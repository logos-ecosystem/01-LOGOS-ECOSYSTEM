from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(BaseModel):
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = None


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    language: Optional[str] = "en"
    domain: Optional[str] = None  # healthcare, legal, sports, general


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    model_used: str
    tokens_used: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class Conversation(BaseModel):
    id: str
    messages: List[Message]
    created_at: datetime
    updated_at: datetime
    metadata: Optional[Dict[str, Any]] = None


class StreamToken(BaseModel):
    token: str
    finished: bool = False
    metadata: Optional[Dict[str, Any]] = None