"""
Comprehensive security headers middleware for API protection
"""

from fastapi import Request
from fastapi.responses import Response
from typing import Callable, Dict, Any, List, Optional
import json

from ...shared.utils.config import get_settings
from ...shared.utils.logger import setup_logger

logger = setup_logger(__name__)
settings = get_settings()


class SecurityHeadersMiddleware:
    """Middleware to add comprehensive security headers to responses"""
    
    def __init__(self, app):
        self.app = app
        self.environment = settings.ENVIRONMENT
        self.report_uri = getattr(settings, 'SECURITY_REPORT_URI', None)
        
    async def __call__(self, request: Request, call_next: Callable) -> Response:
        """Add security headers to response"""
        response = await call_next(request)
        
        # Add security headers
        self._add_security_headers(response, request)
        
        return response
    
    def _add_security_headers(self, response: Response, request: Request):
        """Add all security headers"""
        # Strict-Transport-Security
        if request.url.scheme == "https" or self.environment == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        # Content-Security-Policy
        response.headers["Content-Security-Policy"] = self._generate_csp()
        
        # X-Frame-Options
        response.headers["X-Frame-Options"] = "DENY"
        
        # X-Content-Type-Options
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # X-XSS-Protection (legacy but still useful)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer-Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Feature-Policy / Permissions-Policy
        response.headers["Permissions-Policy"] = self._generate_permissions_policy()
        
        # Cache-Control for security
        if "/api/auth" in str(request.url):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"
        
        # Remove potentially dangerous headers
        headers_to_remove = ["Server", "X-Powered-By", "X-AspNet-Version"]
        for header in headers_to_remove:
            response.headers.pop(header, None)
        
        # Add custom security headers
        response.headers["X-Content-Security-Policy"] = response.headers["Content-Security-Policy"]
        response.headers["X-WebKit-CSP"] = response.headers["Content-Security-Policy"]
    
    def _generate_csp(self) -> str:
        """Generate Content Security Policy based on environment"""
        csp_directives = {
            "default-src": ["'self'"],
            "script-src": ["'self'"],
            "style-src": ["'self'", "'unsafe-inline'"],  # Allow inline styles for UI libraries
            "img-src": ["'self'", "data:", "https:"],
            "font-src": ["'self'", "data:"],
            "connect-src": ["'self'"],
            "media-src": ["'self'"],
            "object-src": ["'none'"],
            "frame-src": ["'none'"],
            "frame-ancestors": ["'none'"],
            "form-action": ["'self'"],
            "base-uri": ["'self'"],
            "manifest-src": ["'self'"],
            "worker-src": ["'self'", "blob:"],
        }
        
        # Environment-specific additions
        if self.environment == "development":
            # Allow webpack dev server in development
            csp_directives["script-src"].extend(["'unsafe-eval'", "localhost:*", "ws://localhost:*"])
            csp_directives["connect-src"].extend(["localhost:*", "ws://localhost:*", "wss://localhost:*"])
            csp_directives["style-src"].append("'unsafe-eval'")
        else:
            # Production CSP
            csp_directives["script-src"].extend([
                "'sha256-...'",  # Add specific script hashes
                "https://cdn.jsdelivr.net",  # For CDN scripts
                "https://www.google-analytics.com",
                "https://www.googletagmanager.com"
            ])
            csp_directives["connect-src"].extend([
                "https://api.stripe.com",
                "https://api.anthropic.com",
                "https://api.openai.com",
                f"wss://{settings.FRONTEND_URL.replace('https://', '')}",
                "https://www.google-analytics.com"
            ])
            csp_directives["img-src"].extend([
                "https://www.google-analytics.com",
                "https://www.googletagmanager.com"
            ])
        
        # Add report URI if configured
        if self.report_uri:
            csp_directives["report-uri"] = [self.report_uri]
            csp_directives["report-to"] = ["csp-endpoint"]
        
        # Build CSP string
        csp_parts = []
        for directive, values in csp_directives.items():
            csp_parts.append(f"{directive} {' '.join(values)}")
        
        return "; ".join(csp_parts)
    
    def _generate_permissions_policy(self) -> str:
        """Generate Permissions Policy (formerly Feature Policy)"""
        policies = {
            "accelerometer": ["()"],
            "autoplay": ["()"],
            "camera": ["()"],
            "display-capture": ["()"],
            "encrypted-media": ["()"],
            "fullscreen": ["(self)"],
            "geolocation": ["()"],
            "gyroscope": ["()"],
            "magnetometer": ["()"],
            "microphone": ["()"],
            "midi": ["()"],
            "payment": ["(self)"],  # Allow payment APIs
            "picture-in-picture": ["()"],
            "publickey-credentials-get": ["(self)"],  # Allow WebAuthn
            "screen-wake-lock": ["()"],
            "sync-xhr": ["()"],
            "usb": ["()"],
            "web-share": ["()"],
            "xr-spatial-tracking": ["()"]
        }
        
        # Build policy string
        policy_parts = []
        for feature, allowlist in policies.items():
            policy_parts.append(f'{feature}={" ".join(allowlist)}')
        
        return ", ".join(policy_parts)


class SecurityReportEndpoint:
    """Handle security violation reports"""
    
    def __init__(self):
        self.reports = []
        self.max_reports = 1000
    
    async def handle_csp_report(self, request: Request) -> Dict[str, Any]:
        """Handle CSP violation reports"""
        try:
            report_data = await request.json()
            
            # Extract relevant information
            csp_report = report_data.get("csp-report", {})
            
            violation = {
                "timestamp": csp_report.get("timestamp", ""),
                "document_uri": csp_report.get("document-uri", ""),
                "referrer": csp_report.get("referrer", ""),
                "violated_directive": csp_report.get("violated-directive", ""),
                "effective_directive": csp_report.get("effective-directive", ""),
                "original_policy": csp_report.get("original-policy", ""),
                "blocked_uri": csp_report.get("blocked-uri", ""),
                "source_file": csp_report.get("source-file", ""),
                "line_number": csp_report.get("line-number", 0),
                "column_number": csp_report.get("column-number", 0)
            }
            
            # Store report
            self.reports.append(violation)
            
            # Limit stored reports
            if len(self.reports) > self.max_reports:
                self.reports = self.reports[-self.max_reports:]
            
            # Log significant violations
            if violation["effective_directive"] in ["script-src", "object-src"]:
                logger.warning(f"CSP violation: {json.dumps(violation)}")
            
            return {"status": "reported"}
            
        except Exception as e:
            logger.error(f"Error processing CSP report: {str(e)}")
            return {"status": "error"}
    
    async def handle_nel_report(self, request: Request) -> Dict[str, Any]:
        """Handle Network Error Logging reports"""
        try:
            report_data = await request.json()
            
            # Process NEL report
            nel_report = {
                "timestamp": report_data.get("age", 0),
                "type": report_data.get("type", ""),
                "url": report_data.get("url", ""),
                "body": report_data.get("body", {})
            }
            
            # Log network errors
            logger.warning(f"Network error: {json.dumps(nel_report)}")
            
            return {"status": "reported"}
            
        except Exception as e:
            logger.error(f"Error processing NEL report: {str(e)}")
            return {"status": "error"}
    
    def get_report_summary(self) -> Dict[str, Any]:
        """Get summary of security reports"""
        if not self.reports:
            return {"total_reports": 0, "violations": {}}
        
        # Aggregate by directive
        violations_by_directive = {}
        for report in self.reports:
            directive = report.get("effective_directive", "unknown")
            violations_by_directive[directive] = violations_by_directive.get(directive, 0) + 1
        
        return {
            "total_reports": len(self.reports),
            "violations_by_directive": violations_by_directive,
            "recent_reports": self.reports[-10:]  # Last 10 reports
        }


# Global report handler
security_report_handler = SecurityReportEndpoint()


# Additional security utilities
def validate_origin(origin: str, allowed_origins: List[str]) -> bool:
    """Validate request origin against allowed list"""
    if not origin:
        return False
    
    # Exact match
    if origin in allowed_origins:
        return True
    
    # Wildcard subdomain match
    for allowed in allowed_origins:
        if allowed.startswith("*."):
            domain = allowed[2:]
            if origin.endswith(domain):
                return True
    
    return False


def generate_nonce() -> str:
    """Generate a nonce for inline scripts"""
    import secrets
    return base64.b64encode(secrets.token_bytes(16)).decode('ascii')


def add_csp_nonce(response: Response, nonce: str):
    """Add nonce to existing CSP header"""
    csp = response.headers.get("Content-Security-Policy", "")
    if "script-src" in csp:
        # Add nonce to script-src
        csp = csp.replace("script-src", f"script-src 'nonce-{nonce}'")
        response.headers["Content-Security-Policy"] = csp