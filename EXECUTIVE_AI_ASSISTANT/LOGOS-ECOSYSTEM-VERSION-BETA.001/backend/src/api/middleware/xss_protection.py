"""
XSS (Cross-Site Scripting) protection middleware and utilities
"""

import re
import html
import json
import bleach
from typing import Dict, Any, List, Optional, Union
from fastapi import Request, Response
from fastapi.responses import JSONResponse

from ...shared.utils.logger import setup_logger
from ...shared.utils.config import get_settings

logger = setup_logger(__name__)
settings = get_settings()


class XSSProtectionMiddleware:
    """Middleware for XSS protection through input sanitization and output encoding"""
    
    def __init__(
        self,
        app,
        allowed_tags: Optional[List[str]] = None,
        allowed_attributes: Optional[Dict[str, List[str]]] = None,
        strip_comments: bool = True,
        strip_scripts: bool = True
    ):
        self.app = app
        
        # Default allowed HTML tags for rich text
        self.allowed_tags = allowed_tags or [
            'p', 'br', 'span', 'div', 'a', 'em', 'strong', 'b', 'i', 'u',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'blockquote', 'code', 'pre'
        ]
        
        # Default allowed attributes
        self.allowed_attributes = allowed_attributes or {
            'a': ['href', 'title', 'target'],
            'span': ['class'],
            'div': ['class'],
            'code': ['class']
        }
        
        self.strip_comments = strip_comments
        self.strip_scripts = strip_scripts
        
        # Dangerous patterns to detect
        self.xss_patterns = [
            re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL),
            re.compile(r'javascript:', re.IGNORECASE),
            re.compile(r'on\w+\s*=', re.IGNORECASE),  # Event handlers
            re.compile(r'<iframe[^>]*>', re.IGNORECASE),
            re.compile(r'<object[^>]*>', re.IGNORECASE),
            re.compile(r'<embed[^>]*>', re.IGNORECASE),
            re.compile(r'<link[^>]*>', re.IGNORECASE),
            re.compile(r'<meta[^>]*>', re.IGNORECASE),
            re.compile(r'expression\s*\(', re.IGNORECASE),  # CSS expressions
            re.compile(r'vbscript:', re.IGNORECASE),
            re.compile(r'data:text/html', re.IGNORECASE)
        ]
    
    async def __call__(self, request: Request, call_next):
        """Process request and sanitize potentially dangerous content"""
        # Skip for safe content types
        content_type = request.headers.get("content-type", "")
        
        if content_type.startswith("application/json"):
            # Sanitize JSON body
            try:
                body = await request.body()
                if body:
                    json_data = json.loads(body)
                    sanitized_data = self.sanitize_data(json_data)
                    
                    # Create new request with sanitized body
                    async def receive():
                        return {
                            "type": "http.request",
                            "body": json.dumps(sanitized_data).encode()
                        }
                    
                    request._receive = receive
            except Exception as e:
                logger.error(f"Error sanitizing JSON request: {str(e)}")
        
        # Process request
        response = await call_next(request)
        
        # Add XSS protection headers
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        return response
    
    def sanitize_data(self, data: Any) -> Any:
        """Recursively sanitize data structure"""
        if isinstance(data, str):
            return self.sanitize_string(data)
        elif isinstance(data, dict):
            return {key: self.sanitize_data(value) for key, value in data.items()}
        elif isinstance(data, list):
            return [self.sanitize_data(item) for item in data]
        else:
            return data
    
    def sanitize_string(self, text: str) -> str:
        """Sanitize string to prevent XSS"""
        if not text:
            return text
        
        # Check for dangerous patterns
        for pattern in self.xss_patterns:
            if pattern.search(text):
                logger.warning(f"Potential XSS pattern detected: {pattern.pattern}")
        
        # Use bleach to clean HTML
        cleaned = bleach.clean(
            text,
            tags=self.allowed_tags,
            attributes=self.allowed_attributes,
            strip=True,
            strip_comments=self.strip_comments
        )
        
        return cleaned


class ContentSecurityPolicyGenerator:
    """Generate and manage Content Security Policy for XSS prevention"""
    
    def __init__(self):
        self.directives = {
            "default-src": ["'self'"],
            "script-src": ["'self'"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "img-src": ["'self'", "data:", "https:"],
            "connect-src": ["'self'"],
            "font-src": ["'self'"],
            "object-src": ["'none'"],
            "media-src": ["'self'"],
            "frame-src": ["'none'"],
            "base-uri": ["'self'"],
            "form-action": ["'self'"],
            "frame-ancestors": ["'none'"],
            "upgrade-insecure-requests": []
        }
    
    def add_source(self, directive: str, source: str):
        """Add a source to a directive"""
        if directive in self.directives:
            if source not in self.directives[directive]:
                self.directives[directive].append(source)
    
    def add_nonce(self, directive: str, nonce: str):
        """Add a nonce to a directive"""
        self.add_source(directive, f"'nonce-{nonce}'")
    
    def add_hash(self, directive: str, hash_value: str):
        """Add a hash to a directive"""
        self.add_source(directive, f"'sha256-{hash_value}'")
    
    def generate(self) -> str:
        """Generate CSP header value"""
        policy_parts = []
        
        for directive, sources in self.directives.items():
            if sources:
                policy_parts.append(f"{directive} {' '.join(sources)}")
            else:
                policy_parts.append(directive)
        
        return "; ".join(policy_parts)


# HTML Sanitization utilities
class HTMLSanitizer:
    """Advanced HTML sanitization for user-generated content"""
    
    def __init__(self):
        # Extended safe tags for rich content
        self.safe_tags = {
            'p', 'br', 'span', 'div', 'a', 'em', 'strong', 'b', 'i', 'u',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'img', 'figure', 'figcaption'
        }
        
        # Safe attributes per tag
        self.safe_attributes = {
            'a': {'href', 'title', 'target', 'rel'},
            'img': {'src', 'alt', 'title', 'width', 'height'},
            'span': {'class', 'style'},
            'div': {'class', 'style'},
            'code': {'class'},
            'pre': {'class'},
            'table': {'class'},
            'td': {'colspan', 'rowspan'},
            'th': {'colspan', 'rowspan'}
        }
        
        # URL schemes considered safe
        self.safe_url_schemes = {'http', 'https', 'mailto', 'tel', 'ftp'}
        
        # CSS properties considered safe
        self.safe_css_properties = {
            'color', 'background-color', 'font-size', 'font-weight',
            'text-align', 'text-decoration', 'padding', 'margin',
            'border', 'width', 'height', 'display'
        }
    
    def sanitize(self, html: str, custom_config: Optional[Dict[str, Any]] = None) -> str:
        """Sanitize HTML content with custom configuration"""
        if not html:
            return html
        
        # Merge custom config
        tags = self.safe_tags
        attributes = self.safe_attributes
        
        if custom_config:
            if 'tags' in custom_config:
                tags = tags.union(set(custom_config['tags']))
            if 'attributes' in custom_config:
                for tag, attrs in custom_config['attributes'].items():
                    if tag in attributes:
                        attributes[tag].update(attrs)
                    else:
                        attributes[tag] = set(attrs)
        
        # Clean with bleach
        cleaned = bleach.clean(
            html,
            tags=list(tags),
            attributes=attributes,
            strip=True,
            strip_comments=True
        )
        
        # Additional cleaning for specific attributes
        cleaned = self._sanitize_urls(cleaned)
        cleaned = self._sanitize_styles(cleaned)
        
        return cleaned
    
    def _sanitize_urls(self, html: str) -> str:
        """Ensure all URLs use safe schemes"""
        def url_filter(tag, name, value):
            if name in ['href', 'src']:
                from urllib.parse import urlparse
                parsed = urlparse(value)
                if parsed.scheme and parsed.scheme not in self.safe_url_schemes:
                    return None
            return value
        
        return bleach.clean(
            html,
            tags=list(self.safe_tags),
            attributes=self.safe_attributes,
            strip=True,
            filters=[url_filter]
        )
    
    def _sanitize_styles(self, html: str) -> str:
        """Sanitize inline CSS styles"""
        def style_filter(tag, name, value):
            if name == 'style':
                # Parse and validate CSS properties
                cleaned_styles = []
                for style in value.split(';'):
                    if ':' in style:
                        prop, val = style.split(':', 1)
                        prop = prop.strip().lower()
                        if prop in self.safe_css_properties:
                            cleaned_styles.append(f"{prop}:{val}")
                return '; '.join(cleaned_styles)
            return value
        
        return bleach.clean(
            html,
            tags=list(self.safe_tags),
            attributes=self.safe_attributes,
            strip=True,
            filters=[style_filter]
        )


# JavaScript context escaping
def escape_javascript(text: str) -> str:
    """Escape text for safe inclusion in JavaScript contexts"""
    if not text:
        return text
    
    # Escape special characters
    replacements = {
        '\\': '\\\\',
        '"': '\\"',
        "'": "\\'",
        '\n': '\\n',
        '\r': '\\r',
        '\t': '\\t',
        '<': '\\u003c',
        '>': '\\u003e',
        '/': '\\/',
        '\u2028': '\\u2028',  # Line separator
        '\u2029': '\\u2029'   # Paragraph separator
    }
    
    for char, replacement in replacements.items():
        text = text.replace(char, replacement)
    
    return text


# JSON context escaping
def escape_json(data: Any) -> str:
    """Safely encode data as JSON for HTML contexts"""
    json_str = json.dumps(data)
    
    # Escape for safe HTML embedding
    json_str = json_str.replace('<', '\\u003c')
    json_str = json_str.replace('>', '\\u003e')
    json_str = json_str.replace('&', '\\u0026')
    
    return json_str


# Template context helpers
class TemplateSecurityContext:
    """Security context for template rendering"""
    
    @staticmethod
    def html_escape(text: str) -> str:
        """Escape for HTML context"""
        return html.escape(text)
    
    @staticmethod
    def attr_escape(text: str) -> str:
        """Escape for HTML attribute context"""
        return html.escape(text, quote=True)
    
    @staticmethod
    def js_escape(text: str) -> str:
        """Escape for JavaScript context"""
        return escape_javascript(text)
    
    @staticmethod
    def css_escape(text: str) -> str:
        """Escape for CSS context"""
        # Remove potentially dangerous characters
        return re.sub(r'[<>"\'\(\)]', '', text)
    
    @staticmethod
    def url_escape(url: str) -> str:
        """Escape and validate URLs"""
        from urllib.parse import quote, urlparse
        
        # Parse and validate
        parsed = urlparse(url)
        if parsed.scheme not in ['http', 'https', 'mailto', 'tel', '']:
            return '#'  # Safe fallback
        
        return quote(url, safe=':/?#[]@!$&\'()*+,;=')


# Global instances
html_sanitizer = HTMLSanitizer()
template_security = TemplateSecurityContext()
csp_generator = ContentSecurityPolicyGenerator()

# Validation functions
def validate_and_sanitize_email(email: str) -> Optional[str]:
    """Validate and sanitize email address"""
    import re
    
    # Basic email regex
    email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    if email_pattern.match(email):
        return html.escape(email)
    return None


def validate_and_sanitize_url(url: str) -> Optional[str]:
    """Validate and sanitize URL"""
    from urllib.parse import urlparse
    
    try:
        parsed = urlparse(url)
        if parsed.scheme in ['http', 'https']:
            return html.escape(url)
    except:
        pass
    
    return None