from sqlalchemy import Column, DateTime, String, Boolean
from ...shared.utils.database_types import UUID as PGUUID
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declared_attr
import uuid
from datetime import datetime
import os


def get_uuid_column(**kwargs):
    """Get UUID column type based on database backend."""
    db_url = os.getenv('DATABASE_URL', '')
    if 'sqlite' in db_url:
        return Column(String(36), **kwargs)
    else:
        return Column(PGUUID(as_uuid=True), **kwargs)


class BaseModel:
    """Base model with common fields."""
    
    @declared_attr
    def __tablename__(cls):
        """Generate table name from class name."""
        return cls.__name__.lower()
    
    # Use String for UUID in SQLite, PGUUID for PostgreSQL
    @declared_attr
    def id(cls):
        db_url = os.getenv('DATABASE_URL', '')
        if 'sqlite' in db_url:
            return Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
        else:
            return Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }