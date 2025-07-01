from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class VoiceRequest(BaseModel):
    text: str
    language: str = "en-US"
    voice: Optional[str] = None
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    pitch: float = Field(default=1.0, ge=0.5, le=2.0)


class VoiceResponse(BaseModel):
    text: str
    language: str
    confidence: float = Field(ge=0.0, le=1.0)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Voice(BaseModel):
    id: str
    name: str
    language: str
    gender: str
    description: Optional[str] = None


class AudioTranscription(BaseModel):
    text: str
    language: str
    duration: float
    confidence: float
    words: Optional[List[dict]] = None