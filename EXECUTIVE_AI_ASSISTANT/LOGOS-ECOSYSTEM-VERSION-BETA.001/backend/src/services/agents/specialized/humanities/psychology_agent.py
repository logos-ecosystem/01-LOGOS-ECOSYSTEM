"""Psychology and Mental Health AI Agent - Expert in psychological support and mental wellness."""

from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import re

from base_agent import BaseAgent, AgentResponse
from src.shared.utils.logger import get_logger

logger = get_logger(__name__)


class PsychologyAgent(BaseAgent):
    """AI Agent specialized in psychology, mental health support, and wellness coaching."""
    
    def __init__(self):
        super().__init__(
            agent_id="psychology-wellness-expert",
            name="Psychology & Mental Wellness Expert",
            description="Supportive AI assistant for mental health awareness, psychological insights, and wellness coaching",
            category="health",
            subcategory="mental_health",
            version="1.0.0",
            pricing_per_use=0.75,
            pricing_monthly=69.99,
            capabilities=[
                AgentCapability.CONSULTATION,
                AgentCapability.ANALYSIS,
                AgentCapability.TEXT_GENERATION,
                AgentCapability.EMOTIONAL_SUPPORT
            ],
            tags=["psychology", "mental health", "wellness", "coaching", "support", "mindfulness"],
            languages=["en", "es", "fr", "de", "pt", "it"],
            expertise_level="expert"
        )
        
        self.specializations = [
            "Stress Management",
            "Anxiety Coping Strategies",
            "Emotional Intelligence",
            "Mindfulness & Meditation",
            "Cognitive Behavioral Techniques",
            "Work-Life Balance",
            "Relationship Dynamics",
            "Self-Esteem Building",
            "Habit Formation",
            "Resilience Training",
            "Communication Skills",
            "Grief & Loss Support"
        ]
        
        self.disclaimer = """
IMPORTANT: I am an AI assistant providing general psychological insights and wellness strategies. 
I am NOT a licensed therapist or medical professional. For serious mental health concerns, 
please consult with a qualified healthcare provider. If you're experiencing a crisis, 
please contact emergency services or a crisis helpline immediately.
"""
    
    def get_system_prompt(self) -> str:
        """Get the specialized system prompt for psychology support."""
        return f"""You are a compassionate and knowledgeable Psychology & Mental Wellness AI Assistant.

{self.disclaimer}

Your expertise includes:
{chr(10).join(f'- {spec}' for spec in self.specializations)}

Your approach:
1. Provide empathetic, non-judgmental support
2. Offer evidence-based strategies and techniques
3. Focus on practical, actionable wellness tips
4. Encourage professional help when appropriate
5. Maintain appropriate boundaries
6. Promote positive mental health practices
7. Use inclusive and sensitive language
8. Respect cultural differences in mental health

Guidelines:
- NEVER diagnose mental health conditions
- NEVER prescribe medications
- ALWAYS encourage professional help for serious concerns
- Provide general educational information only
- Focus on wellness, coping strategies, and self-improvement
- Maintain user privacy and confidentiality

Your responses should be warm, supportive, and empowering while remaining professional."""
    
    async def process_request(
        self,
        user_input: str,
        context: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None
    ) -> AgentResponse:
        """Process a psychology/wellness request."""
        try:
            # Check for crisis keywords
            if self._detect_crisis(user_input):
                return self._create_crisis_response()
            
            # Detect request type
            request_type = self._detect_request_type(user_input)
            
            # Add appropriate context
            enhanced_prompt = self._enhance_prompt(user_input, request_type, context)
            
            # Get response from Claude
            response = await self.get_ai_response(
                enhanced_prompt,
                system_prompt=self.get_system_prompt(),
                temperature=0.8,
                max_tokens=1500
            )
            
            # Add disclaimer if needed
            final_content = self._add_appropriate_disclaimer(response.content, request_type)
            
            # Extract insights
            insights = self._extract_psychological_insights(response.content)
            
            return AgentResponse(
                content=final_content,
                agent_id=self.agent_id,
                usage_tokens=response.usage_tokens,
                metadata={
                    "request_type": request_type,
                    "specialization_used": self._identify_specialization(user_input),
                    "insights": insights,
                    "resources_mentioned": self._extract_resources(response.content),
                    "techniques_suggested": self._extract_techniques(response.content)
                }
            )
            
        except Exception as e:
            logger.error(f"Error processing psychology request: {str(e)}")
            raise
    
    def _detect_crisis(self, user_input: str) -> bool:
        """Detect if the user might be in crisis."""
        crisis_keywords = [
            "suicide", "kill myself", "end my life", "not worth living",
            "self-harm", "hurt myself", "cutting", "overdose",
            "no reason to live", "better off dead", "ending it all"
        ]
        
        input_lower = user_input.lower()
        return any(keyword in input_lower for keyword in crisis_keywords)
    
    def _create_crisis_response(self) -> AgentResponse:
        """Create an immediate crisis response."""
        crisis_content = """I'm concerned about what you're sharing, and I want you to know that you don't have to face this alone. Your life has value, and there are people who want to help.

**Please reach out for immediate support:**

🇺🇸 **United States:**
- National Suicide Prevention Lifeline: 988 or 1-800-273-8255
- Crisis Text Line: Text HOME to 741741

🇬🇧 **United Kingdom:**
- Samaritans: 116 123

🇦🇺 **Australia:**
- Lifeline: 13 11 14

🇨🇦 **Canada:**
- Talk Suicide Canada: 1-833-456-4566

**International:**
- International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/

If you're in immediate danger, please call emergency services (911, 112, or your local emergency number) right away.

Remember: This feeling is temporary, but suicide is permanent. There are people who care about you and want to help. Please reach out to someone today."""
        
        return AgentResponse(
            content=crisis_content,
            agent_id=self.agent_id,
            usage_tokens=0,
            metadata={
                "response_type": "crisis_intervention",
                "emergency_resources": True
            }
        )
    
    def _detect_request_type(self, user_input: str) -> str:
        """Detect the type of psychological support needed."""
        input_lower = user_input.lower()
        
        if any(term in input_lower for term in ["stress", "overwhelm", "pressure", "burnout"]):
            return "stress_management"
        elif any(term in input_lower for term in ["anxiety", "worried", "nervous", "panic"]):
            return "anxiety_support"
        elif any(term in input_lower for term in ["depress", "sad", "hopeless", "mood"]):
            return "mood_support"
        elif any(term in input_lower for term in ["relationship", "partner", "marriage", "conflict"]):
            return "relationship_guidance"
        elif any(term in input_lower for term in ["confidence", "self-esteem", "self-worth"]):
            return "self_esteem"
        elif any(term in input_lower for term in ["habit", "change", "improve", "goal"]):
            return "behavior_change"
        elif any(term in input_lower for term in ["mindful", "meditat", "relax", "calm"]):
            return "mindfulness"
        elif any(term in input_lower for term in ["sleep", "insomnia", "rest"]):
            return "sleep_support"
        else:
            return "general_wellness"
    
    def _enhance_prompt(self, user_input: str, request_type: str, context: Optional[Dict[str, Any]]) -> str:
        """Enhance the prompt based on request type."""
        enhancements = {
            "stress_management": "Provide practical stress management techniques including immediate coping strategies and long-term stress reduction methods.",
            "anxiety_support": "Offer anxiety management strategies including breathing exercises, grounding techniques, and cognitive reframing methods.",
            "mood_support": "Suggest mood improvement strategies including behavioral activation, positive psychology techniques, and self-care practices.",
            "relationship_guidance": "Provide relationship insights focusing on communication skills, boundary setting, and conflict resolution.",
            "self_esteem": "Offer self-esteem building exercises including self-compassion practices, achievement recognition, and positive self-talk.",
            "behavior_change": "Provide behavior change strategies using habit formation science, motivation techniques, and goal-setting frameworks.",
            "mindfulness": "Guide through mindfulness practices including meditation techniques, present-moment awareness, and relaxation exercises.",
            "sleep_support": "Offer sleep hygiene tips, relaxation techniques for better sleep, and strategies for managing sleep-related anxiety.",
            "general_wellness": "Provide holistic mental wellness strategies including self-care practices, emotional regulation, and life balance tips."
        }
        
        enhancement = enhancements.get(request_type, "Provide supportive psychological insights and practical wellness strategies.")
        
        # Add context if available
        context_info = ""
        if context:
            if "previous_strategies" in context:
                context_info += f"\nPrevious strategies tried: {context['previous_strategies']}"
            if "duration" in context:
                context_info += f"\nDuration of concern: {context['duration']}"
        
        return f"{user_input}\n\nPlease {enhancement}{context_info}\n\nRemember to be empathetic and provide practical, actionable advice."
    
    def _add_appropriate_disclaimer(self, content: str, request_type: str) -> str:
        """Add appropriate disclaimers based on content."""
        disclaimer_needed = ["mood_support", "anxiety_support", "relationship_guidance"]
        
        if request_type in disclaimer_needed:
            disclaimer = "\n\n💡 **Remember:** These suggestions are for general wellness only. If you're experiencing persistent difficulties, please consider reaching out to a mental health professional who can provide personalized support."
            return content + disclaimer
        
        return content
    
    def _extract_psychological_insights(self, content: str) -> List[str]:
        """Extract key psychological insights from the response."""
        insights = []
        
        # Common insight patterns
        insight_patterns = [
            r"(?:Research shows|Studies indicate|Evidence suggests) that ([^.]+)",
            r"(?:It's important to understand|Key insight:|Understanding) ([^.]+)",
            r"(?:This (?:feeling|behavior|pattern) often indicates) ([^.]+)"
        ]
        
        for pattern in insight_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            insights.extend(matches[:2])  # Limit to 2 per pattern
        
        return insights[:5]  # Return top 5 insights
    
    def _extract_techniques(self, content: str) -> List[str]:
        """Extract suggested techniques from the response."""
        techniques = []
        
        technique_keywords = [
            "breathing exercise", "meditation", "journaling", "grounding technique",
            "cognitive reframing", "progressive relaxation", "mindfulness",
            "visualization", "affirmations", "gratitude practice"
        ]
        
        content_lower = content.lower()
        for keyword in technique_keywords:
            if keyword in content_lower:
                techniques.append(keyword.title())
        
        return techniques
    
    def _extract_resources(self, content: str) -> List[str]:
        """Extract mentioned resources."""
        resources = []
        
        # Look for book mentions, apps, or websites
        if "book" in content.lower():
            resources.append("Book recommendations")
        if "app" in content.lower():
            resources.append("Mobile apps")
        if any(term in content.lower() for term in ["website", "online", "resource"]):
            resources.append("Online resources")
        if "professional" in content.lower() or "therapist" in content.lower():
            resources.append("Professional support")
        
        return resources
    
    def _identify_specialization(self, user_input: str) -> str:
        """Identify which specialization is most relevant."""
        input_lower = user_input.lower()
        
        for spec in self.specializations:
            if spec.lower() in input_lower:
                return spec
        
        # Default mappings
        if "stress" in input_lower:
            return "Stress Management"
        elif "anxiety" in input_lower:
            return "Anxiety Coping Strategies"
        elif "relationship" in input_lower:
            return "Relationship Dynamics"
        elif "confidence" in input_lower:
            return "Self-Esteem Building"
        else:
            return "Emotional Intelligence"
    
    def get_capabilities_detail(self) -> Dict[str, Any]:
        """Get detailed capabilities of the psychology agent."""
        return {
            "specializations": self.specializations,
            "therapeutic_approaches": [
                "Cognitive Behavioral Techniques",
                "Mindfulness-Based Approaches",
                "Positive Psychology",
                "Solution-Focused Strategies",
                "Acceptance and Commitment Concepts",
                "Emotional Intelligence Development"
            ],
            "support_areas": [
                "Stress & Burnout",
                "Anxiety Management",
                "Depression Support",
                "Relationship Issues",
                "Self-Esteem",
                "Life Transitions",
                "Grief & Loss",
                "Work-Life Balance",
                "Personal Growth",
                "Communication Skills"
            ],
            "techniques_offered": [
                "Breathing Exercises",
                "Mindfulness Meditation",
                "Cognitive Reframing",
                "Journaling Prompts",
                "Relaxation Techniques",
                "Goal Setting",
                "Boundary Setting",
                "Self-Compassion Practices"
            ],
            "limitations": [
                "Cannot diagnose mental health conditions",
                "Cannot prescribe medications",
                "Not a replacement for therapy",
                "General guidance only"
            ]
        }
    
    def get_example_queries(self) -> List[Dict[str, str]]:
        """Get example queries for this agent."""
        return [
            {
                "query": "I'm feeling overwhelmed with work stress. What are some immediate coping strategies?",
                "description": "Stress management techniques"
            },
            {
                "query": "How can I build better self-esteem and confidence?",
                "description": "Self-esteem building strategies"
            },
            {
                "query": "I'm having trouble sleeping due to anxiety. Any suggestions?",
                "description": "Sleep and anxiety management"
            },
            {
                "query": "What are some mindfulness exercises I can do during a busy day?",
                "description": "Quick mindfulness practices"
            },
            {
                "query": "How can I improve communication in my relationship?",
                "description": "Relationship communication skills"
            }
        ]