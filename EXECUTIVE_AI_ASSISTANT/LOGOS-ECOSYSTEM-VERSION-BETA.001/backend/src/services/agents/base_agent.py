"""Base AI Agent framework for LOGOS ECOSYSTEM marketplace."""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional, Type, Union
from uuid import UUID, uuid4
import json
import time
from enum import Enum
from pydantic import BaseModel, Field, field_validator
import asyncio
from functools import wraps

from ...shared.utils.logger import get_logger
from ...shared.utils.exceptions import (
    AgentExecutionError,
    AgentValidationError,
    AgentAuthorizationError
)
from ..ai.ai_integration import ai_service

logger = get_logger(__name__)


class AgentStatus(str, Enum):
    """Agent status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEPRECATED = "deprecated"
    BETA = "beta"
    MAINTENANCE = "maintenance"


class AgentCategory(str, Enum):
    """Comprehensive agent category taxonomy."""
    # Professional Services
    MEDICAL = "medical"
    LEGAL = "legal"
    FINANCIAL = "financial"
    CONSULTING = "consulting"
    
    # Technology
    SOFTWARE_DEVELOPMENT = "software_development"
    DATA_SCIENCE = "data_science"
    CYBERSECURITY = "cybersecurity"
    DEVOPS = "devops"
    
    # Creative
    WRITING = "writing"
    DESIGN = "design"
    MUSIC = "music"
    VIDEO = "video"
    
    # Education
    TUTORING = "tutoring"
    LANGUAGE_LEARNING = "language_learning"
    SKILL_TRAINING = "skill_training"
    ACADEMIC_RESEARCH = "academic_research"
    
    # Business
    MARKETING = "marketing"
    SALES = "sales"
    HR = "human_resources"
    PROJECT_MANAGEMENT = "project_management"
    
    # Science & Research
    PHYSICS = "physics"
    CHEMISTRY = "chemistry"
    BIOLOGY = "biology"
    MATHEMATICS = "mathematics"
    
    # Lifestyle
    FITNESS = "fitness"
    NUTRITION = "nutrition"
    TRAVEL = "travel"
    COOKING = "cooking"
    
    # Specialized
    TRANSLATION = "translation"
    TRANSCRIPTION = "transcription"
    ANALYSIS = "analysis"
    AUTOMATION = "automation"


# Category-specific disclaimers for responsible AI usage
CATEGORY_DISCLAIMERS = {
    AgentCategory.MEDICAL: (
        "This AI assistant provides health information for educational purposes only. "
        "It is not a substitute for professional medical advice, diagnosis, or treatment. "
        "Always seek the advice of your physician or other qualified health provider "
        "with any questions you may have regarding a medical condition. "
        "If you think you may have a medical emergency, call your doctor or 911 immediately."
    ),
    AgentCategory.LEGAL: (
        "This AI assistant provides general legal information for educational purposes only. "
        "It is not a substitute for professional legal advice. "
        "For specific legal advice, please consult with a licensed attorney in your jurisdiction. "
        "No attorney-client relationship is formed through use of this service."
    ),
    AgentCategory.FINANCIAL: (
        "This AI assistant provides general financial information for educational purposes only. "
        "It is not personalized financial advice. Investment decisions should be made "
        "in consultation with qualified financial advisors. Past performance does not "
        "guarantee future results. All investments carry risk."
    ),
    AgentCategory.CONSULTING: (
        "This AI assistant provides general consulting insights based on available data. "
        "Recommendations should be validated with industry experts and adapted to your "
        "specific business context before implementation."
    ),
    "default": (
        "This AI assistant provides information based on its training data. "
        "Always verify important information and consult with appropriate professionals "
        "for critical decisions. Results may vary based on individual circumstances."
    )
}


class PricingModel(str, Enum):
    """Agent pricing models."""
    PER_USE = "per_use"
    SUBSCRIPTION = "subscription"
    TIERED = "tiered"
    FREEMIUM = "freemium"
    CUSTOM = "custom"


class AgentMetadata(BaseModel):
    """Agent metadata model."""
    id: UUID = Field(default_factory=uuid4)
    name: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    category: AgentCategory
    version: str = Field(default="1.0.0")
    author: str
    pricing_model: PricingModel
    price_per_use: Optional[float] = Field(None, ge=0)
    subscription_price: Optional[float] = Field(None, ge=0)
    tags: List[str] = Field(default_factory=list)
    capabilities: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    status: AgentStatus = Field(default=AgentStatus.ACTIVE)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    disclaimer: Optional[str] = None
    
    @field_validator('tags', 'capabilities', 'limitations')
    @classmethod
    def validate_list_items(cls, v):
        """Ensure list items are non-empty strings."""
        return [item.strip() for item in v if item.strip()]


class AgentInput(BaseModel):
    """Base input schema for agents."""
    user_id: UUID
    session_id: Optional[UUID] = Field(default_factory=uuid4)
    input_data: Dict[str, Any]
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AgentOutput(BaseModel):
    """Base output schema for agents."""
    agent_id: UUID
    session_id: UUID
    success: bool
    output_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time: float = 0.0
    tokens_used: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)


class PerformanceMetrics(BaseModel):
    """Agent performance tracking."""
    total_executions: int = 0
    successful_executions: int = 0
    failed_executions: int = 0
    average_execution_time: float = 0.0
    average_tokens_used: float = 0.0
    total_revenue: float = 0.0
    user_satisfaction_score: float = 0.0
    last_execution: Optional[datetime] = None


def track_performance(func):
    """Decorator to track agent performance."""
    @wraps(func)
    async def wrapper(self, *args, **kwargs):
        start_time = time.time()
        try:
            result = await func(self, *args, **kwargs)
            execution_time = time.time() - start_time
            
            # Update performance metrics
            self._performance.total_executions += 1
            self._performance.successful_executions += 1
            self._performance.average_execution_time = (
                (self._performance.average_execution_time * (self._performance.total_executions - 1) + execution_time) /
                self._performance.total_executions
            )
            self._performance.last_execution = datetime.utcnow()
            
            # Add execution time to result
            if isinstance(result, AgentOutput):
                result.execution_time = execution_time
            
            return result
        except Exception as e:
            self._performance.total_executions += 1
            self._performance.failed_executions += 1
            self._performance.last_execution = datetime.utcnow()
            raise
    
    return wrapper


class BaseAIAgent(ABC):
    """Abstract base class for all AI agents in the marketplace."""
    
    def __init__(self, metadata: AgentMetadata):
        """Initialize base agent.
        
        Args:
            metadata: Agent metadata configuration
        """
        # Set category-specific disclaimer if not provided
        if not metadata.disclaimer:
            metadata.disclaimer = CATEGORY_DISCLAIMERS.get(
                metadata.category, 
                CATEGORY_DISCLAIMERS["default"]
            )
        
        self.metadata = metadata
        self._performance = PerformanceMetrics()
        self._is_initialized = False
        self._claude_client = None  # Will be injected by registry
        
    async def initialize(self):
        """Initialize agent resources."""
        if self._is_initialized:
            return
            
        try:
            await self._setup()
            self._is_initialized = True
            logger.info(f"Initialized agent: {self.metadata.name}")
        except Exception as e:
            logger.error(f"Failed to initialize agent {self.metadata.name}: {str(e)}")
            raise AgentExecutionError(f"Agent initialization failed: {str(e)}")
    
    @abstractmethod
    async def _setup(self):
        """Agent-specific setup logic."""
        pass
    
    @abstractmethod
    def get_input_schema(self) -> Type[BaseModel]:
        """Get the input schema for this agent."""
        pass
    
    @abstractmethod
    def get_output_schema(self) -> Type[BaseModel]:
        """Get the output schema for this agent."""
        pass
    
    @abstractmethod
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute agent logic.
        
        Args:
            input_data: Validated input data
            
        Returns:
            AgentOutput with results
        """
        pass
    
    @track_performance
    async def execute(self, input_data: Dict[str, Any], user_id: UUID) -> AgentOutput:
        """Execute agent with validation and error handling.
        
        Args:
            input_data: Raw input data
            user_id: User ID making the request
            
        Returns:
            AgentOutput with results
        """
        if not self._is_initialized:
            await self.initialize()
        
        # Validate status
        if self.metadata.status not in [AgentStatus.ACTIVE, AgentStatus.BETA]:
            raise AgentExecutionError(f"Agent {self.metadata.name} is not available")
        
        try:
            # Create agent input
            agent_input = AgentInput(
                user_id=user_id,
                input_data=input_data
            )
            
            # Validate input against schema
            input_schema = self.get_input_schema()
            if input_schema:
                try:
                    validated_input = input_schema(**input_data)
                    agent_input.input_data = validated_input.model_dump()
                except Exception as e:
                    raise AgentValidationError(f"Invalid input: {str(e)}")
            
            # Execute agent logic
            result = await self._execute(agent_input)
            result.agent_id = self.metadata.id
            
            # Always include disclaimer in metadata
            result.metadata["disclaimer"] = self.metadata.disclaimer
            
            return result
            
        except (AgentValidationError, AgentExecutionError, AgentAuthorizationError):
            raise
        except Exception as e:
            logger.error(f"Agent execution error: {str(e)}")
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=agent_input.session_id,
                success=False,
                error=str(e)
            )
    
    async def validate_access(self, user_id: UUID) -> bool:
        """Validate user access to this agent.
        
        Args:
            user_id: User ID to validate
            
        Returns:
            True if user has access
        """
        # This will be implemented with actual database checks
        # For now, return True for active agents
        return self.metadata.status == AgentStatus.ACTIVE
    
    def get_performance_metrics(self) -> PerformanceMetrics:
        """Get current performance metrics."""
        return self._performance
    
    async def update_version(self, new_version: str):
        """Update agent version."""
        self.metadata.version = new_version
        self.metadata.updated_at = datetime.utcnow()
        
    async def deprecate(self):
        """Mark agent as deprecated."""
        self.metadata.status = AgentStatus.DEPRECATED
        self.metadata.updated_at = datetime.utcnow()
    
    async def claude_completion(self, prompt: str, **kwargs) -> str:
        """Make a completion request to Claude Opus 4.
        
        Args:
            prompt: The prompt to send
            **kwargs: Additional parameters for the API
            
        Returns:
            The completion response
        """
        try:
            # Add agent-specific system prompt
            system_prompt = f"""You are {self.metadata.name}, an AI assistant specialized in {self.metadata.category.value}.

{self.metadata.description}

Important: {self.metadata.disclaimer}"""
            
            # Make the API call
            response = await ai_service.complete(
                prompt=prompt,
                system_prompt=system_prompt,
                **kwargs
            )
            
            return response
        except Exception as e:
            logger.error(f"Claude API error: {str(e)}")
            raise AgentExecutionError(f"AI model error: {str(e)}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert agent to dictionary representation."""
        return {
            "metadata": self.metadata.model_dump(),
            "performance": self._performance.model_dump(),
            "input_schema": self.get_input_schema().model_json_schema() if self.get_input_schema() else None,
            "output_schema": self.get_output_schema().model_json_schema() if self.get_output_schema() else None,
        }
    
    def __repr__(self) -> str:
        """String representation of agent."""
        return f"<{self.__class__.__name__} {self.metadata.name} v{self.metadata.version}>"


class AgentCapability(str, Enum):
    """Agent capability enumeration."""
    TEXT_GENERATION = "text_generation"
    ANALYSIS = "analysis"
    RESEARCH = "research"
    EDUCATION = "education"
    CONSULTATION = "consultation"
    REAL_TIME_PROCESSING = "real_time_processing"
    IOT_INTEGRATION = "iot_integration"
    VOICE_SYNTHESIS = "voice_synthesis"
    AUDIO_PROCESSING = "audio_processing"
    IMAGE_PROCESSING = "image_processing"
    VIDEO_PROCESSING = "video_processing"
    DATA_VISUALIZATION = "data_visualization"
    CODE_GENERATION = "code_generation"
    AUTOMATION = "automation"
    TRANSLATION = "translation"


class AgentResponse(BaseModel):
    """Standard response from agent processing."""
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    suggestions: List[str] = Field(default_factory=list)
    references: List[Dict[str, str]] = Field(default_factory=list)
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0)
    processing_time: float = Field(default=0.0)
    tokens_used: int = Field(default=0)
    audio_url: Optional[str] = None
    visualizations: List[Dict[str, Any]] = Field(default_factory=list)


class BaseAgent(BaseAIAgent):
    """Simplified base agent class for specialized agents."""
    
    def __init__(
        self,
        name: str,
        description: str,
        category: str,
        subcategory: str = "",
        version: str = "1.0.0",
        capabilities: List[AgentCapability] = None,
        tags: List[str] = None,
        pricing_model: PricingModel = PricingModel.PER_USE,
        price_per_use: float = 0.1
    ):
        """Initialize base agent with simplified parameters."""
        capabilities = capabilities or []
        tags = tags or []
        
        metadata = AgentMetadata(
            name=name,
            description=description,
            category=AgentCategory.ANALYSIS,  # Default category
            version=version,
            author="LOGOS Ecosystem",
            pricing_model=pricing_model,
            price_per_use=price_per_use,
            tags=tags,
            capabilities=[cap.value for cap in capabilities],
            limitations=[]
        )
        
        # Map category string to enum
        category_map = {
            "medical": AgentCategory.MEDICAL,
            "legal": AgentCategory.LEGAL,
            "financial": AgentCategory.FINANCIAL,
            "consulting": AgentCategory.CONSULTING,
            "science": AgentCategory.ANALYSIS,
            "education": AgentCategory.TUTORING,
            "technology": AgentCategory.SOFTWARE_DEVELOPMENT,
            "business": AgentCategory.CONSULTING,
            "arts": AgentCategory.DESIGN,
            "sports": AgentCategory.FITNESS,
            "real_estate": AgentCategory.CONSULTING,
            "agriculture": AgentCategory.ANALYSIS,
            "transportation": AgentCategory.ANALYSIS,
            "research": AgentCategory.ACADEMIC_RESEARCH
        }
        
        if category.lower() in category_map:
            metadata.category = category_map[category.lower()]
        
        super().__init__(metadata)
        self.name = name
        self.description = description
        self.category = category
        self.subcategory = subcategory
        self.version = version
        self.capabilities = capabilities
        self.tags = tags
    
    async def _setup(self):
        """Default setup - can be overridden by subclasses."""
        pass
    
    def get_input_schema(self) -> Type[BaseModel]:
        """Default input schema."""
        return AgentInput
    
    def get_output_schema(self) -> Type[BaseModel]:
        """Default output schema."""
        return AgentOutput
    
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute agent by processing the request."""
        try:
            # Extract user input
            user_input = input_data.input_data.get("message", "")
            if not user_input:
                user_input = input_data.input_data.get("query", "")
            if not user_input:
                user_input = str(input_data.input_data)
            
            # Process the request
            response = await self.process_request(
                user_input=user_input,
                user_id=input_data.user_id,
                session_id=input_data.session_id,
                context=input_data.context
            )
            
            # Convert to AgentOutput
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=True,
                output_data={
                    "content": response.content,
                    "metadata": response.metadata,
                    "suggestions": response.suggestions,
                    "references": response.references,
                    "confidence_score": response.confidence_score,
                    "audio_url": response.audio_url,
                    "visualizations": response.visualizations
                },
                tokens_used=response.tokens_used,
                execution_time=response.processing_time
            )
        except Exception as e:
            logger.error(f"Error in agent execution: {str(e)}")
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=False,
                error=str(e)
            )
    
    async def process_request(
        self,
        user_input: str,
        user_id: UUID,
        session_id: Optional[UUID] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Process a user request and return a response."""
        start_time = time.time()
        
        try:
            # Get enhanced system prompt
            system_prompt = self._get_enhanced_system_prompt(context)
            
            # Make Claude API call
            response = await self.claude_completion(
                prompt=user_input,
                system_prompt=system_prompt,
                max_tokens=2000
            )
            
            # Extract metadata from response
            metadata = self._extract_metadata(response, context)
            
            # Generate suggestions
            suggestions = self._generate_suggestions(response, context)
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            return AgentResponse(
                content=response,
                metadata=metadata,
                suggestions=suggestions,
                references=[],
                confidence_score=0.95,
                processing_time=processing_time,
                tokens_used=len(response.split()) * 2  # Rough estimate
            )
        except Exception as e:
            logger.error(f"Error processing request: {str(e)}")
            raise AgentExecutionError(f"Failed to process request: {str(e)}")
    
    def _get_enhanced_system_prompt(self, context: Optional[Dict[str, Any]] = None) -> str:
        """Get enhanced system prompt for the agent."""
        base_prompt = f"""You are {self.name}, a specialized AI agent in the {self.category} domain.
        
{self.description}

Key capabilities: {', '.join([cap.value for cap in self.capabilities])}

Always provide accurate, helpful, and relevant information within your domain of expertise.
Be clear about any limitations or when information falls outside your specialized knowledge."""
        
        return base_prompt
    
    def _extract_metadata(self, response: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Extract metadata from the response."""
        metadata = {
            "agent_name": self.name,
            "category": self.category,
            "subcategory": self.subcategory,
            "response_length": len(response),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if context:
            metadata["context_provided"] = True
        
        return metadata
    
    def _generate_suggestions(self, response: str, context: Optional[Dict[str, Any]] = None) -> List[str]:
        """Generate follow-up suggestions based on the response."""
        # Default implementation - can be overridden by subclasses
        return []