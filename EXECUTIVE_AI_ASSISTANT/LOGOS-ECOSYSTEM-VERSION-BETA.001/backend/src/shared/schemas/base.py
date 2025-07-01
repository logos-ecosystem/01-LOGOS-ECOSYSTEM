"""Base response models for API responses."""

from typing import Any, Optional, Generic, TypeVar
from pydantic import BaseModel, Field
from datetime import datetime

T = TypeVar('T')


class ResponseModel(BaseModel, Generic[T]):
    """Standard API response model."""
    
    success: bool = Field(default=True, description="Whether the request was successful")
    message: str = Field(default="Success", description="Response message")
    data: Optional[T] = Field(default=None, description="Response data")
    errors: Optional[list[str]] = Field(default=None, description="List of errors if any")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class PaginatedResponse(ResponseModel[T]):
    """Paginated response model."""
    
    page: int = Field(default=1, description="Current page number")
    page_size: int = Field(default=20, description="Items per page")
    total_items: int = Field(default=0, description="Total number of items")
    total_pages: int = Field(default=0, description="Total number of pages")
    
    @property
    def has_next(self) -> bool:
        """Check if there's a next page."""
        return self.page < self.total_pages
    
    @property
    def has_prev(self) -> bool:
        """Check if there's a previous page."""
        return self.page > 1