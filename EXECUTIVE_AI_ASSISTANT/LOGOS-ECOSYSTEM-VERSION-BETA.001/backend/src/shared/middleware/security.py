"""Security middleware for the application."""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import List, Dict, Optional
import re
import hashlib
import hmac
import time
from urllib.parse import urlparse

from ..utils.config import get_settings
from ..utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class SecurityMiddleware(BaseHTTPMiddleware):
    """Comprehensive security middleware."""
    
    def __init__(self, app):
        super().__init__(app)
        self.allowed_hosts = getattr(settings, 'ALLOWED_HOSTS', [])
        self.csrf_exempt_paths = ['/api/v1/auth/token', '/api/docs', '/api/redoc']
        self.security_headers = self._get_security_headers()
    
    async def dispatch(self, request: Request, call_next):
        """Process request with security checks."""
        try:
            # Check host header
            if not self._validate_host(request):
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"detail": "Invalid host header"}
                )
            
            # Check for common attacks
            if self._detect_sql_injection(request):
                logger.warning(f"SQL injection attempt from {request.client.host}")
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"detail": "Invalid request"}
                )
            
            if self._detect_xss(request):
                logger.warning(f"XSS attempt from {request.client.host}")
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"detail": "Invalid request"}
                )
            
            # Process request
            response = await call_next(request)
            
            # Add security headers
            for header, value in self.security_headers.items():
                response.headers[header] = value
            
            return response
            
        except Exception as e:
            logger.error(f"Security middleware error: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal server error"}
            )
    
    def _validate_host(self, request: Request) -> bool:
        """Validate host header to prevent host header injection."""
        if not self.allowed_hosts:
            return True
        
        host = request.headers.get("host", "").split(":")[0]
        return host in self.allowed_hosts or host == "localhost"
    
    def _detect_sql_injection(self, request: Request) -> bool:
        """Detect potential SQL injection attempts."""
        sql_patterns = [
            r"(\b(union|select|insert|update|delete|drop|create)\b.*\b(from|into|where|table)\b)",
            r"(;|'|\"|-{2,}|/\*|\*/)",
            r"(\b(or|and)\b\s*\d+\s*=\s*\d+)",
            r"(\b(exec|execute|xp_)\w+)",
        ]
        
        # Check URL parameters
        params = str(request.url.query)
        for pattern in sql_patterns:
            if re.search(pattern, params, re.IGNORECASE):
                return True
        
        return False
    
    def _detect_xss(self, request: Request) -> bool:
        """Detect potential XSS attacks."""
        xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe",
            r"<object",
            r"<embed",
            r"<svg",
            r"alert\s*\(",
            r"prompt\s*\(",
            r"confirm\s*\("
        ]
        
        # Check URL and query parameters
        url_str = str(request.url)
        for pattern in xss_patterns:
            if re.search(pattern, url_str, re.IGNORECASE):
                return True
        
        return False
    
    def _get_security_headers(self) -> Dict[str, str]:
        """Get security headers."""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": self._get_csp_policy(),
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
        }
    
    def _get_csp_policy(self) -> str:
        """Get Content Security Policy."""
        return (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://api.anthropic.com; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )


class InputSanitizer:
    """Input sanitization utilities."""
    
    @staticmethod
    def sanitize_string(input_str: str, max_length: int = 1000) -> str:
        """Sanitize string input."""
        if not input_str:
            return ""
        
        # Truncate to max length
        input_str = input_str[:max_length]
        
        # Remove null bytes
        input_str = input_str.replace('\x00', '')
        
        # Escape HTML entities
        html_escape_table = {
            "&": "&amp;",
            '"': "&quot;",
            "'": "&#x27;",
            ">": "&gt;",
            "<": "&lt;",
        }
        
        for char, escape in html_escape_table.items():
            input_str = input_str.replace(char, escape)
        
        return input_str
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename to prevent directory traversal."""
        # Remove path separators
        filename = filename.replace("/", "").replace("\\", "")
        
        # Remove special characters
        filename = re.sub(r'[^\w\s.-]', '', filename)
        
        # Limit length
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        if ext:
            filename = f"{name[:100]}.{ext[:10]}"
        else:
            filename = filename[:100]
        
        return filename
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format."""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @staticmethod
    def validate_url(url: str, allowed_schemes: List[str] = None) -> bool:
        """Validate URL format and scheme."""
        allowed_schemes = allowed_schemes or ['http', 'https']
        
        try:
            parsed = urlparse(url)
            return (
                parsed.scheme in allowed_schemes and
                bool(parsed.netloc) and
                not any(char in url for char in ['\n', '\r', '\t'])
            )
        except Exception:
            return False


class EncryptionHelper:
    """Encryption and hashing utilities."""
    
    def __init__(self, secret_key: str = None):
        self.secret_key = (secret_key or settings.SECRET_KEY).encode()
    
    def generate_token(self, data: str, timestamp: bool = True) -> str:
        """Generate a secure token."""
        if timestamp:
            data = f"{data}:{int(time.time())}"
        
        signature = hmac.new(
            self.secret_key,
            data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return f"{data}:{signature}"
    
    def verify_token(self, token: str, max_age: Optional[int] = None) -> Optional[str]:
        """Verify a token and return the data if valid."""
        try:
            parts = token.rsplit(':', 2)
            if len(parts) != 3:
                return None
            
            data, timestamp, signature = parts
            
            # Verify signature
            expected_signature = hmac.new(
                self.secret_key,
                f"{data}:{timestamp}".encode(),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                return None
            
            # Check age if specified
            if max_age:
                token_age = int(time.time()) - int(timestamp)
                if token_age > max_age:
                    return None
            
            return data
            
        except Exception:
            return None
    
    def hash_password(self, password: str, salt: Optional[str] = None) -> str:
        """Hash a password with salt."""
        if not salt:
            salt = hashlib.sha256(str(time.time()).encode()).hexdigest()[:16]
        
        pwd_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode(),
            salt.encode(),
            100000  # iterations
        )
        
        return f"{salt}:{pwd_hash.hex()}"
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify a password against its hash."""
        try:
            salt, hash_hex = password_hash.split(':', 1)
            test_hash = self.hash_password(password, salt)
            return hmac.compare_digest(test_hash, password_hash)
        except Exception:
            return False


class APIKeySecurity:
    """API key management and validation."""
    
    @staticmethod
    def generate_api_key(prefix: str = "sk") -> str:
        """Generate a secure API key."""
        random_bytes = hashlib.sha256(
            f"{time.time()}:{settings.SECRET_KEY}".encode()
        ).digest()
        
        key = hashlib.sha256(random_bytes).hexdigest()
        return f"{prefix}_{key}"
    
    @staticmethod
    def validate_api_key_format(api_key: str) -> bool:
        """Validate API key format."""
        pattern = r'^(sk|pk)_[a-f0-9]{64}$'
        return bool(re.match(pattern, api_key))


# Global instances
input_sanitizer = InputSanitizer()
encryption_helper = EncryptionHelper()
api_key_security = APIKeySecurity()


__all__ = [
    "SecurityMiddleware",
    "input_sanitizer",
    "encryption_helper",
    "api_key_security"
]