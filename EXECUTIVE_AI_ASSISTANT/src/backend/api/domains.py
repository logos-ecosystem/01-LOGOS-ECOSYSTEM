from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional

from ..models.domains import DomainRequest, DomainResponse, DomainType
from ..services.domain_services import (
    HealthcareService,
    LegalService,
    SportsService
)

router = APIRouter()

# Initialize domain services
healthcare_service = HealthcareService()
legal_service = LegalService()
sports_service = SportsService()


@router.post("/healthcare", response_model=DomainResponse)
async def healthcare_assistant(request: DomainRequest):
    """Healthcare domain assistant endpoint"""
    if not healthcare_service.is_enabled():
        raise HTTPException(status_code=503, detail="Healthcare module is disabled")
    
    response = await healthcare_service.process_request(request)
    return response


@router.post("/legal", response_model=DomainResponse)
async def legal_assistant(request: DomainRequest):
    """Legal domain assistant endpoint"""
    if not legal_service.is_enabled():
        raise HTTPException(status_code=503, detail="Legal module is disabled")
    
    response = await legal_service.process_request(request)
    return response


@router.post("/sports", response_model=DomainResponse)
async def sports_assistant(request: DomainRequest):
    """Sports domain assistant endpoint"""
    if not sports_service.is_enabled():
        raise HTTPException(status_code=503, detail="Sports module is disabled")
    
    response = await sports_service.process_request(request)
    return response


@router.get("/available")
async def list_available_domains():
    """List all available domain modules"""
    domains = []
    
    if healthcare_service.is_enabled():
        domains.append({
            "id": "healthcare",
            "name": "Healthcare Assistant",
            "description": "Medical knowledge, health management, and healthcare industry insights",
            "enabled": True
        })
    
    if legal_service.is_enabled():
        domains.append({
            "id": "legal",
            "name": "Legal Assistant",
            "description": "Corporate law, compliance, contracts, and legal risk management",
            "enabled": True
        })
    
    if sports_service.is_enabled():
        domains.append({
            "id": "sports",
            "name": "Sports Assistant",
            "description": "Sports management, athlete performance, and sports business",
            "enabled": True
        })
    
    return {"domains": domains}