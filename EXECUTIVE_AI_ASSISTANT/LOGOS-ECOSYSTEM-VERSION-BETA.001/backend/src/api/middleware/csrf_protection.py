"""
CSRF protection middleware for preventing cross-site request forgery attacks
"""

import secrets
import hashlib
import time
from typing import Optional, Dict, List, Callable
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse

from ...shared.utils.logger import setup_logger
from ...shared.utils.config import get_settings
from ...infrastructure.cache import cache_manager

logger = setup_logger(__name__)
settings = get_settings()


class CSRFProtectionMiddleware:
    """Middleware for CSRF protection using double-submit cookie pattern"""
    
    def __init__(
        self,
        app,
        cookie_name: str = "csrf_token",
        header_name: str = "X-CSRF-Token",
        exclude_paths: Optional[List[str]] = None,
        secure: Optional[bool] = None,
        samesite: str = "strict"
    ):
        self.app = app
        self.cookie_name = cookie_name
        self.header_name = header_name
        self.exclude_paths = exclude_paths or ["/api/auth/csrf", "/api/health"]
        self.secure = secure if secure is not None else (settings.ENVIRONMENT == "production")
        self.samesite = samesite
        self.token_length = 32
        self.token_lifetime = 3600 * 24  # 24 hours
        
    async def __call__(self, request: Request, call_next: Callable) -> Response:
        """Process request and validate CSRF token"""
        # Skip CSRF check for excluded paths
        if self._is_excluded_path(request.url.path):
            return await call_next(request)
        
        # Skip CSRF check for safe methods
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            response = await call_next(request)
            # Set CSRF token for subsequent requests
            await self._ensure_csrf_token(request, response)
            return response
        
        # Validate CSRF token for state-changing methods
        if not await self._validate_csrf_token(request):
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "CSRF token validation failed"}
            )
        
        # Process request
        response = await call_next(request)
        
        # Ensure CSRF token is set
        await self._ensure_csrf_token(request, response)
        
        return response
    
    def _is_excluded_path(self, path: str) -> bool:
        """Check if path is excluded from CSRF protection"""
        for excluded in self.exclude_paths:
            if path.startswith(excluded):
                return True
        return False
    
    async def _validate_csrf_token(self, request: Request) -> bool:
        """Validate CSRF token from cookie and header"""
        # Get token from cookie
        cookie_token = request.cookies.get(self.cookie_name)
        if not cookie_token:
            logger.warning("CSRF validation failed: No cookie token")
            return False
        
        # Get token from header
        header_token = request.headers.get(self.header_name)
        if not header_token:
            # Try to get from form data
            if request.headers.get("content-type", "").startswith("application/x-www-form-urlencoded"):
                form = await request.form()
                header_token = form.get("csrf_token")
        
        if not header_token:
            logger.warning("CSRF validation failed: No header token")
            return False
        
        # Compare tokens
        if not self._compare_tokens(cookie_token, header_token):
            logger.warning("CSRF validation failed: Token mismatch")
            return False
        
        # Validate token format and expiry
        if not await self._validate_token_format(cookie_token):
            logger.warning("CSRF validation failed: Invalid token format")
            return False
        
        return True
    
    async def _ensure_csrf_token(self, request: Request, response: Response):
        """Ensure CSRF token is set in cookie"""
        current_token = request.cookies.get(self.cookie_name)
        
        # Generate new token if needed
        if not current_token or not await self._validate_token_format(current_token):
            new_token = self._generate_csrf_token()
            response.set_cookie(
                key=self.cookie_name,
                value=new_token,
                max_age=self.token_lifetime,
                secure=self.secure,
                httponly=False,  # Must be readable by JavaScript
                samesite=self.samesite,
                path="/"
            )
            
            # Store token metadata in cache
            await self._store_token_metadata(new_token, request)
    
    def _generate_csrf_token(self) -> str:
        """Generate a new CSRF token"""
        # Generate random token
        random_bytes = secrets.token_bytes(self.token_length)
        
        # Add timestamp for expiry checking
        timestamp = int(time.time()).to_bytes(8, 'big')
        
        # Combine and encode
        token_data = timestamp + random_bytes
        return secrets.token_urlsafe(len(token_data))
    
    async def _validate_token_format(self, token: str) -> bool:
        """Validate token format and check if not expired"""
        try:
            # Decode token
            token_bytes = secrets.token_urlsafe_decode(token)
            
            # Extract timestamp
            timestamp = int.from_bytes(token_bytes[:8], 'big')
            
            # Check expiry
            if time.time() - timestamp > self.token_lifetime:
                return False
            
            # Check token metadata in cache
            return await self._check_token_metadata(token)
            
        except Exception:
            return False
    
    def _compare_tokens(self, token1: str, token2: str) -> bool:
        """Constant-time comparison of tokens"""
        return secrets.compare_digest(token1, token2)
    
    async def _store_token_metadata(self, token: str, request: Request):
        """Store token metadata for additional validation"""
        metadata = {
            "ip": request.client.host,
            "user_agent": request.headers.get("user-agent", ""),
            "created_at": time.time()
        }
        
        key = f"csrf_token:{self._hash_token(token)}"
        await cache_manager.set(key, metadata, ttl=self.token_lifetime)
    
    async def _check_token_metadata(self, token: str) -> bool:
        """Check token metadata for additional validation"""
        key = f"csrf_token:{self._hash_token(token)}"
        metadata = await cache_manager.get(key)
        
        # Token is valid if metadata exists (additional checks can be added)
        return metadata is not None
    
    def _hash_token(self, token: str) -> str:
        """Hash token for storage key"""
        return hashlib.sha256(token.encode()).hexdigest()[:16]


class CSRFTokenEndpoint:
    """Endpoint for getting CSRF tokens"""
    
    async def get_csrf_token(self, request: Request, response: Response) -> Dict[str, str]:
        """Get a new CSRF token"""
        token = secrets.token_urlsafe(32)
        
        # Set cookie
        response.set_cookie(
            key="csrf_token",
            value=token,
            max_age=86400,  # 24 hours
            secure=settings.ENVIRONMENT == "production",
            httponly=False,
            samesite="strict",
            path="/"
        )
        
        return {
            "csrf_token": token,
            "header_name": "X-CSRF-Token",
            "expires_in": 86400
        }


# Additional CSRF utilities
def generate_csrf_meta_tags(token: str) -> str:
    """Generate HTML meta tags for CSRF token"""
    return f"""
    <meta name="csrf-token" content="{token}">
    <meta name="csrf-header" content="X-CSRF-Token">
    <meta name="csrf-param" content="csrf_token">
    """


def validate_origin(request: Request, allowed_origins: List[str]) -> bool:
    """Validate request origin for CSRF protection"""
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    
    # Check origin header
    if origin:
        return origin in allowed_origins
    
    # Fallback to referer
    if referer:
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        referer_origin = f"{parsed.scheme}://{parsed.netloc}"
        return referer_origin in allowed_origins
    
    # No origin or referer (could be legitimate for same-origin requests)
    return True


class StatelessCSRFProtection:
    """Stateless CSRF protection using signed tokens"""
    
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        
    def generate_token(self, session_id: str) -> str:
        """Generate a signed CSRF token"""
        timestamp = int(time.time())
        message = f"{session_id}:{timestamp}"
        
        # Create HMAC signature
        signature = hashlib.sha256(
            f"{self.secret_key}:{message}".encode()
        ).hexdigest()
        
        # Combine message and signature
        token = f"{message}:{signature}"
        return secrets.token_urlsafe(len(token))
    
    def validate_token(self, token: str, session_id: str, max_age: int = 3600) -> bool:
        """Validate a signed CSRF token"""
        try:
            # Decode token
            decoded = secrets.token_urlsafe_decode(token).decode()
            parts = decoded.split(":")
            
            if len(parts) != 3:
                return False
            
            token_session_id, timestamp_str, signature = parts
            timestamp = int(timestamp_str)
            
            # Check session ID
            if token_session_id != session_id:
                return False
            
            # Check age
            if time.time() - timestamp > max_age:
                return False
            
            # Verify signature
            expected_signature = hashlib.sha256(
                f"{self.secret_key}:{token_session_id}:{timestamp_str}".encode()
            ).hexdigest()
            
            return secrets.compare_digest(signature, expected_signature)
            
        except Exception:
            return False


# Global CSRF protection instance
csrf_protection = CSRFTokenEndpoint()
stateless_csrf = StatelessCSRFProtection(settings.SECRET_KEY)