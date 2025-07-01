"""AI and Machine Learning Research Agent for LOGOS ECOSYSTEM."""

from typing import List, Dict, Any, Optional, Type
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator

from ....base_agent import (, AgentStatus, PricingModel
    BaseAIAgent, AgentMetadata, AgentCategory, PricingModel,
    AgentStatus, AgentInput, AgentOutput
)
from ....ai.ai_integration import ai_service
from .....shared.utils.logger import get_logger

logger = get_logger(__name__)


class AIResearchInput(BaseModel):
    """Input schema for AI research queries."""
    research_area: str = Field(..., description="Specific AI/ML research area")
    query_type: str = Field(..., description="Type of research query")
    detail_level: str = Field(default="intermediate", description="Level of technical detail")
    include_code: bool = Field(default=True, description="Include code examples")
    include_papers: bool = Field(default=True, description="Include paper references")
    implementation_focus: Optional[str] = Field(None, description="Specific framework (TensorFlow, PyTorch, etc.)")
    
    @field_validator('query_type')
    @classmethod
    def validate_query_type(cls, v):
        valid_types = [
            'algorithm_explanation', 'architecture_design', 'optimization',
            'implementation', 'paper_analysis', 'comparison', 'troubleshooting',
            'best_practices', 'ethics', 'future_trends'
        ]
        if v.lower() not in valid_types:
            raise ValueError(f"Query type must be one of {valid_types}")
        return v.lower()
    
    @field_validator('detail_level')
    @classmethod
    def validate_detail_level(cls, v):
        valid_levels = ['beginner', 'intermediate', 'advanced', 'research']
        if v.lower() not in valid_levels:
            raise ValueError(f"Detail level must be one of {valid_levels}")
        return v.lower()


class AIResearchOutput(BaseModel):
    """Output schema for AI research results."""
    summary: str = Field(..., description="Executive summary of findings")
    detailed_explanation: str = Field(..., description="Comprehensive explanation")
    key_concepts: List[Dict[str, str]] = Field(..., description="Key concepts explained")
    implementation_guide: Optional[str] = Field(None, description="Implementation guidance")
    code_examples: Optional[List[Dict[str, str]]] = Field(None, description="Code examples")
    paper_references: Optional[List[Dict[str, str]]] = Field(None, description="Relevant papers")
    best_practices: List[str] = Field(default=[], description="Best practices")
    common_pitfalls: List[str] = Field(default=[], description="Common pitfalls to avoid")
    future_directions: List[str] = Field(default=[], description="Future research directions")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence in analysis")
    key_concepts: List[Dict[str, str]] = Field(..., description="Important concepts explained")
    algorithms: List[Dict[str, Any]] = Field(default=[], description="Relevant algorithms")
    code_examples: List[Dict[str, str]] = Field(default=[], description="Implementation examples")
    paper_references: List[Dict[str, str]] = Field(default=[], description="Academic papers")
    practical_applications: List[str] = Field(default=[], description="Real-world applications")
    limitations: List[str] = Field(default=[], description="Known limitations")
    future_directions: List[str] = Field(default=[], description="Future research directions")
    resources: List[Dict[str, str]] = Field(default=[], description="Additional learning resources")


class AIResearchAgent(BaseAgent):
    """AI agent specialized in artificial intelligence and machine learning research."""
    
    def __init__(self):
        metadata = AgentMetadata(
            name="AI & Machine Learning Research Expert",
            description="Advanced AI agent for deep technical insights into machine learning, deep learning, neural networks, and AI research. Provides cutting-edge knowledge, implementation guidance, and research analysis.",
            category=AgentCategory.DATA_SCIENCE,
            version="1.0.0",
            author="LOGOS AI Research Team",
            pricing_model=PricingModel.PER_USE,
            price_per_use=3.00,
            tags=["AI", "machine learning", "deep learning", "research", "neural networks", "algorithms"],
            capabilities=[
                "Explain complex ML algorithms and theory",
                "Design neural network architectures",
                "Analyze research papers and trends",
                "Provide implementation guidance",
                "Compare ML frameworks and tools",
                "Optimize model performance",
                "Address AI ethics and safety",
                "Suggest research directions",
                "Debug ML implementations",
                "Explain state-of-the-art techniques"
            ],
            limitations=[
                "Cannot train actual models",
                "Research advice based on knowledge cutoff",
                "Cannot access proprietary research",
                "Implementation guidance requires testing"
            ],
            status=AgentStatus.ACTIVE,
            disclaimer="AI research guidance is based on published knowledge. Always verify implementations and consider ethical implications. For production systems, consult with ML engineers and conduct thorough testing."
        )
        super().__init__(metadata)
        
        self._research_areas = {}
        self._algorithm_database = {}
    
    async def _setup(self):
        """Initialize AI research knowledge base."""
        self._research_areas = {
            "supervised_learning": ["classification", "regression", "ensemble methods"],
            "unsupervised_learning": ["clustering", "dimensionality reduction", "anomaly detection"],
            "deep_learning": ["CNN", "RNN", "Transformer", "GAN", "VAE"],
            "reinforcement_learning": ["Q-learning", "Policy Gradient", "Actor-Critic"],
            "meta_learning": ["few-shot learning", "zero-shot learning", "transfer learning"],
            "ai_safety": ["alignment", "interpretability", "robustness", "fairness"]
        }
        
        self._algorithm_database = {
            "optimization": ["SGD", "Adam", "RMSprop", "AdaGrad", "LAMB"],
            "architectures": ["ResNet", "BERT", "GPT", "Vision Transformer", "YOLO"],
            "techniques": ["attention", "batch normalization", "dropout", "data augmentation"]
        }
        
        logger.info("AI Research agent initialized with knowledge base")
    
    def get_input_schema(self) -> Type[BaseModel]:
        """Get the input schema for this agent."""
        return AIResearchInput
    
    def get_output_schema(self) -> Type[BaseModel]:
        """Get the output schema for this agent."""
        return AIResearchOutput
    
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute AI research analysis with real Claude integration."""
        try:
            # Validate input
            research_input = AIResearchInput(**input_data.input_data)
            
            # Create comprehensive research prompt
            prompt = await self._create_research_prompt(research_input)
            
            # Get real AI analysis from Claude
            from ....ai.ai_integration import ai_service
            
            system_prompt = """You are an expert AI/ML researcher with deep knowledge of:
            - Machine Learning algorithms and theory
            - Deep Learning architectures (CNN, RNN, Transformer, etc.)
            - Neural network optimization techniques
            - State-of-the-art research papers and trends
            - Implementation best practices across frameworks
            - AI ethics, safety, and alignment
            
            Provide detailed, technically accurate responses with practical insights."""
            
            ai_response = await ai_service.complete(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.4,  # Balanced for technical accuracy
                max_tokens=4000
            )
            
            # Parse the AI response into structured format
            structured_prompt = f"""Based on this AI research analysis:
            
            {ai_response}
            
            Extract and structure the information into the following JSON format:
            {{
                "summary": "Executive summary (2-3 sentences)",
                "detailed_explanation": "Comprehensive technical explanation",
                "key_concepts": [
                    {{"concept": "name", "explanation": "detailed explanation"}}
                ],
                "algorithms": [
                    {{
                        "name": "algorithm name",
                        "description": "what it does",
                        "use_cases": ["use case 1", "use case 2"],
                        "complexity": "time/space complexity",
                        "advantages": ["advantage 1"],
                        "disadvantages": ["disadvantage 1"]
                    }}
                ],
                "code_examples": [
                    {{
                        "title": "example title",
                        "language": "python",
                        "framework": "pytorch/tensorflow/etc",
                        "code": "actual code",
                        "explanation": "what the code does"
                    }}
                ],
                "paper_references": [
                    {{
                        "title": "paper title",
                        "authors": "Author et al.",
                        "year": "YYYY",
                        "venue": "conference/journal",
                        "arxiv_link": "if available",
                        "relevance": "why this paper matters"
                    }}
                ],
                "practical_applications": ["application 1", "application 2"],
                "limitations": ["limitation 1", "limitation 2"],
                "future_directions": ["research direction 1", "research direction 2"],
                "resources": [
                    {{
                        "type": "Course/Book/Tool/Framework",
                        "name": "resource name",
                        "description": "brief description",
                        "url": "if applicable"
                    }}
                ],
                "implementation_tips": ["tip 1", "tip 2"],
                "common_pitfalls": ["pitfall 1", "pitfall 2"],
                "best_practices": ["practice 1", "practice 2"],
                "confidence_score": 0.85
            }}
            
            Ensure all content is technically accurate and practically useful.
            Include specific details, not generic information.
            """
            
            structured_response = await ai_service.complete(
                prompt=structured_prompt,
                temperature=0.2,  # Lower temperature for structured extraction
                max_tokens=3000
            )
            
            # Parse JSON response
            import json
            try:
                research_results = json.loads(structured_response)
            except json.JSONDecodeError:
                # Fallback to parsing the original response
                research_results = await self._parse_research_results(ai_response, research_input)
            
            # Ensure all required fields are present
            research_results.setdefault('confidence_score', 0.85)
            research_results.setdefault('best_practices', [])
            research_results.setdefault('common_pitfalls', [])
            research_results.setdefault('implementation_tips', [])
            
            # Create output with all fields
            output = AIResearchOutput(
                summary=research_results.get("summary", "AI research analysis completed"),
                detailed_explanation=research_results.get("detailed_explanation", ai_response),
                key_concepts=research_results.get("key_concepts", []),
                algorithms=research_results.get("algorithms", []),
                code_examples=research_results.get("code_examples", []),
                paper_references=research_results.get("paper_references", []),
                practical_applications=research_results.get("practical_applications", []),
                limitations=research_results.get("limitations", []),
                future_directions=research_results.get("future_directions", []),
                resources=research_results.get("resources", []),
                best_practices=research_results.get("best_practices", []),
                common_pitfalls=research_results.get("common_pitfalls", []),
                confidence_score=research_results.get("confidence_score", 0.85)
            )
            
            # Calculate approximate tokens used
            tokens_used = len(prompt.split()) + len(ai_response.split()) + len(structured_response.split())
            
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=True,
                output_data=output.model_dump(),
                tokens_used=tokens_used,
                execution_time=0.0,  # Will be set by base class
                usage_metrics={
                    "model": ai_service.model,
                    "temperature": 0.4,
                    "research_area": research_input.research_area,
                    "query_type": research_input.query_type
                }
            )
            
        except Exception as e:
            logger.error(f"AI research analysis error: {str(e)}")
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=False,
                error=str(e),
                execution_time=0.0
            )
    
    async def _create_research_prompt(self, research_input: AIResearchInput) -> str:
        """Create a comprehensive prompt for AI research."""
        prompt = f"""
        Provide expert analysis on the following AI/ML research topic:
        
        Research Area: {research_input.research_area}
        Query Type: {research_input.query_type}
        Technical Level: {research_input.detail_level}
        
        Requirements:
        - Include code examples: {research_input.include_code}
        - Include paper references: {research_input.include_papers}
        """
        
        if research_input.implementation_focus:
            prompt += f"\n- Focus on {research_input.implementation_focus} implementation"
        
        prompt += """
        
        Please provide:
        1. Executive summary of the topic
        2. Detailed technical explanation
        3. Key algorithms and techniques
        4. Implementation considerations
        5. Current research trends
        6. Practical applications
        7. Known limitations and challenges
        8. Future research directions
        
        Format the response clearly with proper technical depth.
        """
        
        return prompt
    
    async def _parse_research_results(
        self,
        ai_response: str,
        research_input: AIResearchInput
    ) -> Dict[str, Any]:
        """Parse AI response into structured research results (fallback method)."""
        # This is a fallback parser when JSON extraction fails
        # Extract key sections from the AI response
        
        results = {
            "summary": self._extract_section(ai_response, "summary", default=f"Analysis of {research_input.research_area}"),
            "detailed_explanation": self._extract_section(ai_response, "explanation", default=ai_response[:1000]),
            "key_concepts": self._extract_concepts(ai_response),
            "algorithms": self._extract_algorithms(ai_response),
            "code_examples": [],
            "paper_references": [],
            "practical_applications": self._extract_list_items(ai_response, "applications"),
            "limitations": self._extract_list_items(ai_response, "limitations"),
            "future_directions": self._extract_list_items(ai_response, "future"),
            "resources": self._extract_resources(ai_response),
            "best_practices": self._extract_list_items(ai_response, "best practices"),
            "common_pitfalls": self._extract_list_items(ai_response, "pitfalls"),
            "implementation_tips": self._extract_list_items(ai_response, "tips"),
            "confidence_score": 0.75  # Lower confidence for parsed results
        }
        
        # Add framework-specific code examples if requested
        if research_input.include_code:
            framework = research_input.implementation_focus or "pytorch"
            results["code_examples"] = self._generate_code_examples(research_input.research_area, framework)
        
        # Add relevant papers if requested
        if research_input.include_papers:
            results["paper_references"] = self._get_relevant_papers(research_input.research_area)
        
        return results
    
    def _extract_section(self, text: str, section: str, default: str = "") -> str:
        """Extract a section from text."""
        import re
        pattern = rf"{section}[:\s]*([^\n]+)"
        match = re.search(pattern, text, re.IGNORECASE)
        return match.group(1).strip() if match else default
    
    def _extract_concepts(self, text: str) -> List[Dict[str, str]]:
        """Extract key concepts from text."""
        concepts = []
        concept_keywords = ["algorithm", "technique", "method", "approach", "architecture", "model"]
        
        for keyword in concept_keywords:
            import re
            pattern = rf"{keyword}[:\s]+([^\.,]+)"
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches[:3]:  # Limit to 3 per keyword
                concepts.append({
                    "concept": match.strip().title(),
                    "explanation": f"Key {keyword} in the research area"
                })
        
        return concepts[:10]  # Return top 10 concepts
    
    def _extract_algorithms(self, text: str) -> List[Dict[str, Any]]:
        """Extract algorithm information from text."""
        algorithms = []
        # Common ML algorithms to look for
        common_algorithms = [
            "gradient descent", "backpropagation", "adam", "sgd", 
            "convolution", "pooling", "attention", "transformer",
            "lstm", "gru", "rnn", "cnn", "gan", "vae"
        ]
        
        for algo in common_algorithms:
            if algo.lower() in text.lower():
                algorithms.append({
                    "name": algo.upper() if len(algo) <= 4 else algo.title(),
                    "description": f"Core algorithm for machine learning",
                    "use_cases": ["Training neural networks", "Optimization"],
                    "complexity": "Varies by implementation",
                    "advantages": ["Widely supported", "Well-documented"],
                    "disadvantages": ["May require tuning"]
                })
        
        return algorithms[:5]  # Return top 5 algorithms
    
    def _extract_list_items(self, text: str, keyword: str) -> List[str]:
        """Extract list items related to a keyword."""
        import re
        items = []
        # Look for bullet points or numbered lists after keyword
        pattern = rf"{keyword}[:\s]*([\s\S]*?)(?:\n\n|$)"
        match = re.search(pattern, text, re.IGNORECASE)
        
        if match:
            content = match.group(1)
            # Extract items from bullets or numbers
            item_pattern = r"(?:[-•*]|\d+\.?)\s*([^\n]+)"
            items = re.findall(item_pattern, content)
            items = [item.strip() for item in items if len(item.strip()) > 10]
        
        return items[:5]  # Return top 5 items
    
    def _extract_resources(self, text: str) -> List[Dict[str, str]]:
        """Extract learning resources from text."""
        resources = []
        resource_types = ["book", "course", "paper", "tutorial", "framework", "library"]
        
        for rtype in resource_types:
            import re
            pattern = rf"{rtype}[:\s]+([^\.,\n]+)"
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches[:2]:  # Limit to 2 per type
                resources.append({
                    "type": rtype.title(),
                    "name": match.strip(),
                    "description": f"Recommended {rtype} for learning"
                })
        
        return resources[:8]  # Return top 8 resources
    
    def _generate_code_examples(self, research_area: str, framework: str) -> List[Dict[str, str]]:
        """Generate relevant code examples based on research area."""
        examples = []
        
        # Basic neural network example (always relevant)
        if framework.lower() == "pytorch":
            examples.append({
                "title": "Basic Neural Network in PyTorch",
                "language": "python",
                "framework": "pytorch",
                "code": """import torch
import torch.nn as nn
import torch.optim as optim

class NeuralNetwork(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super(NeuralNetwork, self).__init__()
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.2)
        self.fc2 = nn.Linear(hidden_size, output_size)
        
    def forward(self, x):
        x = self.fc1(x)
        x = self.relu(x)
        x = self.dropout(x)
        x = self.fc2(x)
        return x

# Training loop
model = NeuralNetwork(784, 256, 10)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)""",
                "explanation": "Basic feedforward neural network with dropout for regularization"
            })
        elif framework.lower() == "tensorflow":
            examples.append({
                "title": "Basic Neural Network in TensorFlow",
                "language": "python",
                "framework": "tensorflow",
                "code": """import tensorflow as tf
from tensorflow import keras

# Build model
model = keras.Sequential([
    keras.layers.Dense(256, activation='relu', input_shape=(784,)),
    keras.layers.Dropout(0.2),
    keras.layers.Dense(10, activation='softmax')
])

# Compile model
model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)""",
                "explanation": "Sequential model with dropout layer for classification"
            })
        
        # Add specific examples based on research area
        if "transformer" in research_area.lower() or "attention" in research_area.lower():
            examples.append({
                "title": "Self-Attention Mechanism",
                "language": "python",
                "framework": framework,
                "code": """import torch
import torch.nn as nn
import math

class SelfAttention(nn.Module):
    def __init__(self, embed_dim, num_heads=8):
        super(SelfAttention, self).__init__()
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.head_dim = embed_dim // num_heads
        
        self.query = nn.Linear(embed_dim, embed_dim)
        self.key = nn.Linear(embed_dim, embed_dim)
        self.value = nn.Linear(embed_dim, embed_dim)
        self.out = nn.Linear(embed_dim, embed_dim)
        
    def forward(self, x):
        batch_size, seq_len, embed_dim = x.shape
        
        # Linear transformations
        Q = self.query(x)
        K = self.key(x)
        V = self.value(x)
        
        # Reshape for multi-head attention
        Q = Q.view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        K = K.view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        V = V.view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        
        # Scaled dot-product attention
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.head_dim)
        attention = torch.softmax(scores, dim=-1)
        context = torch.matmul(attention, V)
        
        # Reshape and project
        context = context.transpose(1, 2).contiguous().view(batch_size, seq_len, embed_dim)
        output = self.out(context)
        
        return output""",
                "explanation": "Multi-head self-attention mechanism used in Transformers"
            })
        
        return examples
    
    def _get_relevant_papers(self, research_area: str) -> List[Dict[str, str]]:
        """Get relevant research papers based on the area."""
        # General important papers
        papers = [
            {
                "title": "Attention Is All You Need",
                "authors": "Vaswani et al.",
                "year": "2017",
                "venue": "NeurIPS",
                "arxiv_link": "https://arxiv.org/abs/1706.03762",
                "relevance": "Introduced the Transformer architecture"
            },
            {
                "title": "Deep Residual Learning for Image Recognition",
                "authors": "He et al.",
                "year": "2016",
                "venue": "CVPR",
                "arxiv_link": "https://arxiv.org/abs/1512.03385",
                "relevance": "Introduced ResNet and skip connections"
            }
        ]
        
        # Add area-specific papers
        area_lower = research_area.lower()
        
        if "gan" in area_lower or "generative" in area_lower:
            papers.append({
                "title": "Generative Adversarial Networks",
                "authors": "Goodfellow et al.",
                "year": "2014",
                "venue": "NeurIPS",
                "arxiv_link": "https://arxiv.org/abs/1406.2661",
                "relevance": "Introduced GANs for generative modeling"
            })
        
        if "bert" in area_lower or "language" in area_lower:
            papers.append({
                "title": "BERT: Pre-training of Deep Bidirectional Transformers",
                "authors": "Devlin et al.",
                "year": "2018",
                "venue": "NAACL",
                "arxiv_link": "https://arxiv.org/abs/1810.04805",
                "relevance": "Revolutionary pre-training for NLP"
            })
        
        if "reinforcement" in area_lower:
            papers.append({
                "title": "Human-level control through deep reinforcement learning",
                "authors": "Mnih et al.",
                "year": "2015",
                "venue": "Nature",
                "relevance": "DQN breakthrough in RL"
            })
        
        return papers[:5]  # Return top 5 papers