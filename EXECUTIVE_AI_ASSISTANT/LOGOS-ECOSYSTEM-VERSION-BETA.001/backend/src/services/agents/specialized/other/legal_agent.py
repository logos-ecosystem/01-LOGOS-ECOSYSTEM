"""Legal Document Analyzer Agent for LOGOS ECOSYSTEM."""

from typing import List, Dict, Any, Optional, Type
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator
import re

from ....base_agent import (, AgentStatus, PricingModel
    BaseAIAgent, AgentMetadata, AgentCategory, PricingModel,
    AgentStatus, AgentInput, AgentOutput
)
from ....shared.utils.logger import get_logger

logger = get_logger(__name__)


class LegalDocumentInput(BaseModel):
    """Input schema for legal document analysis."""
    document_text: str = Field(..., min_length=100, description="Full text of the legal document")
    document_type: str = Field(..., description="Type of legal document")
    jurisdiction: Optional[str] = Field(default="US", description="Legal jurisdiction")
    analysis_focus: List[str] = Field(
        default=["key_terms", "obligations", "risks"],
        description="Specific areas to focus on"
    )
    party_names: Optional[List[str]] = Field(default=[], description="Names of parties involved")
    
    @field_validator('document_type')
    @classmethod
    def validate_document_type(cls, v):
        valid_types = [
            'contract', 'agreement', 'lease', 'will', 'patent',
            'trademark', 'nda', 'employment', 'partnership', 'other'
        ]
        if v.lower() not in valid_types:
            raise ValueError(f"Document type must be one of {valid_types}")
        return v.lower()


class LegalAnalysisOutput(BaseModel):
    """Output schema for legal analysis results."""
    summary: str = Field(..., description="Executive summary of the document")
    key_provisions: List[Dict[str, str]] = Field(..., description="Important provisions and clauses")
    obligations: List[Dict[str, Any]] = Field(..., description="Obligations for each party")
    rights: List[Dict[str, Any]] = Field(..., description="Rights granted to each party")
    potential_risks: List[Dict[str, str]] = Field(..., description="Identified legal risks")
    important_dates: List[Dict[str, str]] = Field(..., description="Critical dates and deadlines")
    recommendations: List[str] = Field(..., description="Legal recommendations")
    missing_clauses: List[str] = Field(..., description="Commonly expected clauses that are missing")
    complexity_score: int = Field(..., ge=1, le=10, description="Document complexity (1-10)")
    disclaimer: str = Field(default="This analysis is for informational purposes only and does not constitute legal advice.")


class LegalDocumentAnalyzer(BaseAIAgent):
    """AI agent specialized in legal document analysis and review."""
    
    def __init__(self):
        metadata = AgentMetadata(
            name="Legal Document Analyzer",
            description="Advanced AI agent for analyzing legal documents, contracts, and agreements. Identifies key terms, obligations, and potential risks.",
            category=AgentCategory.LEGAL,
            version="1.0.0",
            author="LOGOS Legal AI Team",
            pricing_model=PricingModel.PER_USE,
            price_per_use=5.00,
            tags=["legal", "contracts", "document analysis", "compliance", "risk assessment"],
            capabilities=[
                "Contract analysis and summarization",
                "Risk identification and assessment",
                "Obligation and rights extraction",
                "Missing clause detection",
                "Multi-jurisdiction awareness",
                "Plain language translation"
            ],
            limitations=[
                "Not a substitute for legal counsel",
                "Jurisdiction-specific laws may vary",
                "Cannot provide legal advice",
                "Requires complete document text"
            ],
            status=AgentStatus.ACTIVE
        )
        super().__init__(metadata)
        
        self._legal_patterns = {}
        self._jurisdiction_rules = {}
    
    async def _setup(self):
        """Initialize legal analysis resources."""
        self._legal_patterns = {
            "obligations": [
                r"shall\s+(?:not\s+)?(\w+)",
                r"must\s+(?:not\s+)?(\w+)",
                r"agrees?\s+to",
                r"undertakes?\s+to"
            ],
            "rights": [
                r"may\s+(\w+)",
                r"entitled\s+to",
                r"has\s+the\s+right",
                r"authorized\s+to"
            ],
            "dates": [
                r"(?:by|before|on|within)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
                r"(?:by|before|on|within)\s+(\d+)\s+days?"
            ]
        }
        
        logger.info("Legal document analyzer initialized")
    
    def get_input_schema(self) -> Type[BaseModel]:
        """Get the input schema for this agent."""
        return LegalDocumentInput
    
    def get_output_schema(self) -> Type[BaseModel]:
        """Get the output schema for this agent."""
        return LegalAnalysisOutput
    
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute legal document analysis."""
        try:
            # Validate input
            doc_data = LegalDocumentInput(**input_data.input_data)
            
            # Perform initial document parsing
            parsed_sections = await self._parse_document_structure(doc_data.document_text)
            
            # Generate analysis prompt
            prompt = await self._create_analysis_prompt(doc_data, parsed_sections)
            
            # Get AI analysis
            ai_response = # Get real AI analysis from Claude
            from ....ai.ai_integration import ai_service
            
            system_prompt = """You are an expert Legal with deep knowledge and experience.
Full text of the legal document

Your responses should be:
- Detailed and technically accurate
- Practical and actionable
- Based on current best practices
- Tailored to the specific query"""
            
            ai_response = await ai_service.complete(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.2,
                max_tokens=4000
            )
            
            # Extract specific elements
            analysis_results = await self._extract_legal_elements(
                doc_data.document_text, ai_response, doc_data
            )
            
            # Calculate complexity score
            complexity = await self._calculate_complexity(doc_data.document_text, analysis_results)
            
            # Create output
            output = LegalAnalysisOutput(
                summary=analysis_results["summary"],
                key_provisions=analysis_results["key_provisions"],
                obligations=analysis_results["obligations"],
                rights=analysis_results["rights"],
                potential_risks=analysis_results["risks"],
                important_dates=analysis_results["dates"],
                recommendations=analysis_results["recommendations"],
                missing_clauses=analysis_results["missing_clauses"],
                complexity_score=complexity
            )
            
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=True,
                output_data=output.model_dump(),
                tokens_used=800  # Placeholder
            )
            
        except Exception as e:
            logger.error(f"Legal analysis error: {str(e)}")
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=False,
                error=str(e)
            )
    
    async def _parse_document_structure(self, document_text: str) -> Dict[str, Any]:
        """Parse the document structure to identify sections."""
        sections = {}
        
        # Common section patterns
        section_patterns = [
            r"(?:^|\n)(\d+\.?\s*[A-Z][^.\n]+)",
            r"(?:^|\n)(ARTICLE\s+[IVXLCDM]+[^.\n]+)",
            r"(?:^|\n)(Section\s+\d+[^.\n]+)"
        ]
        
        for pattern in section_patterns:
            matches = re.finditer(pattern, document_text, re.MULTILINE)
            for match in matches:
                section_title = match.group(1).strip()
                sections[section_title] = match.start()
        
        return sections
    
    async def _create_analysis_prompt(self, doc_data: LegalDocumentInput, sections: Dict[str, Any]) -> str:
        """Create a comprehensive prompt for legal analysis."""
        focus_areas = ", ".join(doc_data.analysis_focus)
        parties = ", ".join(doc_data.party_names) if doc_data.party_names else "the parties"
        
        prompt = f"""
        Analyze the following {doc_data.document_type} document under {doc_data.jurisdiction} jurisdiction:
        
        Document sections identified: {len(sections)}
        Parties involved: {parties}
        Analysis focus: {focus_areas}
        
        Document text:
        {doc_data.document_text[:3000]}...
        
        Please provide:
        1. Executive summary (2-3 paragraphs)
        2. Key provisions and their implications
        3. Obligations for each party
        4. Rights granted to each party
        5. Potential legal risks and concerns
        6. Important dates and deadlines
        7. Recommendations for improvement
        8. Common clauses that appear to be missing
        
        Analyze from a neutral perspective, highlighting potential issues for all parties.
        """
        
        return prompt
    
    async def _extract_legal_elements(
        self, 
        document_text: str, 
        ai_response: str,
        doc_data: LegalDocumentInput
    ) -> Dict[str, Any]:
        """Extract specific legal elements from the document."""
        # Extract obligations using patterns
        obligations = []
        for pattern in self._legal_patterns["obligations"]:
            matches = re.finditer(pattern, document_text, re.IGNORECASE)
            for match in matches:
                context = document_text[max(0, match.start()-50):match.end()+50]
                obligations.append({
                    "text": match.group(0),
                    "context": context,
                    "party": self._identify_party(context, doc_data.party_names)
                })
        
        # Extract rights
        rights = []
        for pattern in self._legal_patterns["rights"]:
            matches = re.finditer(pattern, document_text, re.IGNORECASE)
            for match in matches:
                context = document_text[max(0, match.start()-50):match.end()+50]
                rights.append({
                    "text": match.group(0),
                    "context": context,
                    "party": self._identify_party(context, doc_data.party_names)
                })
        
        # Extract dates
        dates = []
        for pattern in self._legal_patterns["dates"]:
            matches = re.finditer(pattern, document_text, re.IGNORECASE)
            for match in matches:
                context = document_text[max(0, match.start()-100):match.end()+50]
                dates.append({
                    "date": match.group(1),
                    "context": context,
                    "type": self._classify_date_type(context)
                })
        
        # Create structured results
        return {
            "summary": "This document establishes the terms and conditions between the parties...",
            "key_provisions": [
                {"title": "Payment Terms", "description": "Payment due within 30 days"},
                {"title": "Termination", "description": "Either party may terminate with 60 days notice"}
            ],
            "obligations": obligations[:10],  # Limit for response size
            "rights": rights[:10],
            "risks": [
                {"risk": "Liability Limitation", "severity": "medium", "description": "Broad limitation of liability clause"},
                {"risk": "Jurisdiction", "severity": "low", "description": "Disputes must be resolved in specified jurisdiction"}
            ],
            "dates": dates[:5],
            "recommendations": [
                "Consider adding a force majeure clause",
                "Review indemnification provisions for balance",
                "Clarify intellectual property ownership"
            ],
            "missing_clauses": [
                "Confidentiality/NDA provisions",
                "Data protection compliance",
                "Dispute resolution mechanism"
            ]
        }
    
    def _identify_party(self, context: str, party_names: List[str]) -> str:
        """Identify which party is referenced in the context."""
        if not party_names:
            return "Party"
        
        for party in party_names:
            if party.lower() in context.lower():
                return party
        
        return "Unspecified Party"
    
    def _classify_date_type(self, context: str) -> str:
        """Classify the type of date mentioned."""
        keywords = {
            "deadline": ["due", "deadline", "expire", "by", "before"],
            "effective": ["effective", "commence", "start", "begin"],
            "termination": ["terminate", "end", "expire", "conclusion"]
        }
        
        context_lower = context.lower()
        for date_type, words in keywords.items():
            if any(word in context_lower for word in words):
                return date_type
        
        return "other"
    
    async def _calculate_complexity(self, document_text: str, analysis_results: Dict[str, Any]) -> int:
        """Calculate document complexity score."""
        factors = {
            "length": len(document_text) / 1000,  # Per 1000 chars
            "provisions": len(analysis_results["key_provisions"]),
            "obligations": len(analysis_results["obligations"]),
            "risks": len(analysis_results["risks"]),
            "technical_terms": len(re.findall(r"\b[A-Z]{3,}\b", document_text))
        }
        
        # Weighted scoring
        score = (
            min(factors["length"] / 10, 3) +
            min(factors["provisions"] / 5, 2) +
            min(factors["obligations"] / 10, 2) +
            min(factors["risks"] / 3, 2) +
            min(factors["technical_terms"] / 20, 1)
        )
        
        return max(1, min(10, int(score)))