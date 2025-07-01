"""Real-time analytics service for the LOGOS ecosystem."""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import asyncio
import json
from collections import defaultdict, deque
import statistics

from prometheus_client import Counter, Histogram, Gauge, Summary
from ...shared.utils.logger import get_logger
from ...infrastructure.cache.multi_level import MultiLevelCache

logger = get_logger(__name__)

# Define detailed metrics for AI agents
ai_agent_requests = Counter(
    'ai_agent_requests_total',
    'Total AI agent requests',
    ['agent_type', 'status', 'user_type']
)

ai_agent_response_time = Histogram(
    'ai_agent_response_duration_seconds',
    'AI agent response time',
    ['agent_type'],
    buckets=(0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)
)

ai_agent_errors = Counter(
    'ai_agent_errors_total',
    'Total AI agent errors',
    ['agent_type', 'error_type']
)

ai_agent_active_sessions = Gauge(
    'ai_agent_active_sessions',
    'Active AI agent sessions',
    ['agent_type']
)

ai_agent_token_usage = Summary(
    'ai_agent_token_usage',
    'AI agent token usage statistics',
    ['agent_type', 'model']
)

# Transaction metrics
transaction_volume = Gauge(
    'transaction_volume_usd',
    'Transaction volume in USD',
    ['type', 'payment_method']
)

transaction_amount = Histogram(
    'transaction_amount_usd',
    'Transaction amount distribution',
    ['type'],
    buckets=(1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000)
)

payment_processing_errors = Counter(
    'payment_processing_errors_total',
    'Payment processing errors',
    ['provider', 'error_type']
)

marketplace_item_sales = Counter(
    'marketplace_item_sales_total',
    'Marketplace item sales',
    ['item_id', 'item_name', 'category']
)

# User analytics metrics
user_registrations = Counter(
    'user_registrations_total',
    'Total user registrations',
    ['source', 'user_type']
)

user_session_duration = Histogram(
    'user_session_duration_seconds',
    'User session duration',
    ['user_type'],
    buckets=(60, 300, 600, 1800, 3600, 7200, 14400)
)

user_feature_usage = Counter(
    'user_feature_usage_total',
    'Feature usage by users',
    ['feature', 'user_type']
)

user_retention_cohort = Gauge(
    'user_retention_cohort',
    'User retention by cohort',
    ['cohort', 'days_since_signup']
)

user_type_distribution = Gauge(
    'user_type_distribution',
    'Distribution of user types',
    ['user_type']
)

daily_active_users = Gauge(
    'user_daily_active_users',
    'Daily active users'
)

monthly_active_users = Gauge(
    'user_monthly_active_users',
    'Monthly active users'
)


class RealTimeAnalytics:
    """Real-time analytics engine for monitoring and insights."""
    
    def __init__(self, cache: Optional[MultiLevelCache] = None):
        self.cache = cache or MultiLevelCache()
        self.event_buffer = defaultdict(lambda: deque(maxlen=1000))
        self.aggregation_interval = 60  # seconds
        self.running = False
        
        # Real-time counters
        self.realtime_counters = defaultdict(int)
        self.realtime_gauges = defaultdict(float)
        self.realtime_histograms = defaultdict(list)
        
    async def start(self):
        """Start the real-time analytics engine."""
        self.running = True
        asyncio.create_task(self._aggregation_loop())
        logger.info("Real-time analytics engine started")
        
    async def stop(self):
        """Stop the real-time analytics engine."""
        self.running = False
        logger.info("Real-time analytics engine stopped")
        
    async def _aggregation_loop(self):
        """Periodically aggregate and publish metrics."""
        while self.running:
            try:
                await self._aggregate_metrics()
                await asyncio.sleep(self.aggregation_interval)
            except Exception as e:
                logger.error(f"Error in aggregation loop: {str(e)}")
                
    async def _aggregate_metrics(self):
        """Aggregate buffered events into metrics."""
        # Aggregate AI agent metrics
        for key, events in self.event_buffer.items():
            if key.startswith("ai_agent_"):
                await self._aggregate_ai_metrics(key, list(events))
                
            elif key.startswith("transaction_"):
                await self._aggregate_transaction_metrics(key, list(events))
                
            elif key.startswith("user_"):
                await self._aggregate_user_metrics(key, list(events))
                
    async def _aggregate_ai_metrics(self, key: str, events: List[Dict[str, Any]]):
        """Aggregate AI agent metrics."""
        if not events:
            return
            
        agent_type = key.split("_")[-1]
        
        # Calculate response times
        response_times = [e.get("response_time", 0) for e in events if "response_time" in e]
        if response_times:
            avg_response_time = statistics.mean(response_times)
            p95_response_time = statistics.quantiles(response_times, n=20)[18]  # 95th percentile
            
            # Update Prometheus metrics
            for rt in response_times:
                ai_agent_response_time.labels(agent_type=agent_type).observe(rt)
                
        # Count requests by status
        status_counts = defaultdict(int)
        for event in events:
            status = event.get("status", "unknown")
            user_type = event.get("user_type", "standard")
            status_counts[(status, user_type)] += 1
            
        for (status, user_type), count in status_counts.items():
            ai_agent_requests.labels(
                agent_type=agent_type,
                status=status,
                user_type=user_type
            ).inc(count)
            
        # Track errors
        errors = [e for e in events if e.get("status") == "error"]
        error_types = defaultdict(int)
        for error in errors:
            error_type = error.get("error_type", "unknown")
            error_types[error_type] += 1
            
        for error_type, count in error_types.items():
            ai_agent_errors.labels(
                agent_type=agent_type,
                error_type=error_type
            ).inc(count)
            
    async def _aggregate_transaction_metrics(self, key: str, events: List[Dict[str, Any]]):
        """Aggregate transaction metrics."""
        if not events:
            return
            
        # Calculate transaction volumes
        volume_by_type = defaultdict(lambda: defaultdict(float))
        amounts = []
        
        for event in events:
            tx_type = event.get("type", "unknown")
            payment_method = event.get("payment_method", "unknown")
            amount = event.get("amount_usd", 0)
            
            volume_by_type[tx_type][payment_method] += amount
            amounts.append(amount)
            
            # Track individual sales
            if event.get("item_id"):
                marketplace_item_sales.labels(
                    item_id=event["item_id"],
                    item_name=event.get("item_name", "Unknown"),
                    category=event.get("category", "Unknown")
                ).inc()
                
        # Update volume gauges
        for tx_type, methods in volume_by_type.items():
            for method, volume in methods.items():
                transaction_volume.labels(
                    type=tx_type,
                    payment_method=method
                ).set(volume)
                
        # Record amount distribution
        for amount in amounts:
            transaction_amount.labels(type="all").observe(amount)
            
    async def _aggregate_user_metrics(self, key: str, events: List[Dict[str, Any]]):
        """Aggregate user metrics."""
        if not events:
            return
            
        # Process different user event types
        if "registration" in key:
            for event in events:
                source = event.get("source", "organic")
                user_type = event.get("user_type", "standard")
                user_registrations.labels(
                    source=source,
                    user_type=user_type
                ).inc()
                
        elif "session" in key:
            durations = [e.get("duration", 0) for e in events if "duration" in e]
            for duration in durations:
                user_type = events[0].get("user_type", "standard")
                user_session_duration.labels(user_type=user_type).observe(duration)
                
        elif "feature" in key:
            feature_counts = defaultdict(lambda: defaultdict(int))
            for event in events:
                feature = event.get("feature", "unknown")
                user_type = event.get("user_type", "standard")
                feature_counts[feature][user_type] += 1
                
            for feature, user_types in feature_counts.items():
                for user_type, count in user_types.items():
                    user_feature_usage.labels(
                        feature=feature,
                        user_type=user_type
                    ).inc(count)
                    
    async def track_event(self, event_type: str, data: Dict[str, Any]):
        """Track a real-time event."""
        # Add timestamp if not present
        if "timestamp" not in data:
            data["timestamp"] = datetime.utcnow().isoformat()
            
        # Buffer the event
        self.event_buffer[event_type].append(data)
        
        # Update real-time counters
        if event_type in ["page_view", "api_call", "feature_use"]:
            self.realtime_counters[event_type] += 1
            
        # Cache for real-time dashboard
        await self._update_realtime_cache(event_type, data)
        
    async def _update_realtime_cache(self, event_type: str, data: Dict[str, Any]):
        """Update real-time cache for dashboards."""
        cache_key = f"realtime:{event_type}:latest"
        
        # Get existing data
        cached = await self.cache.get(cache_key) or []
        if isinstance(cached, str):
            cached = json.loads(cached)
            
        # Add new event (keep last 100)
        cached.append(data)
        if len(cached) > 100:
            cached = cached[-100:]
            
        # Update cache with 5-minute TTL
        await self.cache.set(cache_key, json.dumps(cached), ttl=300)
        
    async def get_realtime_stats(self) -> Dict[str, Any]:
        """Get real-time statistics for dashboards."""
        stats = {
            "timestamp": datetime.utcnow().isoformat(),
            "counters": dict(self.realtime_counters),
            "active_users": await self._get_active_users_count(),
            "recent_transactions": await self._get_recent_transactions(),
            "ai_agent_activity": await self._get_ai_agent_activity(),
            "system_health": await self._get_system_health()
        }
        
        return stats
        
    async def _get_active_users_count(self) -> int:
        """Get current active users count."""
        # This would be implemented with actual session tracking
        cached = await self.cache.get("active_users:count")
        return int(cached) if cached else 0
        
    async def _get_recent_transactions(self) -> List[Dict[str, Any]]:
        """Get recent transactions."""
        cached = await self.cache.get("realtime:transaction_completed:latest")
        if cached:
            transactions = json.loads(cached)
            return transactions[-10:]  # Last 10 transactions
        return []
        
    async def _get_ai_agent_activity(self) -> Dict[str, Any]:
        """Get AI agent activity summary."""
        activity = {}
        
        # Get activity for each agent type
        for agent_type in ["business", "science", "technology", "medical"]:
            key = f"realtime:ai_agent_{agent_type}:latest"
            cached = await self.cache.get(key)
            
            if cached:
                events = json.loads(cached)
                recent_events = [e for e in events if self._is_recent(e.get("timestamp"))]
                
                activity[agent_type] = {
                    "requests_last_minute": len(recent_events),
                    "avg_response_time": statistics.mean([
                        e.get("response_time", 0) for e in recent_events
                    ]) if recent_events else 0,
                    "error_rate": sum(1 for e in recent_events if e.get("status") == "error") / len(recent_events) if recent_events else 0
                }
            else:
                activity[agent_type] = {
                    "requests_last_minute": 0,
                    "avg_response_time": 0,
                    "error_rate": 0
                }
                
        return activity
        
    async def _get_system_health(self) -> Dict[str, Any]:
        """Get system health metrics."""
        # This would integrate with actual health checks
        return {
            "status": "healthy",
            "services": {
                "api": "up",
                "database": "up",
                "cache": "up",
                "ai_service": "up"
            },
            "response_time_ms": 45,
            "error_rate": 0.02
        }
        
    def _is_recent(self, timestamp: str, minutes: int = 1) -> bool:
        """Check if timestamp is within recent minutes."""
        if not timestamp:
            return False
            
        try:
            event_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)
            return event_time > cutoff_time
        except:
            return False
            
    async def generate_analytics_report(self, period: str = "daily") -> Dict[str, Any]:
        """Generate comprehensive analytics report."""
        report = {
            "period": period,
            "generated_at": datetime.utcnow().isoformat(),
            "summary": {},
            "ai_agents": {},
            "transactions": {},
            "users": {},
            "performance": {}
        }
        
        # Populate report sections
        report["summary"] = await self._generate_summary_stats(period)
        report["ai_agents"] = await self._generate_ai_agent_stats(period)
        report["transactions"] = await self._generate_transaction_stats(period)
        report["users"] = await self._generate_user_stats(period)
        report["performance"] = await self._generate_performance_stats(period)
        
        return report
        
    async def _generate_summary_stats(self, period: str) -> Dict[str, Any]:
        """Generate summary statistics."""
        return {
            "total_requests": self.realtime_counters.get("api_call", 0),
            "total_users": await self._get_total_users_count(),
            "total_revenue": await self._get_total_revenue(period),
            "ai_tokens_used": await self._get_total_tokens_used(period)
        }
        
    async def _generate_ai_agent_stats(self, period: str) -> Dict[str, Any]:
        """Generate AI agent statistics."""
        stats = {}
        
        for agent_type in ["business", "science", "technology", "medical"]:
            # Aggregate from event buffer
            events = list(self.event_buffer.get(f"ai_agent_{agent_type}", []))
            
            if events:
                stats[agent_type] = {
                    "total_requests": len(events),
                    "success_rate": sum(1 for e in events if e.get("status") == "success") / len(events),
                    "avg_response_time": statistics.mean([e.get("response_time", 0) for e in events]),
                    "tokens_used": sum(e.get("tokens", 0) for e in events)
                }
            else:
                stats[agent_type] = {
                    "total_requests": 0,
                    "success_rate": 0,
                    "avg_response_time": 0,
                    "tokens_used": 0
                }
                
        return stats
        
    async def _generate_transaction_stats(self, period: str) -> Dict[str, Any]:
        """Generate transaction statistics."""
        events = list(self.event_buffer.get("transaction_completed", []))
        
        if not events:
            return {
                "total_transactions": 0,
                "total_volume": 0,
                "avg_transaction_value": 0,
                "top_categories": []
            }
            
        amounts = [e.get("amount_usd", 0) for e in events]
        categories = defaultdict(int)
        
        for event in events:
            category = event.get("category", "Unknown")
            categories[category] += 1
            
        return {
            "total_transactions": len(events),
            "total_volume": sum(amounts),
            "avg_transaction_value": statistics.mean(amounts),
            "top_categories": sorted(
                [{"category": k, "count": v} for k, v in categories.items()],
                key=lambda x: x["count"],
                reverse=True
            )[:10]
        }
        
    async def _generate_user_stats(self, period: str) -> Dict[str, Any]:
        """Generate user statistics."""
        return {
            "new_users": self.realtime_counters.get("user_registration", 0),
            "active_users": await self._get_active_users_count(),
            "avg_session_duration": await self._get_avg_session_duration(),
            "feature_usage": await self._get_feature_usage_stats()
        }
        
    async def _generate_performance_stats(self, period: str) -> Dict[str, Any]:
        """Generate performance statistics."""
        return {
            "avg_response_time": await self._get_avg_response_time(),
            "error_rate": await self._get_error_rate(),
            "uptime": await self._get_uptime_percentage(),
            "peak_concurrent_users": await self._get_peak_concurrent_users()
        }
        
    # Helper methods for stats generation
    async def _get_total_users_count(self) -> int:
        """Get total registered users count."""
        cached = await self.cache.get("users:total_count")
        return int(cached) if cached else 0
        
    async def _get_total_revenue(self, period: str) -> float:
        """Get total revenue for period."""
        cached = await self.cache.get(f"revenue:{period}:total")
        return float(cached) if cached else 0.0
        
    async def _get_total_tokens_used(self, period: str) -> int:
        """Get total AI tokens used for period."""
        cached = await self.cache.get(f"ai_tokens:{period}:total")
        return int(cached) if cached else 0
        
    async def _get_avg_session_duration(self) -> float:
        """Get average user session duration."""
        events = list(self.event_buffer.get("user_session", []))
        if events:
            durations = [e.get("duration", 0) for e in events if "duration" in e]
            return statistics.mean(durations) if durations else 0
        return 0
        
    async def _get_feature_usage_stats(self) -> Dict[str, int]:
        """Get feature usage statistics."""
        events = list(self.event_buffer.get("user_feature", []))
        feature_counts = defaultdict(int)
        
        for event in events:
            feature = event.get("feature", "unknown")
            feature_counts[feature] += 1
            
        return dict(feature_counts)
        
    async def _get_avg_response_time(self) -> float:
        """Get average API response time."""
        events = list(self.event_buffer.get("api_call", []))
        if events:
            times = [e.get("response_time", 0) for e in events if "response_time" in e]
            return statistics.mean(times) if times else 0
        return 0
        
    async def _get_error_rate(self) -> float:
        """Get overall error rate."""
        events = list(self.event_buffer.get("api_call", []))
        if events:
            errors = sum(1 for e in events if e.get("status_code", 200) >= 400)
            return errors / len(events)
        return 0
        
    async def _get_uptime_percentage(self) -> float:
        """Get system uptime percentage."""
        # This would be calculated from actual health check data
        return 99.9
        
    async def _get_peak_concurrent_users(self) -> int:
        """Get peak concurrent users."""
        cached = await self.cache.get("users:peak_concurrent")
        return int(cached) if cached else 0


# Global analytics instance
analytics = RealTimeAnalytics()