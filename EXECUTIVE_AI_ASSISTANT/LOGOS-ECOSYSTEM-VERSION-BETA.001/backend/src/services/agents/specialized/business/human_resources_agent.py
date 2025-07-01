"""
Human Resources Specialist - Expert in expert ai for hr management, talent acquisition, and organizational development
"""

from typing import List, Dict, Any, Optional, Type
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator

from ....base_agent import (, AgentStatus, PricingModel
    BaseAIAgent, AgentMetadata, AgentCategory, PricingModel,
    AgentStatus, AgentInput, AgentOutput
)
from ....shared.utils.logger import get_logger
from ....services.ai.ai_integration import ai_service

logger = get_logger(__name__)


class HumanResourcesInput(BaseModel):
    """Input schema for human resources queries."""
    query: str = Field(..., description="Human Resources related question or request")
    context: Optional[Dict[str, Any]] = Field(default={}, description="Additional context for the query")
    parameters: Optional[Dict[str, Any]] = Field(default={}, description="Specific parameters for analysis")
    focus_area: Optional[str] = Field(None, description="Specific area of focus within human resources")
    detail_level: Optional[str] = Field("comprehensive", description="Level of detail required (basic/intermediate/comprehensive)")


class HumanResourcesOutput(BaseModel):
    """Output schema for human resources analysis."""
    analysis: str = Field(..., description="Comprehensive human resources analysis and insights")
    key_findings: List[str] = Field(..., description="Key findings and conclusions")
    recommendations: List[str] = Field(..., description="Actionable recommendations")
    technical_details: Dict[str, Any] = Field(default={}, description="Technical details and data")
    methodologies: List[str] = Field(default=[], description="Methodologies and approaches used")
    references: List[str] = Field(default=[], description="References and further reading")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence in the analysis")


class HumanResourcesAgent(BaseAgent):
    """
    Specialized AI agent for human resources.
    Expert AI for HR management, talent acquisition, and organizational development.
    """
    
    def __init__(self):
        metadata = AgentMetadata(
            name="Human Resources Specialist",
            description="""Expert AI for HR management, talent acquisition, and organizational development.
            Specializes in recruitment, performance management, compensation, employee relations, HR strategy.
            Provides detailed analysis, expert insights, and practical recommendations.""",
            category=AgentCategory.HR,
            version="1.0.0",
            author="LOGOS AI Team",
            pricing_model=PricingModel.PER_USE,
            price_per_use=1.5,
            tags=["human-resources", "human resources", "expert", "analysis", "consulting"],
            capabilities=[
                "Comprehensive human resources analysis",
                "Expert insights and recommendations",
                "Technical problem solving",
                "Best practices guidance",
                "Current research integration"
            ],
            limitations=[
                "Analysis based on training data cutoff",
                "Cannot access real-time data without integration",
                "Recommendations should be validated by domain experts"
            ],
            status=AgentStatus.ACTIVE
        )
        super().__init__(metadata)
        
        # Domain-specific knowledge base
        self._domain_knowledge = {}
        self._best_practices = {}
    
    async def _setup(self):
        """Initialize agent-specific resources."""
        logger.info(f"{self.metadata.name} initialized")
    
    def get_input_schema(self) -> Type[BaseModel]:
        """Get the input schema for this agent."""
        return HumanResourcesInput
    
    def get_output_schema(self) -> Type[BaseModel]:
        """Get the output schema for this agent."""
        return HumanResourcesOutput
    
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute human resources analysis using Claude AI."""
        try:
            # Validate input
            validated_input = HumanResourcesInput(**input_data.input_data)
            
            # Create specialized system prompt
            system_prompt = """You are an expert Human Resources Specialist with deep knowledge in recruitment, performance management, compensation, employee relations, HR strategy.

Your role is to:
1. Provide comprehensive analysis of human resources queries
2. Offer expert insights based on current best practices
3. Give practical, actionable recommendations
4. Explain complex concepts clearly
5. Consider multiple perspectives and approaches

Always structure your responses to be:
- Technically accurate and detailed
- Practical and actionable
- Based on established principles and methodologies
- Clear and well-organized"""
            
            # Build user prompt
            user_prompt = await self._build_prompt(validated_input)
            
            # Get AI response
            ai_response = await ai_service.complete(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.7,
                max_tokens=4000
            )
            
            # Parse and structure the response
            output = await self._parse_response(ai_response, validated_input)
            
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=True,
                output_data=output.model_dump(),
                tokens_used=1000  # Placeholder
            )
            
        except Exception as e:
            logger.error(f"{self.metadata.name} execution error: {str(e)}")
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=False,
                error=str(e)
            )
    
    async def _build_prompt(self, validated_input: HumanResourcesInput) -> str:
        """Build a detailed prompt for the query."""
        prompt_parts = [f"Query: {validated_input.query}"]
        
        if validated_input.context:
            prompt_parts.append(f"Context: {validated_input.context}")
        
        if validated_input.parameters:
            prompt_parts.append(f"Parameters: {validated_input.parameters}")
        
        if validated_input.focus_area:
            prompt_parts.append(f"Focus Area: {validated_input.focus_area}")
        
        prompt_parts.append(f"Detail Level: {validated_input.detail_level}")
        
        prompt_parts.append("""
Please provide a comprehensive analysis including:
1. Overview and context
2. Detailed technical analysis
3. Key findings and insights
4. Practical recommendations
5. Relevant methodologies and approaches
6. References and further resources""")
        
        return "\n".join(prompt_parts)
    
    async def _parse_response(
        self, 
        ai_response: str, 
        validated_input: HumanResourcesInput
    ) -> HumanResourcesOutput:
        """Parse AI response into structured output."""
        
        # Extract key sections from the response
        key_findings = []
        recommendations = []
        methodologies = []
        
        # Simple extraction based on common patterns
        # In production, use more sophisticated NLP parsing
        lines = ai_response.split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Detect section headers
            if 'finding' in line.lower() or 'conclusion' in line.lower():
                current_section = 'findings'
            elif 'recommend' in line.lower():
                current_section = 'recommendations'
            elif 'method' in line.lower() or 'approach' in line.lower():
                current_section = 'methodologies'
            elif line.startswith('-') or line.startswith('•') or line.startswith('*'):
                # Extract bullet points
                content = line.lstrip('-•* ').strip()
                if content:
                    if current_section == 'findings':
                        key_findings.append(content)
                    elif current_section == 'recommendations':
                        recommendations.append(content)
                    elif current_section == 'methodologies':
                        methodologies.append(content)
        
        # If no structured extraction, provide defaults
        if not key_findings:
            key_findings = ["Comprehensive analysis provided", "See detailed analysis for specific insights"]
        if not recommendations:
            recommendations = ["Review the detailed analysis", "Consider domain-specific factors", "Consult with specialists as needed"]
        if not methodologies:
            methodologies = ["Standard human resources analysis", "Best practices evaluation", "Evidence-based approach"]
        
        # Technical details (placeholder - would extract from response in production)
        technical_details = {
            "analysis_type": "human resources",
            "complexity_level": validated_input.detail_level,
            "focus_areas": [validated_input.focus_area] if validated_input.focus_area else ["human resources"]
        }
        
        # References
        references = [
            "Industry best practices and standards",
            "Current research in human resources",
            "Professional guidelines and frameworks"
        ]
        
        # Calculate confidence score
        confidence_score = 0.85
        if validated_input.detail_level == "comprehensive":
            confidence_score += 0.05
        if validated_input.focus_area:
            confidence_score += 0.05
        
        return HumanResourcesOutput(
            analysis=ai_response,
            key_findings=key_findings[:5],  # Limit to top 5
            recommendations=recommendations[:5],  # Limit to top 5
            technical_details=technical_details,
            methodologies=methodologies[:3],  # Limit to top 3
            references=references,
            confidence_score=min(confidence_score, 0.95)
        )
