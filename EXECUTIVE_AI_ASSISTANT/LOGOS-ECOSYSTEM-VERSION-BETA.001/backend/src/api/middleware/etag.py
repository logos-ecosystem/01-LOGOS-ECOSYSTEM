"""
ETag Middleware for HTTP Caching
Implements SHA256-based ETag generation with Redis caching
"""

import hashlib
import json
from typing import Optional, Set, Callable, Dict, Any
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.datastructures import MutableHeaders
import redis.asyncio as redis
from datetime import datetime, timedelta
import logging


logger = logging.getLogger(__name__)


class ETagMiddleware(BaseHTTPMiddleware):
    """
    Middleware for handling ETags and conditional requests
    """
    
    def __init__(
        self,
        app,
        redis_client: Optional[redis.Redis] = None,
        cache_ttl: int = 3600,  # 1 hour default
        excluded_paths: Optional[Set[str]] = None,
        weak_etag_paths: Optional[Set[str]] = None,
        include_query_params: bool = True
    ):
        super().__init__(app)
        self.redis_client = redis_client
        self.cache_ttl = cache_ttl
        self.excluded_paths = excluded_paths or {"/health", "/metrics"}
        self.weak_etag_paths = weak_etag_paths or {"/api/feed", "/api/timeline"}
        self.include_query_params = include_query_params
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and handle ETag generation/validation
        """
        # Skip ETag handling for excluded paths
        if request.url.path in self.excluded_paths:
            return await call_next(request)
        
        # Only handle GET and HEAD requests
        if request.method not in ["GET", "HEAD"]:
            return await call_next(request)
        
        # Get the response
        response = await call_next(request)
        
        # Skip if response indicates an error
        if response.status_code >= 400:
            return response
        
        # Skip if ETag already set
        if "etag" in response.headers:
            return response
        
        # Generate cache key
        cache_key = self._generate_cache_key(request)
        
        # Try to get cached ETag if Redis is available
        cached_etag = None
        if self.redis_client:
            try:
                cached_etag = await self.redis_client.get(f"etag:{cache_key}")
                if cached_etag:
                    cached_etag = cached_etag.decode("utf-8")
            except Exception as e:
                logger.warning(f"Failed to get cached ETag: {e}")
        
        # Read response body
        body = b""
        async for chunk in response.body_iterator:
            body += chunk
        
        # Generate ETag from body
        etag = self._generate_etag(body, request.url.path)
        
        # Check if client has matching ETag
        if_none_match = request.headers.get("if-none-match")
        if if_none_match and self._etag_matches(etag, if_none_match):
            # Return 304 Not Modified
            return Response(
                status_code=304,
                headers=self._get_cache_headers(response.headers, etag)
            )
        
        # Cache the ETag if Redis is available and ETag changed
        if self.redis_client and etag != cached_etag:
            try:
                await self.redis_client.setex(
                    f"etag:{cache_key}",
                    self.cache_ttl,
                    etag.encode("utf-8")
                )
            except Exception as e:
                logger.warning(f"Failed to cache ETag: {e}")
        
        # Update response headers
        headers = MutableHeaders(response.headers)
        headers["etag"] = etag
        
        # Add cache control headers if not present
        if "cache-control" not in headers:
            headers["cache-control"] = f"private, max-age={self.cache_ttl}"
        
        # Return response with ETag
        return Response(
            content=body,
            status_code=response.status_code,
            headers=headers,
            media_type=response.media_type
        )
    
    def _generate_cache_key(self, request: Request) -> str:
        """
        Generate a unique cache key for the request
        """
        parts = [request.url.path]
        
        # Include query parameters if configured
        if self.include_query_params and request.url.query:
            # Sort query params for consistent keys
            query_items = sorted(request.query_params.items())
            query_str = "&".join(f"{k}={v}" for k, v in query_items)
            parts.append(query_str)
        
        # Include user ID if authenticated
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            parts.append(f"user:{user_id}")
        
        return ":".join(parts)
    
    def _generate_etag(self, content: bytes, path: str) -> str:
        """
        Generate an ETag from the response content
        """
        # Create SHA256 hash
        hasher = hashlib.sha256()
        hasher.update(content)
        hash_value = hasher.hexdigest()
        
        # Use weak ETag for dynamic content paths
        if path in self.weak_etag_paths:
            return f'W/"{hash_value[:16]}"'
        
        # Strong ETag for static content
        return f'"{hash_value[:32]}"'
    
    def _etag_matches(self, etag: str, if_none_match: str) -> bool:
        """
        Check if ETag matches the If-None-Match header
        """
        # Handle multiple ETags in If-None-Match
        if "," in if_none_match:
            etags = [e.strip() for e in if_none_match.split(",")]
        else:
            etags = [if_none_match.strip()]
        
        # Check for wildcard
        if "*" in etags:
            return True
        
        # Compare ETags
        for client_etag in etags:
            if self._compare_etags(etag, client_etag):
                return True
        
        return False
    
    def _compare_etags(self, etag1: str, etag2: str) -> bool:
        """
        Compare two ETags considering weak comparison
        """
        # Remove quotes for comparison
        etag1 = etag1.strip('"')
        etag2 = etag2.strip('"')
        
        # Handle weak ETags
        weak1 = etag1.startswith("W/")
        weak2 = etag2.startswith("W/")
        
        if weak1:
            etag1 = etag1[2:].strip('"')
        if weak2:
            etag2 = etag2[2:].strip('"')
        
        # Weak comparison if either is weak
        if weak1 or weak2:
            # For weak comparison, only compare the hash part
            return etag1 == etag2
        
        # Strong comparison
        return etag1 == etag2
    
    def _get_cache_headers(self, original_headers: Dict[str, str], etag: str) -> Dict[str, str]:
        """
        Get headers for 304 response
        """
        # Headers that should be included in 304 response
        allowed_headers = {
            "cache-control", "content-location", "date",
            "expires", "vary", "warning"
        }
        
        headers = {}
        for key, value in original_headers.items():
            if key.lower() in allowed_headers:
                headers[key] = value
        
        # Always include ETag
        headers["etag"] = etag
        
        return headers


class ETagCache:
    """
    Helper class for managing ETag cache with Redis
    """
    
    def __init__(self, redis_client: redis.Redis, default_ttl: int = 3600):
        self.redis_client = redis_client
        self.default_ttl = default_ttl
    
    async def get_etag(self, key: str) -> Optional[str]:
        """
        Get cached ETag
        """
        try:
            value = await self.redis_client.get(f"etag:{key}")
            return value.decode("utf-8") if value else None
        except Exception as e:
            logger.error(f"Failed to get ETag from cache: {e}")
            return None
    
    async def set_etag(self, key: str, etag: str, ttl: Optional[int] = None) -> bool:
        """
        Cache an ETag
        """
        try:
            await self.redis_client.setex(
                f"etag:{key}",
                ttl or self.default_ttl,
                etag.encode("utf-8")
            )
            return True
        except Exception as e:
            logger.error(f"Failed to cache ETag: {e}")
            return False
    
    async def invalidate_etag(self, key: str) -> bool:
        """
        Invalidate a cached ETag
        """
        try:
            await self.redis_client.delete(f"etag:{key}")
            return True
        except Exception as e:
            logger.error(f"Failed to invalidate ETag: {e}")
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """
        Invalidate all ETags matching a pattern
        """
        try:
            cursor = 0
            deleted = 0
            
            while True:
                cursor, keys = await self.redis_client.scan(
                    cursor,
                    match=f"etag:{pattern}",
                    count=100
                )
                
                if keys:
                    deleted += await self.redis_client.delete(*keys)
                
                if cursor == 0:
                    break
            
            return deleted
        except Exception as e:
            logger.error(f"Failed to invalidate ETag pattern: {e}")
            return 0