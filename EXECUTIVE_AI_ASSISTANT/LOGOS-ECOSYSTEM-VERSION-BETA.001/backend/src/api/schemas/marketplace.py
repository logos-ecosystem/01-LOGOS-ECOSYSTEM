from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from enum import Enum


class ItemType(str, Enum):
    AI_MODEL = "ai_model"
    PROMPT = "prompt"
    DATASET = "dataset"
    SERVICE = "service"
    TEMPLATE = "template"
    TOOL = "tool"


class ItemStatus(str, Enum):
    ACTIVE = "active"
    PENDING = "pending"
    SOLD = "sold"
    REMOVED = "removed"


class ItemCategory(str, Enum):
    AI_AGENTS = "ai_agents"
    PROMPTS = "prompts"
    DATASETS = "datasets"
    APIS = "apis"
    TEMPLATES = "templates"
    AUTOMATION = "automation"
    ANALYTICS = "analytics"
    OTHER = "other"


class MarketplaceItemCreate(BaseModel):
    """Schema for creating a marketplace item."""
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10, max_length=5000)
    category: ItemCategory
    item_type: ItemType
    price: float = Field(..., ge=0, le=1000000)
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    is_negotiable: bool = Field(default=False)
    tags: List[str] = Field(default=[], max_items=10)
    metadata: Dict[str, Any] = Field(default={})
    thumbnail_url: Optional[str] = Field(None, max_length=500)
    media_urls: List[str] = Field(default=[], max_items=10)
    
    @field_validator("price")
    @classmethod
    def validate_price(cls, v):
        if v < 0:
            raise ValueError("Price cannot be negative")
        return round(v, 2)
    
    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v):
        return [tag.lower().strip() for tag in v if tag.strip()]


class MarketplaceItemUpdate(BaseModel):
    """Schema for updating a marketplace item."""
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = Field(None, min_length=10, max_length=5000)
    price: Optional[float] = Field(None, ge=0, le=1000000)
    is_negotiable: Optional[bool] = None
    tags: Optional[List[str]] = Field(None, max_items=10)
    metadata: Optional[Dict[str, Any]] = None
    thumbnail_url: Optional[str] = Field(None, max_length=500)
    media_urls: Optional[List[str]] = Field(None, max_items=10)
    status: Optional[ItemStatus] = None


class MarketplaceItemResponse(BaseModel):
    """Schema for marketplace item response."""
    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    description: str
    category: str
    item_type: str
    price: float
    currency: str
    is_negotiable: bool
    tags: List[str]
    metadata: Dict[str, Any]
    thumbnail_url: Optional[str]
    media_urls: List[str]
    view_count: int
    purchase_count: int
    rating: float
    review_count: int
    status: str
    created_at: datetime
    updated_at: datetime
    
    # Owner info
    owner_username: Optional[str] = None
    owner_avatar_url: Optional[str] = None
    
    model_config = {
        "from_attributes": True
    }


class MarketplaceItemListResponse(BaseModel):
    """Schema for paginated marketplace items."""
    items: List[MarketplaceItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    recommendations: Optional[List[Dict[str, Any]]] = None


class TransactionCreate(BaseModel):
    """Schema for creating a transaction."""
    item_id: uuid.UUID
    payment_method: str = Field(..., pattern="^(credit_card|paypal|crypto|wallet)$")
    metadata: Optional[Dict[str, Any]] = Field(default={})


class TransactionResponse(BaseModel):
    """Schema for transaction response."""
    id: uuid.UUID
    item_id: uuid.UUID
    buyer_id: uuid.UUID
    seller_id: uuid.UUID
    amount: float
    currency: str
    payment_method: str
    transaction_hash: Optional[str]
    status: str
    metadata: Dict[str, Any]
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class ReviewCreate(BaseModel):
    """Schema for creating a review."""
    rating: float = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=10, max_length=1000)


class ReviewResponse(BaseModel):
    """Schema for review response."""
    id: uuid.UUID
    item_id: uuid.UUID
    user_id: uuid.UUID
    rating: float
    comment: str
    created_at: datetime
    updated_at: datetime
    
    # User info
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    
    model_config = {
        "from_attributes": True
    }


class MarketplaceSearchParams(BaseModel):
    """Schema for marketplace search parameters."""
    query: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[ItemCategory] = None
    item_type: Optional[ItemType] = None
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    tags: Optional[List[str]] = None
    sort_by: Optional[str] = Field(default="created_at", pattern="^(created_at|price|rating|purchase_count)$")
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$")
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)