from abc import ABC, abstractmethod
from typing import Dict, Any
import logging

from ..models.domains import DomainRequest, DomainResponse, DomainType
from ..core.config import settings
from .ai_service import AIService

logger = logging.getLogger(__name__)


class BaseDomainService(ABC):
    """Base class for domain-specific services"""
    
    def __init__(self, domain_type: DomainType, enabled_setting: str):
        self.domain_type = domain_type
        self.enabled_setting = enabled_setting
        self.ai_service = AIService()
    
    def is_enabled(self) -> bool:
        """Check if this domain service is enabled"""
        return getattr(settings, self.enabled_setting, False)
    
    @abstractmethod
    async def get_system_prompt(self) -> str:
        """Get domain-specific system prompt"""
        pass
    
    async def process_request(self, request: DomainRequest) -> DomainResponse:
        """Process a domain-specific request"""
        try:
            # Get domain-specific system prompt
            system_prompt = await self.get_system_prompt()
            
            # Add language-specific adjustments
            if request.language == "es":
                system_prompt = await self._translate_prompt_to_spanish(system_prompt)
            
            # Process through AI with domain context
            response = await self.ai_service.process_message(
                message=request.query,
                conversation=None,  # Domain queries are stateless for now
                language=request.language,
                domain=self.domain_type.value,
                context=request.context
            )
            
            # Extract domain-specific insights
            insights = await self._extract_domain_insights(
                request.query,
                response.response,
                request.context
            )
            
            return DomainResponse(
                response=response.response,
                domain=self.domain_type,
                confidence=0.85,  # Placeholder confidence
                sources=insights.get("sources", []),
                recommendations=insights.get("recommendations", []),
                metadata=insights.get("metadata", {})
            )
            
        except Exception as e:
            logger.error(f"Domain service error ({self.domain_type}): {str(e)}")
            raise
    
    async def _extract_domain_insights(
        self,
        query: str,
        response: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extract domain-specific insights from the response"""
        # This is a placeholder - in production, this would use NLP
        # to extract structured information from the response
        return {
            "sources": [],
            "recommendations": [],
            "metadata": {"processed": True}
        }
    
    async def _translate_prompt_to_spanish(self, prompt: str) -> str:
        """Translate system prompt to Spanish"""
        # In production, this would use a translation service
        # For now, we'll handle it in the specific domain classes
        return prompt


class HealthcareService(BaseDomainService):
    def __init__(self):
        super().__init__(DomainType.HEALTHCARE, "ENABLE_HEALTHCARE_MODULE")
    
    async def get_system_prompt(self) -> str:
        return """You are a Healthcare AI Assistant specialized in medical knowledge, 
        health management, and healthcare industry insights. You provide evidence-based 
        information while always reminding users to consult with healthcare professionals 
        for medical advice. You can help with:
        - Understanding medical conditions and symptoms
        - Healthcare management strategies
        - Medical technology trends
        - Health policy analysis
        - Wellness and prevention strategies
        
        Always include appropriate disclaimers about not replacing professional medical advice."""


class LegalService(BaseDomainService):
    def __init__(self):
        super().__init__(DomainType.LEGAL, "ENABLE_LEGAL_MODULE")
    
    async def get_system_prompt(self) -> str:
        return """You are a Legal AI Assistant specialized in corporate law, compliance, 
        contracts, and legal risk management. You provide general legal information and 
        insights while always clarifying that you cannot provide specific legal advice. 
        You can help with:
        - Contract review and analysis
        - Compliance requirements
        - Legal risk assessment
        - Corporate governance
        - Regulatory updates
        - Legal document templates
        
        Always remind users to consult with qualified legal counsel for specific legal matters."""


class SportsService(BaseDomainService):
    def __init__(self):
        super().__init__(DomainType.SPORTS, "ENABLE_SPORTS_MODULE")
    
    async def get_system_prompt(self) -> str:
        return """You are a Sports AI Assistant specialized in sports management, 
        athlete performance, and sports business operations. You provide insights on:
        - Team management strategies
        - Athlete performance optimization
        - Sports analytics and statistics
        - Sports business and marketing
        - Training methodologies
        - Injury prevention and recovery
        - Sports technology trends
        
        You combine data-driven insights with practical sports management experience."""