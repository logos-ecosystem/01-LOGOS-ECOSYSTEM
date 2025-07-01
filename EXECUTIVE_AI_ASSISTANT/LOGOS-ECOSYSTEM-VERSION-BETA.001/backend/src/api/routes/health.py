from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any
import psutil
import platform
from datetime import datetime

from ...infrastructure.database import get_db
from ...infrastructure.cache import cache_manager
from ...shared.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/")
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "LOGOS Ecosystem API",
        "version": "1.0.0"
    }


@router.get("/detailed")
async def detailed_health(
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Detailed health check with system metrics."""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {},
        "system": {}
    }
    
    # Database check
    try:
        await db.execute("SELECT 1")
        health_status["checks"]["database"] = {
            "status": "healthy",
            "response_time_ms": 0
        }
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Cache check
    try:
        await cache_manager.get("health_check_test")
        health_status["checks"]["cache"] = {
            "status": "healthy",
            "response_time_ms": 0
        }
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["checks"]["cache"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # System metrics
    health_status["system"] = {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "memory": {
            "total": psutil.virtual_memory().total,
            "available": psutil.virtual_memory().available,
            "percent": psutil.virtual_memory().percent
        },
        "disk": {
            "total": psutil.disk_usage("/").total,
            "free": psutil.disk_usage("/").free,
            "percent": psutil.disk_usage("/").percent
        },
        "platform": {
            "system": platform.system(),
            "release": platform.release(),
            "python_version": platform.python_version()
        }
    }
    
    return health_status


@router.get("/ready")
async def readiness_check(
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Kubernetes readiness probe endpoint."""
    try:
        # Check database
        await db.execute("SELECT 1")
        
        # Check cache
        await cache_manager.get("health_check_ping")
        
        return {"status": "ready"}
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        return {"status": "not ready", "error": str(e)}