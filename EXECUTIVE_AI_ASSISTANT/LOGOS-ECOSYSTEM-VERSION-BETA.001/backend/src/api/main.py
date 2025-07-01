import uvicorn
from . import app
from ..shared.utils.config import get_settings

settings = get_settings()

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True,
        workers=settings.WORKERS if not settings.DEBUG else 1
    )