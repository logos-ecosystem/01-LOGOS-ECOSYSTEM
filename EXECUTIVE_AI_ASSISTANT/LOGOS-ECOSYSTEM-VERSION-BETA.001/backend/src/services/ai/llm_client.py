"""Enhanced LLM Client for LOGOS Ecosystem with Claude API Integration."""

import asyncio
import json
from typing import Dict, Any, Optional, List, AsyncGenerator, Union
from datetime import datetime
import backoff
import anthropic
from anthropic import AsyncAnthropic, Anthropic
import logging

from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings
from ...shared.utils.exceptions import AIServiceError

logger = get_logger(__name__)
settings = get_settings()


class LLMClient:
    """Unified LLM client for interacting with Claude and other AI providers."""
    
    def __init__(self):
        """Initialize the LLM client with proper API credentials."""
        # Try to get API key from multiple environment variables
        self.api_key = (
            settings.CLAUDE_API_KEY or 
            settings.ANTHROPIC_API_KEY or 
            settings.AI_API_KEY
        )
        
        if not self.api_key:
            logger.warning("No API key configured for LLM client")
            
        # Model configuration
        self.model = settings.CLAUDE_MODEL or "claude-3-opus-20240229"
        self.max_tokens = settings.MAX_TOKENS or 4096
        self.default_temperature = settings.TEMPERATURE or 0.7
        self.timeout = 60.0  # Increased timeout for complex requests
        
        # Initialize clients
        self.async_client = None
        self.sync_client = None
        
        if self.api_key:
            try:
                self.async_client = AsyncAnthropic(api_key=self.api_key)
                self.sync_client = Anthropic(api_key=self.api_key)
                logger.info(f"Initialized LLM client with model: {self.model}")
            except Exception as e:
                logger.error(f"Failed to initialize Anthropic client: {str(e)}")
        
        # Rate limiting
        self._rate_limiter = asyncio.Semaphore(10)  # Max 10 concurrent requests
        self._request_count = 0
        self._last_reset = datetime.utcnow()
        
        # Cache for system prompts
        self._system_prompt_cache = {}
    
    @backoff.on_exception(
        backoff.expo,
        (anthropic.RateLimitError, anthropic.APITimeoutError),
        max_tries=3,
        max_time=30
    )
    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stop_sequences: Optional[List[str]] = None,
        stream: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Union[str, AsyncGenerator[str, None]]:
        """Generate completion using Claude API with enhanced error handling.
        
        Args:
            prompt: User prompt
            system_prompt: System instructions
            temperature: Randomness (0-1)
            max_tokens: Maximum response tokens
            stop_sequences: Stop generation sequences
            stream: Enable streaming response
            metadata: Additional metadata for logging
            
        Returns:
            Generated text or async generator for streaming
        """
        if not self.async_client:
            raise AIServiceError("LLM client not initialized. Please configure CLAUDE_API_KEY or ANTHROPIC_API_KEY.")
            
        async with self._rate_limiter:
            try:
                # Log request metadata
                if metadata:
                    logger.debug(f"LLM request metadata: {metadata}")
                
                messages = [{"role": "user", "content": prompt}]
                
                # Build request parameters
                kwargs = {
                    "model": self.model,
                    "messages": messages,
                    "max_tokens": max_tokens or self.max_tokens,
                    "temperature": temperature if temperature is not None else self.default_temperature,
                }
                
                if system_prompt:
                    kwargs["system"] = system_prompt
                
                if stop_sequences:
                    kwargs["stop_sequences"] = stop_sequences
                
                # Track request
                self._request_count += 1
                
                if stream:
                    # Return async generator for streaming
                    async def stream_generator():
                        try:
                            async with self.async_client.messages.stream(**kwargs) as stream:
                                async for text in stream.text_stream:
                                    yield text
                        except Exception as e:
                            logger.error(f"Streaming error: {str(e)}")
                            raise AIServiceError(f"Streaming failed: {str(e)}")
                    
                    return stream_generator()
                else:
                    # Regular completion
                    response = await self.async_client.messages.create(**kwargs)
                    return response.content[0].text
                    
            except anthropic.AuthenticationError:
                raise AIServiceError("Invalid API key. Please check your CLAUDE_API_KEY or ANTHROPIC_API_KEY configuration.")
            except anthropic.RateLimitError:
                raise AIServiceError("Rate limit exceeded. Please try again later.")
            except anthropic.APITimeoutError:
                raise AIServiceError("Request timed out. Please try again.")
            except anthropic.APIError as e:
                raise AIServiceError(f"Claude API error: {str(e)}")
            except Exception as e:
                logger.error(f"Unexpected error in LLM completion: {str(e)}")
                raise AIServiceError(f"LLM service error: {str(e)}")
    
    async def complete_with_tools(
        self,
        prompt: str,
        tools: List[Dict[str, Any]],
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate completion with tool/function calling support.
        
        Args:
            prompt: User prompt
            tools: List of available tools/functions
            system_prompt: System instructions
            **kwargs: Additional parameters
            
        Returns:
            Response with potential tool calls
        """
        if not self.async_client:
            raise AIServiceError("LLM client not initialized")
        
        # Format tools for Claude
        tool_descriptions = self._format_tools_for_claude(tools)
        
        # Enhanced system prompt with tool instructions
        enhanced_system = f"""{system_prompt or ''}

You have access to the following tools:
{tool_descriptions}

When you need to use a tool, format your response as:
<tool_use>
{{
    "tool": "tool_name",
    "parameters": {{
        "param1": "value1",
        "param2": "value2"
    }}
}}
</tool_use>

You can use multiple tools in a single response."""
        
        response = await self.complete(
            prompt=prompt,
            system_prompt=enhanced_system,
            **kwargs
        )
        
        # Parse tool usage from response
        return self._parse_tool_usage(response)
    
    def _format_tools_for_claude(self, tools: List[Dict[str, Any]]) -> str:
        """Format tools for Claude's understanding."""
        formatted = []
        for tool in tools:
            tool_desc = f"- {tool['name']}: {tool['description']}"
            if 'parameters' in tool:
                params = ", ".join([f"{p['name']} ({p['type']})" for p in tool['parameters']])
                tool_desc += f"\n  Parameters: {params}"
            formatted.append(tool_desc)
        return "\n".join(formatted)
    
    def _parse_tool_usage(self, response: str) -> Dict[str, Any]:
        """Parse tool usage from Claude's response."""
        import re
        
        tool_pattern = r'<tool_use>(.*?)</tool_use>'
        tool_matches = re.findall(tool_pattern, response, re.DOTALL)
        
        tools_used = []
        for match in tool_matches:
            try:
                tool_data = json.loads(match.strip())
                tools_used.append(tool_data)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse tool usage: {match}")
        
        # Remove tool usage from response
        clean_response = re.sub(tool_pattern, '', response, flags=re.DOTALL).strip()
        
        return {
            "response": clean_response,
            "tools_used": tools_used,
            "raw_response": response
        }
    
    async def embed(self, text: str) -> List[float]:
        """Generate embeddings for text.
        
        Note: Claude doesn't provide embeddings directly, so this would need
        to use a different service or model.
        """
        # For now, return a mock embedding
        # In production, integrate with an embedding model
        logger.warning("Embedding generation not implemented for Claude")
        return [0.0] * 768  # Mock 768-dimensional embedding
    
    async def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment of text using Claude."""
        prompt = f"""Analyze the sentiment of the following text. Provide a JSON response with:
- overall_sentiment: (positive/negative/neutral/mixed)
- sentiment_score: (-1.0 to 1.0)
- confidence: (0.0 to 1.0)
- key_emotions: (list of detected emotions)
- reasoning: (brief explanation)

Text: {text}

Respond only with valid JSON."""
        
        response = await self.complete(
            prompt=prompt,
            temperature=0.3,
            max_tokens=500
        )
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse sentiment analysis: {response}")
            return {
                "overall_sentiment": "neutral",
                "sentiment_score": 0.0,
                "confidence": 0.5,
                "key_emotions": [],
                "reasoning": "Failed to analyze"
            }
    
    async def summarize(
        self,
        text: str,
        max_length: int = 200,
        style: str = "concise"
    ) -> str:
        """Summarize text with specified style."""
        style_prompts = {
            "concise": "Provide a concise summary in 1-2 sentences.",
            "detailed": "Provide a detailed summary covering all key points.",
            "bullet": "Provide a bullet-point summary of the main ideas.",
            "technical": "Provide a technical summary focusing on key concepts and terminology.",
            "executive": "Provide an executive summary suitable for decision-makers."
        }
        
        prompt = f"""Summarize the following text. {style_prompts.get(style, style_prompts['concise'])}
Keep the summary under {max_length} words.

Text: {text}

Summary:"""
        
        return await self.complete(
            prompt=prompt,
            temperature=0.3,
            max_tokens=max_length * 2
        )
    
    async def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract named entities from text."""
        prompt = f"""Extract named entities from the following text and categorize them.
Return a JSON object with these categories:
- persons: (people's names)
- organizations: (companies, institutions)
- locations: (places, addresses)
- dates: (dates, time periods)
- amounts: (quantities, prices)
- products: (product names, services)
- technical_terms: (domain-specific terminology)

Text: {text}

Respond only with valid JSON."""
        
        response = await self.complete(
            prompt=prompt,
            temperature=0.2,
            max_tokens=1000
        )
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse entity extraction: {response}")
            return {
                "persons": [],
                "organizations": [],
                "locations": [],
                "dates": [],
                "amounts": [],
                "products": [],
                "technical_terms": []
            }
    
    async def translate(
        self,
        text: str,
        target_language: str,
        source_language: Optional[str] = None
    ) -> str:
        """Translate text to target language."""
        source_part = f"from {source_language} " if source_language else ""
        
        prompt = f"""Translate the following text {source_part}to {target_language}.
Maintain the original meaning, tone, and style.
Preserve any technical terms that shouldn't be translated.

Text: {text}

Translation:"""
        
        return await self.complete(
            prompt=prompt,
            temperature=0.3,
            max_tokens=len(text) * 2
        )
    
    async def generate_code(
        self,
        description: str,
        language: str = "python",
        context: Optional[str] = None
    ) -> str:
        """Generate code based on description."""
        context_part = f"\nContext: {context}" if context else ""
        
        prompt = f"""Generate {language} code for the following requirement:
{description}{context_part}

Requirements:
- Write clean, well-commented code
- Follow best practices for {language}
- Include error handling where appropriate
- Make the code production-ready

Code:"""
        
        return await self.complete(
            prompt=prompt,
            temperature=0.2,
            max_tokens=2000
        )
    
    async def answer_question(
        self,
        question: str,
        context: Optional[str] = None,
        format: str = "detailed"
    ) -> str:
        """Answer a question with optional context."""
        context_part = f"\nContext: {context}" if context else ""
        
        format_instructions = {
            "brief": "Provide a brief, direct answer.",
            "detailed": "Provide a comprehensive answer with explanations.",
            "technical": "Provide a technical answer with precise terminology.",
            "eli5": "Explain like I'm five - use simple language and analogies."
        }
        
        prompt = f"""Question: {question}{context_part}

{format_instructions.get(format, format_instructions['detailed'])}

Answer:"""
        
        return await self.complete(
            prompt=prompt,
            temperature=0.5,
            max_tokens=1500
        )
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Get API usage statistics."""
        now = datetime.utcnow()
        time_since_reset = (now - self._last_reset).total_seconds()
        
        return {
            "request_count": self._request_count,
            "time_window_seconds": time_since_reset,
            "requests_per_minute": (self._request_count / time_since_reset) * 60 if time_since_reset > 0 else 0,
            "model": self.model,
            "last_reset": self._last_reset.isoformat(),
            "client_initialized": self.async_client is not None
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of LLM service."""
        try:
            if not self.async_client:
                return {
                    "status": "unhealthy",
                    "error": "Client not initialized",
                    "model": self.model
                }
            
            # Try a simple completion
            response = await self.complete(
                prompt="Hello",
                max_tokens=10,
                temperature=0
            )
            
            return {
                "status": "healthy",
                "model": self.model,
                "response_received": bool(response),
                "usage_stats": self.get_usage_stats()
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "model": self.model
            }


# Global LLM client instance
llm_client = LLMClient()