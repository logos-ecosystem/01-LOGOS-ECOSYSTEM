from openai import AsyncOpenAI
import anthropic
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime

from ..core.config import settings
from ..models.chat import ChatResponse, Message, MessageRole, Conversation

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self):
        self.openai_client = None
        self.anthropic_client = None
        
        if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "your_openai_api_key_here":
            self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            
        if settings.ANTHROPIC_API_KEY and settings.ANTHROPIC_API_KEY != "your_anthropic_api_key_here":
            self.anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    async def process_message(
        self,
        message: str,
        conversation: Conversation,
        language: str = "en",
        domain: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> ChatResponse:
        """Process a message through the AI model"""
        
        # Build the system prompt based on domain and language
        system_prompt = self._build_system_prompt(domain, language)
        
        # Prepare messages for the AI model
        messages = self._prepare_messages(system_prompt, conversation, message)
        
        # Select and call the appropriate AI model
        if settings.DEFAULT_AI_MODEL.startswith("gpt") and self.openai_client:
            response_text, tokens = await self._call_openai(messages)
        elif settings.DEFAULT_AI_MODEL.startswith("claude") and self.anthropic_client:
            response_text, tokens = await self._call_anthropic(messages)
        else:
            response_text = "I'm sorry, but no AI model is currently configured. Please check your API keys."
            tokens = 0
        
        return ChatResponse(
            response=response_text,
            conversation_id=conversation.id,
            model_used=settings.DEFAULT_AI_MODEL,
            tokens_used=tokens,
            metadata={
                "domain": domain,
                "language": language
            }
        )
    
    def _build_system_prompt(self, domain: Optional[str], language: str) -> str:
        """Build a system prompt based on domain and language"""
        base_prompt = "You are an Executive AI Assistant, designed to help business leaders make informed decisions and manage their responsibilities effectively."
        
        if language == "es":
            base_prompt = "Eres un Asistente de IA Ejecutivo, diseñado para ayudar a los líderes empresariales a tomar decisiones informadas y gestionar sus responsabilidades de manera efectiva."
        
        domain_prompts = {
            "healthcare": " You have specialized knowledge in healthcare management, medical technology, and health policy.",
            "legal": " You have expertise in corporate law, compliance, contracts, and legal risk management.",
            "sports": " You have knowledge in sports management, athlete performance, and sports business operations."
        }
        
        if language == "es":
            domain_prompts = {
                "healthcare": " Tienes conocimiento especializado en gestión sanitaria, tecnología médica y política de salud.",
                "legal": " Tienes experiencia en derecho corporativo, cumplimiento, contratos y gestión de riesgos legales.",
                "sports": " Tienes conocimiento en gestión deportiva, rendimiento de atletas y operaciones de negocios deportivos."
            }
        
        if domain and domain in domain_prompts:
            base_prompt += domain_prompts[domain]
        
        return base_prompt
    
    def _prepare_messages(self, system_prompt: str, conversation: Conversation, new_message: str) -> List[Dict[str, str]]:
        """Prepare messages for the AI model"""
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history (limit to last 10 messages to manage context)
        for msg in conversation.messages[-10:]:
            messages.append({"role": msg.role.value, "content": msg.content})
        
        # Add the new user message
        messages.append({"role": "user", "content": new_message})
        
        return messages
    
    async def _call_openai(self, messages: List[Dict[str, str]]) -> tuple[str, int]:
        """Call OpenAI API"""
        try:
            response = await self.openai_client.chat.completions.create(
                model=settings.DEFAULT_AI_MODEL,
                messages=messages,
                max_tokens=settings.MAX_TOKENS,
                temperature=settings.TEMPERATURE
            )
            
            return response.choices[0].message.content, response.usage.total_tokens
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            return "I apologize, but I encountered an error processing your request. Please check your OpenAI API key.", 0
    
    async def _call_anthropic(self, messages: List[Dict[str, str]]) -> tuple[str, int]:
        """Call Anthropic API"""
        try:
            # Convert messages format for Anthropic
            system = messages[0]["content"]
            claude_messages = []
            for msg in messages[1:]:
                claude_messages.append({
                    "role": msg["role"] if msg["role"] != "system" else "user",
                    "content": msg["content"]
                })
            
            # Use sync client in async context (Anthropic doesn't have async client yet)
            import asyncio
            loop = asyncio.get_event_loop()
            
            def create_message():
                return self.anthropic_client.messages.create(
                    model=settings.DEFAULT_AI_MODEL,
                    messages=claude_messages,
                    system=system,
                    max_tokens=settings.MAX_TOKENS,
                    temperature=settings.TEMPERATURE
                )
            
            response = await loop.run_in_executor(None, create_message)
            
            return response.content[0].text, response.usage.input_tokens + response.usage.output_tokens
        except Exception as e:
            logger.error(f"Anthropic API error: {str(e)}")
            error_msg = str(e).lower()
            if "credit balance" in error_msg or "billing" in error_msg:
                return "Your Anthropic API key is valid, but your account needs credits. Please visit https://console.anthropic.com to add credits to your account.", 0
            elif "invalid" in error_msg and "key" in error_msg:
                return "Invalid Anthropic API key. Please check your API key in the .env file.", 0
            else:
                return f"Error with Anthropic API: {str(e)}", 0