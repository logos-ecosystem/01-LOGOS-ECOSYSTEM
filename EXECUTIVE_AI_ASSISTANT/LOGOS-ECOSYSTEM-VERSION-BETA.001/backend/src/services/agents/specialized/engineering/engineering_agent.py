"""Engineering and Technology AI Agent - Expert in software, hardware, and systems engineering."""

from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import re

from base_agent import BaseAgent, AgentResponse
from src.shared.utils.logger import get_logger

logger = get_logger(__name__)


class EngineeringAgent(BaseAgent):
    """AI Agent specialized in engineering, technology, and technical problem-solving."""
    
    def __init__(self):
        super().__init__(
            agent_id="engineering-tech-expert",
            name="Engineering & Technology Expert",
            description="Advanced AI assistant for software engineering, system design, hardware engineering, and technical architecture",
            category="technology",
            subcategory="engineering",
            version="1.0.0",
            pricing_per_use=0.60,
            pricing_monthly=59.99,
            capabilities=[
                AgentCapability.CODE_GENERATION,
                AgentCapability.ANALYSIS,
                AgentCapability.PROBLEM_SOLVING,
                AgentCapability.TECHNICAL_WRITING
            ],
            tags=["engineering", "software", "hardware", "systems", "architecture", "development", "technical"],
            languages=["en", "zh", "ja", "de", "ru", "ko"],
            expertise_level="expert"
        )
        
        self.specializations = [
            "Software Architecture Design",
            "Cloud Infrastructure",
            "DevOps & CI/CD",
            "Microservices Architecture",
            "Database Design & Optimization",
            "API Design & Development",
            "Security Engineering",
            "Performance Optimization",
            "Machine Learning Engineering",
            "Mobile Development",
            "Embedded Systems",
            "Network Engineering",
            "Blockchain & Web3",
            "IoT Solutions"
        ]
        
        self.supported_languages = [
            "Python", "JavaScript", "TypeScript", "Java", "C++", "C#",
            "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala",
            "R", "MATLAB", "SQL", "Bash", "PowerShell"
        ]
    
    def get_system_prompt(self) -> str:
        """Get the specialized system prompt for engineering."""
        return f"""You are an expert Engineering & Technology AI Assistant with deep knowledge in:

Specializations:
{chr(10).join(f'- {spec}' for spec in self.specializations)}

Programming Languages:
{chr(10).join(f'- {lang}' for lang in self.supported_languages[:10])} (and more)

Your approach:
1. Provide technically accurate and detailed solutions
2. Follow best practices and design patterns
3. Consider scalability, security, and performance
4. Write clean, maintainable, and well-documented code
5. Explain complex concepts clearly
6. Provide multiple solution approaches when applicable
7. Include error handling and edge cases
8. Consider real-world constraints and trade-offs

Technical Standards:
- Follow SOLID principles and clean architecture
- Apply appropriate design patterns
- Ensure code security and prevent vulnerabilities
- Optimize for performance without premature optimization
- Write comprehensive tests and documentation
- Consider CI/CD and deployment strategies

Always provide production-ready solutions with proper error handling, logging, and monitoring considerations."""
    
    async def process_request(
        self,
        user_input: str,
        context: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None
    ) -> AgentResponse:
        """Process an engineering request."""
        try:
            # Detect request type
            request_type = self._detect_request_type(user_input)
            
            # Extract technical requirements
            tech_requirements = self._extract_technical_requirements(user_input, context)
            
            # Enhance prompt based on request type
            enhanced_prompt = self._enhance_prompt(user_input, request_type, tech_requirements)
            
            # Get response from Claude
            response = await self.get_ai_response(
                enhanced_prompt,
                system_prompt=self.get_system_prompt(),
                temperature=0.3 if request_type == "code_generation" else 0.6,
                max_tokens=3000
            )
            
            # Post-process code if needed
            processed_content = self._post_process_response(response.content, request_type)
            
            # Extract technical metadata
            metadata = self._extract_technical_metadata(processed_content, request_type)
            
            return AgentResponse(
                content=processed_content,
                agent_id=self.agent_id,
                usage_tokens=response.usage_tokens,
                metadata={
                    "request_type": request_type,
                    "technical_requirements": tech_requirements,
                    "detected_technologies": metadata.get("technologies", []),
                    "complexity_level": metadata.get("complexity", "medium"),
                    "code_blocks": metadata.get("code_blocks", 0),
                    "patterns_used": metadata.get("patterns", [])
                }
            )
            
        except Exception as e:
            logger.error(f"Error processing engineering request: {str(e)}")
            raise
    
    def _detect_request_type(self, user_input: str) -> str:
        """Detect the type of engineering request."""
        input_lower = user_input.lower()
        
        if any(term in input_lower for term in ["code", "implement", "function", "class", "program"]):
            return "code_generation"
        elif any(term in input_lower for term in ["design", "architect", "structure", "pattern"]):
            return "architecture_design"
        elif any(term in input_lower for term in ["debug", "error", "fix", "issue", "problem"]):
            return "debugging"
        elif any(term in input_lower for term in ["optimize", "performance", "speed", "efficiency"]):
            return "optimization"
        elif any(term in input_lower for term in ["review", "improve", "refactor", "clean"]):
            return "code_review"
        elif any(term in input_lower for term in ["deploy", "ci/cd", "docker", "kubernetes"]):
            return "deployment"
        elif any(term in input_lower for term in ["database", "query", "sql", "nosql"]):
            return "database"
        elif any(term in input_lower for term in ["api", "rest", "graphql", "endpoint"]):
            return "api_design"
        elif any(term in input_lower for term in ["security", "vulnerability", "auth", "encrypt"]):
            return "security"
        else:
            return "general_technical"
    
    def _extract_technical_requirements(self, user_input: str, context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract technical requirements from the input."""
        requirements = {}
        input_lower = user_input.lower()
        
        # Detect programming language
        for lang in self.supported_languages:
            if lang.lower() in input_lower:
                requirements["language"] = lang
                break
        
        # Detect frameworks
        frameworks = {
            "react": "React", "angular": "Angular", "vue": "Vue.js",
            "django": "Django", "flask": "Flask", "fastapi": "FastAPI",
            "spring": "Spring", "express": "Express.js", "rails": "Ruby on Rails"
        }
        
        detected_frameworks = []
        for key, value in frameworks.items():
            if key in input_lower:
                detected_frameworks.append(value)
        
        if detected_frameworks:
            requirements["frameworks"] = detected_frameworks
        
        # Detect specific requirements
        if "async" in input_lower or "concurrent" in input_lower:
            requirements["async"] = True
        
        if "test" in input_lower or "testing" in input_lower:
            requirements["testing"] = True
        
        if "scale" in input_lower or "scalab" in input_lower:
            requirements["scalability"] = True
        
        # Add context requirements
        if context:
            requirements.update(context.get("technical_requirements", {}))
        
        return requirements
    
    def _enhance_prompt(self, user_input: str, request_type: str, tech_requirements: Dict[str, Any]) -> str:
        """Enhance the prompt based on request type and requirements."""
        enhancements = {
            "code_generation": "Generate clean, well-documented code with proper error handling and type hints/annotations where applicable.",
            "architecture_design": "Design a scalable, maintainable architecture following best practices and design patterns.",
            "debugging": "Identify the issue, explain the root cause, and provide a corrected solution with explanations.",
            "optimization": "Analyze performance bottlenecks and provide optimized solutions with benchmarking considerations.",
            "code_review": "Review the code for best practices, potential issues, and provide improvement suggestions.",
            "deployment": "Provide deployment configuration with security, scalability, and monitoring considerations.",
            "database": "Design efficient database schema/queries with indexing and performance considerations.",
            "api_design": "Design RESTful/GraphQL APIs following best practices with proper documentation.",
            "security": "Identify security vulnerabilities and provide secure implementation following OWASP guidelines."
        }
        
        enhancement = enhancements.get(request_type, "Provide comprehensive technical solution with best practices.")
        
        # Add technical requirements
        req_text = ""
        if tech_requirements:
            if "language" in tech_requirements:
                req_text += f"\nLanguage: {tech_requirements['language']}"
            if "frameworks" in tech_requirements:
                req_text += f"\nFrameworks: {', '.join(tech_requirements['frameworks'])}"
            if tech_requirements.get("async"):
                req_text += "\nRequirement: Asynchronous/concurrent implementation"
            if tech_requirements.get("testing"):
                req_text += "\nRequirement: Include unit tests"
            if tech_requirements.get("scalability"):
                req_text += "\nRequirement: Design for high scalability"
        
        return f"{user_input}\n\n{enhancement}{req_text}\n\nProvide production-ready solution with proper documentation."
    
    def _post_process_response(self, content: str, request_type: str) -> str:
        """Post-process the response for better formatting."""
        if request_type == "code_generation":
            # Ensure code blocks are properly formatted
            # Add syntax highlighting hints if missing
            content = re.sub(
                r'```(\w*)\n',
                lambda m: f'```{m.group(1) or "python"}\n',
                content
            )
        
        return content
    
    def _extract_technical_metadata(self, content: str, request_type: str) -> Dict[str, Any]:
        """Extract technical metadata from the response."""
        metadata = {}
        
        # Count code blocks
        code_blocks = len(re.findall(r'```[\w]*\n', content))
        metadata["code_blocks"] = code_blocks
        
        # Detect technologies mentioned
        technologies = []
        tech_keywords = [
            "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Redis", "PostgreSQL",
            "MongoDB", "React", "Vue", "Angular", "Node.js", "Python", "Java"
        ]
        
        content_lower = content.lower()
        for tech in tech_keywords:
            if tech.lower() in content_lower:
                technologies.append(tech)
        
        metadata["technologies"] = technologies[:10]  # Limit to 10
        
        # Detect design patterns
        patterns = []
        pattern_keywords = [
            "Singleton", "Factory", "Observer", "Strategy", "Decorator",
            "MVC", "MVP", "MVVM", "Repository", "Dependency Injection"
        ]
        
        for pattern in pattern_keywords:
            if pattern.lower() in content_lower:
                patterns.append(pattern)
        
        metadata["patterns"] = patterns
        
        # Estimate complexity
        if code_blocks > 3 or len(content) > 2000:
            metadata["complexity"] = "high"
        elif code_blocks > 1 or len(content) > 1000:
            metadata["complexity"] = "medium"
        else:
            metadata["complexity"] = "low"
        
        return metadata
    
    def get_capabilities_detail(self) -> Dict[str, Any]:
        """Get detailed capabilities of the engineering agent."""
        return {
            "specializations": self.specializations,
            "programming_languages": self.supported_languages,
            "frameworks": [
                "React", "Angular", "Vue.js", "Next.js",
                "Django", "Flask", "FastAPI", "Express.js",
                "Spring Boot", "ASP.NET Core", "Ruby on Rails",
                "Laravel", "Symfony", "NestJS"
            ],
            "databases": [
                "PostgreSQL", "MySQL", "MongoDB", "Redis",
                "Cassandra", "Elasticsearch", "DynamoDB",
                "Firebase", "SQLite", "Oracle"
            ],
            "cloud_platforms": [
                "AWS", "Google Cloud", "Azure", "Heroku",
                "DigitalOcean", "Vercel", "Netlify"
            ],
            "devops_tools": [
                "Docker", "Kubernetes", "Jenkins", "GitLab CI",
                "GitHub Actions", "Terraform", "Ansible"
            ],
            "expertise_areas": [
                "Microservices", "Serverless", "Event-Driven",
                "Domain-Driven Design", "Clean Architecture",
                "Test-Driven Development", "Continuous Integration"
            ]
        }
    
    def get_example_queries(self) -> List[Dict[str, str]]:
        """Get example queries for this agent."""
        return [
            {
                "query": "Design a scalable microservices architecture for an e-commerce platform",
                "description": "System architecture design"
            },
            {
                "query": "Implement a rate limiter in Python using Redis",
                "description": "Code implementation with caching"
            },
            {
                "query": "Optimize this SQL query that's running slowly on a table with 10M records",
                "description": "Database optimization"
            },
            {
                "query": "Create a secure REST API with JWT authentication in Node.js",
                "description": "API development with security"
            },
            {
                "query": "Debug this React component that's causing infinite re-renders",
                "description": "Frontend debugging"
            },
            {
                "query": "Set up a CI/CD pipeline with Docker and Kubernetes",
                "description": "DevOps automation"
            }
        ]