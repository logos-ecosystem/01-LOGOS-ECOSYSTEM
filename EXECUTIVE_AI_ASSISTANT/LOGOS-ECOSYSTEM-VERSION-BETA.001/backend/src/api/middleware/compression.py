"""
Compression Middleware for API Response Optimization
Supports Brotli (primary) and Gzip (fallback) compression
"""

import brotli
import gzip
from typing import Optional, Set, Callable
from fastapi import Request, Response
from fastapi.responses import StreamingResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.datastructures import MutableHeaders
import io


class CompressionMiddleware(BaseHTTPMiddleware):
    """
    Middleware for compressing HTTP responses using Brotli or Gzip
    """
    
    # Content types that should be compressed
    COMPRESSIBLE_TYPES: Set[str] = {
        "application/json",
        "application/javascript",
        "application/xml",
        "text/plain",
        "text/html",
        "text/css",
        "text/javascript",
        "text/xml",
        "application/ld+json",
        "application/manifest+json",
    }
    
    # File extensions that should never be compressed
    SKIP_EXTENSIONS: Set[str] = {
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".ico", ".svg",
        ".mp4", ".webm", ".mp3", ".wav", ".ogg", ".flac",
        ".zip", ".gz", ".br", ".7z", ".tar", ".rar",
        ".pdf", ".doc", ".docx", ".xls", ".xlsx",
        ".woff", ".woff2", ".ttf", ".otf", ".eot"
    }
    
    def __init__(
        self,
        app,
        minimum_size: int = 1024,  # 1KB minimum size
        brotli_quality: int = 4,    # Brotli quality (0-11)
        gzip_level: int = 6,        # Gzip level (1-9)
        excluded_paths: Optional[Set[str]] = None
    ):
        super().__init__(app)
        self.minimum_size = minimum_size
        self.brotli_quality = brotli_quality
        self.gzip_level = gzip_level
        self.excluded_paths = excluded_paths or set()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process the request and compress the response if applicable
        """
        # Skip compression for excluded paths
        if request.url.path in self.excluded_paths:
            return await call_next(request)
        
        # Check if any file extension should be skipped
        for ext in self.SKIP_EXTENSIONS:
            if request.url.path.lower().endswith(ext):
                return await call_next(request)
        
        # Get the response
        response = await call_next(request)
        
        # Check if response should be compressed
        if not self._should_compress(request, response):
            return response
        
        # Get accepted encodings
        accept_encoding = request.headers.get("accept-encoding", "")
        
        # Determine compression method
        if "br" in accept_encoding and brotli:
            return await self._compress_brotli(response)
        elif "gzip" in accept_encoding:
            return await self._compress_gzip(response)
        
        return response
    
    def _should_compress(self, request: Request, response: Response) -> bool:
        """
        Determine if the response should be compressed
        """
        # Don't compress if already encoded
        if "content-encoding" in response.headers:
            return False
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        if not any(ct in content_type for ct in self.COMPRESSIBLE_TYPES):
            return False
        
        # Check content length if available
        content_length = response.headers.get("content-length")
        if content_length and int(content_length) < self.minimum_size:
            return False
        
        # Don't compress streaming responses
        if isinstance(response, StreamingResponse):
            return False
        
        # Check for no-transform cache directive
        cache_control = response.headers.get("cache-control", "")
        if "no-transform" in cache_control:
            return False
        
        return True
    
    async def _compress_brotli(self, response: Response) -> Response:
        """
        Compress response using Brotli
        """
        # Read the response body
        body = b""
        async for chunk in response.body_iterator:
            body += chunk
        
        # Skip if body is too small
        if len(body) < self.minimum_size:
            response.body = body
            return response
        
        # Compress the body
        compressed_body = brotli.compress(body, quality=self.brotli_quality)
        
        # Update headers
        headers = MutableHeaders(response.headers)
        headers["content-encoding"] = "br"
        headers["content-length"] = str(len(compressed_body))
        headers.add_vary_header("Accept-Encoding")
        
        # Return compressed response
        return Response(
            content=compressed_body,
            status_code=response.status_code,
            headers=headers,
            media_type=response.media_type
        )
    
    async def _compress_gzip(self, response: Response) -> Response:
        """
        Compress response using Gzip
        """
        # Read the response body
        body = b""
        async for chunk in response.body_iterator:
            body += chunk
        
        # Skip if body is too small
        if len(body) < self.minimum_size:
            response.body = body
            return response
        
        # Compress the body
        buffer = io.BytesIO()
        with gzip.GzipFile(mode="wb", fileobj=buffer, compresslevel=self.gzip_level) as gz:
            gz.write(body)
        compressed_body = buffer.getvalue()
        
        # Update headers
        headers = MutableHeaders(response.headers)
        headers["content-encoding"] = "gzip"
        headers["content-length"] = str(len(compressed_body))
        headers.add_vary_header("Accept-Encoding")
        
        # Return compressed response
        return Response(
            content=compressed_body,
            status_code=response.status_code,
            headers=headers,
            media_type=response.media_type
        )


def add_vary_header(headers: MutableHeaders, value: str) -> None:
    """
    Add a value to the Vary header
    """
    vary = headers.get("vary", "")
    if vary:
        vary_values = [v.strip() for v in vary.split(",")]
        if value not in vary_values:
            vary_values.append(value)
            headers["vary"] = ", ".join(vary_values)
    else:
        headers["vary"] = value


# Extension method for MutableHeaders
MutableHeaders.add_vary_header = lambda self, value: add_vary_header(self, value)