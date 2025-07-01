"""
Upload schemas for API
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field

from src.shared.models.upload import UploadCategory, UploadStatus

class UploadResponse(BaseModel):
    """Upload response schema"""
    id: str
    filename: str
    url: str
    file_size: int
    file_type: str
    category: UploadCategory
    is_public: bool
    metadata: Optional[Dict[str, Any]] = {}
    uploaded_at: datetime
    
    model_config = {
        "from_attributes": True
    }

class UploadListResponse(BaseModel):
    """Upload list response schema"""
    items: List[UploadResponse]
    total: int
    limit: int
    offset: int

class PresignedUrlResponse(BaseModel):
    """Presigned URL response schema"""
    url: str
    expires_in: int  # Seconds until expiration

class UploadStatusResponse(BaseModel):
    """Upload status response schema"""
    id: str
    status: UploadStatus
    error_message: Optional[str] = None
    progress: Optional[float] = None  # 0.0 to 1.0