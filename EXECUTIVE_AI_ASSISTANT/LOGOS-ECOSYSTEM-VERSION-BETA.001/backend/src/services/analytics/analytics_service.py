"""Core analytics service for tracking and analyzing system metrics."""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from collections import defaultdict
import json
import logging
from dataclasses import dataclass, asdict
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
import redis.asyncio as redis
from prometheus_client import Counter, Histogram, Gauge

from src.infrastructure.database import Base
from src.shared.utils.logger import get_logger
from src.infrastructure.cache.multi_level import MultiLevelCache

logger = get_logger(__name__)


class EventType(Enum):
    """Types of events to track."""
    USER_LOGIN = "user_login"
    USER_SIGNUP = "user_signup"
    USER_LOGOUT = "user_logout"
    
    AI_CHAT_MESSAGE = "ai_chat_message"
    AI_AGENT_CALL = "ai_agent_call"
    AI_MODEL_SWITCH = "ai_model_switch"
    
    MARKETPLACE_VIEW = "marketplace_view"
    MARKETPLACE_PURCHASE = "marketplace_purchase"
    MARKETPLACE_LIST = "marketplace_list"
    
    WALLET_TRANSACTION = "wallet_transaction"
    WALLET_DEPOSIT = "wallet_deposit"
    WALLET_WITHDRAW = "wallet_withdraw"
    
    IOT_DEVICE_CONNECT = "iot_device_connect"
    IOT_DEVICE_COMMAND = "iot_device_command"
    IOT_SCENE_ACTIVATE = "iot_scene_activate"
    
    AUTOMOTIVE_CONNECT = "automotive_connect"
    AUTOMOTIVE_COMMAND = "automotive_command"
    
    ERROR_OCCURRED = "error_occurred"
    PERFORMANCE_METRIC = "performance_metric"


@dataclass
class AnalyticsEvent:
    """Analytics event data structure."""
    event_type: EventType
    user_id: Optional[str]
    session_id: Optional[str]
    timestamp: datetime
    properties: Dict[str, Any]
    metadata: Dict[str, Any]


@dataclass
class MetricData:
    """Metric data structure."""
    name: str
    value: float
    timestamp: datetime
    tags: Dict[str, str]
    unit: str = "count"


class AnalyticsService:
    """Service for tracking analytics and metrics."""
    
    # Prometheus metrics
    event_counter = Counter(
        'analytics_events_total',
        'Total number of analytics events',
        ['event_type', 'status']
    )
    
    api_request_duration = Histogram(
        'api_request_duration_seconds',
        'API request duration',
        ['method', 'endpoint', 'status']
    )
    
    active_users_gauge = Gauge(
        'active_users_total',
        'Number of active users'
    )
    
    revenue_gauge = Gauge(
        'revenue_total',
        'Total revenue',
        ['currency']
    )
    
    def __init__(self, cache: MultiLevelCache, redis_client: redis.Redis):
        self.cache = cache
        self.redis = redis_client
        self.event_queue: asyncio.Queue = asyncio.Queue(maxsize=10000)
        self.metric_queue: asyncio.Queue = asyncio.Queue(maxsize=10000)
        self.batch_size = 100
        self.batch_interval = 5  # seconds
        self._running = False
        self._tasks: List[asyncio.Task] = []
        
    async def start(self):
        """Start the analytics service."""
        self._running = True
        self._tasks = [
            asyncio.create_task(self._process_event_queue()),
            asyncio.create_task(self._process_metric_queue()),
            asyncio.create_task(self._aggregate_metrics()),
            asyncio.create_task(self._cleanup_old_data())
        ]
        logger.info("Analytics service started")
        
    async def stop(self):
        """Stop the analytics service."""
        self._running = False
        
        # Process remaining events
        await self._flush_queues()
        
        # Cancel tasks
        for task in self._tasks:
            task.cancel()
            
        await asyncio.gather(*self._tasks, return_exceptions=True)
        logger.info("Analytics service stopped")
        
    async def track_event(
        self,
        event_type: EventType,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        properties: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Track an analytics event."""
        event = AnalyticsEvent(
            event_type=event_type,
            user_id=user_id,
            session_id=session_id,
            timestamp=datetime.utcnow(),
            properties=properties or {},
            metadata=metadata or {}
        )
        
        try:
            await self.event_queue.put(event)
            self.event_counter.labels(
                event_type=event_type.value,
                status='queued'
            ).inc()
        except asyncio.QueueFull:
            logger.error(f"Event queue full, dropping event: {event_type.value}")
            self.event_counter.labels(
                event_type=event_type.value,
                status='dropped'
            ).inc()
            
    async def track_metric(
        self,
        name: str,
        value: float,
        tags: Optional[Dict[str, str]] = None,
        unit: str = "count"
    ):
        """Track a metric value."""
        metric = MetricData(
            name=name,
            value=value,
            timestamp=datetime.utcnow(),
            tags=tags or {},
            unit=unit
        )
        
        try:
            await self.metric_queue.put(metric)
        except asyncio.QueueFull:
            logger.error(f"Metric queue full, dropping metric: {name}")
            
    async def track_api_request(
        self,
        method: str,
        endpoint: str,
        duration: float,
        status_code: int,
        user_id: Optional[str] = None
    ):
        """Track API request metrics."""
        # Update Prometheus histogram
        self.api_request_duration.labels(
            method=method,
            endpoint=endpoint,
            status=str(status_code)
        ).observe(duration)
        
        # Track as event
        await self.track_event(
            EventType.PERFORMANCE_METRIC,
            user_id=user_id,
            properties={
                "method": method,
                "endpoint": endpoint,
                "duration": duration,
                "status_code": status_code
            }
        )
        
    async def get_user_analytics(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get analytics for a specific user."""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
            
        # Try cache first
        cache_key = f"user_analytics:{user_id}:{start_date.date()}:{end_date.date()}"
        cached = await self.cache.get(cache_key)
        if cached:
            return json.loads(cached)
            
        # Aggregate from Redis
        analytics = await self._aggregate_user_analytics(
            user_id, start_date, end_date
        )
        
        # Cache for 1 hour
        await self.cache.set(cache_key, json.dumps(analytics), ttl=3600)
        
        return analytics
        
    async def get_system_metrics(self) -> Dict[str, Any]:
        """Get current system metrics."""
        metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "active_users": await self._get_active_users_count(),
            "revenue": await self._get_revenue_metrics(),
            "performance": await self._get_performance_metrics(),
            "errors": await self._get_error_metrics()
        }
        
        return metrics
        
    async def get_dashboard_data(
        self,
        timeframe: str = "24h"
    ) -> Dict[str, Any]:
        """Get analytics data for dashboard display."""
        end_time = datetime.utcnow()
        
        timeframe_map = {
            "1h": timedelta(hours=1),
            "24h": timedelta(days=1),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30)
        }
        
        start_time = end_time - timeframe_map.get(timeframe, timedelta(days=1))
        
        return {
            "summary": await self._get_summary_stats(start_time, end_time),
            "charts": await self._get_chart_data(start_time, end_time),
            "top_events": await self._get_top_events(start_time, end_time),
            "real_time": await self._get_realtime_stats()
        }
        
    async def _process_event_queue(self):
        """Process events from the queue in batches."""
        batch = []
        last_flush = datetime.utcnow()
        
        while self._running:
            try:
                # Get event with timeout
                event = await asyncio.wait_for(
                    self.event_queue.get(),
                    timeout=1.0
                )
                batch.append(event)
                
                # Flush if batch is full or interval elapsed
                if len(batch) >= self.batch_size or \
                   (datetime.utcnow() - last_flush).seconds >= self.batch_interval:
                    await self._save_events(batch)
                    batch = []
                    last_flush = datetime.utcnow()
                    
            except asyncio.TimeoutError:
                # Flush any pending events
                if batch:
                    await self._save_events(batch)
                    batch = []
                    last_flush = datetime.utcnow()
                    
    async def _process_metric_queue(self):
        """Process metrics from the queue."""
        batch = []
        last_flush = datetime.utcnow()
        
        while self._running:
            try:
                metric = await asyncio.wait_for(
                    self.metric_queue.get(),
                    timeout=1.0
                )
                batch.append(metric)
                
                if len(batch) >= self.batch_size or \
                   (datetime.utcnow() - last_flush).seconds >= self.batch_interval:
                    await self._save_metrics(batch)
                    batch = []
                    last_flush = datetime.utcnow()
                    
            except asyncio.TimeoutError:
                if batch:
                    await self._save_metrics(batch)
                    batch = []
                    last_flush = datetime.utcnow()
                    
    async def _save_events(self, events: List[AnalyticsEvent]):
        """Save events to storage."""
        if not events:
            return
            
        try:
            # Save to Redis for real-time analytics
            pipeline = self.redis.pipeline()
            
            for event in events:
                event_data = {
                    "type": event.event_type.value,
                    "user_id": event.user_id,
                    "session_id": event.session_id,
                    "timestamp": event.timestamp.isoformat(),
                    "properties": event.properties,
                    "metadata": event.metadata
                }
                
                # Add to sorted set by timestamp
                pipeline.zadd(
                    f"events:{event.event_type.value}",
                    {json.dumps(event_data): event.timestamp.timestamp()}
                )
                
                # Update counters
                pipeline.hincrby(
                    f"event_counts:{event.timestamp.date()}",
                    event.event_type.value,
                    1
                )
                
                # User-specific events
                if event.user_id:
                    pipeline.zadd(
                        f"user_events:{event.user_id}",
                        {json.dumps(event_data): event.timestamp.timestamp()}
                    )
                    
            await pipeline.execute()
            
            # Update Prometheus counters
            for event in events:
                self.event_counter.labels(
                    event_type=event.event_type.value,
                    status='processed'
                ).inc()
                
        except Exception as e:
            logger.error(f"Error saving events: {e}")
            
    async def _save_metrics(self, metrics: List[MetricData]):
        """Save metrics to storage."""
        if not metrics:
            return
            
        try:
            pipeline = self.redis.pipeline()
            
            for metric in metrics:
                # Create time series key
                ts_key = f"metrics:{metric.name}:{metric.timestamp.date()}"
                
                # Add to time series
                pipeline.zadd(
                    ts_key,
                    {f"{metric.value}:{json.dumps(metric.tags)}": metric.timestamp.timestamp()}
                )
                
                # Update aggregates
                pipeline.hincrby(
                    f"metric_sums:{metric.name}:{metric.timestamp.date()}",
                    "count",
                    1
                )
                pipeline.hincrbyfloat(
                    f"metric_sums:{metric.name}:{metric.timestamp.date()}",
                    "sum",
                    metric.value
                )
                
            await pipeline.execute()
            
        except Exception as e:
            logger.error(f"Error saving metrics: {e}")
            
    async def _aggregate_metrics(self):
        """Periodically aggregate metrics."""
        while self._running:
            try:
                await asyncio.sleep(60)  # Run every minute
                
                # Update active users
                active_users = await self._get_active_users_count()
                self.active_users_gauge.set(active_users)
                
                # Update revenue
                revenue = await self._get_revenue_metrics()
                for currency, amount in revenue.items():
                    self.revenue_gauge.labels(currency=currency).set(amount)
                    
            except Exception as e:
                logger.error(f"Error aggregating metrics: {e}")
                
    async def _cleanup_old_data(self):
        """Clean up old analytics data."""
        while self._running:
            try:
                await asyncio.sleep(3600)  # Run hourly
                
                cutoff = datetime.utcnow() - timedelta(days=90)
                cutoff_ts = cutoff.timestamp()
                
                # Clean up old events
                event_types = [e.value for e in EventType]
                for event_type in event_types:
                    await self.redis.zremrangebyscore(
                        f"events:{event_type}",
                        0,
                        cutoff_ts
                    )
                    
            except Exception as e:
                logger.error(f"Error cleaning up old data: {e}")
                
    async def _flush_queues(self):
        """Flush remaining items in queues."""
        events = []
        metrics = []
        
        # Drain event queue
        while not self.event_queue.empty():
            try:
                events.append(self.event_queue.get_nowait())
            except asyncio.QueueEmpty:
                break
                
        # Drain metric queue
        while not self.metric_queue.empty():
            try:
                metrics.append(self.metric_queue.get_nowait())
            except asyncio.QueueEmpty:
                break
                
        # Save remaining data
        if events:
            await self._save_events(events)
        if metrics:
            await self._save_metrics(metrics)
            
    async def _get_active_users_count(self) -> int:
        """Get count of active users in last 24 hours."""
        cutoff = datetime.utcnow() - timedelta(hours=24)
        
        # Get unique users from recent events
        users = set()
        event_types = [EventType.USER_LOGIN, EventType.AI_CHAT_MESSAGE, EventType.MARKETPLACE_VIEW]
        
        for event_type in event_types:
            events = await self.redis.zrangebyscore(
                f"events:{event_type.value}",
                cutoff.timestamp(),
                "+inf"
            )
            
            for event_data in events:
                event = json.loads(event_data)
                if event.get("user_id"):
                    users.add(event["user_id"])
                    
        return len(users)
        
    async def _get_revenue_metrics(self) -> Dict[str, float]:
        """Get revenue metrics by currency."""
        today = datetime.utcnow().date()
        revenue = defaultdict(float)
        
        # Get purchase events
        events = await self.redis.zrangebyscore(
            f"events:{EventType.MARKETPLACE_PURCHASE.value}",
            datetime.combine(today, datetime.min.time()).timestamp(),
            "+inf"
        )
        
        for event_data in events:
            event = json.loads(event_data)
            properties = event.get("properties", {})
            
            currency = properties.get("currency", "USD")
            amount = properties.get("amount", 0)
            revenue[currency] += amount
            
        return dict(revenue)
        
    async def _get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics."""
        metrics = {
            "avg_response_time": 0,
            "p95_response_time": 0,
            "p99_response_time": 0,
            "error_rate": 0
        }
        
        # Calculate from recent performance events
        cutoff = datetime.utcnow() - timedelta(hours=1)
        events = await self.redis.zrangebyscore(
            f"events:{EventType.PERFORMANCE_METRIC.value}",
            cutoff.timestamp(),
            "+inf"
        )
        
        durations = []
        error_count = 0
        
        for event_data in events:
            event = json.loads(event_data)
            properties = event.get("properties", {})
            
            duration = properties.get("duration", 0)
            status_code = properties.get("status_code", 200)
            
            durations.append(duration)
            if status_code >= 400:
                error_count += 1
                
        if durations:
            durations.sort()
            metrics["avg_response_time"] = sum(durations) / len(durations)
            metrics["p95_response_time"] = durations[int(len(durations) * 0.95)]
            metrics["p99_response_time"] = durations[int(len(durations) * 0.99)]
            metrics["error_rate"] = error_count / len(durations)
            
        return metrics
        
    async def _get_error_metrics(self) -> Dict[str, Any]:
        """Get error metrics."""
        cutoff = datetime.utcnow() - timedelta(hours=24)
        
        errors = await self.redis.zrangebyscore(
            f"events:{EventType.ERROR_OCCURRED.value}",
            cutoff.timestamp(),
            "+inf"
        )
        
        error_types = defaultdict(int)
        
        for error_data in errors:
            error = json.loads(error_data)
            error_type = error.get("properties", {}).get("error_type", "unknown")
            error_types[error_type] += 1
            
        return {
            "total_errors": len(errors),
            "error_types": dict(error_types)
        }
        
    async def _aggregate_user_analytics(
        self,
        user_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Aggregate analytics for a specific user."""
        events = await self.redis.zrangebyscore(
            f"user_events:{user_id}",
            start_date.timestamp(),
            end_date.timestamp()
        )
        
        event_counts = defaultdict(int)
        total_ai_messages = 0
        total_purchases = 0
        purchase_amount = 0
        
        for event_data in events:
            event = json.loads(event_data)
            event_type = event["type"]
            event_counts[event_type] += 1
            
            if event_type == EventType.AI_CHAT_MESSAGE.value:
                total_ai_messages += 1
            elif event_type == EventType.MARKETPLACE_PURCHASE.value:
                total_purchases += 1
                purchase_amount += event.get("properties", {}).get("amount", 0)
                
        return {
            "user_id": user_id,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "event_counts": dict(event_counts),
            "ai_usage": {
                "total_messages": total_ai_messages,
                "avg_messages_per_day": total_ai_messages / max((end_date - start_date).days, 1)
            },
            "purchases": {
                "total_count": total_purchases,
                "total_amount": purchase_amount
            }
        }
        
    async def _get_summary_stats(
        self,
        start_time: datetime,
        end_time: datetime
    ) -> Dict[str, Any]:
        """Get summary statistics for a time period."""
        return {
            "total_events": await self._count_events(start_time, end_time),
            "active_users": await self._count_active_users(start_time, end_time),
            "revenue": await self._calculate_revenue(start_time, end_time),
            "ai_usage": await self._calculate_ai_usage(start_time, end_time)
        }
        
    async def _get_chart_data(
        self,
        start_time: datetime,
        end_time: datetime
    ) -> Dict[str, Any]:
        """Get data for charts."""
        return {
            "events_timeline": await self._get_events_timeline(start_time, end_time),
            "user_activity": await self._get_user_activity_chart(start_time, end_time),
            "revenue_chart": await self._get_revenue_chart(start_time, end_time)
        }
        
    async def _get_top_events(
        self,
        start_time: datetime,
        end_time: datetime
    ) -> List[Dict[str, Any]]:
        """Get top events by count."""
        event_counts = defaultdict(int)
        
        for event_type in EventType:
            count = await self.redis.zcount(
                f"events:{event_type.value}",
                start_time.timestamp(),
                end_time.timestamp()
            )
            event_counts[event_type.value] = count
            
        # Sort by count and return top 10
        sorted_events = sorted(
            event_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        return [
            {"event_type": event_type, "count": count}
            for event_type, count in sorted_events
        ]
        
    async def _get_realtime_stats(self) -> Dict[str, Any]:
        """Get real-time statistics."""
        # Get stats for last 5 minutes
        cutoff = datetime.utcnow() - timedelta(minutes=5)
        
        events_count = 0
        for event_type in EventType:
            count = await self.redis.zcount(
                f"events:{event_type.value}",
                cutoff.timestamp(),
                "+inf"
            )
            events_count += count
            
        return {
            "events_per_minute": events_count / 5,
            "queue_sizes": {
                "events": self.event_queue.qsize(),
                "metrics": self.metric_queue.qsize()
            }
        }
        
    # Helper methods for chart data
    async def _count_events(self, start_time: datetime, end_time: datetime) -> int:
        """Count total events in time range."""
        total = 0
        for event_type in EventType:
            count = await self.redis.zcount(
                f"events:{event_type.value}",
                start_time.timestamp(),
                end_time.timestamp()
            )
            total += count
        return total
        
    async def _count_active_users(self, start_time: datetime, end_time: datetime) -> int:
        """Count active users in time range."""
        users = set()
        
        for event_type in [EventType.USER_LOGIN, EventType.AI_CHAT_MESSAGE]:
            events = await self.redis.zrangebyscore(
                f"events:{event_type.value}",
                start_time.timestamp(),
                end_time.timestamp()
            )
            
            for event_data in events:
                event = json.loads(event_data)
                if event.get("user_id"):
                    users.add(event["user_id"])
                    
        return len(users)
        
    async def _calculate_revenue(self, start_time: datetime, end_time: datetime) -> Dict[str, float]:
        """Calculate revenue in time range."""
        revenue = defaultdict(float)
        
        events = await self.redis.zrangebyscore(
            f"events:{EventType.MARKETPLACE_PURCHASE.value}",
            start_time.timestamp(),
            end_time.timestamp()
        )
        
        for event_data in events:
            event = json.loads(event_data)
            properties = event.get("properties", {})
            
            currency = properties.get("currency", "USD")
            amount = properties.get("amount", 0)
            revenue[currency] += amount
            
        return dict(revenue)
        
    async def _calculate_ai_usage(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Calculate AI usage statistics."""
        message_count = await self.redis.zcount(
            f"events:{EventType.AI_CHAT_MESSAGE.value}",
            start_time.timestamp(),
            end_time.timestamp()
        )
        
        agent_calls = await self.redis.zcount(
            f"events:{EventType.AI_AGENT_CALL.value}",
            start_time.timestamp(),
            end_time.timestamp()
        )
        
        return {
            "total_messages": message_count,
            "agent_calls": agent_calls,
            "avg_messages_per_hour": message_count / max((end_time - start_time).total_seconds() / 3600, 1)
        }
        
    async def _get_events_timeline(self, start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
        """Get events timeline data."""
        # Group by hour
        timeline = []
        current = start_time.replace(minute=0, second=0, microsecond=0)
        
        while current < end_time:
            next_hour = current + timedelta(hours=1)
            
            hour_data = {
                "timestamp": current.isoformat(),
                "events": {}
            }
            
            for event_type in EventType:
                count = await self.redis.zcount(
                    f"events:{event_type.value}",
                    current.timestamp(),
                    next_hour.timestamp()
                )
                if count > 0:
                    hour_data["events"][event_type.value] = count
                    
            timeline.append(hour_data)
            current = next_hour
            
        return timeline
        
    async def _get_user_activity_chart(self, start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
        """Get user activity chart data."""
        # Similar to events timeline but focused on user activities
        activity_types = [
            EventType.USER_LOGIN,
            EventType.AI_CHAT_MESSAGE,
            EventType.MARKETPLACE_VIEW,
            EventType.MARKETPLACE_PURCHASE
        ]
        
        timeline = []
        current = start_time.replace(minute=0, second=0, microsecond=0)
        
        while current < end_time:
            next_hour = current + timedelta(hours=1)
            
            hour_data = {
                "timestamp": current.isoformat(),
                "activities": {}
            }
            
            for event_type in activity_types:
                count = await self.redis.zcount(
                    f"events:{event_type.value}",
                    current.timestamp(),
                    next_hour.timestamp()
                )
                if count > 0:
                    hour_data["activities"][event_type.value] = count
                    
            timeline.append(hour_data)
            current = next_hour
            
        return timeline
        
    async def _get_revenue_chart(self, start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
        """Get revenue chart data."""
        timeline = []
        current = start_time.replace(hour=0, minute=0, second=0, microsecond=0)
        
        while current < end_time:
            next_day = current + timedelta(days=1)
            
            revenue = await self._calculate_revenue(current, next_day)
            
            timeline.append({
                "date": current.date().isoformat(),
                "revenue": revenue
            })
            
            current = next_day
            
        return timeline