from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class DomainType(str, Enum):
    HEALTHCARE = "healthcare"
    LEGAL = "legal"
    SPORTS = "sports"
    GENERAL = "general"


class DomainRequest(BaseModel):
    query: str
    domain: DomainType
    context: Optional[Dict[str, Any]] = None
    language: str = "en"
    user_id: Optional[str] = None


class DomainResponse(BaseModel):
    response: str
    domain: DomainType
    confidence: float = Field(ge=0.0, le=1.0)
    sources: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class HealthcareQuery(BaseModel):
    symptoms: Optional[List[str]] = None
    medical_history: Optional[Dict[str, Any]] = None
    medications: Optional[List[str]] = None
    query_type: str  # diagnosis, treatment, prevention, general


class LegalQuery(BaseModel):
    document_type: Optional[str] = None  # contract, compliance, policy
    jurisdiction: Optional[str] = None
    parties_involved: Optional[List[str]] = None
    query_type: str  # review, draft, compliance_check, general


class SportsQuery(BaseModel):
    sport_type: Optional[str] = None
    athlete_data: Optional[Dict[str, Any]] = None
    team_info: Optional[Dict[str, Any]] = None
    query_type: str  # performance, strategy, injury, business