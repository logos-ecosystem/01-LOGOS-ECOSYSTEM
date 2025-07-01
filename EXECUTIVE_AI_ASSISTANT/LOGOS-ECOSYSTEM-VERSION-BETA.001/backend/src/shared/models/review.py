from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from ...shared.utils.database_types import UUID
import uuid

from ...infrastructure.database import Base
from .base import BaseModel


class Review(Base, BaseModel):
    """Review model for marketplace items."""
    
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint('item_id', 'user_id', name='uix_one_review_per_user_per_item'),
    )
    
    item_id = Column(UUID, ForeignKey("marketplace_items.id"), nullable=False, index=True)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    
    # Review content
    rating = Column(Integer, nullable=False)  # 1-5 stars
    title = Column(String(255))
    comment = Column(Text)
    
    # Verification
    verified_purchase = Column(Boolean, default=False, nullable=False)
    
    # Engagement
    helpful_count = Column(Integer, default=0, nullable=False)
    unhelpful_count = Column(Integer, default=0, nullable=False)
    
    # Relationships
    item = relationship("MarketplaceItem", backref="reviews")
    user = relationship("User", backref="reviews")
    
    def __repr__(self):
        return f"<Review {self.user_id} -> {self.item_id}: {self.rating}/5>"


class ReviewVote(Base, BaseModel):
    """Track user votes on review helpfulness."""
    
    __tablename__ = "review_votes"
    __table_args__ = (
        UniqueConstraint('review_id', 'user_id', name='uix_one_vote_per_user_per_review'),
    )
    
    review_id = Column(UUID, ForeignKey("reviews.id"), nullable=False, index=True)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    is_helpful = Column(Boolean, nullable=False)
    
    # Relationships
    review = relationship("Review", backref="votes")
    user = relationship("User", backref="review_votes")
    
    def __repr__(self):
        return f"<ReviewVote {self.user_id} -> {self.review_id}: {'helpful' if self.is_helpful else 'unhelpful'}>"