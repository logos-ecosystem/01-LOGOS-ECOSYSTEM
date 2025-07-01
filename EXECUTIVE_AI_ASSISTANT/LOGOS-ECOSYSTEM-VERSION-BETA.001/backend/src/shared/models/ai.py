from sqlalchemy import Column, String, Text, Integer, Float, JSON, ForeignKey, DateTime, Boolean, DECIMAL
from sqlalchemy.orm import relationship
from ...shared.utils.database_types import UUID, JSONB, ARRAY
import uuid
from decimal import Decimal

from ...infrastructure.database import Base
from .base import BaseModel


class AISession(Base, BaseModel):
    """AI conversation session model."""
    
    __tablename__ = "ai_sessions"
    
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), default="New Conversation")
    model = Column(String(100), nullable=False, default="claude-3-opus-20240229")
    
    # Session metadata
    total_tokens = Column(Integer, default=0, nullable=False)
    total_messages = Column(Integer, default=0, nullable=False)
    context_window = Column(Integer, default=200000, nullable=False)
    
    # Configuration
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=4096)
    system_prompt = Column(Text)
    
    # Session state
    is_archived = Column(Boolean, default=False, nullable=False)
    last_message_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="ai_sessions")
    messages = relationship("AIMessage", back_populates="session", cascade="all, delete-orphan", order_by="AIMessage.created_at")
    
    def __repr__(self):
        return f"<AISession {self.id}: {self.title}>"


class AIMessage(Base, BaseModel):
    """Individual message in an AI session."""
    
    __tablename__ = "ai_messages"
    
    session_id = Column(UUID, ForeignKey("ai_sessions.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    
    # Token usage
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    
    # Metadata
    model_used = Column(String(100))
    processing_time_ms = Column(Integer)
    message_metadata = Column(JSON, default={})
    
    # Relationships
    session = relationship("AISession", back_populates="messages")
    
    def __repr__(self):
        return f"<AIMessage {self.role}: {self.content[:50]}...>"


class AIPromptTemplate(Base, BaseModel):
    """Reusable prompt templates."""
    
    __tablename__ = "ai_prompt_templates"
    
    name = Column(String(100), unique=True, nullable=False)
    category = Column(String(50), nullable=False)
    description = Column(Text)
    template = Column(Text, nullable=False)
    
    # Template variables
    variables = Column(JSON, default=[])  # List of variable names
    example_values = Column(JSON, default={})
    
    # Usage tracking
    usage_count = Column(Integer, default=0, nullable=False)
    rating = Column(Float, default=0.0)
    
    # Visibility
    is_public = Column(Boolean, default=True, nullable=False)
    created_by_id = Column(UUID, ForeignKey("users.id"))
    
    def __repr__(self):
        return f"<AIPromptTemplate {self.name}>"


class AIModel(Base, BaseModel):
    """Available AI models and their configurations - enhanced for marketplace."""
    
    __tablename__ = "ai_models"
    
    model_id = Column(String(100), unique=True, nullable=False)
    provider = Column(String(50), nullable=False)  # 'anthropic', 'openai', etc.
    name = Column(String(100), nullable=False)
    description = Column(Text)
    model_type = Column(String(50), nullable=False)  # language_model, image_generation, etc.
    
    # Model capabilities
    max_tokens = Column(Integer, nullable=False)
    context_window = Column(Integer, nullable=False)
    max_output_tokens = Column(Integer)
    supports_vision = Column(Boolean, default=False)
    supports_tools = Column(Boolean, default=False)
    capabilities = Column(JSONB, default=list)  # List of capabilities
    
    # Pricing - enhanced for marketplace
    input_token_price = Column(DECIMAL(10, 6), nullable=False)  # Price per 1K tokens
    output_token_price = Column(DECIMAL(10, 6), nullable=False)
    pricing = Column(JSONB, default=dict)  # Detailed pricing structure
    
    # Performance metrics
    performance_metrics = Column(JSONB, default=dict)
    average_latency_ms = Column(Float)
    throughput_tokens_per_second = Column(Float)
    
    # Configuration
    default_temperature = Column(Float, default=0.7)
    default_max_tokens = Column(Integer, default=4096)
    
    # Marketplace features
    is_marketplace_model = Column(Boolean, default=False)
    is_custom_model = Column(Boolean, default=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    tags = Column(ARRAY(String), default=list)
    
    # Usage statistics
    usage_statistics = Column(JSONB, default=dict)
    average_rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    
    # Availability
    is_available = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    requires_premium = Column(Boolean, default=False, nullable=False)
    requires_approval = Column(Boolean, default=False)
    
    def __repr__(self):
        return f"<AIModel {self.model_id}>: {self.name}"


class ModelVersion(Base, BaseModel):
    """Version tracking for AI models."""
    
    __tablename__ = "model_versions"
    
    model_id = Column(Integer, ForeignKey("ai_models.id"), nullable=False)
    version = Column(String(50), nullable=False)
    description = Column(Text)
    
    # Model artifacts (for custom models)
    artifact_path = Column(String(500))
    checksum = Column(String(64))
    
    # Configuration
    parameters = Column(JSONB, default=dict)
    training_data = Column(JSONB, default=dict)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_deprecated = Column(Boolean, default=False)
    deprecation_date = Column(DateTime)
    migration_guide = Column(Text)
    
    # Relationships
    model = relationship("AIModel", backref="versions")
    
    def __repr__(self):
        return f"<ModelVersion {self.model_id}:{self.version}>"


class ModelMetrics(Base, BaseModel):
    """Performance metrics for model versions."""
    
    __tablename__ = "model_metrics"
    
    version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=False)
    metric_name = Column(String(100), nullable=False)
    value = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    
    # Relationships
    version = relationship("ModelVersion", backref="metrics")
    
    def __repr__(self):
        return f"<ModelMetrics {self.metric_name}: {self.value}>"