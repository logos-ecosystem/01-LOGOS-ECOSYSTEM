import speech_recognition as sr
import pyttsx3
from typing import List, Optional, Dict
import io
import logging
from gtts import gTTS

from ..core.config import settings

logger = logging.getLogger(__name__)


class VoiceService:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.tts_engine = None
        
        # Initialize TTS engine with error handling
        try:
            self.tts_engine = pyttsx3.init()
        except Exception as e:
            logger.warning(f"Failed to initialize pyttsx3: {str(e)}")
    
    async def transcribe(self, audio_data: bytes, language: str = "en-US") -> str:
        """Transcribe audio to text using speech recognition"""
        try:
            # Convert bytes to audio file
            audio_file = io.BytesIO(audio_data)
            
            with sr.AudioFile(audio_file) as source:
                audio = self.recognizer.record(source)
            
            # Try Google Speech Recognition first (free)
            try:
                text = self.recognizer.recognize_google(audio, language=language)
                return text
            except sr.UnknownValueError:
                return "Could not understand the audio"
            except sr.RequestError as e:
                logger.error(f"Speech recognition error: {str(e)}")
                return "Speech recognition service is unavailable"
                
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            raise
    
    async def synthesize(
        self,
        text: str,
        language: str = "en",
        voice: Optional[str] = None
    ) -> bytes:
        """Convert text to speech"""
        try:
            # Use gTTS for simplicity (Google Text-to-Speech)
            tts = gTTS(text=text, lang=language[:2])  # Use first 2 chars of language code
            
            # Save to bytes
            audio_buffer = io.BytesIO()
            tts.write_to_fp(audio_buffer)
            audio_buffer.seek(0)
            
            return audio_buffer.read()
            
        except Exception as e:
            logger.error(f"TTS error: {str(e)}")
            # Fallback to pyttsx3 if available
            if self.tts_engine:
                return await self._synthesize_with_pyttsx3(text, voice)
            raise
    
    async def _synthesize_with_pyttsx3(self, text: str, voice: Optional[str] = None) -> bytes:
        """Fallback TTS using pyttsx3"""
        try:
            # Set voice if specified
            if voice:
                voices = self.tts_engine.getProperty('voices')
                for v in voices:
                    if voice in v.id:
                        self.tts_engine.setProperty('voice', v.id)
                        break
            
            # Generate speech
            audio_buffer = io.BytesIO()
            self.tts_engine.save_to_file(text, audio_buffer)
            self.tts_engine.runAndWait()
            
            audio_buffer.seek(0)
            return audio_buffer.read()
            
        except Exception as e:
            logger.error(f"pyttsx3 TTS error: {str(e)}")
            raise
    
    async def get_available_voices(self, language: Optional[str] = None) -> List[Dict[str, str]]:
        """Get list of available voices"""
        voices = []
        
        # Basic voice options for gTTS
        gtts_voices = [
            {"id": "en", "name": "English", "language": "en", "gender": "neutral"},
            {"id": "es", "name": "Spanish", "language": "es", "gender": "neutral"},
            {"id": "fr", "name": "French", "language": "fr", "gender": "neutral"},
            {"id": "de", "name": "German", "language": "de", "gender": "neutral"},
            {"id": "it", "name": "Italian", "language": "it", "gender": "neutral"},
            {"id": "pt", "name": "Portuguese", "language": "pt", "gender": "neutral"},
        ]
        
        if language:
            voices = [v for v in gtts_voices if v["language"].startswith(language[:2])]
        else:
            voices = gtts_voices
        
        # Add pyttsx3 voices if available
        if self.tts_engine:
            try:
                pyttsx3_voices = self.tts_engine.getProperty('voices')
                for voice in pyttsx3_voices:
                    voice_info = {
                        "id": voice.id,
                        "name": voice.name,
                        "language": voice.languages[0] if voice.languages else "unknown",
                        "gender": voice.gender if hasattr(voice, 'gender') else "unknown"
                    }
                    voices.append(voice_info)
            except Exception as e:
                logger.warning(f"Could not get pyttsx3 voices: {str(e)}")
        
        return voices