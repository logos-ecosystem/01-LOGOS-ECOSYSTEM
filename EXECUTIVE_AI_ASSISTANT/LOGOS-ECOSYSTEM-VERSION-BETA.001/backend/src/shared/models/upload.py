"""
Upload model for file storage
"""

from enum import Enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship

from ...infrastructure.database import Base
from .base import BaseModel
from ...shared.utils.database_types import UUID

class UploadStatus(str, Enum):
    """Upload status enum"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class UploadCategory(str, Enum):
    """Upload category enum"""
    AVATAR = "avatar"
    PRODUCT = "product"
    DOCUMENT = "document"
    GENERAL = "general"
    THUMBNAIL = "thumbnail"

class Upload(Base, BaseModel):
    """Upload model for file storage"""
    __tablename__ = "uploads"
    
    # Primary fields
    user_id = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # File information
    filename = Column(String, nullable=False)  # Original filename
    unique_filename = Column(String, nullable=False, unique=True)  # System-generated unique name
    file_size = Column(Integer, nullable=False)  # Size in bytes
    file_type = Column(String, nullable=False)  # MIME type
    file_extension = Column(String, nullable=False)
    
    # Storage information
    url = Column(String, nullable=False)  # Public URL or path
    storage_path = Column(String)  # Internal storage path
    
    # Categorization
    category = Column(SQLEnum(UploadCategory), default=UploadCategory.GENERAL)
    
    # Access control
    is_public = Column(Boolean, default=True)
    
    # Metadata
    file_metadata = Column(JSON, default={})  # Additional metadata (dimensions for images, etc.)
    
    # Status tracking
    status = Column(SQLEnum(UploadStatus), default=UploadStatus.PENDING)
    error_message = Column(String)
    
    # Reference counting
    reference_count = Column(Integer, default=0)  # Number of times this upload is referenced
    
    # Timestamps
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
    
    # Relationships
    user = relationship("User", back_populates="uploads", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<Upload {self.id}: {self.filename}>"