"""Business Strategy AI Agent - Expert in business planning, strategy, and operations."""

from typing import Dict, Any, List, Optional
from datetime import datetime
import json

from base_agent import BaseAgent, AgentResponse
from src.shared.utils.logger import get_logger

logger = get_logger(__name__)


class BusinessStrategyAgent(BaseAgent):
    """AI Agent specialized in business strategy, planning, and operations."""
    
    def __init__(self):
        super().__init__(
            agent_id="business-strategy-expert",
            name="Business Strategy Expert",
            description="Expert AI assistant for business planning, strategy development, market analysis, and operational excellence",
            category="business",
            subcategory="strategy",
            version="1.0.0",
            pricing_per_use=0.50,
            pricing_monthly=49.99,
            capabilities=[
                AgentCapability.TEXT_GENERATION,
                AgentCapability.ANALYSIS,
                AgentCapability.PLANNING,
                AgentCapability.CONSULTATION
            ],
            tags=["business", "strategy", "planning", "analysis", "management", "consulting"],
            languages=["en", "es", "fr", "de", "zh", "ja"],
            expertise_level="expert"
        )
        
        self.specializations = [
            "Business Plan Development",
            "Market Analysis & Research",
            "Competitive Intelligence",
            "Strategic Planning",
            "Financial Projections",
            "Operations Optimization",
            "Growth Strategies",
            "Risk Assessment",
            "Change Management",
            "Digital Transformation",
            "Mergers & Acquisitions",
            "International Expansion"
        ]
    
    def get_system_prompt(self) -> str:
        """Get the specialized system prompt for business strategy."""
        return f"""You are an expert Business Strategy AI Assistant with deep knowledge in:

Expertise Areas:
{chr(10).join(f'- {spec}' for spec in self.specializations)}

Your approach:
1. Provide data-driven insights and recommendations
2. Consider market trends and competitive landscape
3. Focus on practical, actionable strategies
4. Balance short-term wins with long-term vision
5. Consider financial implications and ROI
6. Address potential risks and mitigation strategies
7. Incorporate industry best practices
8. Provide clear implementation roadmaps

You have access to:
- Market research methodologies
- Financial modeling techniques
- Strategic frameworks (SWOT, Porter's Five Forces, BCG Matrix, etc.)
- Industry benchmarks and KPIs
- Case studies and best practices

Always provide comprehensive, strategic advice tailored to the specific business context."""
    
    async def process_request(
        self,
        user_input: str,
        context: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None
    ) -> AgentResponse:
        """Process a business strategy request."""
        try:
            # Detect request type
            request_type = self._detect_request_type(user_input)
            
            # Enhance prompt based on request type
            enhanced_prompt = self._enhance_prompt(user_input, request_type, context)
            
            # Get response from Claude
            response = await self.get_ai_response(
                enhanced_prompt,
                system_prompt=self.get_system_prompt(),
                temperature=0.7,
                max_tokens=2000
            )
            
            # Extract structured insights if applicable
            structured_data = self._extract_structured_data(response.content, request_type)
            
            return AgentResponse(
                content=response.content,
                agent_id=self.agent_id,
                usage_tokens=response.usage_tokens,
                metadata={
                    "request_type": request_type,
                    "structured_data": structured_data,
                    "specialization_used": self._identify_specialization(user_input),
                    "confidence_score": self._calculate_confidence(response.content)
                }
            )
            
        except Exception as e:
            logger.error(f"Error processing business strategy request: {str(e)}")
            raise
    
    def _detect_request_type(self, user_input: str) -> str:
        """Detect the type of business request."""
        input_lower = user_input.lower()
        
        if any(term in input_lower for term in ["business plan", "startup plan", "company plan"]):
            return "business_plan"
        elif any(term in input_lower for term in ["market analysis", "market research", "target market"]):
            return "market_analysis"
        elif any(term in input_lower for term in ["competitor", "competitive analysis", "competition"]):
            return "competitive_analysis"
        elif any(term in input_lower for term in ["strategy", "strategic plan", "growth strategy"]):
            return "strategic_planning"
        elif any(term in input_lower for term in ["financial", "projection", "forecast", "revenue"]):
            return "financial_planning"
        elif any(term in input_lower for term in ["operations", "process", "efficiency", "optimize"]):
            return "operations"
        elif any(term in input_lower for term in ["risk", "threat", "mitigation"]):
            return "risk_assessment"
        elif any(term in input_lower for term in ["expand", "international", "global", "new market"]):
            return "expansion"
        else:
            return "general_consultation"
    
    def _enhance_prompt(self, user_input: str, request_type: str, context: Optional[Dict[str, Any]]) -> str:
        """Enhance the prompt based on request type."""
        enhancements = {
            "business_plan": "Provide a comprehensive business plan outline including executive summary, market analysis, competitive landscape, marketing strategy, operations plan, management team, and financial projections.",
            "market_analysis": "Conduct thorough market analysis including market size, growth trends, customer segments, buying behaviors, and market opportunities.",
            "competitive_analysis": "Analyze competitors including their strengths, weaknesses, market position, strategies, and identify competitive advantages.",
            "strategic_planning": "Develop strategic recommendations with clear objectives, key initiatives, timelines, resources needed, and success metrics.",
            "financial_planning": "Provide detailed financial analysis including revenue projections, cost structure, break-even analysis, and funding requirements.",
            "operations": "Analyze operational efficiency and provide recommendations for process improvement, cost reduction, and productivity enhancement.",
            "risk_assessment": "Identify potential risks, assess their impact and likelihood, and provide mitigation strategies.",
            "expansion": "Develop expansion strategy including market selection, entry modes, resource requirements, and implementation timeline."
        }
        
        enhancement = enhancements.get(request_type, "Provide comprehensive business advice and strategic recommendations.")
        
        # Add context if available
        context_info = ""
        if context:
            if "company_info" in context:
                context_info += f"\nCompany Context: {json.dumps(context['company_info'])}"
            if "industry" in context:
                context_info += f"\nIndustry: {context['industry']}"
            if "budget" in context:
                context_info += f"\nBudget: ${context['budget']:,.2f}"
        
        return f"{user_input}\n\nPlease {enhancement}{context_info}"
    
    def _extract_structured_data(self, content: str, request_type: str) -> Optional[Dict[str, Any]]:
        """Extract structured data from the response."""
        structured_data = {}
        
        try:
            if request_type == "business_plan":
                # Extract key sections of business plan
                sections = ["Executive Summary", "Market Analysis", "Marketing Strategy", 
                          "Operations Plan", "Financial Projections"]
                for section in sections:
                    if section in content:
                        structured_data[section.lower().replace(" ", "_")] = True
            
            elif request_type == "financial_planning":
                # Extract financial metrics
                import re
                
                # Extract revenue projections
                revenue_pattern = r'\$[\d,]+(?:\.\d{2})?'
                revenues = re.findall(revenue_pattern, content)
                if revenues:
                    structured_data["projected_revenues"] = revenues[:5]  # Top 5
                
                # Extract percentages
                percentage_pattern = r'\d+(?:\.\d+)?%'
                percentages = re.findall(percentage_pattern, content)
                if percentages:
                    structured_data["key_percentages"] = percentages[:5]
            
            elif request_type == "competitive_analysis":
                # Extract competitor mentions
                if "competitor" in content.lower():
                    structured_data["competitors_analyzed"] = True
                
                # Extract SWOT elements
                swot_elements = ["Strengths", "Weaknesses", "Opportunities", "Threats"]
                for element in swot_elements:
                    if element in content:
                        structured_data[f"swot_{element.lower()}"] = True
            
            return structured_data if structured_data else None
            
        except Exception as e:
            logger.warning(f"Error extracting structured data: {str(e)}")
            return None
    
    def _identify_specialization(self, user_input: str) -> str:
        """Identify which specialization is most relevant."""
        input_lower = user_input.lower()
        
        for spec in self.specializations:
            if spec.lower() in input_lower:
                return spec
        
        # Default mappings
        if "plan" in input_lower:
            return "Business Plan Development"
        elif "market" in input_lower:
            return "Market Analysis & Research"
        elif "compete" in input_lower or "competitor" in input_lower:
            return "Competitive Intelligence"
        elif "grow" in input_lower:
            return "Growth Strategies"
        elif "risk" in input_lower:
            return "Risk Assessment"
        else:
            return "Strategic Planning"
    
    def _calculate_confidence(self, content: str) -> float:
        """Calculate confidence score based on response quality."""
        score = 0.7  # Base score
        
        # Check for comprehensive content
        if len(content) > 1000:
            score += 0.1
        
        # Check for structured elements
        if any(marker in content for marker in ["1.", "2.", "•", "-"]):
            score += 0.05
        
        # Check for specific recommendations
        if any(word in content.lower() for word in ["recommend", "suggest", "advise", "should"]):
            score += 0.1
        
        # Check for data/metrics
        import re
        if re.search(r'\d+', content):
            score += 0.05
        
        return min(score, 1.0)
    
    def get_capabilities_detail(self) -> Dict[str, Any]:
        """Get detailed capabilities of the business agent."""
        return {
            "specializations": self.specializations,
            "frameworks": [
                "SWOT Analysis",
                "Porter's Five Forces",
                "BCG Growth-Share Matrix",
                "Ansoff Matrix",
                "Value Chain Analysis",
                "Balanced Scorecard",
                "Blue Ocean Strategy",
                "Lean Canvas",
                "Business Model Canvas"
            ],
            "deliverables": [
                "Business Plans",
                "Market Research Reports",
                "Competitive Analysis",
                "Financial Models",
                "Strategic Roadmaps",
                "Risk Assessments",
                "Growth Strategies",
                "Operational Improvements"
            ],
            "industries": [
                "Technology",
                "Healthcare",
                "Finance",
                "Retail",
                "Manufacturing",
                "Services",
                "E-commerce",
                "SaaS",
                "Education",
                "Real Estate"
            ],
            "integration_options": [
                "CRM Systems",
                "Financial Planning Tools",
                "Market Research Databases",
                "Analytics Platforms"
            ]
        }
    
    def get_example_queries(self) -> List[Dict[str, str]]:
        """Get example queries for this agent."""
        return [
            {
                "query": "Help me create a business plan for a SaaS startup targeting small businesses",
                "description": "Comprehensive business plan development"
            },
            {
                "query": "Analyze the competitive landscape for online education platforms",
                "description": "Competitive intelligence and market positioning"
            },
            {
                "query": "What's the best growth strategy for a $5M ARR B2B software company?",
                "description": "Growth strategy recommendations"
            },
            {
                "query": "Create financial projections for a new product launch",
                "description": "Financial planning and forecasting"
            },
            {
                "query": "How can we optimize our operations to reduce costs by 20%?",
                "description": "Operational efficiency improvements"
            }
        ]