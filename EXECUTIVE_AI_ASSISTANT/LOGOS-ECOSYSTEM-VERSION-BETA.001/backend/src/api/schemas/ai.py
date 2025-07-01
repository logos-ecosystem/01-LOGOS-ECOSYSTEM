from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


class AISessionCreate(BaseModel):
    """Schema for creating an AI session."""
    title: Optional[str] = Field(None, max_length=255)
    model: Optional[str] = Field(None, max_length=100)
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=200000)
    system_prompt: Optional[str] = None


class AISessionResponse(BaseModel):
    """Schema for AI session response."""
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    model: str
    total_tokens: int
    total_messages: int
    context_window: int
    temperature: float
    max_tokens: int
    system_prompt: Optional[str]
    is_archived: bool
    last_message_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class AIMessageCreate(BaseModel):
    """Schema for creating an AI message."""
    content: str = Field(..., min_length=1, max_length=100000)
    metadata: Optional[Dict[str, Any]] = None


class AIMessageResponse(BaseModel):
    """Schema for AI message response."""
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    model_used: Optional[str]
    processing_time_ms: Optional[int]
    metadata: Dict[str, Any]
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class StreamResponse(BaseModel):
    """Schema for streaming response."""
    event: str
    data: str
    id: Optional[str] = None
    retry: Optional[int] = None


class PromptTemplateResponse(BaseModel):
    """Schema for prompt template response."""
    id: uuid.UUID
    name: str
    category: str
    description: Optional[str]
    template: str
    variables: List[str]
    example_values: Dict[str, Any]
    usage_count: int
    rating: float
    is_public: bool
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class AIModelResponse(BaseModel):
    """Schema for AI model response."""
    model_id: str
    provider: str
    name: str
    description: Optional[str]
    max_tokens: int
    context_window: int
    supports_vision: bool
    supports_tools: bool
    input_token_price: float
    output_token_price: float
    default_temperature: float
    default_max_tokens: int
    is_available: bool
    requires_premium: bool
    
    model_config = {
        "from_attributes": True
    }