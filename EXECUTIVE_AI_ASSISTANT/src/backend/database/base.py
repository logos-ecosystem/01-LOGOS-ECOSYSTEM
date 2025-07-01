from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, String, DateTime, JSON, Text, Boolean, Integer
from datetime import datetime
import os
from typing import Dict, Any

from ..core.config import settings

# Create base class for models
Base = declarative_base()

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///"),
    echo=settings.DEBUG,
)

# Create async session factory
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class ConversationModel(Base):
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True)
    messages = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    meta_data = Column(JSON, nullable=True)


class UserPreferences(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, unique=True, nullable=False)
    language = Column(String, default="en")
    timezone = Column(String, default="UTC")
    preferences = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    action = Column(String, nullable=False)
    user_id = Column(String, nullable=True)
    details = Column(JSON, nullable=True)


async def init_database():
    """Initialize database tables"""
    # Create data directory if it doesn't exist
    os.makedirs("data", exist_ok=True)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Dependency for getting database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_db_status() -> Dict[str, Any]:
    """Check database connectivity and status"""
    try:
        async with AsyncSessionLocal() as session:
            await session.execute("SELECT 1")
        return {"status": "connected", "type": "sqlite"}
    except Exception as e:
        return {"status": "error", "error": str(e)}