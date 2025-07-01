"""
Political Science Expert - Expert in expert ai for political analysis, governance, and policy studies
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


class PoliticalScienceAgentInput(BaseModel):
    """Input schema for political science queries."""
    query: str = Field(..., description="Political Science related question or request")
    context: Optional[Dict[str, Any]] = Field(default={}, description="Additional context for the query")
    parameters: Optional[Dict[str, Any]] = Field(default={}, description="Specific parameters for analysis")
    focus_area: Optional[str] = Field(None, description="Specific area of focus within political science")
    detail_level: Optional[str] = Field("comprehensive", description="Level of detail required (basic/intermediate/comprehensive)")


class PoliticalScienceAgentOutput(BaseModel):
    """Output schema for political science analysis."""
    analysis: str = Field(..., description="Comprehensive political science analysis and insights")
    key_findings: List[str] = Field(..., description="Key findings and conclusions")
    recommendations: List[str] = Field(..., description="Actionable recommendations")
    technical_details: Dict[str, Any] = Field(default={}, description="Technical details and data")
    methodologies: List[str] = Field(default=[], description="Methodologies and approaches used")
    references: List[str] = Field(default=[], description="References and further reading")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence in the analysis")


class PoliticalScienceAgent(BaseAgent):
    """
    Specialized AI agent for political science.
    Expert AI for political analysis, governance, and policy studies.
    """
    
    def __init__(self):
        metadata = AgentMetadata(
            name="Political Science Expert",
            description="""Expert AI for political analysis, governance, and policy studies.
            Specializes in political theory, comparative politics, international relations, public policy.
            Provides detailed analysis, expert insights, and practical recommendations.""",
            category=AgentCategory.HUMANITIES,
            version="1.0.0",
            author="LOGOS AI Team",
            pricing_model=PricingModel.PER_USE,
            price_per_use=1.5,
            tags=["political-science", "political science", "expert", "analysis", "consulting"],
            capabilities=[
                "Comprehensive political science analysis",
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
        return PoliticalScienceAgentInput
    
    def get_output_schema(self) -> Type[BaseModel]:
        """Get the output schema for this agent."""
        return PoliticalScienceAgentOutput
    
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute political science analysis using Claude AI."""
        try:
            # Validate input
            validated_input = PoliticalScienceAgentInput(**input_data.input_data)
            
            # Create specialized system prompt
            system_prompt = """You are an expert Political Science Expert with deep knowledge in political theory, comparative politics, international relations, public policy.

Your role is to:
1. Provide comprehensive analysis of political science queries
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
    
    async def _build_prompt(self, validated_input: PoliticalScienceAgentInput) -> str:
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
        validated_input: PoliticalScienceAgentInput
    ) -> PoliticalScienceAgentOutput:
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
            methodologies = ["Standard political science analysis", "Best practices evaluation", "Evidence-based approach"]
        
        # Technical details (placeholder - would extract from response in production)
        technical_details = {
            "analysis_type": "political science",
            "complexity_level": validated_input.detail_level,
            "focus_areas": [validated_input.focus_area] if validated_input.focus_area else ["political science"]
        }
        
        # References
        references = [
            "Industry best practices and standards",
            "Current research in political science",
            "Professional guidelines and frameworks"
        ]
        
        # Calculate confidence score
        confidence_score = 0.85
        if validated_input.detail_level == "comprehensive":
            confidence_score += 0.05
        if validated_input.focus_area:
            confidence_score += 0.05
        
        return PoliticalScienceAgentOutput(
            analysis=ai_response,
            key_findings=key_findings[:5],  # Limit to top 5
            recommendations=recommendations[:5],  # Limit to top 5
            technical_details=technical_details,
            methodologies=methodologies[:3],  # Limit to top 3
            references=references,
            confidence_score=min(confidence_score, 0.95)
        )
