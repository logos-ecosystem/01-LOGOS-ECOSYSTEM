from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
import logging
from typing import AsyncGenerator

from ...shared.utils.config import get_settings
from ...shared.utils.logger import setup_logger

logger = setup_logger(__name__)
settings = get_settings()

# Create async engine
# Handle different database URLs
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

# Create engine with appropriate settings
engine_args = {
    "echo": settings.DEBUG,
}

# Configure pooling based on database type
if db_url.startswith("sqlite"):
    # SQLite doesn't support connection pooling
    engine_args["poolclass"] = NullPool
else:
    # PostgreSQL with connection pooling
    engine_args["pool_pre_ping"] = True
    if settings.ENVIRONMENT == "development":
        # Use NullPool in development (no pooling)
        engine_args["poolclass"] = NullPool
    else:
        # Use connection pooling in production
        engine_args["pool_size"] = settings.DATABASE_POOL_SIZE
        engine_args["max_overflow"] = settings.DATABASE_MAX_OVERFLOW

engine = create_async_engine(db_url, **engine_args)

# Create session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for models
Base = declarative_base()


async def init_db():
    """Initialize database and create tables."""
    try:
        async with engine.begin() as conn:
            # Import all models to register them
            from ...shared.models import user, ai, marketplace, wallet
            
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
            
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()