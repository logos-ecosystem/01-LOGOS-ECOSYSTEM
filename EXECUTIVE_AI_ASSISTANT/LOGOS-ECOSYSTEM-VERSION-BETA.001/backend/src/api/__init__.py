from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging
from typing import Dict, Any

from ..shared.utils.config import get_settings
from ..shared.utils.logger import setup_logger
from .routes import health, auth, ai, ai_registry, marketplace, users, wallet, upload, whitelabel, roles, rag, seo, llm_health, payment, analytics
from ..infrastructure.database import init_db
from ..infrastructure.cache import init_cache
from ..shared.middleware.monitoring import MonitoringMiddleware
from ..shared.middleware.rate_limit import RateLimitMiddleware
from ..services.monitoring import metrics_endpoint
from .docs import custom_openapi

logger = setup_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown events."""
    logger.info("Starting LOGOS Ecosystem API...")
    
    # Initialize database
    await init_db()
    
    # Initialize cache
    await init_cache()
    
    logger.info("LOGOS Ecosystem API started successfully")
    
    yield
    
    # Cleanup
    logger.info("Shutting down LOGOS Ecosystem API...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="LOGOS Ecosystem API",
        description="AI-Native Ecosystem Platform API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json"
    )
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add compression
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # Add monitoring middleware
    app.add_middleware(MonitoringMiddleware)
    
    # Add rate limiting middleware
    app.add_middleware(RateLimitMiddleware)
    
    # Include routers
    app.include_router(health.router, prefix="/api/v1/health", tags=["health"])
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
    app.include_router(ai.router, prefix="/api/v1/ai", tags=["ai"])
    app.include_router(ai_registry.router, prefix="/api/v1/ai-registry", tags=["ai-registry"])
    app.include_router(marketplace.router, prefix="/api/v1/marketplace", tags=["marketplace"])
    app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
    app.include_router(wallet.router, prefix="/api/v1/wallet", tags=["wallet"])
    app.include_router(upload.router, prefix="/api/v1/uploads", tags=["upload"])
    app.include_router(whitelabel.router, prefix="/api/v1/whitelabel", tags=["whitelabel"])
    app.include_router(roles.router, prefix="/api/v1/roles", tags=["roles"])
    app.include_router(rag.router, prefix="/api/v1/rag", tags=["rag"])
    app.include_router(seo.router, prefix="/api/v1/seo", tags=["seo"])
    app.include_router(llm_health.router, prefix="/api/v1/llm", tags=["llm-health"])
    app.include_router(payment.router, prefix="/api/v1", tags=["payment"])
    app.include_router(analytics.router, prefix="/api/v1", tags=["analytics"])
    
    # Add metrics endpoint
    @app.get("/metrics", include_in_schema=False)
    async def get_metrics():
        return metrics_endpoint()
    
    # Add WebSocket endpoint
    from fastapi import WebSocket
    from ..services.websocket import get_websocket_manager
    
    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        """WebSocket endpoint for real-time communication."""
        manager = get_websocket_manager()
        await manager.handle_connection(websocket)
    
    # Configure custom OpenAPI documentation
    app.openapi = lambda: custom_openapi(app)
    
    return app


app = create_app()