from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, Optional
import os


class Settings(BaseSettings):
    # API Keys
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    
    # Application
    APP_NAME: str = "Executive AI Assistant"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    
    # Database
    DATABASE_URL: str = "sqlite:///./data/executive_ai.db"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"
    
    # Language
    DEFAULT_LANGUAGE: str = "en"
    SUPPORTED_LANGUAGES: List[str] = Field(default=["en", "es"])
    
    # AI Model
    DEFAULT_AI_MODEL: str = "gpt-4"
    MAX_TOKENS: int = 2000
    TEMPERATURE: float = 0.7
    
    # Voice
    SPEECH_RECOGNITION_LANGUAGE: str = "en-US"
    TTS_VOICE: str = "en-US-AriaNeural"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # Features
    ENABLE_VOICE_ASSISTANT: bool = True
    ENABLE_HEALTHCARE_MODULE: bool = True
    ENABLE_LEGAL_MODULE: bool = True
    ENABLE_SPORTS_MODULE: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()