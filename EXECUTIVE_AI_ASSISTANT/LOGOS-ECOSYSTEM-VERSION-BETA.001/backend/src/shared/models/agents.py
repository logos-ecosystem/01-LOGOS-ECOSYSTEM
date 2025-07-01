"""Database models for AI Agent marketplace."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
import enum

from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, JSON, Text,
    ForeignKey, Index, UniqueConstraint, CheckConstraint, Enum
)
from sqlalchemy.orm import relationship
from ...shared.utils.database_types import UUID as PGUUID

from ...infrastructure.database import Base
from .base import BaseModel


class AgentStatus(str, enum.Enum):
    """Agent status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEPRECATED = "deprecated"
    BETA = "beta"
    MAINTENANCE = "maintenance"


class AgentCategory(str, enum.Enum):
    """Agent category enumeration."""
    MEDICAL = "medical"
    LEGAL = "legal"
    FINANCIAL = "financial"
    CONSULTING = "consulting"
    SOFTWARE_DEVELOPMENT = "software_development"
    DATA_SCIENCE = "data_science"
    CYBERSECURITY = "cybersecurity"
    DEVOPS = "devops"
    WRITING = "writing"
    DESIGN = "design"
    MUSIC = "music"
    VIDEO = "video"
    TUTORING = "tutoring"
    LANGUAGE_LEARNING = "language_learning"
    SKILL_TRAINING = "skill_training"
    ACADEMIC_RESEARCH = "academic_research"
    MARKETING = "marketing"
    SALES = "sales"
    HR = "human_resources"
    PROJECT_MANAGEMENT = "project_management"
    PHYSICS = "physics"
    CHEMISTRY = "chemistry"
    BIOLOGY = "biology"
    MATHEMATICS = "mathematics"
    FITNESS = "fitness"
    NUTRITION = "nutrition"
    TRAVEL = "travel"
    COOKING = "cooking"
    TRANSLATION = "translation"
    TRANSCRIPTION = "transcription"
    ANALYSIS = "analysis"
    AUTOMATION = "automation"


class PricingModel(str, enum.Enum):
    """Pricing model enumeration."""
    PER_USE = "per_use"
    SUBSCRIPTION = "subscription"
    TIERED = "tiered"
    FREEMIUM = "freemium"
    CUSTOM = "custom"


class AgentModel(Base, BaseModel):
    """AI Agent model."""
    
    __tablename__ = "ai_agents"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(Enum(AgentCategory), nullable=False, index=True)
    author_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Versioning
    version = Column(String(20), nullable=False, default="1.0.0")
    is_latest = Column(Boolean, default=True)
    
    # Pricing
    pricing_model = Column(Enum(PricingModel), nullable=False)
    price_per_use = Column(Float, nullable=True)
    subscription_price_monthly = Column(Float, nullable=True)
    subscription_price_yearly = Column(Float, nullable=True)
    free_tier_uses = Column(Integer, default=0)
    
    # Metadata
    tags = Column(JSON, default=list)
    capabilities = Column(JSON, default=list)
    limitations = Column(JSON, default=list)
    requirements = Column(JSON, default=dict)
    
    # Configuration
    config_schema = Column(JSON, nullable=True)
    default_config = Column(JSON, nullable=True)
    input_schema = Column(JSON, nullable=True)
    output_schema = Column(JSON, nullable=True)
    
    # Performance
    average_execution_time = Column(Float, default=0.0)
    average_tokens_used = Column(Float, default=0.0)
    success_rate = Column(Float, default=0.0)
    
    # Status
    status = Column(Enum(AgentStatus), default=AgentStatus.ACTIVE, index=True)
    is_featured = Column(Boolean, default=False)
    
    # Implementation details
    class_name = Column(String(255), nullable=False)
    module_path = Column(String(500), nullable=False)
    
    # Relationships
    author = relationship("User", back_populates="created_agents")
    versions = relationship("AgentVersion", back_populates="agent", cascade="all, delete-orphan")
    purchases = relationship("AgentPurchase", back_populates="agent", cascade="all, delete-orphan")
    usage_records = relationship("AgentUsage", back_populates="agent", cascade="all, delete-orphan")
    reviews = relationship("AgentReview", back_populates="agent", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("idx_agent_category_status", "category", "status"),
        Index("idx_agent_author_status", "author_id", "status"),
        Index("idx_agent_featured", "is_featured", "status"),
        UniqueConstraint("name", "version", name="uq_agent_name_version"),
    )
    
    def __repr__(self):
        return f"<AgentModel {self.name} v{self.version}>"


class AgentVersion(Base, BaseModel):
    """Agent version tracking."""
    
    __tablename__ = "agent_versions"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True)
    agent_id = Column(PGUUID(as_uuid=True), ForeignKey("ai_agents.id"), nullable=False)
    version = Column(String(20), nullable=False)
    
    # Version metadata
    changelog = Column(Text, nullable=True)
    breaking_changes = Column(Boolean, default=False)
    deprecated_features = Column(JSON, default=list)
    new_features = Column(JSON, default=list)
    bug_fixes = Column(JSON, default=list)
    
    # Configuration changes
    config_schema = Column(JSON, nullable=True)
    migration_script = Column(Text, nullable=True)
    
    # Status
    is_stable = Column(Boolean, default=True)
    is_deprecated = Column(Boolean, default=False)
    deprecation_date = Column(DateTime, nullable=True)
    end_of_life_date = Column(DateTime, nullable=True)
    
    # Relationships
    agent = relationship("AgentModel", back_populates="versions")
    
    # Indexes
    __table_args__ = (
        Index("idx_agent_version", "agent_id", "version"),
        UniqueConstraint("agent_id", "version", name="uq_agent_version"),
    )
    
    def __repr__(self):
        return f"<AgentVersion {self.version}>"


class AgentPurchase(Base, BaseModel):
    """Agent purchase records."""
    
    __tablename__ = "agent_purchases"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True)
    agent_id = Column(PGUUID(as_uuid=True), ForeignKey("ai_agents.id"), nullable=False)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Purchase details
    purchase_type = Column(Enum(PricingModel), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="USD")
    
    # Subscription details
    subscription_start = Column(DateTime, nullable=True)
    subscription_end = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    auto_renew = Column(Boolean, default=True)
    
    # Usage limits
    usage_limit = Column(Integer, nullable=True)
    usage_count = Column(Integer, default=0)
    
    # Transaction details
    transaction_id = Column(String(255), nullable=True)
    payment_method = Column(String(50), nullable=True)
    
    # Relationships
    agent = relationship("AgentModel", back_populates="purchases")
    user = relationship("User", back_populates="agent_purchases")
    
    # Indexes
    __table_args__ = (
        Index("idx_purchase_user_agent", "user_id", "agent_id"),
        Index("idx_purchase_active", "is_active", "subscription_end"),
        CheckConstraint("amount >= 0", name="check_purchase_amount_positive"),
    )
    
    def __repr__(self):
        return f"<AgentPurchase {self.user_id} -> {self.agent_id}>"


class AgentUsage(Base, BaseModel):
    """Agent usage tracking."""
    
    __tablename__ = "agent_usage"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True)
    agent_id = Column(PGUUID(as_uuid=True), ForeignKey("ai_agents.id"), nullable=False)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    
    # Execution details
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    execution_time = Column(Float, nullable=False)
    tokens_used = Column(Integer, default=0)
    
    # Status
    success = Column(Boolean, nullable=False)
    error_message = Column(Text, nullable=True)
    error_type = Column(String(100), nullable=True)
    
    # Billing
    cost = Column(Float, default=0.0)
    billed = Column(Boolean, default=False)
    
    # Context
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Relationships
    agent = relationship("AgentModel", back_populates="usage_records")
    user = relationship("User", back_populates="agent_usage")
    
    # Indexes
    __table_args__ = (
        Index("idx_usage_user_agent", "user_id", "agent_id"),
        Index("idx_usage_session", "session_id"),
        Index("idx_usage_created", "created_at"),
        Index("idx_usage_billed", "billed", "created_at"),
    )
    
    def __repr__(self):
        return f"<AgentUsage {self.session_id}>"


class AgentReview(Base, BaseModel):
    """Agent reviews and ratings."""
    
    __tablename__ = "agent_reviews"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True)
    agent_id = Column(PGUUID(as_uuid=True), ForeignKey("ai_agents.id"), nullable=False)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Review content
    rating = Column(Integer, nullable=False)
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=True)
    
    # Review metadata
    verified_purchase = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    helpful_count = Column(Integer, default=0)
    unhelpful_count = Column(Integer, default=0)
    
    # Moderation
    is_approved = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    moderation_notes = Column(Text, nullable=True)
    
    # Response from agent author
    author_response = Column(Text, nullable=True)
    author_response_date = Column(DateTime, nullable=True)
    
    # Relationships
    agent = relationship("AgentModel", back_populates="reviews")
    user = relationship("User", back_populates="agent_reviews")
    
    # Indexes
    __table_args__ = (
        Index("idx_review_agent_rating", "agent_id", "rating"),
        Index("idx_review_user", "user_id"),
        Index("idx_review_featured", "is_featured", "is_approved"),
        UniqueConstraint("agent_id", "user_id", name="uq_agent_review_user"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="check_review_rating_range"),
    )
    
    def __repr__(self):
        return f"<AgentReview {self.user_id} -> {self.agent_id}: {self.rating}★>"


class AgentAnalytics(Base, BaseModel):
    """Aggregated analytics for agents."""
    
    __tablename__ = "agent_analytics"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True)
    agent_id = Column(PGUUID(as_uuid=True), ForeignKey("ai_agents.id"), unique=True, nullable=False)
    
    # Usage metrics
    total_uses = Column(Integer, default=0)
    successful_uses = Column(Integer, default=0)
    failed_uses = Column(Integer, default=0)
    
    # Performance metrics
    average_execution_time = Column(Float, default=0.0)
    median_execution_time = Column(Float, default=0.0)
    p95_execution_time = Column(Float, default=0.0)
    average_tokens_used = Column(Float, default=0.0)
    
    # Financial metrics
    total_revenue = Column(Float, default=0.0)
    monthly_revenue = Column(Float, default=0.0)
    total_purchases = Column(Integer, default=0)
    active_subscriptions = Column(Integer, default=0)
    
    # User metrics
    unique_users = Column(Integer, default=0)
    returning_users = Column(Integer, default=0)
    average_uses_per_user = Column(Float, default=0.0)
    
    # Review metrics
    total_reviews = Column(Integer, default=0)
    average_rating = Column(Float, default=0.0)
    rating_distribution = Column(JSON, default=dict)
    
    # Trend data
    daily_usage_trend = Column(JSON, default=list)
    weekly_revenue_trend = Column(JSON, default=list)
    
    # Last updated
    last_calculated = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    agent = relationship("AgentModel", backref="analytics", uselist=False)
    
    # Indexes
    __table_args__ = (
        Index("idx_analytics_revenue", "total_revenue"),
        Index("idx_analytics_rating", "average_rating"),
        Index("idx_analytics_uses", "total_uses"),
    )
    
    def __repr__(self):
        return f"<AgentAnalytics {self.agent_id}>"