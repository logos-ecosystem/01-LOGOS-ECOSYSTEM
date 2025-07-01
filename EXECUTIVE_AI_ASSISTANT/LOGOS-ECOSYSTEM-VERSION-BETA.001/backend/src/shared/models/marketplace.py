from sqlalchemy import Column, String, Text, Float, Integer, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from ...shared.utils.database_types import UUID
import uuid

from ...infrastructure.database import Base
from .base import BaseModel


class Category(Base, BaseModel):
    """Marketplace category model."""
    
    __tablename__ = "categories"
    
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text)
    parent_id = Column(UUID, ForeignKey("categories.id"), nullable=True)
    icon = Column(String(50))
    
    # Relationships
    items = relationship("MarketplaceItem", back_populates="category_rel")
    parent = relationship("Category", remote_side="Category.id")


class MarketplaceItem(Base, BaseModel):
    """Marketplace item model."""
    
    __tablename__ = "marketplace_items"
    
    owner_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, index=True)  # Keep for backward compatibility
    category_id = Column(UUID, ForeignKey("categories.id"), nullable=True)
    
    # Pricing
    price = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    is_negotiable = Column(Boolean, default=False, nullable=False)
    
    # Item details
    item_type = Column(String(50), nullable=False)  # 'ai_model', 'prompt', 'dataset', 'service'
    item_metadata = Column(JSON, default={})
    tags = Column(JSON, default=[])
    
    # Media
    thumbnail_url = Column(String(500))
    media_urls = Column(JSON, default=[])
    
    # Upload relationships
    thumbnail_upload_id = Column(UUID, ForeignKey("uploads.id", ondelete="SET NULL"))
    media_upload_ids = Column(JSON, default=[])  # List of upload IDs
    
    # Stats
    view_count = Column(Integer, default=0, nullable=False)
    purchase_count = Column(Integer, default=0, nullable=False)
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0, nullable=False)
    
    # Status
    status = Column(String(20), default="active", nullable=False)  # 'active', 'pending', 'sold', 'removed'
    
    # Relationships
    owner = relationship("User", back_populates="marketplace_items")
    transactions = relationship("Transaction", back_populates="item", cascade="all, delete-orphan")
    category_rel = relationship("Category", back_populates="items")
    
    def __repr__(self):
        return f"<MarketplaceItem {self.title}>"


class Transaction(Base, BaseModel):
    """Transaction model for marketplace purchases."""
    
    __tablename__ = "transactions"
    
    item_id = Column(UUID, ForeignKey("marketplace_items.id"), nullable=False, index=True)
    buyer_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    seller_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    
    # Transaction details
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    payment_method = Column(String(50), nullable=False)
    transaction_hash = Column(String(255), unique=True)
    
    # Status
    status = Column(String(20), default="pending", nullable=False)  # 'pending', 'completed', 'failed', 'refunded'
    
    # Additional data
    transaction_metadata = Column(JSON, default={})
    
    # Relationships
    item = relationship("MarketplaceItem", back_populates="transactions")
    
    def __repr__(self):
        return f"<Transaction {self.id}: {self.amount} {self.currency}>"