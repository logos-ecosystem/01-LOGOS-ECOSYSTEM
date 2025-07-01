"""Enhanced Audio Service with emotion analysis, voice biometrics, and multiple TTS engines."""

import asyncio
import io
import wave
import json
import hashlib
from typing import Optional, Dict, Any, Union, BinaryIO, List, Tuple
from datetime import datetime
import numpy as np
import speech_recognition as sr
from gtts import gTTS
import pygame
import tempfile
import os
from pydub import AudioSegment
from pydub.playback import play
import whisper
import soundfile as sf
import librosa
import scipy.signal
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
import joblib
import pyaudio
import sounddevice as sd

# Optional cloud service imports
try:
    import azure.cognitiveservices.speech as speechsdk
    AZURE_AVAILABLE = True
except ImportError:
    AZURE_AVAILABLE = False

try:
    import boto3
    AWS_AVAILABLE = True
except ImportError:
    AWS_AVAILABLE = False

try:
    from google.cloud import texttospeech, speech_v1
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

try:
    import torch
    import torchaudio
    import transformers
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

from ...shared.utils.logger import get_logger
from ...shared.utils.exceptions import AudioProcessingError
from ...shared.utils.config import get_settings
from ...infrastructure.cache import cache_manager

logger = get_logger(__name__)
settings = get_settings()
cache = cache_manager


class VoiceProfile:
    """Voice biometric profile for speaker identification."""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.features = []
        self.model = None
        self.enrollment_samples = 0
        self.created_at = datetime.utcnow()
        self.last_updated = datetime.utcnow()
    
    def add_sample(self, features: np.ndarray):
        """Add voice sample features."""
        self.features.append(features)
        self.enrollment_samples += 1
        self.last_updated = datetime.utcnow()
    
    def train_model(self):
        """Train SVM model for voice verification."""
        if len(self.features) < 3:
            raise ValueError("Need at least 3 samples for training")
        
        # Create positive samples
        X_positive = np.array(self.features)
        y_positive = np.ones(len(X_positive))
        
        # Generate synthetic negative samples (simplified)
        X_negative = X_positive + np.random.normal(0, 0.5, X_positive.shape)
        y_negative = np.zeros(len(X_negative))
        
        # Combine data
        X = np.vstack([X_positive, X_negative])
        y = np.hstack([y_positive, y_negative])
        
        # Train SVM
        self.model = SVC(kernel='rbf', probability=True)
        self.model.fit(X, y)
    
    def verify(self, features: np.ndarray, threshold: float = 0.7) -> Tuple[bool, float]:
        """Verify if voice matches profile."""
        if not self.model:
            return False, 0.0
        
        prob = self.model.predict_proba([features])[0][1]
        return prob >= threshold, prob


class EmotionRecognizer:
    """Real emotion recognition from voice."""
    
    def __init__(self):
        self.emotion_labels = [
            'neutral', 'happy', 'sad', 'angry', 
            'fearful', 'disgusted', 'surprised'
        ]
        self.model = None
        self._load_emotion_model()
    
    def _load_emotion_model(self):
        """Load pre-trained emotion recognition model."""
        try:
            if TORCH_AVAILABLE:
                # Use Hugging Face model for emotion recognition
                from transformers import pipeline
                self.model = pipeline(
                    "audio-classification",
                    model="ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
                )
            else:
                logger.warning("PyTorch not available, emotion recognition disabled")
        except Exception as e:
            logger.error(f"Failed to load emotion model: {e}")
    
    def analyze_emotion(self, audio_path: str) -> Dict[str, float]:
        """Analyze emotions in audio file."""
        if not self.model:
            return {"neutral": 1.0}
        
        try:
            # Get predictions
            predictions = self.model(audio_path)
            
            # Convert to emotion scores
            emotion_scores = {
                label['label'].lower(): label['score'] 
                for label in predictions
            }
            
            return emotion_scores
        except Exception as e:
            logger.error(f"Emotion analysis failed: {e}")
            return {"neutral": 1.0}


class EnhancedAudioService:
    """Enhanced audio service for handling voice interactions."""
    
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.whisper_model = None
        self.supported_languages = [
            'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'ko',
            'ar', 'hi', 'tr', 'pl', 'nl', 'sv', 'da', 'no', 'fi'
        ]
        self.voice_profiles = {}
        self.emotion_recognizer = EmotionRecognizer()
        self._initialize_audio()
        self._initialize_cloud_services()
    
    def _initialize_audio(self):
        """Initialize audio systems."""
        try:
            # Initialize pygame mixer for audio playback
            pygame.mixer.init(
                frequency=44100,
                size=-16,
                channels=2,
                buffer=512
            )
            
            # Load Whisper model for advanced speech recognition
            if settings.AUDIO_USE_WHISPER:
                self.whisper_model = whisper.load_model("base")
            
            logger.info("Audio service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize audio service: {str(e)}")
    
    def _initialize_cloud_services(self):
        """Initialize cloud TTS/STT services."""
        self.cloud_services = {}
        
        # Azure Speech Services
        if AZURE_AVAILABLE and hasattr(settings, 'AZURE_SPEECH_KEY'):
            try:
                speech_config = speechsdk.SpeechConfig(
                    subscription=settings.AZURE_SPEECH_KEY,
                    region=settings.AZURE_SPEECH_REGION
                )
                self.cloud_services['azure'] = speech_config
                logger.info("Azure Speech Services initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Azure: {e}")
        
        # AWS Polly
        if AWS_AVAILABLE and hasattr(settings, 'AWS_ACCESS_KEY_ID'):
            try:
                self.cloud_services['aws'] = boto3.client(
                    'polly',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_REGION
                )
                logger.info("AWS Polly initialized")
            except Exception as e:
                logger.error(f"Failed to initialize AWS: {e}")
        
        # Google Cloud TTS
        if GOOGLE_AVAILABLE and hasattr(settings, 'GOOGLE_CLOUD_CREDENTIALS'):
            try:
                os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = settings.GOOGLE_CLOUD_CREDENTIALS
                self.cloud_services['google_tts'] = texttospeech.TextToSpeechClient()
                self.cloud_services['google_stt'] = speech_v1.SpeechClient()
                logger.info("Google Cloud Speech Services initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Google Cloud: {e}")
    
    async def speech_to_text(
        self,
        audio_data: Union[bytes, BinaryIO],
        language: str = "en",
        use_whisper: bool = True,
        analyze_emotion: bool = False,
        identify_speaker: bool = False,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Convert speech audio to text with optional analysis.
        
        Args:
            audio_data: Audio data as bytes or file-like object
            language: Language code for recognition
            use_whisper: Use Whisper model for better accuracy
            analyze_emotion: Perform emotion analysis
            identify_speaker: Perform speaker identification
            user_id: User ID for voice biometrics
            
        Returns:
            Dictionary with transcribed text and metadata
        """
        try:
            # Convert audio to suitable format
            audio_file = self._prepare_audio_file(audio_data)
            
            result = {
                "timestamp": datetime.utcnow().isoformat(),
                "language": language
            }
            
            # Speech recognition
            if use_whisper and self.whisper_model:
                # Use Whisper for transcription
                whisper_result = self.whisper_model.transcribe(
                    audio_file,
                    language=language,
                    task="transcribe"
                )
                
                result.update({
                    "text": whisper_result["text"],
                    "segments": whisper_result.get("segments", []),
                    "confidence": 0.95,
                    "duration": self._get_audio_duration(audio_file)
                })
            else:
                # Use speech_recognition library
                with sr.AudioFile(audio_file) as source:
                    audio = self.recognizer.record(source)
                
                # Try multiple recognition engines
                text, confidence = await self._recognize_with_fallback(audio, language)
                result.update({
                    "text": text,
                    "confidence": confidence,
                    "duration": self._get_audio_duration(audio_file)
                })
            
            # Emotion analysis
            if analyze_emotion:
                emotions = self.emotion_recognizer.analyze_emotion(audio_file)
                result["emotions"] = emotions
                result["dominant_emotion"] = max(emotions, key=emotions.get)
            
            # Speaker identification
            if identify_speaker and user_id:
                features = self._extract_voice_features(audio_file)
                
                if user_id in self.voice_profiles:
                    verified, confidence = self.voice_profiles[user_id].verify(features)
                    result["speaker_verified"] = verified
                    result["speaker_confidence"] = confidence
                else:
                    # Create new profile
                    profile = VoiceProfile(user_id)
                    profile.add_sample(features)
                    self.voice_profiles[user_id] = profile
                    result["speaker_enrolled"] = True
            
            # Audio quality metrics
            result["audio_quality"] = self._analyze_audio_quality(audio_file)
            
            return result
            
        except Exception as e:
            logger.error(f"Speech to text failed: {str(e)}")
            raise AudioProcessingError(f"Failed to process audio: {str(e)}")
    
    async def text_to_speech(
        self,
        text: str,
        language: str = "en",
        voice: Optional[str] = None,
        emotion: Optional[str] = None,
        output_format: str = "mp3",
        service: str = "auto"
    ) -> bytes:
        """Convert text to speech with emotion and voice selection.
        
        Args:
            text: Text to convert to speech
            language: Language code
            voice: Voice ID or name
            emotion: Emotion to apply (if supported)
            output_format: Output audio format
            service: TTS service to use (auto, gtts, azure, aws, google)
            
        Returns:
            Audio data as bytes
        """
        try:
            # Select TTS service
            if service == "auto":
                service = self._select_best_tts_service(language, emotion)
            
            # Generate speech based on service
            if service == "azure" and "azure" in self.cloud_services:
                audio_data = await self._tts_azure(text, language, voice, emotion)
            elif service == "aws" and "aws" in self.cloud_services:
                audio_data = await self._tts_aws(text, language, voice)
            elif service == "google" and "google_tts" in self.cloud_services:
                audio_data = await self._tts_google(text, language, voice)
            else:
                # Fallback to gTTS
                audio_data = await self._tts_gtts(text, language)
            
            # Convert format if needed
            if output_format != "mp3":
                audio_data = self._convert_audio_format(audio_data, "mp3", output_format)
            
            return audio_data
            
        except Exception as e:
            logger.error(f"Text to speech failed: {str(e)}")
            raise AudioProcessingError(f"Failed to generate speech: {str(e)}")
    
    async def _recognize_with_fallback(
        self,
        audio: sr.AudioData,
        language: str
    ) -> Tuple[str, float]:
        """Try multiple recognition engines with fallback."""
        text = None
        confidence = 0.0
        
        # Try Google Speech Recognition first
        try:
            text = self.recognizer.recognize_google(
                audio,
                language=language,
                show_all=False
            )
            confidence = 0.85
        except Exception as e:
            logger.warning(f"Google recognition failed: {e}")
        
        # Try Google Cloud if available
        if not text and "google_stt" in self.cloud_services:
            try:
                client = self.cloud_services["google_stt"]
                audio_bytes = audio.get_wav_data()
                
                gcs_audio = speech_v1.RecognitionAudio(content=audio_bytes)
                config = speech_v1.RecognitionConfig(
                    encoding=speech_v1.RecognitionConfig.AudioEncoding.LINEAR16,
                    sample_rate_hertz=16000,
                    language_code=language,
                )
                
                response = client.recognize(config=config, audio=gcs_audio)
                if response.results:
                    text = response.results[0].alternatives[0].transcript
                    confidence = response.results[0].alternatives[0].confidence
            except Exception as e:
                logger.warning(f"Google Cloud recognition failed: {e}")
        
        # Try Azure if available
        if not text and "azure" in self.cloud_services:
            try:
                # Azure recognition implementation
                pass
            except Exception as e:
                logger.warning(f"Azure recognition failed: {e}")
        
        if not text:
            raise AudioProcessingError("All recognition engines failed")
        
        return text, confidence
    
    async def _tts_azure(
        self,
        text: str,
        language: str,
        voice: Optional[str],
        emotion: Optional[str]
    ) -> bytes:
        """Generate speech using Azure."""
        speech_config = self.cloud_services["azure"]
        
        # Select voice
        if not voice:
            voice = self._get_azure_voice(language, emotion)
        
        # Create synthesizer
        synthesizer = speechsdk.SpeechSynthesizer(
            speech_config=speech_config,
            audio_config=None
        )
        
        # Build SSML with emotion
        ssml = self._build_ssml_azure(text, voice, emotion)
        
        # Synthesize
        result = synthesizer.speak_ssml_async(ssml).get()
        
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            return bytes(result.audio_data)
        else:
            raise AudioProcessingError(f"Azure TTS failed: {result.reason}")
    
    async def _tts_aws(
        self,
        text: str,
        language: str,
        voice: Optional[str]
    ) -> bytes:
        """Generate speech using AWS Polly."""
        polly = self.cloud_services["aws"]
        
        # Select voice
        if not voice:
            voice = self._get_aws_voice(language)
        
        # Synthesize
        response = polly.synthesize_speech(
            Text=text,
            OutputFormat="mp3",
            VoiceId=voice,
            LanguageCode=language
        )
        
        return response["AudioStream"].read()
    
    async def _tts_google(
        self,
        text: str,
        language: str,
        voice: Optional[str]
    ) -> bytes:
        """Generate speech using Google Cloud TTS."""
        client = self.cloud_services["google_tts"]
        
        # Set the text input
        synthesis_input = texttospeech.SynthesisInput(text=text)
        
        # Select voice
        voice_params = texttospeech.VoiceSelectionParams(
            language_code=language,
            name=voice if voice else None
        )
        
        # Select audio config
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )
        
        # Perform synthesis
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice_params,
            audio_config=audio_config
        )
        
        return response.audio_content
    
    async def _tts_gtts(self, text: str, language: str) -> bytes:
        """Generate speech using gTTS (fallback)."""
        tts = gTTS(text=text, lang=language, slow=False)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
            tts.save(tmp_file.name)
            tmp_file.seek(0)
            audio_data = tmp_file.read()
        
        os.unlink(tmp_file.name)
        return audio_data
    
    def _prepare_audio_file(self, audio_data: Union[bytes, BinaryIO]) -> str:
        """Prepare audio file for processing."""
        if isinstance(audio_data, bytes):
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                tmp_file.write(audio_data)
                return tmp_file.name
        else:
            # Assume it's already a file path or file-like object
            return audio_data.name if hasattr(audio_data, 'name') else str(audio_data)
    
    def _get_audio_duration(self, audio_file: str) -> float:
        """Get duration of audio file in seconds."""
        try:
            audio = AudioSegment.from_file(audio_file)
            return len(audio) / 1000.0
        except Exception:
            return 0.0
    
    def _extract_voice_features(self, audio_file: str) -> np.ndarray:
        """Extract voice biometric features."""
        # Load audio
        y, sr = librosa.load(audio_file, sr=16000)
        
        # Extract features
        features = []
        
        # MFCCs
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        features.extend([
            np.mean(mfccs, axis=1),
            np.std(mfccs, axis=1)
        ])
        
        # Spectral features
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)
        features.append(np.mean(spectral_centroids))
        
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
        features.append(np.mean(spectral_rolloff))
        
        # Zero crossing rate
        zcr = librosa.feature.zero_crossing_rate(y)
        features.append(np.mean(zcr))
        
        # Flatten features
        return np.hstack(features)
    
    def _analyze_audio_quality(self, audio_file: str) -> Dict[str, Any]:
        """Analyze audio quality metrics."""
        y, sr = librosa.load(audio_file, sr=None)
        
        # Calculate SNR (simplified)
        signal_power = np.mean(y**2)
        noise_power = np.mean((y - np.mean(y))**2)
        snr = 10 * np.log10(signal_power / (noise_power + 1e-10))
        
        # Check clipping
        clipping = np.sum(np.abs(y) > 0.95) / len(y)
        
        return {
            "sample_rate": sr,
            "duration": len(y) / sr,
            "snr_db": float(snr),
            "clipping_ratio": float(clipping),
            "quality_score": min(100, max(0, snr * 2.5 - clipping * 100))
        }
    
    def _select_best_tts_service(self, language: str, emotion: Optional[str]) -> str:
        """Select the best TTS service based on requirements."""
        # Azure supports emotions via SSML
        if emotion and "azure" in self.cloud_services:
            return "azure"
        
        # AWS has good multilingual support
        if language != "en" and "aws" in self.cloud_services:
            return "aws"
        
        # Google has natural voices
        if "google_tts" in self.cloud_services:
            return "google"
        
        # Fallback
        return "gtts"
    
    def _get_azure_voice(self, language: str, emotion: Optional[str]) -> str:
        """Get Azure voice name for language and emotion."""
        voice_map = {
            "en": "en-US-AriaNeural",
            "es": "es-ES-ElviraNeural",
            "fr": "fr-FR-DeniseNeural",
            "de": "de-DE-KatjaNeural",
            "it": "it-IT-ElsaNeural",
            "pt": "pt-BR-FranciscaNeural",
            "ja": "ja-JP-NanamiNeural",
            "zh": "zh-CN-XiaoxiaoNeural",
            "ko": "ko-KR-SunHiNeural"
        }
        return voice_map.get(language, "en-US-AriaNeural")
    
    def _get_aws_voice(self, language: str) -> str:
        """Get AWS Polly voice ID for language."""
        voice_map = {
            "en": "Joanna",
            "es": "Conchita",
            "fr": "Celine",
            "de": "Marlene",
            "it": "Carla",
            "pt": "Vitoria",
            "ja": "Mizuki",
            "zh": "Zhiyu",
            "ko": "Seoyeon"
        }
        return voice_map.get(language, "Joanna")
    
    def _build_ssml_azure(self, text: str, voice: str, emotion: Optional[str]) -> str:
        """Build SSML for Azure with emotion."""
        emotion_styles = {
            "happy": "cheerful",
            "sad": "sad",
            "angry": "angry",
            "fearful": "fearful",
            "neutral": "neutral"
        }
        
        style = emotion_styles.get(emotion, "neutral") if emotion else "neutral"
        
        return f"""
        <speak version="1.0" xml:lang="en-US">
            <voice name="{voice}">
                <mstts:express-as style="{style}" styledegree="1.5">
                    {text}
                </mstts:express-as>
            </voice>
        </speak>
        """
    
    def _convert_audio_format(
        self,
        audio_data: bytes,
        from_format: str,
        to_format: str
    ) -> bytes:
        """Convert audio between formats."""
        # Create temporary files
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{from_format}') as tmp_in:
            tmp_in.write(audio_data)
            tmp_in_path = tmp_in.name
        
        tmp_out_path = tmp_in_path.replace(f'.{from_format}', f'.{to_format}')
        
        try:
            # Convert using pydub
            audio = AudioSegment.from_file(tmp_in_path, format=from_format)
            audio.export(tmp_out_path, format=to_format)
            
            # Read converted file
            with open(tmp_out_path, 'rb') as f:
                converted_data = f.read()
            
            return converted_data
        finally:
            # Cleanup
            os.unlink(tmp_in_path)
            if os.path.exists(tmp_out_path):
                os.unlink(tmp_out_path)
    
    async def stream_audio(
        self,
        callback,
        sample_rate: int = 16000,
        channels: int = 1,
        chunk_size: int = 1024
    ):
        """Stream audio from microphone with callback."""
        def audio_callback(indata, frames, time, status):
            if status:
                logger.warning(f"Audio stream status: {status}")
            callback(indata.copy())
        
        with sd.InputStream(
            samplerate=sample_rate,
            channels=channels,
            callback=audio_callback,
            blocksize=chunk_size
        ):
            await asyncio.sleep(float('inf'))
    
    def play_audio(self, audio_data: bytes):
        """Play audio data."""
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
            tmp_file.write(audio_data)
            tmp_file_path = tmp_file.name
        
        try:
            pygame.mixer.music.load(tmp_file_path)
            pygame.mixer.music.play()
            
            # Wait for playback to complete
            while pygame.mixer.music.get_busy():
                pygame.time.Clock().tick(10)
        finally:
            os.unlink(tmp_file_path)
    
    def save_audio(
        self,
        audio_data: bytes,
        filepath: str,
        format: Optional[str] = None
    ):
        """Save audio data to file."""
        if not format:
            format = os.path.splitext(filepath)[1][1:]
        
        with open(filepath, 'wb') as f:
            f.write(audio_data)
        
        logger.info(f"Audio saved to {filepath}")
    
    def get_voice_profile(self, user_id: str) -> Optional[VoiceProfile]:
        """Get voice profile for user."""
        return self.voice_profiles.get(user_id)
    
    def enroll_voice(self, user_id: str, audio_files: List[str]) -> bool:
        """Enroll user voice with multiple samples."""
        try:
            profile = self.voice_profiles.get(user_id, VoiceProfile(user_id))
            
            for audio_file in audio_files:
                features = self._extract_voice_features(audio_file)
                profile.add_sample(features)
            
            if profile.enrollment_samples >= 3:
                profile.train_model()
                self.voice_profiles[user_id] = profile
                return True
            
            return False
        except Exception as e:
            logger.error(f"Voice enrollment failed: {e}")
            return False
    
    def get_supported_voices(self, service: str = "all") -> Dict[str, List[str]]:
        """Get list of supported voices by service."""
        voices = {}
        
        if service in ["all", "gtts"]:
            voices["gtts"] = ["default"]
        
        if service in ["all", "azure"] and "azure" in self.cloud_services:
            voices["azure"] = [
                "en-US-AriaNeural", "en-US-GuyNeural",
                "es-ES-ElviraNeural", "es-ES-AlvaroNeural",
                "fr-FR-DeniseNeural", "fr-FR-HenriNeural",
                # Add more voices as needed
            ]
        
        if service in ["all", "aws"] and "aws" in self.cloud_services:
            voices["aws"] = [
                "Joanna", "Matthew", "Salli", "Joey",
                "Conchita", "Enrique", "Celine", "Mathieu",
                # Add more voices as needed
            ]
        
        if service in ["all", "google"] and "google_tts" in self.cloud_services:
            voices["google"] = [
                "en-US-Wavenet-A", "en-US-Wavenet-B",
                "es-ES-Wavenet-A", "es-ES-Wavenet-B",
                # Add more voices as needed
            ]
        
        return voices


# Create global audio service instance
audio_service = EnhancedAudioService()


__all__ = [
    "audio_service",
    "EnhancedAudioService",
    "VoiceProfile",
    "EmotionRecognizer",
    "AudioProcessingError"
]