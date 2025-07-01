from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import time
import uuid
from typing import Callable

from ...services.monitoring import track_request_metrics, active_connections
from ..utils.logger import get_logger

logger = get_logger(__name__)


class MonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware for request monitoring and metrics collection."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Track active connections
        active_connections.inc()
        
        # Start timing
        start_time = time.time()
        
        # Add request ID to logs
        logger.info(
            f"Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client": request.client.host if request.client else None
            }
        )
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Track metrics
            track_request_metrics(
                method=request.method,
                endpoint=request.url.path,
                status=response.status_code,
                duration=duration
            )
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            # Log completion
            logger.info(
                f"Request completed",
                extra={
                    "request_id": request_id,
                    "status_code": response.status_code,
                    "duration_ms": int(duration * 1000)
                }
            )
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            
            # Track error metrics
            track_request_metrics(
                method=request.method,
                endpoint=request.url.path,
                status=500,
                duration=duration
            )
            
            # Log error
            logger.error(
                f"Request failed",
                extra={
                    "request_id": request_id,
                    "error": str(e),
                    "duration_ms": int(duration * 1000)
                }
            )
            
            raise
            
        finally:
            # Decrement active connections
            active_connections.dec()