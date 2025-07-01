"""Database models for AI Model Registry."""

from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Any
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, Text,
    ForeignKey, Index, JSON, DECIMAL, Enum as SQLEnum, UniqueConstraint
)
from sqlalchemy.orm import relationship
from ...shared.utils.database_types import UUID, JSONB, ARRAY
import uuid

from ...infrastructure.database import Base
from .base import BaseModel


class RegisteredModel(Base, BaseModel):
    """AI Model registration in the marketplace."""
    __tablename__ = "ai_model_registrations"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # Basic information
    name = Column(String(200), nullable=False)
    description = Column(Text)
    model_type = Column(String(50), nullable=False, index=True)  # language_model, image_generation, etc.
    provider = Column(String(50), nullable=False, index=True)  # anthropic, openai, google, etc.
    
    # Owner information (for custom models)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_marketplace_model = Column(Boolean, default=False)
    is_custom_model = Column(Boolean, default=False)
    
    # Technical specifications
    capabilities = Column(JSONB, default=list)  # List of capabilities
    context_window = Column(Integer)
    max_output_tokens = Column(Integer)
    supported_languages = Column(JSONB, default=list)
    
    # Pricing information
    pricing = Column(JSONB, nullable=False)  # Detailed pricing structure
    currency = Column(String(3), default="USD")
    
    # Performance metrics
    performance_metrics = Column(JSONB, default=dict)
    average_latency_ms = Column(Float)
    throughput_tokens_per_second = Column(Float)
    
    # Status and visibility
    is_active = Column(Boolean, default=True, index=True)
    is_featured = Column(Boolean, default=False)
    requires_approval = Column(Boolean, default=False)
    approval_status = Column(String(20), default="pending")  # pending, approved, rejected
    
    # Metadata
    tags = Column(ARRAY(String), default=list)
    model_metadata = Column(JSONB, default=dict)
    
    # Usage statistics
    usage_statistics = Column(JSONB, default=dict)
    total_uses = Column(Integer, default=0)
    total_revenue = Column(DECIMAL(12, 2), default=Decimal("0.00"))
    
    # Ratings
    average_rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = relationship("User", back_populates="ai_models")
    versions = relationship("AIModelVersion", back_populates="model", cascade="all, delete-orphan")
    usage_records = relationship("AIModelUsage", back_populates="model")
    reviews = relationship("AIModelReview", back_populates="model", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("idx_ai_models_provider_type", "provider", "model_type"),
        Index("idx_ai_models_active_featured", "is_active", "is_featured"),
        Index("idx_ai_models_owner_active", "owner_id", "is_active"),
    )


class AIModelVersion(Base, BaseModel):
    """Version tracking for AI models."""
    __tablename__ = "ai_model_versions"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    model_id = Column(Integer, ForeignKey("ai_model_registrations.id", ondelete="CASCADE"), nullable=False)
    
    # Version information
    version = Column(String(50), nullable=False)
    version_number = Column(Integer, nullable=False)  # For ordering
    description = Column(Text)
    
    # Model artifacts (for custom models)
    artifact_path = Column(String(500))
    checksum = Column(String(64))  # SHA256
    model_size_mb = Column(Float)
    
    # Configuration
    parameters = Column(JSONB, default=dict)
    training_data = Column(JSONB, default=dict)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_deprecated = Column(Boolean, default=False)
    deprecation_date = Column(DateTime)
    migration_guide = Column(Text)
    
    # Performance updates
    performance_improvements = Column(JSONB, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    model = relationship("RegisteredModel", back_populates="versions")
    metrics = relationship("AIModelMetrics", back_populates="version", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint("model_id", "version", name="uq_model_version"),
        Index("idx_model_versions_active", "model_id", "is_active"),
    )


class AIModelUsage(Base, BaseModel):
    """Track usage of AI models."""
    __tablename__ = "ai_model_usage"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    model_id = Column(String(100), ForeignKey("ai_model_registrations.model_id"), nullable=False)
    session_id = Column(UUID, default=uuid.uuid4)
    
    # Usage details
    usage_type = Column(String(50), nullable=False)  # chat, completion, image_generation, etc.
    
    # Token usage (for language models)
    tokens_used = Column(JSONB, default=dict)  # {"input": 1000, "output": 500}
    
    # Image generation usage
    images_generated = Column(Integer)
    image_size = Column(String(20))  # "1024x1024", etc.
    
    # Audio usage
    audio_minutes = Column(Float)
    
    # Cost tracking
    cost = Column(DECIMAL(10, 6), nullable=False, default=Decimal("0"))
    cost_breakdown = Column(JSONB, default=dict)
    
    # Performance metrics
    latency_ms = Column(Integer)
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    
    # Metadata
    request_metadata = Column(JSONB, default=dict)
    response_metadata = Column(JSONB, default=dict)
    
    # Timestamp
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="ai_model_usage")
    model = relationship("RegisteredModel", back_populates="usage_records")
    
    # Indexes
    __table_args__ = (
        Index("idx_model_usage_user_time", "user_id", "timestamp"),
        Index("idx_model_usage_model_time", "model_id", "timestamp"),
        Index("idx_model_usage_session", "session_id"),
    )


class AIModelReview(Base, BaseModel):
    """Reviews and ratings for AI models."""
    __tablename__ = "ai_model_reviews"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    model_id = Column(String(100), ForeignKey("ai_model_registrations.model_id"), nullable=False)
    
    # Review content
    rating = Column(Integer, nullable=False)  # 1-5 stars
    review_text = Column(Text)
    
    # Performance feedback
    performance_metrics = Column(JSONB, default=dict)  # User-reported metrics
    use_case = Column(String(100))
    
    # Verification
    is_verified_purchase = Column(Boolean, default=True)
    usage_hours = Column(Float, default=0)
    
    # Helpfulness
    helpful_count = Column(Integer, default=0)
    not_helpful_count = Column(Integer, default=0)
    
    # Status
    is_flagged = Column(Boolean, default=False)
    moderation_status = Column(String(20), default="approved")
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="ai_model_reviews")
    model = relationship("RegisteredModel", back_populates="reviews")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint("user_id", "model_id", name="uq_user_model_review"),
        Index("idx_model_reviews_rating", "model_id", "rating"),
    )


class AIModelMetrics(Base, BaseModel):
    """Performance metrics for model versions."""
    __tablename__ = "ai_model_metrics"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key
    version_id = Column(Integer, ForeignKey("ai_model_versions.id", ondelete="CASCADE"), nullable=False)
    
    # Metric information
    metric_name = Column(String(100), nullable=False)
    metric_type = Column(String(50), nullable=False)  # accuracy, latency, throughput, etc.
    value = Column(Float, nullable=False)
    unit = Column(String(20))
    
    # Context
    test_dataset = Column(String(200))
    conditions = Column(JSONB, default=dict)
    
    # Timestamp
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    version = relationship("AIModelVersion", back_populates="metrics")
    
    # Indexes
    __table_args__ = (
        Index("idx_model_metrics_version_name", "version_id", "metric_name"),
    )


class AIModelComparison(Base, BaseModel):
    """Store model comparison results."""
    __tablename__ = "ai_model_comparisons"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    comparison_id = Column(UUID, default=uuid.uuid4, unique=True)
    
    # User who created the comparison
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Models being compared
    model_ids = Column(ARRAY(String), nullable=False)
    
    # Comparison details
    comparison_type = Column(String(50), nullable=False)  # performance, cost, features, etc.
    parameters = Column(JSONB, default=dict)
    results = Column(JSONB, nullable=False)
    
    # Metadata
    title = Column(String(200))
    description = Column(Text)
    is_public = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime)
    
    # Relationships
    user = relationship("User", back_populates="ai_model_comparisons")
    
    # Indexes
    __table_args__ = (
        Index("idx_model_comparisons_user", "user_id"),
        Index("idx_model_comparisons_public", "is_public", "created_at"),
    )