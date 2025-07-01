"""Metrics collector for system performance and resource monitoring."""

import asyncio
import psutil
import time
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
import logging

from prometheus_client import Gauge, Summary, Info
import aiohttp
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from src.shared.utils.logger import get_logger

logger = get_logger(__name__)


class MetricsCollector:
    """Collects system and application metrics."""
    
    # System metrics
    cpu_usage_gauge = Gauge('system_cpu_usage_percent', 'CPU usage percentage')
    memory_usage_gauge = Gauge('system_memory_usage_percent', 'Memory usage percentage')
    memory_available_gauge = Gauge('system_memory_available_bytes', 'Available memory in bytes')
    disk_usage_gauge = Gauge('system_disk_usage_percent', 'Disk usage percentage', ['mount_point'])
    network_io_gauge = Gauge('system_network_io_bytes', 'Network I/O bytes', ['direction', 'interface'])
    
    # Database metrics
    db_connections_gauge = Gauge('database_connections_active', 'Active database connections')
    db_query_duration = Summary('database_query_duration_seconds', 'Database query duration')
    db_pool_size_gauge = Gauge('database_pool_size', 'Database connection pool size')
    db_pool_checked_out_gauge = Gauge('database_pool_checked_out', 'Checked out connections')
    
    # Application metrics
    active_websockets_gauge = Gauge('app_websocket_connections_active', 'Active WebSocket connections')
    request_queue_size_gauge = Gauge('app_request_queue_size', 'Request queue size')
    cache_hit_rate_gauge = Gauge('app_cache_hit_rate', 'Cache hit rate')
    ai_model_latency = Summary('ai_model_latency_seconds', 'AI model inference latency', ['model'])
    
    def __init__(self):
        self.collection_interval = 60  # seconds
        self._running = False
        self._tasks: List[asyncio.Task] = []
        self._custom_collectors: Dict[str, Callable] = {}
        
    async def start(self):
        """Start metrics collection."""
        self._running = True
        self._tasks = [
            asyncio.create_task(self._collect_system_metrics()),
            asyncio.create_task(self._collect_process_metrics()),
            asyncio.create_task(self._collect_custom_metrics())
        ]
        logger.info("Metrics collector started")
        
    async def stop(self):
        """Stop metrics collection."""
        self._running = False
        
        for task in self._tasks:
            task.cancel()
            
        await asyncio.gather(*self._tasks, return_exceptions=True)
        logger.info("Metrics collector stopped")
        
    def register_collector(self, name: str, collector: Callable):
        """Register a custom metrics collector."""
        self._custom_collectors[name] = collector
        logger.info(f"Registered custom collector: {name}")
        
    async def collect_database_metrics(self, session: AsyncSession):
        """Collect database-specific metrics."""
        try:
            # Get connection pool stats
            pool = session.bind.pool
            self.db_pool_size_gauge.set(pool.size())
            self.db_pool_checked_out_gauge.set(pool.checked_out())
            
            # Get active connections
            result = await session.execute(
                text("""
                    SELECT count(*) as active_connections
                    FROM pg_stat_activity
                    WHERE state = 'active'
                """)
            )
            active_connections = result.scalar()
            self.db_connections_gauge.set(active_connections)
            
            # Get database size
            result = await session.execute(
                text("""
                    SELECT pg_database_size(current_database()) as db_size
                """)
            )
            db_size = result.scalar()
            
            # Get table statistics
            result = await session.execute(
                text("""
                    SELECT 
                        schemaname,
                        tablename,
                        n_live_tup as live_rows,
                        n_dead_tup as dead_rows,
                        last_vacuum,
                        last_autovacuum
                    FROM pg_stat_user_tables
                    ORDER BY n_live_tup DESC
                    LIMIT 10
                """)
            )
            table_stats = result.fetchall()
            
            return {
                "connections": {
                    "active": active_connections,
                    "pool_size": pool.size(),
                    "pool_checked_out": pool.checked_out()
                },
                "size": db_size,
                "tables": [
                    {
                        "schema": row.schemaname,
                        "table": row.tablename,
                        "live_rows": row.live_rows,
                        "dead_rows": row.dead_rows,
                        "last_vacuum": row.last_vacuum,
                        "last_autovacuum": row.last_autovacuum
                    }
                    for row in table_stats
                ]
            }
            
        except Exception as e:
            logger.error(f"Error collecting database metrics: {e}")
            return {}
            
    async def collect_cache_metrics(self, cache_client) -> Dict[str, Any]:
        """Collect cache metrics."""
        try:
            info = await cache_client.info()
            stats = await cache_client.info("stats")
            
            # Calculate hit rate
            hits = int(stats.get("keyspace_hits", 0))
            misses = int(stats.get("keyspace_misses", 0))
            total_ops = hits + misses
            
            hit_rate = (hits / total_ops * 100) if total_ops > 0 else 0
            self.cache_hit_rate_gauge.set(hit_rate)
            
            return {
                "hit_rate": hit_rate,
                "hits": hits,
                "misses": misses,
                "memory_used": info.get("used_memory", 0),
                "memory_peak": info.get("used_memory_peak", 0),
                "connected_clients": info.get("connected_clients", 0),
                "total_commands": stats.get("total_commands_processed", 0)
            }
            
        except Exception as e:
            logger.error(f"Error collecting cache metrics: {e}")
            return {}
            
    async def collect_ai_metrics(self) -> Dict[str, Any]:
        """Collect AI service metrics."""
        # This would be populated by the AI service
        return {
            "models_loaded": 0,
            "inference_requests": 0,
            "average_latency": 0,
            "queue_size": 0
        }
        
    async def collect_websocket_metrics(self, ws_manager) -> Dict[str, Any]:
        """Collect WebSocket metrics."""
        try:
            active_connections = len(ws_manager.active_connections)
            self.active_websockets_gauge.set(active_connections)
            
            return {
                "active_connections": active_connections,
                "total_messages_sent": ws_manager.total_messages_sent,
                "total_messages_received": ws_manager.total_messages_received
            }
        except Exception as e:
            logger.error(f"Error collecting websocket metrics: {e}")
            return {}
            
    async def get_health_status(self) -> Dict[str, Any]:
        """Get overall system health status."""
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Define health thresholds
        health_status = "healthy"
        issues = []
        
        if cpu_percent > 80:
            health_status = "warning"
            issues.append(f"High CPU usage: {cpu_percent}%")
            
        if memory.percent > 85:
            health_status = "warning"
            issues.append(f"High memory usage: {memory.percent}%")
            
        if disk.percent > 90:
            health_status = "critical"
            issues.append(f"Low disk space: {disk.percent}% used")
            
        return {
            "status": health_status,
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "disk_percent": disk.percent
            },
            "issues": issues
        }
        
    async def _collect_system_metrics(self):
        """Continuously collect system metrics."""
        while self._running:
            try:
                # CPU metrics
                cpu_percent = psutil.cpu_percent(interval=1)
                self.cpu_usage_gauge.set(cpu_percent)
                
                # Memory metrics
                memory = psutil.virtual_memory()
                self.memory_usage_gauge.set(memory.percent)
                self.memory_available_gauge.set(memory.available)
                
                # Disk metrics
                for partition in psutil.disk_partitions():
                    if partition.fstype:
                        usage = psutil.disk_usage(partition.mountpoint)
                        self.disk_usage_gauge.labels(
                            mount_point=partition.mountpoint
                        ).set(usage.percent)
                        
                # Network metrics
                net_io = psutil.net_io_counters(pernic=True)
                for interface, counters in net_io.items():
                    self.network_io_gauge.labels(
                        direction="sent",
                        interface=interface
                    ).set(counters.bytes_sent)
                    
                    self.network_io_gauge.labels(
                        direction="recv",
                        interface=interface
                    ).set(counters.bytes_recv)
                    
                await asyncio.sleep(self.collection_interval)
                
            except Exception as e:
                logger.error(f"Error collecting system metrics: {e}")
                await asyncio.sleep(self.collection_interval)
                
    async def _collect_process_metrics(self):
        """Collect process-specific metrics."""
        process = psutil.Process()
        
        while self._running:
            try:
                # Process CPU and memory
                cpu_percent = process.cpu_percent()
                memory_info = process.memory_info()
                
                # Process connections
                connections = len(process.connections())
                
                # Process threads
                num_threads = process.num_threads()
                
                # File descriptors (Unix only)
                try:
                    num_fds = process.num_fds()
                except AttributeError:
                    num_fds = 0
                    
                logger.debug(
                    f"Process metrics - CPU: {cpu_percent}%, "
                    f"Memory: {memory_info.rss / 1024 / 1024:.2f}MB, "
                    f"Connections: {connections}, "
                    f"Threads: {num_threads}"
                )
                
                await asyncio.sleep(self.collection_interval)
                
            except Exception as e:
                logger.error(f"Error collecting process metrics: {e}")
                await asyncio.sleep(self.collection_interval)
                
    async def _collect_custom_metrics(self):
        """Collect custom registered metrics."""
        while self._running:
            for name, collector in self._custom_collectors.items():
                try:
                    if asyncio.iscoroutinefunction(collector):
                        await collector()
                    else:
                        collector()
                except Exception as e:
                    logger.error(f"Error in custom collector '{name}': {e}")
                    
            await asyncio.sleep(self.collection_interval)
            
    async def export_metrics(self) -> Dict[str, Any]:
        """Export all collected metrics."""
        cpu_times = psutil.cpu_times()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        net_io = psutil.net_io_counters()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "system": {
                "cpu": {
                    "percent": psutil.cpu_percent(interval=1),
                    "count": psutil.cpu_count(),
                    "times": {
                        "user": cpu_times.user,
                        "system": cpu_times.system,
                        "idle": cpu_times.idle
                    }
                },
                "memory": {
                    "total": memory.total,
                    "available": memory.available,
                    "percent": memory.percent,
                    "used": memory.used,
                    "free": memory.free
                },
                "disk": {
                    "total": disk.total,
                    "used": disk.used,
                    "free": disk.free,
                    "percent": disk.percent
                },
                "network": {
                    "bytes_sent": net_io.bytes_sent,
                    "bytes_recv": net_io.bytes_recv,
                    "packets_sent": net_io.packets_sent,
                    "packets_recv": net_io.packets_recv
                }
            },
            "process": self._get_process_metrics()
        }
        
    def _get_process_metrics(self) -> Dict[str, Any]:
        """Get current process metrics."""
        try:
            process = psutil.Process()
            memory_info = process.memory_info()
            
            return {
                "pid": process.pid,
                "cpu_percent": process.cpu_percent(),
                "memory": {
                    "rss": memory_info.rss,
                    "vms": memory_info.vms,
                    "percent": process.memory_percent()
                },
                "threads": process.num_threads(),
                "connections": len(process.connections()),
                "create_time": process.create_time()
            }
        except Exception as e:
            logger.error(f"Error getting process metrics: {e}")
            return {}