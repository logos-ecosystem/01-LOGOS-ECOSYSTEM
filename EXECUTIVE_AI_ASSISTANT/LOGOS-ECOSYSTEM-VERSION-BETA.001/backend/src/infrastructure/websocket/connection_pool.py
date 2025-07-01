"""
Optimized WebSocket connection pooling with intelligent resource management
"""

import asyncio
import time
import uuid
from typing import Dict, List, Optional, Set, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, deque
import weakref
from contextlib import asynccontextmanager
import json

from websockets import WebSocketServerProtocol, ConnectionClosed
from websockets.exceptions import WebSocketException
import aiohttp

from src.shared.utils.logger import get_logger
from src.shared.utils.config import get_settings

settings = get_settings()

logger = get_logger(__name__)


@dataclass
class ConnectionStats:
    """Statistics for a WebSocket connection"""
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_activity: datetime = field(default_factory=datetime.utcnow)
    messages_sent: int = 0
    messages_received: int = 0
    bytes_sent: int = 0
    bytes_received: int = 0
    errors: int = 0
    reconnections: int = 0
    latency_ms: deque = field(default_factory=lambda: deque(maxlen=100))
    
    @property
    def average_latency(self) -> float:
        """Calculate average latency"""
        return sum(self.latency_ms) / len(self.latency_ms) if self.latency_ms else 0
    
    @property
    def uptime(self) -> timedelta:
        """Connection uptime"""
        return datetime.utcnow() - self.created_at
    
    @property
    def idle_time(self) -> timedelta:
        """Time since last activity"""
        return datetime.utcnow() - self.last_activity


@dataclass
class PooledConnection:
    """Wrapper for pooled WebSocket connection"""
    connection_id: str
    websocket: WebSocketServerProtocol
    client_id: str
    metadata: Dict[str, Any]
    stats: ConnectionStats
    subscriptions: Set[str] = field(default_factory=set)
    is_healthy: bool = True
    pool_ref: Optional[weakref.ref] = None
    
    async def send(self, message: str) -> None:
        """Send message with stats tracking"""
        try:
            await self.websocket.send(message)
            self.stats.messages_sent += 1
            self.stats.bytes_sent += len(message.encode())
            self.stats.last_activity = datetime.utcnow()
        except Exception as e:
            self.stats.errors += 1
            self.is_healthy = False
            raise
    
    async def close(self) -> None:
        """Close connection gracefully"""
        try:
            await self.websocket.close()
        except Exception:
            pass


class WebSocketConnectionPool:
    """
    Advanced WebSocket connection pool with:
    - Connection multiplexing
    - Automatic health checking
    - Connection warm-up
    - Load balancing
    - Circuit breaker pattern
    - Connection migration
    """
    
    def __init__(
        self,
        min_connections: int = 10,
        max_connections: int = 1000,
        max_connections_per_client: int = 5,
        idle_timeout: int = 300,  # 5 minutes
        health_check_interval: int = 30,
        enable_multiplexing: bool = True
    ):
        self.min_connections = min_connections
        self.max_connections = max_connections
        self.max_connections_per_client = max_connections_per_client
        self.idle_timeout = idle_timeout
        self.health_check_interval = health_check_interval
        self.enable_multiplexing = enable_multiplexing
        
        # Connection storage
        self.connections: Dict[str, PooledConnection] = {}
        self.client_connections: Dict[str, List[str]] = defaultdict(list)
        self.available_connections: deque = deque()
        self.subscription_map: Dict[str, Set[str]] = defaultdict(set)
        
        # Circuit breaker
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=5,
            recovery_timeout=60,
            expected_exception=WebSocketException
        )
        
        # Statistics
        self.pool_stats = {
            "total_connections_created": 0,
            "total_connections_closed": 0,
            "total_messages_sent": 0,
            "total_messages_received": 0,
            "connection_errors": 0,
            "circuit_breaker_trips": 0
        }
        
        # Background tasks
        self._tasks: List[asyncio.Task] = []
        
    async def initialize(self):
        """Initialize connection pool"""
        logger.info(f"Initializing WebSocket pool with min={self.min_connections}, max={self.max_connections}")
        
        # Start background tasks
        self._tasks.append(asyncio.create_task(self._health_check_loop()))
        self._tasks.append(asyncio.create_task(self._cleanup_loop()))
        self._tasks.append(asyncio.create_task(self._stats_reporting_loop()))
        
        # Pre-create minimum connections
        await self._ensure_minimum_connections()
        
        logger.info("WebSocket connection pool initialized")
    
    async def shutdown(self):
        """Shutdown connection pool gracefully"""
        logger.info("Shutting down WebSocket connection pool")
        
        # Cancel background tasks
        for task in self._tasks:
            task.cancel()
        
        # Close all connections
        close_tasks = []
        for conn in self.connections.values():
            close_tasks.append(asyncio.create_task(conn.close()))
        
        await asyncio.gather(*close_tasks, return_exceptions=True)
        
        self.connections.clear()
        self.client_connections.clear()
        self.available_connections.clear()
        
        logger.info("WebSocket connection pool shut down")
    
    @asynccontextmanager
    async def acquire(self, client_id: str, metadata: Optional[Dict[str, Any]] = None):
        """Acquire a connection from the pool"""
        connection = None
        try:
            connection = await self._acquire_connection(client_id, metadata)
            yield connection
        finally:
            if connection:
                await self._release_connection(connection)
    
    async def _acquire_connection(
        self,
        client_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> PooledConnection:
        """Acquire a healthy connection for client"""
        # Check circuit breaker
        if not self.circuit_breaker.call_allowed():
            raise WebSocketException("Circuit breaker is open")
        
        try:
            # Try to reuse existing connection if multiplexing enabled
            if self.enable_multiplexing:
                existing_conn = await self._find_reusable_connection(client_id)
                if existing_conn:
                    logger.debug(f"Reusing connection {existing_conn.connection_id} for client {client_id}")
                    return existing_conn
            
            # Check if client has reached connection limit
            client_conn_count = len(self.client_connections[client_id])
            if client_conn_count >= self.max_connections_per_client:
                # Try to migrate to least loaded connection
                return await self._migrate_to_least_loaded(client_id)
            
            # Get or create new connection
            if self.available_connections:
                conn_id = self.available_connections.popleft()
                connection = self.connections[conn_id]
                connection.client_id = client_id
                connection.metadata = metadata or {}
            else:
                connection = await self._create_connection(client_id, metadata)
            
            # Add to client connections
            self.client_connections[client_id].append(connection.connection_id)
            
            # Record success for circuit breaker
            self.circuit_breaker.record_success()
            
            return connection
            
        except Exception as e:
            self.circuit_breaker.record_failure()
            self.pool_stats["connection_errors"] += 1
            logger.error(f"Failed to acquire connection: {e}")
            raise
    
    async def _release_connection(self, connection: PooledConnection):
        """Release connection back to pool"""
        if not connection.is_healthy:
            # Remove unhealthy connection
            await self._remove_connection(connection.connection_id)
            return
        
        # Check if connection should be kept alive
        if connection.stats.idle_time.total_seconds() > self.idle_timeout:
            await self._remove_connection(connection.connection_id)
            return
        
        # Return to available pool if multiplexing enabled
        if self.enable_multiplexing and connection.connection_id not in self.available_connections:
            self.available_connections.append(connection.connection_id)
    
    async def _create_connection(
        self,
        client_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> PooledConnection:
        """Create new WebSocket connection"""
        if len(self.connections) >= self.max_connections:
            raise WebSocketException("Connection pool limit reached")
        
        conn_id = str(uuid.uuid4())
        
        # This is a placeholder - in real implementation, would create actual WebSocket
        # For now, create a mock connection
        websocket = MockWebSocket()  # Replace with actual WebSocket creation
        
        connection = PooledConnection(
            connection_id=conn_id,
            websocket=websocket,
            client_id=client_id,
            metadata=metadata or {},
            stats=ConnectionStats(),
            pool_ref=weakref.ref(self)
        )
        
        self.connections[conn_id] = connection
        self.pool_stats["total_connections_created"] += 1
        
        logger.info(f"Created new connection {conn_id} for client {client_id}")
        
        return connection
    
    async def _remove_connection(self, connection_id: str):
        """Remove connection from pool"""
        if connection_id not in self.connections:
            return
        
        connection = self.connections[connection_id]
        
        # Remove from client connections
        if connection.client_id in self.client_connections:
            self.client_connections[connection.client_id].remove(connection_id)
            if not self.client_connections[connection.client_id]:
                del self.client_connections[connection.client_id]
        
        # Remove from available connections
        if connection_id in self.available_connections:
            self.available_connections.remove(connection_id)
        
        # Clean up subscriptions
        for topic in connection.subscriptions:
            self.subscription_map[topic].discard(connection_id)
        
        # Close connection
        await connection.close()
        
        # Remove from pool
        del self.connections[connection_id]
        self.pool_stats["total_connections_closed"] += 1
        
        logger.info(f"Removed connection {connection_id}")
        
        # Ensure minimum connections
        await self._ensure_minimum_connections()
    
    async def _find_reusable_connection(self, client_id: str) -> Optional[PooledConnection]:
        """Find a healthy reusable connection for client"""
        # Check client's existing connections
        for conn_id in self.client_connections.get(client_id, []):
            if conn_id in self.connections:
                connection = self.connections[conn_id]
                if connection.is_healthy and len(connection.subscriptions) < 100:  # Max subscriptions per connection
                    return connection
        
        # Check available connections
        for conn_id in list(self.available_connections):
            if conn_id in self.connections:
                connection = self.connections[conn_id]
                if connection.is_healthy:
                    return connection
        
        return None
    
    async def _migrate_to_least_loaded(self, client_id: str) -> PooledConnection:
        """Migrate client to least loaded connection"""
        # Find least loaded connection
        least_loaded = None
        min_load = float('inf')
        
        for conn_id in self.client_connections[client_id]:
            if conn_id in self.connections:
                connection = self.connections[conn_id]
                load = len(connection.subscriptions) + connection.stats.messages_sent / 100
                if load < min_load:
                    min_load = load
                    least_loaded = connection
        
        if least_loaded:
            logger.info(f"Migrating client {client_id} to connection {least_loaded.connection_id}")
            return least_loaded
        
        raise WebSocketException("No suitable connection for migration")
    
    async def _ensure_minimum_connections(self):
        """Ensure minimum number of connections in pool"""
        current_count = len(self.connections)
        if current_count < self.min_connections:
            create_count = self.min_connections - current_count
            logger.info(f"Creating {create_count} connections to meet minimum requirement")
            
            create_tasks = []
            for _ in range(create_count):
                task = asyncio.create_task(
                    self._create_connection("pool", {"type": "reserved"})
                )
                create_tasks.append(task)
            
            connections = await asyncio.gather(*create_tasks, return_exceptions=True)
            
            # Add successful connections to available pool
            for conn in connections:
                if isinstance(conn, PooledConnection):
                    self.available_connections.append(conn.connection_id)
    
    async def broadcast(
        self,
        message: str,
        client_ids: Optional[List[str]] = None,
        topic: Optional[str] = None
    ) -> Dict[str, Any]:
        """Broadcast message to multiple clients efficiently"""
        results = {
            "sent": 0,
            "failed": 0,
            "clients": []
        }
        
        # Determine target connections
        target_connections = set()
        
        if topic:
            # Topic-based broadcast
            target_connections.update(self.subscription_map.get(topic, set()))
        
        if client_ids:
            # Client-specific broadcast
            for client_id in client_ids:
                target_connections.update(self.client_connections.get(client_id, []))
        
        if not client_ids and not topic:
            # Broadcast to all
            target_connections = set(self.connections.keys())
        
        # Send messages in parallel
        send_tasks = []
        for conn_id in target_connections:
            if conn_id in self.connections:
                connection = self.connections[conn_id]
                task = asyncio.create_task(self._send_with_retry(connection, message))
                send_tasks.append((conn_id, task))
        
        # Wait for all sends to complete
        for conn_id, task in send_tasks:
            try:
                await task
                results["sent"] += 1
                results["clients"].append(self.connections[conn_id].client_id)
            except Exception as e:
                results["failed"] += 1
                logger.error(f"Failed to send to {conn_id}: {e}")
        
        self.pool_stats["total_messages_sent"] += results["sent"]
        
        return results
    
    async def _send_with_retry(self, connection: PooledConnection, message: str, retries: int = 3):
        """Send message with retry logic"""
        last_error = None
        
        for attempt in range(retries):
            try:
                await connection.send(message)
                return
            except ConnectionClosed:
                connection.is_healthy = False
                raise
            except Exception as e:
                last_error = e
                if attempt < retries - 1:
                    await asyncio.sleep(0.1 * (attempt + 1))  # Exponential backoff
        
        raise last_error
    
    async def subscribe(self, connection_id: str, topic: str):
        """Subscribe connection to topic"""
        if connection_id in self.connections:
            connection = self.connections[connection_id]
            connection.subscriptions.add(topic)
            self.subscription_map[topic].add(connection_id)
            logger.debug(f"Connection {connection_id} subscribed to {topic}")
    
    async def unsubscribe(self, connection_id: str, topic: str):
        """Unsubscribe connection from topic"""
        if connection_id in self.connections:
            connection = self.connections[connection_id]
            connection.subscriptions.discard(topic)
            self.subscription_map[topic].discard(connection_id)
            logger.debug(f"Connection {connection_id} unsubscribed from {topic}")
    
    def get_pool_stats(self) -> Dict[str, Any]:
        """Get comprehensive pool statistics"""
        active_connections = len(self.connections)
        available_connections = len(self.available_connections)
        
        # Calculate per-connection stats
        total_messages = sum(conn.stats.messages_sent + conn.stats.messages_received 
                           for conn in self.connections.values())
        
        avg_latency = sum(conn.stats.average_latency for conn in self.connections.values()) / active_connections if active_connections > 0 else 0
        
        # Client distribution
        client_distribution = {
            client_id: len(conn_ids) 
            for client_id, conn_ids in self.client_connections.items()
        }
        
        return {
            "pool_stats": self.pool_stats,
            "active_connections": active_connections,
            "available_connections": available_connections,
            "total_clients": len(self.client_connections),
            "average_connections_per_client": active_connections / len(self.client_connections) if self.client_connections else 0,
            "total_messages": total_messages,
            "average_latency_ms": avg_latency,
            "circuit_breaker_state": self.circuit_breaker.state,
            "client_distribution": client_distribution,
            "health_status": self._calculate_health_score()
        }
    
    def _calculate_health_score(self) -> float:
        """Calculate overall pool health score (0-100)"""
        score = 100.0
        
        # Deduct for connection errors
        error_rate = self.pool_stats["connection_errors"] / max(self.pool_stats["total_connections_created"], 1)
        score -= min(error_rate * 100, 30)
        
        # Deduct for circuit breaker trips
        if self.circuit_breaker.state != CircuitBreakerState.CLOSED:
            score -= 20
        
        # Deduct for low availability
        availability = len(self.available_connections) / max(self.min_connections, 1)
        if availability < 0.5:
            score -= 20
        
        # Deduct for high connection count
        utilization = len(self.connections) / self.max_connections
        if utilization > 0.9:
            score -= 10
        
        return max(0, score)
    
    async def _health_check_loop(self):
        """Background task to check connection health"""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                
                # Check each connection
                for connection in list(self.connections.values()):
                    try:
                        # Send ping to check health
                        await connection.websocket.ping()
                        
                        # Check idle timeout
                        if connection.stats.idle_time.total_seconds() > self.idle_timeout:
                            await self._remove_connection(connection.connection_id)
                            
                    except Exception as e:
                        logger.warning(f"Health check failed for {connection.connection_id}: {e}")
                        connection.is_healthy = False
                        await self._remove_connection(connection.connection_id)
                
            except Exception as e:
                logger.error(f"Health check loop error: {e}")
    
    async def _cleanup_loop(self):
        """Background task to clean up resources"""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                
                # Clean up empty subscription topics
                empty_topics = [
                    topic for topic, connections in self.subscription_map.items()
                    if not connections
                ]
                for topic in empty_topics:
                    del self.subscription_map[topic]
                
                # Clean up stale client entries
                empty_clients = [
                    client_id for client_id, conn_ids in self.client_connections.items()
                    if not conn_ids
                ]
                for client_id in empty_clients:
                    del self.client_connections[client_id]
                
                # Ensure minimum connections
                await self._ensure_minimum_connections()
                
            except Exception as e:
                logger.error(f"Cleanup loop error: {e}")
    
    async def _stats_reporting_loop(self):
        """Background task to report statistics"""
        while True:
            try:
                await asyncio.sleep(300)  # Report every 5 minutes
                
                stats = self.get_pool_stats()
                logger.info(f"WebSocket pool stats: {json.dumps(stats, indent=2)}")
                
                # Reset circuit breaker if healthy
                if stats["health_status"] > 80 and self.circuit_breaker.state == CircuitBreakerState.OPEN:
                    self.circuit_breaker.reset()
                
            except Exception as e:
                logger.error(f"Stats reporting error: {e}")


class CircuitBreaker:
    """Circuit breaker pattern implementation"""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitBreakerState.CLOSED
    
    def call_allowed(self) -> bool:
        """Check if calls are allowed"""
        if self.state == CircuitBreakerState.CLOSED:
            return True
        
        if self.state == CircuitBreakerState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitBreakerState.HALF_OPEN
                return True
            return False
        
        # HALF_OPEN state
        return True
    
    def record_success(self):
        """Record successful call"""
        self.failure_count = 0
        self.state = CircuitBreakerState.CLOSED
    
    def record_failure(self):
        """Record failed call"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitBreakerState.OPEN
            logger.warning("Circuit breaker opened due to failures")
    
    def reset(self):
        """Reset circuit breaker"""
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitBreakerState.CLOSED
    
    def _should_attempt_reset(self) -> bool:
        """Check if we should attempt to reset"""
        return (
            self.last_failure_time and
            time.time() - self.last_failure_time >= self.recovery_timeout
        )


class CircuitBreakerState:
    """Circuit breaker states"""
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class MockWebSocket:
    """Mock WebSocket for testing"""
    
    async def send(self, message: str):
        """Mock send"""
        pass
    
    async def ping(self):
        """Mock ping"""
        pass
    
    async def close(self):
        """Mock close"""
        pass


# Connection pool manager singleton
_connection_pool: Optional[WebSocketConnectionPool] = None


async def get_connection_pool() -> WebSocketConnectionPool:
    """Get or create connection pool singleton"""
    global _connection_pool
    
    if _connection_pool is None:
        _connection_pool = WebSocketConnectionPool(
            min_connections=settings.WS_POOL_MIN_CONNECTIONS,
            max_connections=settings.WS_POOL_MAX_CONNECTIONS,
            max_connections_per_client=settings.WS_MAX_CONNECTIONS_PER_CLIENT,
            idle_timeout=settings.WS_IDLE_TIMEOUT,
            health_check_interval=settings.WS_HEALTH_CHECK_INTERVAL
        )
        await _connection_pool.initialize()
    
    return _connection_pool