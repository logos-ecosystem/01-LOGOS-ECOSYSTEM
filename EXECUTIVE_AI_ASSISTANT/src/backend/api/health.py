from fastapi import APIRouter, Depends
from datetime import datetime
from typing import Dict, Any

from ..core.config import settings
from ..database.base import get_db_status

router = APIRouter()


@router.get("/")
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.APP_VERSION
    }


@router.get("/status")
async def detailed_status() -> Dict[str, Any]:
    """Detailed system status"""
    db_status = await get_db_status()
    
    return {
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.APP_VERSION,
        "components": {
            "database": db_status,
            "ai_services": {
                "openai": "configured" if settings.OPENAI_API_KEY else "not configured",
                "anthropic": "configured" if settings.ANTHROPIC_API_KEY else "not configured"
            },
            "features": {
                "voice_assistant": settings.ENABLE_VOICE_ASSISTANT,
                "healthcare": settings.ENABLE_HEALTHCARE_MODULE,
                "legal": settings.ENABLE_LEGAL_MODULE,
                "sports": settings.ENABLE_SPORTS_MODULE
            }
        }
    }