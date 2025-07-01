# Route modules initialization

from .auth import router as auth_router
from .users import router as users_router
from .marketplace import router as marketplace_router
from .wallet import router as wallet_router
from .ai import router as ai_router
from .ai_registry import router as ai_registry_router
from .upload import router as upload_router
from .health import router as health_router
from .seo import router as seo_router
# from .seo_enhanced import router as seo_enhanced_router  # Removed - file doesn't exist
from .whitelabel import router as whitelabel_router
from .rag import router as rag_router

__all__ = [
    "auth_router",
    "users_router", 
    "marketplace_router",
    "wallet_router",
    "ai_router",
    "ai_registry_router",
    "upload_router",
    "health_router",
    "seo_router",
    # "seo_enhanced_router",  # Removed - file doesn't exist
    "whitelabel_router",
    "rag_router"
]