"""
Advanced rate limiting with multiple strategies and DDoS protection
"""

import asyncio
import time
import ipaddress
from typing import Optional, Dict, List, Tuple, Any
from datetime import datetime, timedelta
from collections import defaultdict
# import aioredis  # Using redis.asyncio instead
from fastapi import Request, HTTPException, status

from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings
from ...infrastructure.cache import cache_manager

logger = get_logger(__name__)
settings = get_settings()


class RateLimitStrategy:
    """Base class for rate limiting strategies"""
    
    async def is_allowed(self, key: str, **kwargs) -> Tuple[bool, Dict[str, Any]]:
        """Check if request is allowed"""
        raise NotImplementedError
    
    async def reset(self, key: str) -> None:
        """Reset rate limit for a key"""
        raise NotImplementedError


class TokenBucketStrategy(RateLimitStrategy):
    """Token bucket algorithm for smooth rate limiting"""
    
    def __init__(
        self,
        capacity: int,
        refill_rate: float,
        refill_period: int = 1
    ):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.refill_period = refill_period
    
    async def is_allowed(self, key: str, tokens: int = 1) -> Tuple[bool, Dict[str, Any]]:
        """Check if request is allowed and consume tokens"""
        now = time.time()
        bucket_key = f"tb:{key}"
        
        # Get current bucket state
        bucket_data = await cache_manager.get(bucket_key)
        
        if bucket_data:
            last_refill = bucket_data.get("last_refill", now)
            current_tokens = bucket_data.get("tokens", self.capacity)
        else:
            last_refill = now
            current_tokens = self.capacity
        
        # Calculate tokens to add
        time_passed = now - last_refill
        tokens_to_add = (time_passed / self.refill_period) * self.refill_rate
        current_tokens = min(self.capacity, current_tokens + tokens_to_add)
        
        # Check if we have enough tokens
        if current_tokens >= tokens:
            current_tokens -= tokens
            allowed = True
        else:
            allowed = False
        
        # Update bucket state
        await cache_manager.set(
            bucket_key,
            {
                "tokens": current_tokens,
                "last_refill": now
            },
            ttl=3600
        )
        
        return allowed, {
            "tokens_remaining": int(current_tokens),
            "capacity": self.capacity,
            "retry_after": int((tokens - current_tokens) / self.refill_rate) if not allowed else 0
        }
    
    async def reset(self, key: str) -> None:
        """Reset token bucket"""
        bucket_key = f"tb:{key}"
        await cache_manager.delete(bucket_key)


class SlidingWindowStrategy(RateLimitStrategy):
    """Sliding window algorithm for precise rate limiting"""
    
    def __init__(self, window_size: int, max_requests: int):
        self.window_size = window_size  # in seconds
        self.max_requests = max_requests
    
    async def is_allowed(self, key: str) -> Tuple[bool, Dict[str, Any]]:
        """Check if request is allowed within sliding window"""
        now = time.time()
        window_key = f"sw:{key}"
        
        # Remove old entries
        cutoff = now - self.window_size
        await cache_manager.redis.zremrangebyscore(window_key, 0, cutoff)
        
        # Count requests in current window
        request_count = await cache_manager.redis.zcard(window_key)
        
        if request_count < self.max_requests:
            # Add current request
            await cache_manager.redis.zadd(window_key, {str(now): now})
            await cache_manager.redis.expire(window_key, self.window_size)
            allowed = True
        else:
            allowed = False
        
        # Get oldest request time for retry calculation
        oldest = await cache_manager.redis.zrange(window_key, 0, 0, withscores=True)
        if oldest and not allowed:
            retry_after = int(oldest[0][1] + self.window_size - now)
        else:
            retry_after = 0
        
        return allowed, {
            "requests_made": request_count + (1 if allowed else 0),
            "max_requests": self.max_requests,
            "window_size": self.window_size,
            "retry_after": retry_after
        }
    
    async def reset(self, key: str) -> None:
        """Reset sliding window"""
        window_key = f"sw:{key}"
        await cache_manager.redis.delete(window_key)


class LeakyBucketStrategy(RateLimitStrategy):
    """Leaky bucket algorithm for request shaping"""
    
    def __init__(self, capacity: int, leak_rate: float):
        self.capacity = capacity
        self.leak_rate = leak_rate  # requests per second
    
    async def is_allowed(self, key: str) -> Tuple[bool, Dict[str, Any]]:
        """Check if request is allowed in leaky bucket"""
        now = time.time()
        bucket_key = f"lb:{key}"
        
        # Get current bucket state
        bucket_data = await cache_manager.get(bucket_key)
        
        if bucket_data:
            last_leak = bucket_data.get("last_leak", now)
            current_level = bucket_data.get("level", 0)
        else:
            last_leak = now
            current_level = 0
        
        # Calculate leaked amount
        time_passed = now - last_leak
        leaked = time_passed * self.leak_rate
        current_level = max(0, current_level - leaked)
        
        # Check if we can add request
        if current_level < self.capacity:
            current_level += 1
            allowed = True
        else:
            allowed = False
        
        # Update bucket state
        await cache_manager.set(
            bucket_key,
            {
                "level": current_level,
                "last_leak": now
            },
            ttl=3600
        )
        
        return allowed, {
            "current_level": current_level,
            "capacity": self.capacity,
            "leak_rate": self.leak_rate,
            "retry_after": int((current_level - self.capacity + 1) / self.leak_rate) if not allowed else 0
        }
    
    async def reset(self, key: str) -> None:
        """Reset leaky bucket"""
        bucket_key = f"lb:{key}"
        await cache_manager.delete(bucket_key)


class AdvancedRateLimiter:
    """Advanced rate limiter with multiple strategies and DDoS protection"""
    
    def __init__(self):
        # Initialize strategies
        self.strategies = {
            "token_bucket": TokenBucketStrategy(
                capacity=100,
                refill_rate=10,
                refill_period=1
            ),
            "sliding_window": SlidingWindowStrategy(
                window_size=60,
                max_requests=60
            ),
            "leaky_bucket": LeakyBucketStrategy(
                capacity=50,
                leak_rate=1
            )
        }
        
        # DDoS protection
        self.blocked_ips = set()
        self.ip_request_counts = defaultdict(lambda: {"count": 0, "first_request": time.time()})
        self.ddos_threshold = 1000  # requests per minute
        self.ddos_window = 60  # seconds
        
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        # Check for proxy headers
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host
    
    async def check_ddos(self, ip: str) -> bool:
        """Check for potential DDoS attack"""
        # Check if IP is already blocked
        if ip in self.blocked_ips:
            return False
        
        now = time.time()
        ip_data = self.ip_request_counts[ip]
        
        # Reset counter if window expired
        if now - ip_data["first_request"] > self.ddos_window:
            ip_data["count"] = 0
            ip_data["first_request"] = now
        
        ip_data["count"] += 1
        
        # Check if threshold exceeded
        if ip_data["count"] > self.ddos_threshold:
            logger.warning(f"DDoS detected from IP: {ip}")
            self.blocked_ips.add(ip)
            
            # Store in Redis for distributed blocking
            await cache_manager.set(
                f"blocked_ip:{ip}",
                True,
                ttl=3600  # Block for 1 hour
            )
            
            return False
        
        return True
    
    async def is_allowed(
        self,
        request: Request,
        key: str,
        strategy: str = "token_bucket",
        **kwargs
    ) -> Tuple[bool, Dict[str, Any]]:
        """Check if request is allowed using specified strategy"""
        client_ip = self._get_client_ip(request)
        
        # Check for DDoS
        if not await self.check_ddos(client_ip):
            return False, {"error": "IP blocked due to excessive requests"}
        
        # Check if IP is blocked (from Redis)
        if await cache_manager.get(f"blocked_ip:{client_ip}"):
            return False, {"error": "IP temporarily blocked"}
        
        # Apply rate limiting strategy
        if strategy not in self.strategies:
            raise ValueError(f"Unknown strategy: {strategy}")
        
        return await self.strategies[strategy].is_allowed(key, **kwargs)
    
    async def reset(self, key: str, strategy: Optional[str] = None) -> None:
        """Reset rate limit for a key"""
        if strategy:
            await self.strategies[strategy].reset(key)
        else:
            # Reset all strategies
            for strat in self.strategies.values():
                await strat.reset(key)
    
    async def unblock_ip(self, ip: str) -> None:
        """Unblock an IP address"""
        self.blocked_ips.discard(ip)
        await cache_manager.delete(f"blocked_ip:{ip}")
        
    async def get_blocked_ips(self) -> List[str]:
        """Get list of blocked IPs"""
        # Get from Redis
        pattern = "blocked_ip:*"
        keys = await cache_manager.redis.keys(pattern)
        
        blocked = []
        for key in keys:
            ip = key.decode().replace("blocked_ip:", "")
            blocked.append(ip)
        
        return blocked
    
    def create_limiter_dependency(
        self,
        strategy: str = "token_bucket",
        key_func: Optional[callable] = None,
        **strategy_kwargs
    ):
        """Create a FastAPI dependency for rate limiting"""
        
        async def limiter(request: Request):
            # Generate key
            if key_func:
                key = await key_func(request)
            else:
                # Default to IP-based limiting
                key = self._get_client_ip(request)
            
            allowed, info = await self.is_allowed(
                request,
                key,
                strategy,
                **strategy_kwargs
            )
            
            if not allowed:
                retry_after = info.get("retry_after", 60)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=info.get("error", "Rate limit exceeded"),
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(info.get("max_requests", "N/A")),
                        "X-RateLimit-Remaining": str(info.get("requests_remaining", 0)),
                        "X-RateLimit-Reset": str(int(time.time() + retry_after))
                    }
                )
            
            # Add rate limit headers to response
            request.state.rate_limit_info = info
        
        return limiter


# Global rate limiter instance
rate_limiter = AdvancedRateLimiter()

# Pre-configured limiters for different endpoints
api_limiter = rate_limiter.create_limiter_dependency(
    strategy="token_bucket",
    capacity=100,
    refill_rate=10
)

auth_limiter = rate_limiter.create_limiter_dependency(
    strategy="sliding_window",
    window_size=300,  # 5 minutes
    max_requests=5  # 5 login attempts per 5 minutes
)

ai_limiter = rate_limiter.create_limiter_dependency(
    strategy="leaky_bucket",
    capacity=20,
    leak_rate=0.5  # 1 request per 2 seconds
)