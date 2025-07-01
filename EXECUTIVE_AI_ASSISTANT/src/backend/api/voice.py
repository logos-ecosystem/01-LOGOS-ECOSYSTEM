from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
import io
import logging
from typing import Optional

from ..services.voice_service import VoiceService
from ..models.voice import VoiceRequest, VoiceResponse

router = APIRouter()
logger = logging.getLogger(__name__)

voice_service = VoiceService()


@router.post("/transcribe", response_model=VoiceResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = "en-US"
):
    """Transcribe audio to text"""
    try:
        # Read audio file
        audio_data = await file.read()
        
        # Perform transcription
        text = await voice_service.transcribe(audio_data, language)
        
        return VoiceResponse(
            text=text,
            language=language,
            confidence=0.95  # Placeholder confidence score
        )
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to transcribe audio")


@router.post("/synthesize")
async def synthesize_speech(request: VoiceRequest):
    """Convert text to speech"""
    try:
        # Generate speech
        audio_data = await voice_service.synthesize(
            text=request.text,
            language=request.language,
            voice=request.voice
        )
        
        # Return audio stream
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/mp3",
            headers={"Content-Disposition": "attachment; filename=speech.mp3"}
        )
    except Exception as e:
        logger.error(f"Synthesis error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to synthesize speech")


@router.get("/voices")
async def list_voices(language: Optional[str] = None):
    """List available voices"""
    voices = await voice_service.get_available_voices(language)
    return {"voices": voices}