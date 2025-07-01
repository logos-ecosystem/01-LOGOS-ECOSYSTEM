"""Rate limiting middleware for API protection."""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Dict, Tuple, Optional
import time
import asyncio
from collections import defaultdict
from datetime import datetime, timedelta

from ..utils.config import get_settings
from ..utils.logger import get_logger
from ...infrastructure.cache import cache_manager

logger = get_logger(__name__)
settings = get_settings()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware using token bucket algorithm."""
    
    def __init__(self, app):
        super().__init__(app)
        self.rate_limit_per_minute = settings.RATE_LIMIT_PER_MINUTE
        self.rate_limit_per_hour = settings.RATE_LIMIT_PER_HOUR
        self.cleanup_interval = 300  # 5 minutes
        self._last_cleanup = time.time()
    
    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting."""
        # Skip rate limiting for certain paths
        if self._should_skip_rate_limit(request.url.path):
            return await call_next(request)
        
        # Get client identifier
        client_id = self._get_client_id(request)
        
        # Check rate limits
        try:
            await self._check_rate_limit(client_id)
        except HTTPException as e:
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
                headers=self._get_rate_limit_headers(client_id)
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        for key, value in self._get_rate_limit_headers(client_id).items():
            response.headers[key] = value
        
        return response
    
    def _should_skip_rate_limit(self, path: str) -> bool:
        """Check if path should skip rate limiting."""
        skip_paths = [
            "/api/docs",
            "/api/redoc",
            "/api/openapi.json",
            "/metrics",
            "/health"
        ]
        return any(path.startswith(p) for p in skip_paths)
    
    def _get_client_id(self, request: Request) -> str:
        """Get unique client identifier."""
        # Try to get authenticated user ID
        if hasattr(request.state, "user") and request.state.user:
            return f"user:{request.state.user.id}"
        
        # Try to get API key
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"api:{api_key[:16]}"
        
        # Fall back to IP address
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host
        
        return f"ip:{client_ip}"
    
    async def _check_rate_limit(self, client_id: str) -> None:
        """Check if client has exceeded rate limits."""
        current_time = time.time()
        
        # Check minute limit
        minute_key = f"rate_limit:minute:{client_id}"
        minute_count = await self._get_request_count(minute_key, 60)
        
        if minute_count >= self.rate_limit_per_minute:
            logger.warning(f"Rate limit exceeded for {client_id} (minute limit)")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later."
            )
        
        # Check hour limit
        hour_key = f"rate_limit:hour:{client_id}"
        hour_count = await self._get_request_count(hour_key, 3600)
        
        if hour_count >= self.rate_limit_per_hour:
            logger.warning(f"Rate limit exceeded for {client_id} (hour limit)")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Hourly rate limit exceeded. Please try again later."
            )
        
        # Increment counters
        await self._increment_request_count(minute_key, 60)
        await self._increment_request_count(hour_key, 3600)
    
    async def _get_request_count(self, key: str, ttl: int) -> int:
        """Get current request count for a key."""
        try:
            count = await cache_manager.get(key)
            return int(count) if count else 0
        except Exception as e:
            logger.error(f"Error getting rate limit count: {str(e)}")
            return 0
    
    async def _increment_request_count(self, key: str, ttl: int) -> None:
        """Increment request count for a key."""
        try:
            count = await cache_manager.increment(key)
            if count == 1:
                await cache_manager.expire(key, ttl)
        except Exception as e:
            logger.error(f"Error incrementing rate limit count: {str(e)}")
    
    def _get_rate_limit_headers(self, client_id: str) -> Dict[str, str]:
        """Get rate limit headers for response."""
        # This is simplified - in production, calculate actual remaining counts
        return {
            "X-RateLimit-Limit": str(self.rate_limit_per_minute),
            "X-RateLimit-Remaining": str(max(0, self.rate_limit_per_minute - 1)),
            "X-RateLimit-Reset": str(int(time.time()) + 60)
        }


class AdvancedRateLimiter:
    """Advanced rate limiter with multiple strategies."""
    
    def __init__(self):
        self.strategies = {
            "fixed_window": self._fixed_window_check,
            "sliding_window": self._sliding_window_check,
            "token_bucket": self._token_bucket_check
        }
    
    async def check_rate_limit(
        self,
        client_id: str,
        resource: str,
        limit: int,
        window: int,
        strategy: str = "sliding_window"
    ) -> Tuple[bool, Dict[str, any]]:
        """Check rate limit using specified strategy."""
        if strategy not in self.strategies:
            strategy = "sliding_window"
        
        return await self.strategies[strategy](
            client_id, resource, limit, window
        )
    
    async def _fixed_window_check(
        self,
        client_id: str,
        resource: str,
        limit: int,
        window: int
    ) -> Tuple[bool, Dict[str, any]]:
        """Fixed window rate limiting."""
        key = f"rate:{resource}:{client_id}:{int(time.time() // window)}"
        
        count = await cache_manager.get(key)
        count = int(count) if count else 0
        
        if count >= limit:
            return False, {
                "limit": limit,
                "remaining": 0,
                "reset": int(time.time() // window + 1) * window
            }
        
        await cache_manager.increment(key)
        await cache_manager.expire(key, window)
        
        return True, {
            "limit": limit,
            "remaining": limit - count - 1,
            "reset": int(time.time() // window + 1) * window
        }
    
    async def _sliding_window_check(
        self,
        client_id: str,
        resource: str,
        limit: int,
        window: int
    ) -> Tuple[bool, Dict[str, any]]:
        """Sliding window rate limiting using timestamps."""
        key = f"rate:sliding:{resource}:{client_id}"
        current_time = time.time()
        window_start = current_time - window
        
        # Get all timestamps in the window
        timestamps = await cache_manager.get(key)
        if timestamps:
            timestamps = [float(ts) for ts in timestamps if float(ts) > window_start]
        else:
            timestamps = []
        
        if len(timestamps) >= limit:
            return False, {
                "limit": limit,
                "remaining": 0,
                "reset": int(timestamps[0] + window)
            }
        
        # Add current timestamp
        timestamps.append(current_time)
        await cache_manager.set(key, timestamps, ttl=window)
        
        return True, {
            "limit": limit,
            "remaining": limit - len(timestamps),
            "reset": int(current_time + window)
        }
    
    async def _token_bucket_check(
        self,
        client_id: str,
        resource: str,
        limit: int,
        window: int
    ) -> Tuple[bool, Dict[str, any]]:
        """Token bucket rate limiting."""
        key = f"rate:bucket:{resource}:{client_id}"
        refill_rate = limit / window
        
        # Get bucket state
        bucket_data = await cache_manager.get(key)
        current_time = time.time()
        
        if bucket_data:
            tokens = bucket_data.get("tokens", limit)
            last_refill = bucket_data.get("last_refill", current_time)
        else:
            tokens = limit
            last_refill = current_time
        
        # Refill tokens
        time_passed = current_time - last_refill
        tokens = min(limit, tokens + time_passed * refill_rate)
        
        if tokens < 1:
            return False, {
                "limit": limit,
                "remaining": 0,
                "reset": int(current_time + (1 - tokens) / refill_rate)
            }
        
        # Consume token
        tokens -= 1
        
        # Save bucket state
        await cache_manager.set(
            key,
            {
                "tokens": tokens,
                "last_refill": current_time
            },
            ttl=window * 2
        )
        
        return True, {
            "limit": limit,
            "remaining": int(tokens),
            "reset": int(current_time + window)
        }


# Global rate limiter instance
rate_limiter = AdvancedRateLimiter()


def create_rate_limit_decorator(
    requests: int = 60,
    window: int = 60,
    strategy: str = "sliding_window"
):
    """Create a rate limit decorator for specific endpoints."""
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            client_id = RateLimitMiddleware._get_client_id(None, request)
            resource = f"{request.method}:{request.url.path}"
            
            allowed, info = await rate_limiter.check_rate_limit(
                client_id, resource, requests, window, strategy
            )
            
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded",
                    headers={
                        "X-RateLimit-Limit": str(info["limit"]),
                        "X-RateLimit-Remaining": str(info["remaining"]),
                        "X-RateLimit-Reset": str(info["reset"])
                    }
                )
            
            return await func(request, *args, **kwargs)
        
        return wrapper
    return decorator