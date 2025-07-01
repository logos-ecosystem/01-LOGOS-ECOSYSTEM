"""AI API integration for AI agents using Anthropic Claude."""

import asyncio
import httpx
from typing import Dict, Any, Optional, List, AsyncGenerator, Union
from datetime import datetime
import json
import backoff
import anthropic
from anthropic import AsyncAnthropic

from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings
from ...shared.utils.exceptions import AIServiceError
from .llm_client import llm_client

logger = get_logger(__name__)
settings = get_settings()


class AIService:
    """Service for interacting with Anthropic Claude API."""
    
    def __init__(self):
        # Use the unified LLM client
        self.llm_client = llm_client
        self.api_key = self.llm_client.api_key
        self.model = self.llm_client.model
        self.max_tokens = self.llm_client.max_tokens
        self.default_temperature = self.llm_client.default_temperature
        self.timeout = self.llm_client.timeout
        
        # Direct client access for backward compatibility
        self.client = self.llm_client.async_client
        
        # Rate limiting (use LLM client's limiter)
        self._rate_limiter = self.llm_client._rate_limiter
        self._request_count = 0
        self._last_reset = datetime.utcnow()
    
    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stop_sequences: Optional[List[str]] = None,
        stream: bool = False
    ) -> Union[str, AsyncGenerator[str, None]]:
        """Generate completion using Claude API via LLM client.
        
        Args:
            prompt: User prompt
            system_prompt: System instructions
            temperature: Randomness (0-1)
            max_tokens: Maximum response tokens
            stop_sequences: Stop generation sequences
            stream: Enable streaming response
            
        Returns:
            Generated text or async generator for streaming
        """
        # Delegate to LLM client
        return await self.llm_client.complete(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            stop_sequences=stop_sequences,
            stream=stream,
            metadata={"source": "AIService"}
        )
    
    async def _stream_response(
        self,
        client: httpx.AsyncClient,
        headers: Dict[str, str],
        data: Dict[str, Any]
    ) -> AsyncGenerator[str, None]:
        """Stream response from AI API.
        
        Args:
            client: HTTP client
            headers: Request headers
            data: Request data
            
        Yields:
            Text chunks from response
        """
        try:
            async with client.stream(
                "POST",
                self.api_url,
                headers=headers,
                json=data
            ) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        
                        try:
                            event_data = json.loads(data_str)
                            if event_data.get("type") == "content_block_delta":
                                delta = event_data.get("delta", {})
                                if delta.get("type") == "text_delta":
                                    yield delta.get("text", "")
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse streaming data: {data_str}")
                            
        except Exception as e:
            logger.error(f"Streaming error: {str(e)}")
            raise AIServiceError(f"Streaming failed: {str(e)}")
    
    async def complete_with_context(
        self,
        prompt: str,
        context: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> str:
        """Generate completion with conversation context.
        
        Args:
            prompt: Current user prompt
            context: Previous conversation messages
            system_prompt: System instructions
            **kwargs: Additional parameters
            
        Returns:
            Generated response
        """
        # Build conversation history
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        # Add context messages
        for msg in context[-10:]:  # Limit context to last 10 messages
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        # Add current prompt
        messages.append({"role": "user", "content": prompt})
        
        # Format for AI API
        formatted_prompt = self._format_conversation(messages)
        
        return await self.complete(formatted_prompt, **kwargs)
    
    def _format_conversation(self, messages: List[Dict[str, str]]) -> str:
        """Format conversation for AI API.
        
        Args:
            messages: Conversation messages
            
        Returns:
            Formatted prompt
        """
        formatted = []
        
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            
            if role == "system":
                formatted.append(f"System: {content}")
            elif role == "assistant":
                formatted.append(f"Assistant: {content}")
            else:
                formatted.append(f"Human: {content}")
        
        return "\n\n".join(formatted)
    
    async def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment of text.
        
        Args:
            text: Text to analyze
            
        Returns:
            Sentiment analysis results
        """
        # Delegate to LLM client
        return await self.llm_client.analyze_sentiment(text)
    
    async def summarize(
        self,
        text: str,
        max_length: int = 200,
        style: str = "concise"
    ) -> str:
        """Summarize text.
        
        Args:
            text: Text to summarize
            max_length: Maximum summary length
            style: Summary style (concise/detailed/bullet)
            
        Returns:
            Summary text
        """
        # Delegate to LLM client
        return await self.llm_client.summarize(text, max_length, style)
    
    async def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract named entities from text.
        
        Args:
            text: Text to analyze
            
        Returns:
            Dictionary of entity types and values
        """
        # Delegate to LLM client
        return await self.llm_client.extract_entities(text)
    
    async def translate(
        self,
        text: str,
        target_language: str,
        source_language: Optional[str] = None
    ) -> str:
        """Translate text to target language.
        
        Args:
            text: Text to translate
            target_language: Target language code or name
            source_language: Source language (auto-detect if None)
            
        Returns:
            Translated text
        """
        # Delegate to LLM client
        return await self.llm_client.translate(text, target_language, source_language)
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Get API usage statistics.
        
        Returns:
            Usage statistics
        """
        # Delegate to LLM client
        return self.llm_client.get_usage_stats()


# Global AI service instance
ai_service = AIService()