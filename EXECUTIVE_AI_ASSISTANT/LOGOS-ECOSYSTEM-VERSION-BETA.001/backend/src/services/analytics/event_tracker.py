"""Event tracking service for user behavior and system events."""

import asyncio
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from collections import defaultdict
import json
import uuid
import logging

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert, select, update

from src.shared.utils.logger import get_logger
from src.services.analytics.analytics_service import EventType, AnalyticsEvent

logger = get_logger(__name__)


class EventTracker:
    """Service for tracking and analyzing user events."""
    
    def __init__(self, redis_client: redis.Redis, analytics_service):
        self.redis = redis_client
        self.analytics = analytics_service
        self.event_handlers: Dict[EventType, List[Callable]] = defaultdict(list)
        self.session_timeout = timedelta(minutes=30)
        self._running = False
        self._tasks: List[asyncio.Task] = []
        
    async def start(self):
        """Start event tracking service."""
        self._running = True
        self._tasks = [
            asyncio.create_task(self._process_event_stream()),
            asyncio.create_task(self._cleanup_sessions())
            asyncio.create_task(self._generate_insights())
        ]
        logger.info("Event tracker started")
        
    async def stop(self):
        """Stop event tracking service."""
        self._running = False
        
        for task in self._tasks:
            task.cancel()
            
        await asyncio.gather(*self._tasks, return_exceptions=True)
        logger.info("Event tracker stopped")
        
    def register_handler(self, event_type: EventType, handler: Callable):
        """Register an event handler."""
        self.event_handlers[event_type].append(handler)
        logger.info(f"Registered handler for event type: {event_type.value}")
        
    async def track_user_event(
        self,
        user_id: str,
        event_type: EventType,
        properties: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None
    ):
        """Track a user event."""
        # Get or create session
        if not session_id:
            session_id = await self._get_or_create_session(user_id)
            
        # Update session activity
        await self._update_session_activity(session_id)
        
        # Track event
        await self.analytics.track_event(
            event_type=event_type,
            user_id=user_id,
            session_id=session_id,
            properties=properties or {},
            metadata={
                "timestamp": datetime.utcnow().isoformat(),
                "session_id": session_id
            }
        )
        
        # Trigger event handlers
        await self._trigger_handlers(event_type, user_id, properties)
        
        # Update user profile
        await self._update_user_profile(user_id, event_type, properties)
        
    async def track_page_view(
        self,
        user_id: Optional[str],
        page_path: str,
        page_title: str,
        referrer: Optional[str] = None,
        session_id: Optional[str] = None
    ):
        """Track a page view event."""
        properties = {
            "page_path": page_path,
            "page_title": page_title,
            "referrer": referrer
        }
        
        event_type = EventType.MARKETPLACE_VIEW  # Generic view event
        
        if user_id:
            await self.track_user_event(
                user_id=user_id,
                event_type=event_type,
                properties=properties,
                session_id=session_id
            )
        else:
            # Anonymous tracking
            await self.analytics.track_event(
                event_type=event_type,
                properties=properties
            )
            
    async def track_conversion(
        self,
        user_id: str,
        conversion_type: str,
        value: float,
        currency: str = "USD",
        properties: Optional[Dict[str, Any]] = None
    ):
        """Track a conversion event."""
        conversion_properties = {
            "conversion_type": conversion_type,
            "value": value,
            "currency": currency,
            **(properties or {})
        }
        
        await self.track_user_event(
            user_id=user_id,
            event_type=EventType.MARKETPLACE_PURCHASE,
            properties=conversion_properties
        )
        
        # Update conversion metrics
        await self._update_conversion_metrics(user_id, conversion_type, value)
        
    async def track_error(
        self,
        error_type: str,
        error_message: str,
        stack_trace: Optional[str] = None,
        user_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        """Track an error event."""
        properties = {
            "error_type": error_type,
            "error_message": error_message,
            "stack_trace": stack_trace,
            "context": context or {}
        }
        
        await self.analytics.track_event(
            event_type=EventType.ERROR_OCCURRED,
            user_id=user_id,
            properties=properties
        )
        
        # Alert if critical error
        if error_type in ["CRITICAL", "FATAL"]:
            await self._send_error_alert(error_type, error_message, context)
            
    async def get_user_journey(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """Get user's journey through events."""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=7)
        if not end_date:
            end_date = datetime.utcnow()
            
        # Get events from Redis
        events = await self.redis.zrangebyscore(
            f"user_events:{user_id}",
            start_date.timestamp(),
            end_date.timestamp()
        )
        
        journey = []
        for event_data in events:
            event = json.loads(event_data)
            journey.append({
                "timestamp": event["timestamp"],
                "event_type": event["type"],
                "properties": event.get("properties", {}),
                "session_id": event.get("session_id")
            })
            
        return sorted(journey, key=lambda x: x["timestamp"])
        
    async def get_funnel_analysis(
        self,
        funnel_steps: List[EventType],
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Analyze conversion funnel."""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
            
        funnel_data = {
            "steps": [],
            "total_users": 0,
            "conversion_rate": 0
        }
        
        users_at_step = {}
        
        # Track users through each step
        for i, step in enumerate(funnel_steps):
            step_users = set()
            
            # Get all events for this step
            events = await self.redis.zrangebyscore(
                f"events:{step.value}",
                start_date.timestamp(),
                end_date.timestamp()
            )
            
            for event_data in events:
                event = json.loads(event_data)
                user_id = event.get("user_id")
                
                if user_id:
                    # Check if user completed previous steps
                    if i == 0 or user_id in users_at_step.get(i-1, set()):
                        step_users.add(user_id)
                        
            users_at_step[i] = step_users
            
            # Calculate metrics
            if i == 0:
                funnel_data["total_users"] = len(step_users)
                
            step_data = {
                "step": step.value,
                "users": len(step_users),
                "percentage": (len(step_users) / funnel_data["total_users"] * 100) 
                             if funnel_data["total_users"] > 0 else 0
            }
            
            if i > 0 and len(users_at_step[i-1]) > 0:
                step_data["conversion_from_previous"] = (
                    len(step_users) / len(users_at_step[i-1]) * 100
                )
                
            funnel_data["steps"].append(step_data)
            
        # Overall conversion rate
        if funnel_data["total_users"] > 0 and funnel_steps:
            final_users = len(users_at_step.get(len(funnel_steps)-1, set()))
            funnel_data["conversion_rate"] = (
                final_users / funnel_data["total_users"] * 100
            )
            
        return funnel_data
        
    async def get_cohort_analysis(
        self,
        cohort_type: str = "weekly",
        metric: str = "retention",
        periods: int = 8
    ) -> Dict[str, Any]:
        """Perform cohort analysis."""
        cohort_data = {
            "type": cohort_type,
            "metric": metric,
            "cohorts": []
        }
        
        # Define cohort periods
        if cohort_type == "daily":
            period_delta = timedelta(days=1)
        elif cohort_type == "weekly":
            period_delta = timedelta(weeks=1)
        elif cohort_type == "monthly":
            period_delta = timedelta(days=30)
        else:
            period_delta = timedelta(days=7)
            
        end_date = datetime.utcnow()
        
        for i in range(periods):
            cohort_start = end_date - (period_delta * (i + 1))
            cohort_end = cohort_start + period_delta
            
            # Get users who signed up in this cohort
            signup_events = await self.redis.zrangebyscore(
                f"events:{EventType.USER_SIGNUP.value}",
                cohort_start.timestamp(),
                cohort_end.timestamp()
            )
            
            cohort_users = set()
            for event_data in signup_events:
                event = json.loads(event_data)
                if event.get("user_id"):
                    cohort_users.add(event["user_id"])
                    
            if not cohort_users:
                continue
                
            cohort_info = {
                "period": cohort_start.strftime("%Y-%m-%d"),
                "users": len(cohort_users),
                "retention": []
            }
            
            # Calculate retention for subsequent periods
            for j in range(min(i + 1, 8)):  # Max 8 periods
                period_start = cohort_end + (period_delta * j)
                period_end = period_start + period_delta
                
                # Count active users in this period
                active_users = 0
                for user_id in cohort_users:
                    user_events = await self.redis.zcount(
                        f"user_events:{user_id}",
                        period_start.timestamp(),
                        period_end.timestamp()
                    )
                    if user_events > 0:
                        active_users += 1
                        
                retention_rate = (active_users / len(cohort_users) * 100) if cohort_users else 0
                cohort_info["retention"].append({
                    "period": j,
                    "rate": retention_rate,
                    "users": active_users
                })
                
            cohort_data["cohorts"].append(cohort_info)
            
        return cohort_data
        
    async def get_user_segments(self) -> List[Dict[str, Any]]:
        """Get user segments based on behavior."""
        segments = []
        
        # Define segment criteria
        segment_definitions = [
            {
                "name": "Power Users",
                "criteria": lambda stats: stats["total_events"] > 100 and stats["days_active"] > 20
            },
            {
                "name": "At Risk",
                "criteria": lambda stats: stats["days_since_last_active"] > 14 and stats["total_events"] > 10
            },
            {
                "name": "New Users",
                "criteria": lambda stats: stats["days_since_signup"] < 7
            },
            {
                "name": "High Value",
                "criteria": lambda stats: stats["total_revenue"] > 100
            }
        ]
        
        # Get all users
        users = await self._get_all_users()
        
        for segment_def in segment_definitions:
            segment_users = []
            
            for user_id in users:
                stats = await self._get_user_stats(user_id)
                
                if segment_def["criteria"](stats):
                    segment_users.append(user_id)
                    
            segments.append({
                "name": segment_def["name"],
                "user_count": len(segment_users),
                "percentage": (len(segment_users) / len(users) * 100) if users else 0,
                "users": segment_users[:100]  # Limit for performance
            })
            
        return segments
        
    async def _get_or_create_session(self, user_id: str) -> str:
        """Get or create a session for a user."""
        # Check for existing active session
        session_key = f"user_session:{user_id}"
        session_id = await self.redis.get(session_key)
        
        if session_id:
            return session_id.decode()
            
        # Create new session
        session_id = str(uuid.uuid4())
        await self.redis.setex(
            session_key,
            int(self.session_timeout.total_seconds()),
            session_id
        )
        
        # Track session start
        await self.redis.hset(
            f"session:{session_id}",
            mapping={
                "user_id": user_id,
                "start_time": datetime.utcnow().isoformat(),
                "last_activity": datetime.utcnow().isoformat()
            }
        )
        
        return session_id
        
    async def _update_session_activity(self, session_id: str):
        """Update session last activity time."""
        await self.redis.hset(
            f"session:{session_id}",
            "last_activity",
            datetime.utcnow().isoformat()
        )
        
        # Extend session TTL
        await self.redis.expire(
            f"session:{session_id}",
            int(self.session_timeout.total_seconds())
        )
        
    async def _trigger_handlers(
        self,
        event_type: EventType,
        user_id: str,
        properties: Optional[Dict[str, Any]]
    ):
        """Trigger registered event handlers."""
        handlers = self.event_handlers.get(event_type, [])
        
        for handler in handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(user_id, properties)
                else:
                    handler(user_id, properties)
            except Exception as e:
                logger.error(f"Error in event handler: {e}")
                
    async def _update_user_profile(
        self,
        user_id: str,
        event_type: EventType,
        properties: Optional[Dict[str, Any]]
    ):
        """Update user profile based on events."""
        profile_key = f"user_profile:{user_id}"
        
        # Increment event counter
        await self.redis.hincrby(profile_key, f"event_{event_type.value}", 1)
        await self.redis.hincrby(profile_key, "total_events", 1)
        
        # Update last activity
        await self.redis.hset(
            profile_key,
            "last_activity",
            datetime.utcnow().isoformat()
        )
        
        # Update specific attributes based on event type
        if event_type == EventType.MARKETPLACE_PURCHASE and properties:
            amount = properties.get("value", 0)
            await self.redis.hincrbyfloat(profile_key, "total_spent", amount)
            await self.redis.hincrby(profile_key, "purchase_count", 1)
            
    async def _update_conversion_metrics(
        self,
        user_id: str,
        conversion_type: str,
        value: float
    ):
        """Update conversion metrics."""
        # Daily conversion tracking
        today = datetime.utcnow().date()
        conversion_key = f"conversions:{today}:{conversion_type}"
        
        await self.redis.hincrby(conversion_key, "count", 1)
        await self.redis.hincrbyfloat(conversion_key, "total_value", value)
        
        # Set expiry for 90 days
        await self.redis.expire(conversion_key, 90 * 24 * 3600)
        
    async def _send_error_alert(
        self,
        error_type: str,
        error_message: str,
        context: Optional[Dict[str, Any]]
    ):
        """Send alert for critical errors."""
        alert_data = {
            "type": "error_alert",
            "severity": error_type,
            "message": error_message,
            "context": context,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Publish to alert channel
        await self.redis.publish("alerts:critical", json.dumps(alert_data))
        
    async def _process_event_stream(self):
        """Process real-time event stream."""
        pubsub = self.redis.pubsub()
        await pubsub.subscribe("events:stream")
        
        while self._running:
            try:
                message = await pubsub.get_message(timeout=1.0)
                if message and message["type"] == "message":
                    event_data = json.loads(message["data"])
                    
                    # Process real-time event
                    await self._process_realtime_event(event_data)
                    
            except Exception as e:
                logger.error(f"Error processing event stream: {e}")
                
    async def _process_realtime_event(self, event_data: Dict[str, Any]):
        """Process a real-time event."""
        # Update real-time dashboards
        await self.redis.publish(
            "dashboard:updates",
            json.dumps({
                "type": "event",
                "data": event_data
            })
        )
        
        # Check for anomalies
        if await self._is_anomalous_event(event_data):
            await self._handle_anomaly(event_data)
            
    async def _is_anomalous_event(self, event_data: Dict[str, Any]) -> bool:
        """Check if an event is anomalous."""
        # Simple anomaly detection based on frequency
        event_type = event_data.get("type")
        user_id = event_data.get("user_id")
        
        if not event_type or not user_id:
            return False
            
        # Check event frequency
        recent_count = await self.redis.zcount(
            f"user_events:{user_id}",
            (datetime.utcnow() - timedelta(minutes=5)).timestamp(),
            "+inf"
        )
        
        # Flag if too many events in short time
        return recent_count > 100
        
    async def _handle_anomaly(self, event_data: Dict[str, Any]):
        """Handle anomalous events."""
        logger.warning(f"Anomalous event detected: {event_data}")
        
        # Track anomaly
        await self.analytics.track_event(
            event_type=EventType.ERROR_OCCURRED,
            properties={
                "error_type": "anomaly_detected",
                "event_data": event_data
            }
        )
        
    async def _cleanup_sessions(self):
        """Clean up expired sessions."""
        while self._running:
            try:
                # Run cleanup every hour
                await asyncio.sleep(3600)
                
                # Find expired sessions
                pattern = "session:*"
                cursor = 0
                
                while True:
                    cursor, keys = await self.redis.scan(
                        cursor, match=pattern, count=100
                    )
                    
                    for key in keys:
                        ttl = await self.redis.ttl(key)
                        if ttl == -1:  # No expiry set
                            # Set expiry if session is old
                            session_data = await self.redis.hgetall(key)
                            last_activity = session_data.get(b"last_activity")
                            
                            if last_activity:
                                last_time = datetime.fromisoformat(
                                    last_activity.decode()
                                )
                                if datetime.utcnow() - last_time > self.session_timeout:
                                    await self.redis.delete(key)
                                    
                    if cursor == 0:
                        break
                        
            except Exception as e:
                logger.error(f"Error cleaning up sessions: {e}")
                
    async def _generate_insights(self):
        """Generate periodic insights from events."""
        while self._running:
            try:
                # Run every 6 hours
                await asyncio.sleep(6 * 3600)
                
                insights = await self._analyze_patterns()
                
                # Store insights
                await self.redis.setex(
                    "analytics:insights:latest",
                    86400,  # 24 hour TTL
                    json.dumps(insights)
                )
                
                # Publish insights
                await self.redis.publish(
                    "analytics:insights",
                    json.dumps(insights)
                )
                
            except Exception as e:
                logger.error(f"Error generating insights: {e}")
                
    async def _analyze_patterns(self) -> Dict[str, Any]:
        """Analyze event patterns for insights."""
        insights = {
            "timestamp": datetime.utcnow().isoformat(),
            "patterns": [],
            "recommendations": []
        }
        
        # Analyze user activity patterns
        activity_pattern = await self._analyze_activity_patterns()
        if activity_pattern:
            insights["patterns"].append(activity_pattern)
            
        # Analyze conversion patterns
        conversion_pattern = await self._analyze_conversion_patterns()
        if conversion_pattern:
            insights["patterns"].append(conversion_pattern)
            
        # Generate recommendations
        insights["recommendations"] = await self._generate_recommendations(
            insights["patterns"]
        )
        
        return insights
        
    async def _analyze_activity_patterns(self) -> Optional[Dict[str, Any]]:
        """Analyze user activity patterns."""
        # Get hourly activity for last 7 days
        hourly_activity = defaultdict(int)
        
        for event_type in [EventType.USER_LOGIN, EventType.AI_CHAT_MESSAGE]:
            events = await self.redis.zrangebyscore(
                f"events:{event_type.value}",
                (datetime.utcnow() - timedelta(days=7)).timestamp(),
                "+inf"
            )
            
            for event_data in events:
                event = json.loads(event_data)
                timestamp = datetime.fromisoformat(event["timestamp"])
                hour = timestamp.hour
                hourly_activity[hour] += 1
                
        if not hourly_activity:
            return None
            
        # Find peak hours
        sorted_hours = sorted(
            hourly_activity.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        peak_hours = [hour for hour, _ in sorted_hours[:3]]
        
        return {
            "type": "activity_pattern",
            "peak_hours": peak_hours,
            "hourly_distribution": dict(hourly_activity)
        }
        
    async def _analyze_conversion_patterns(self) -> Optional[Dict[str, Any]]:
        """Analyze conversion patterns."""
        # Get conversion funnel for common path
        funnel = await self.get_funnel_analysis([
            EventType.MARKETPLACE_VIEW,
            EventType.AI_CHAT_MESSAGE,
            EventType.MARKETPLACE_PURCHASE
        ])
        
        if not funnel["steps"]:
            return None
            
        return {
            "type": "conversion_pattern",
            "funnel": funnel,
            "bottlenecks": [
                step for step in funnel["steps"]
                if step.get("conversion_from_previous", 100) < 50
            ]
        }
        
    async def _generate_recommendations(
        self,
        patterns: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Generate recommendations based on patterns."""
        recommendations = []
        
        for pattern in patterns:
            if pattern["type"] == "activity_pattern":
                peak_hours = pattern["peak_hours"]
                recommendations.append({
                    "type": "scheduling",
                    "priority": "medium",
                    "message": f"Schedule important updates during peak hours: {peak_hours}",
                    "data": pattern
                })
                
            elif pattern["type"] == "conversion_pattern":
                bottlenecks = pattern["bottlenecks"]
                if bottlenecks:
                    recommendations.append({
                        "type": "conversion_optimization",
                        "priority": "high",
                        "message": f"Optimize conversion at step: {bottlenecks[0]['step']}",
                        "data": pattern
                    })
                    
        return recommendations
        
    async def _get_all_users(self) -> List[str]:
        """Get all user IDs."""
        users = set()
        
        # Get users from recent events
        for event_type in EventType:
            events = await self.redis.zrangebyscore(
                f"events:{event_type.value}",
                (datetime.utcnow() - timedelta(days=30)).timestamp(),
                "+inf",
                start=0,
                num=1000  # Limit for performance
            )
            
            for event_data in events:
                event = json.loads(event_data)
                if event.get("user_id"):
                    users.add(event["user_id"])
                    
        return list(users)
        
    async def _get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get statistics for a user."""
        profile = await self.redis.hgetall(f"user_profile:{user_id}")
        
        stats = {
            "user_id": user_id,
            "total_events": int(profile.get(b"total_events", 0)),
            "total_revenue": float(profile.get(b"total_spent", 0)),
            "days_active": 0,
            "days_since_last_active": 0,
            "days_since_signup": 0
        }
        
        # Calculate activity metrics
        if b"last_activity" in profile:
            last_activity = datetime.fromisoformat(
                profile[b"last_activity"].decode()
            )
            stats["days_since_last_active"] = (
                datetime.utcnow() - last_activity
            ).days
            
        # Get signup date from first event
        first_event = await self.redis.zrange(
            f"user_events:{user_id}",
            0, 0,
            withscores=True
        )
        
        if first_event:
            signup_timestamp = first_event[0][1]
            signup_date = datetime.fromtimestamp(signup_timestamp)
            stats["days_since_signup"] = (datetime.utcnow() - signup_date).days
            
        # Count active days
        active_days = set()
        events = await self.redis.zrange(f"user_events:{user_id}", 0, -1)
        
        for event_data in events:
            event = json.loads(event_data)
            event_date = datetime.fromisoformat(event["timestamp"]).date()
            active_days.add(event_date)
            
        stats["days_active"] = len(active_days)
        
        return stats