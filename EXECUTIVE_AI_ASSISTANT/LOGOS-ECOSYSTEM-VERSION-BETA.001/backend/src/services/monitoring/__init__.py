"""Monitoring service for application metrics and health."""

from prometheus_client import Counter, Histogram, Gauge, generate_latest
from prometheus_client.core import CollectorRegistry
from typing import Dict, Any, Optional
import time
import psutil
import os

from ...shared.utils.logger import get_logger

logger = get_logger(__name__)

# Create registry
registry = CollectorRegistry()

# Define metrics
request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status'],
    registry=registry
)

request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint'],
    registry=registry
)

active_users = Gauge(
    'active_users_total',
    'Total active users',
    registry=registry
)

ai_tokens_used = Counter(
    'ai_tokens_used_total',
    'Total AI tokens used',
    ['model', 'user_type'],
    registry=registry
)

marketplace_transactions = Counter(
    'marketplace_transactions_total',
    'Total marketplace transactions',
    ['type', 'status'],
    registry=registry
)

wallet_balance_total = Gauge(
    'wallet_balance_total_usd',
    'Total wallet balance in USD',
    registry=registry
)

# System metrics
cpu_usage = Gauge(
    'system_cpu_usage_percent',
    'System CPU usage percentage',
    registry=registry
)

memory_usage = Gauge(
    'system_memory_usage_percent',
    'System memory usage percentage',
    registry=registry
)

disk_usage = Gauge(
    'system_disk_usage_percent',
    'System disk usage percentage',
    registry=registry
)


class MetricsCollector:
    """Collects and exposes application metrics."""
    
    def __init__(self):
        self.start_time = time.time()
    
    def record_request(
        self,
        method: str,
        endpoint: str,
        status: int,
        duration: float
    ):
        """Record HTTP request metrics."""
        request_count.labels(
            method=method,
            endpoint=endpoint,
            status=str(status)
        ).inc()
        
        request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)
    
    def record_ai_usage(
        self,
        model: str,
        tokens: int,
        is_premium: bool = False
    ):
        """Record AI token usage."""
        user_type = "premium" if is_premium else "standard"
        ai_tokens_used.labels(
            model=model,
            user_type=user_type
        ).inc(tokens)
    
    def record_transaction(
        self,
        transaction_type: str,
        status: str
    ):
        """Record marketplace transaction."""
        marketplace_transactions.labels(
            type=transaction_type,
            status=status
        ).inc()
    
    def update_active_users(self, count: int):
        """Update active users count."""
        active_users.set(count)
    
    def update_wallet_balance(self, total: float):
        """Update total wallet balance."""
        wallet_balance_total.set(total)
    
    def collect_system_metrics(self):
        """Collect system resource metrics."""
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_usage.set(cpu_percent)
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_usage.set(memory.percent)
        
        # Disk usage
        disk = psutil.disk_usage('/')
        disk_usage.set(disk.percent)
    
    def get_metrics(self) -> bytes:
        """Get Prometheus metrics."""
        # Update system metrics
        self.collect_system_metrics()
        
        # Generate metrics
        return generate_latest(registry)
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get application health status."""
        uptime = time.time() - self.start_time
        
        # Check critical services
        services_status = {
            "database": self._check_database(),
            "cache": self._check_cache(),
            "ai_service": self._check_ai_service()
        }
        
        # Overall health
        all_healthy = all(services_status.values())
        
        return {
            "status": "healthy" if all_healthy else "unhealthy",
            "uptime_seconds": int(uptime),
            "services": services_status,
            "system": {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_percent": psutil.disk_usage('/').percent
            },
            "timestamp": time.time()
        }
    
    def _check_database(self) -> bool:
        """Check database health."""
        try:
            # This would be implemented with actual database check
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return False
    
    def _check_cache(self) -> bool:
        """Check cache health."""
        try:
            # This would be implemented with actual cache check
            return True
        except Exception as e:
            logger.error(f"Cache health check failed: {str(e)}")
            return False
    
    def _check_ai_service(self) -> bool:
        """Check AI service health."""
        try:
            # This would be implemented with actual AI service check
            return True
        except Exception as e:
            logger.error(f"AI service health check failed: {str(e)}")
            return False


# Global metrics collector
metrics_collector = MetricsCollector()


def metrics_endpoint():
    """Endpoint handler for Prometheus metrics."""
    return metrics_collector.get_metrics()


def health_endpoint():
    """Endpoint handler for health check."""
    return metrics_collector.get_health_status()


# Track active connections
active_connections = Gauge(
    'active_connections',
    'Number of active connections',
    registry=registry
)

def track_request_metrics(method: str, endpoint: str, status: int, duration: float):
    """Track request metrics (wrapper for metrics_collector)."""
    metrics_collector.record_request(method, endpoint, status, duration)


from .real_time_analytics import analytics

# Start real-time analytics engine on import
import asyncio
try:
    loop = asyncio.get_event_loop()
except RuntimeError:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

# Schedule analytics engine startup
loop.create_task(analytics.start())

__all__ = [
    "metrics_collector",
    "metrics_endpoint",
    "health_endpoint",
    "track_request_metrics",
    "active_connections",
    "analytics"
]