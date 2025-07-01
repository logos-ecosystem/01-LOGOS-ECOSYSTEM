"""Audio-enabled wrapper for AI agents to support voice interactions."""

from typing import Dict, Any, Optional, AsyncGenerator, Type
from datetime import datetime
import asyncio
import json
from uuid import UUID

from .base_agent import BaseAIAgent, AgentInput, AgentOutput
from ..audio.audio_service import audio_service
from ...shared.utils.logger import get_logger
from ...shared.utils.exceptions import AgentExecutionError

logger = get_logger(__name__)


class AudioAgentWrapper:
    """Wrapper to add audio capabilities to any AI agent."""
    
    def __init__(self, agent: BaseAIAgent):
        """Initialize audio wrapper for an agent.
        
        Args:
            agent: The base AI agent to wrap
        """
        self.agent = agent
        self.audio_service = audio_service
        self._audio_session_active = False
        self._current_language = "en"
        self._voice_settings = {
            "voice": "default",
            "speed": 1.0,
            "volume": 1.0
        }
    
    async def process_audio_input(
        self,
        audio_data: bytes,
        user_id: UUID,
        session_id: Optional[UUID] = None,
        language: str = "en",
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process audio input and return both text and audio responses.
        
        Args:
            audio_data: Audio input from user
            user_id: User ID
            session_id: Optional session ID
            language: Language code
            context: Optional context
            
        Returns:
            Response with text and audio data
        """
        try:
            # Convert speech to text
            logger.info(f"Processing audio input for agent {self.agent.metadata.name}")
            
            transcription = await self.audio_service.speech_to_text(
                audio_data,
                language=language
            )
            
            logger.info(f"Transcribed: {transcription['text'][:100]}...")
            
            # Prepare agent input
            agent_input = AgentInput(
                user_id=user_id,
                session_id=session_id,
                input_data={
                    "query": transcription["text"],
                    "audio_metadata": {
                        "duration": transcription["duration"],
                        "confidence": transcription["confidence"],
                        "language": language
                    }
                },
                context=context or {}
            )
            
            # Execute agent
            agent_output = await self.agent.execute(
                agent_input.input_data,
                user_id
            )
            
            # Extract text response
            response_text = self._extract_response_text(agent_output)
            
            # Generate audio response
            audio_response = await self.audio_service.text_to_speech(
                text=response_text,
                language=language,
                voice=self._voice_settings["voice"],
                speed=self._voice_settings["speed"]
            )
            
            return {
                "transcription": transcription,
                "agent_response": agent_output.model_dump(),
                "response_text": response_text,
                "response_audio": audio_response,
                "metadata": {
                    "agent_id": str(self.agent.metadata.id),
                    "agent_name": self.agent.metadata.name,
                    "processing_time": agent_output.execution_time,
                    "language": language
                }
            }
            
        except Exception as e:
            logger.error(f"Audio processing error: {str(e)}")
            
            # Generate error audio response
            error_message = "I apologize, but I encountered an error processing your request. Please try again."
            error_audio = await self.audio_service.text_to_speech(
                error_message,
                language=language
            )
            
            return {
                "error": str(e),
                "response_text": error_message,
                "response_audio": error_audio,
                "metadata": {
                    "agent_id": str(self.agent.metadata.id),
                    "agent_name": self.agent.metadata.name,
                    "error": True
                }
            }
    
    async def start_audio_conversation(
        self,
        user_id: UUID,
        language: str = "en",
        voice_settings: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Start an interactive audio conversation session.
        
        Args:
            user_id: User ID
            language: Conversation language
            voice_settings: Voice configuration
            
        Yields:
            Conversation updates and audio chunks
        """
        self._audio_session_active = True
        self._current_language = language
        
        if voice_settings:
            self._voice_settings.update(voice_settings)
        
        session_id = UUID()
        
        # Send welcome message
        welcome_text = f"Hello! I'm {self.agent.metadata.name}. How can I assist you today?"
        welcome_audio = await self.audio_service.text_to_speech(
            welcome_text,
            language=language,
            **self._voice_settings
        )
        
        yield {
            "type": "welcome",
            "text": welcome_text,
            "audio": welcome_audio,
            "session_id": str(session_id)
        }
        
        # Conversation loop
        while self._audio_session_active:
            try:
                # Wait for audio input (this would come from WebSocket in practice)
                yield {
                    "type": "waiting_for_input",
                    "message": "Listening..."
                }
                
                # In a real implementation, this would receive audio chunks
                # For now, we'll simulate with a placeholder
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Conversation error: {str(e)}")
                yield {
                    "type": "error",
                    "error": str(e)
                }
    
    async def process_streaming_audio(
        self,
        audio_stream: AsyncGenerator[bytes, None],
        user_id: UUID,
        session_id: UUID
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Process streaming audio input and generate streaming responses.
        
        Args:
            audio_stream: Async generator of audio chunks
            user_id: User ID
            session_id: Session ID
            
        Yields:
            Response chunks with partial transcriptions and audio
        """
        audio_buffer = bytearray()
        silence_threshold = 1.5  # seconds of silence to trigger processing
        last_audio_time = datetime.utcnow()
        
        async for audio_chunk in audio_stream:
            audio_buffer.extend(audio_chunk)
            current_time = datetime.utcnow()
            
            # Check if we have enough silence to process
            if (current_time - last_audio_time).total_seconds() > silence_threshold:
                if len(audio_buffer) > 0:
                    # Process accumulated audio
                    response = await self.process_audio_input(
                        bytes(audio_buffer),
                        user_id,
                        session_id,
                        language=self._current_language
                    )
                    
                    # Stream response audio in chunks
                    audio_data = response.get("response_audio", b"")
                    chunk_size = 4096
                    
                    for i in range(0, len(audio_data), chunk_size):
                        yield {
                            "type": "audio_chunk",
                            "audio": audio_data[i:i + chunk_size],
                            "chunk_index": i // chunk_size,
                            "is_final": i + chunk_size >= len(audio_data)
                        }
                    
                    # Clear buffer
                    audio_buffer.clear()
            
            # Update last audio time if chunk has sound
            if self._has_audio_content(audio_chunk):
                last_audio_time = current_time
    
    def set_voice_settings(self, settings: Dict[str, Any]):
        """Update voice settings for audio output.
        
        Args:
            settings: Voice configuration (voice, speed, volume, etc.)
        """
        self._voice_settings.update(settings)
    
    def set_language(self, language: str):
        """Set the conversation language.
        
        Args:
            language: Language code
        """
        self._current_language = language
    
    async def end_audio_session(self):
        """End the audio conversation session."""
        self._audio_session_active = False
        
        # Generate goodbye message
        goodbye_text = "Thank you for using our service. Have a great day!"
        goodbye_audio = await self.audio_service.text_to_speech(
            goodbye_text,
            language=self._current_language,
            **self._voice_settings
        )
        
        return {
            "type": "session_ended",
            "text": goodbye_text,
            "audio": goodbye_audio
        }
    
    def _extract_response_text(self, agent_output: AgentOutput) -> str:
        """Extract text response from agent output.
        
        Args:
            agent_output: Agent output object
            
        Returns:
            Text response
        """
        if not agent_output.success:
            return f"I encountered an error: {agent_output.error}"
        
        output_data = agent_output.output_data or {}
        
        # Try common response fields
        for field in ["response", "answer", "text", "message", "summary", "analysis_summary"]:
            if field in output_data:
                value = output_data[field]
                if isinstance(value, str):
                    return value
                elif isinstance(value, dict) and "text" in value:
                    return value["text"]
        
        # Try to construct response from structured data
        if "results" in output_data:
            return self._format_results(output_data["results"])
        
        # Fallback to JSON representation
        return json.dumps(output_data, indent=2)
    
    def _format_results(self, results: Any) -> str:
        """Format results into readable text.
        
        Args:
            results: Results data
            
        Returns:
            Formatted text
        """
        if isinstance(results, list):
            items = []
            for i, result in enumerate(results[:5]):  # Limit to 5 items
                if isinstance(result, dict):
                    items.append(f"{i+1}. {self._dict_to_text(result)}")
                else:
                    items.append(f"{i+1}. {str(result)}")
            return "Here are the results:\n" + "\n".join(items)
        elif isinstance(results, dict):
            return self._dict_to_text(results)
        else:
            return str(results)
    
    def _dict_to_text(self, data: Dict[str, Any]) -> str:
        """Convert dictionary to readable text.
        
        Args:
            data: Dictionary data
            
        Returns:
            Formatted text
        """
        parts = []
        for key, value in data.items():
            if key not in ["id", "created_at", "updated_at"]:  # Skip metadata
                formatted_key = key.replace("_", " ").title()
                parts.append(f"{formatted_key}: {value}")
        return ", ".join(parts)
    
    def _has_audio_content(self, audio_chunk: bytes) -> bool:
        """Check if audio chunk contains actual sound (not silence).
        
        Args:
            audio_chunk: Audio data chunk
            
        Returns:
            True if chunk has audio content
        """
        # Simple energy-based detection
        # In production, use proper VAD (Voice Activity Detection)
        if len(audio_chunk) < 2:
            return False
        
        # Calculate RMS energy
        samples = [int.from_bytes(audio_chunk[i:i+2], 'little', signed=True) 
                  for i in range(0, len(audio_chunk)-1, 2)]
        
        if not samples:
            return False
        
        rms = (sum(s**2 for s in samples) / len(samples)) ** 0.5
        
        # Threshold for silence (adjust based on your needs)
        silence_threshold = 500
        
        return rms > silence_threshold


class AudioEnabledAgentRegistry:
    """Registry for audio-enabled agents."""
    
    def __init__(self):
        self._audio_agents: Dict[UUID, AudioAgentWrapper] = {}
    
    def wrap_agent(self, agent: BaseAIAgent) -> AudioAgentWrapper:
        """Wrap an agent with audio capabilities.
        
        Args:
            agent: Base agent to wrap
            
        Returns:
            Audio-enabled agent wrapper
        """
        if agent.metadata.id not in self._audio_agents:
            self._audio_agents[agent.metadata.id] = AudioAgentWrapper(agent)
        
        return self._audio_agents[agent.metadata.id]
    
    def get_audio_agent(self, agent_id: UUID) -> Optional[AudioAgentWrapper]:
        """Get audio-enabled agent by ID.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Audio agent wrapper or None
        """
        return self._audio_agents.get(agent_id)


# Global audio agent registry
audio_agent_registry = AudioEnabledAgentRegistry()