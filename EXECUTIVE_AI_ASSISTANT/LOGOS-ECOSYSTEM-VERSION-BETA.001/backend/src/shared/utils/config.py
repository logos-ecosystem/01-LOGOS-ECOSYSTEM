from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import List, Optional
import os
from functools import lru_cache


class Settings(BaseSettings):
    # API Configuration
    API_HOST: str = Field(default="0.0.0.0", env="API_HOST")
    API_PORT: int = Field(default=8000, env="API_PORT")
    API_PREFIX: str = Field(default="/api/v1", env="API_PREFIX")
    
    # Environment
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=True, env="DEBUG")
    PRODUCTION: bool = Field(default=False, env="PRODUCTION")
    WORKERS: int = Field(default=4, env="WORKERS")
    
    # Security
    SECRET_KEY: str = Field(default="your-secret-key-here", env="SECRET_KEY")
    ALGORITHM: str = Field(default="HS256", env="ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, env="REFRESH_TOKEN_EXPIRE_DAYS")
    
    # Database
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./logos_dev.db",
        env="DATABASE_URL"
    )
    DATABASE_POOL_SIZE: int = Field(default=20, env="DATABASE_POOL_SIZE")
    DATABASE_MAX_OVERFLOW: int = Field(default=40, env="DATABASE_MAX_OVERFLOW")
    
    # Redis Cache
    REDIS_URL: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    CACHE_TTL: int = Field(default=3600, env="CACHE_TTL")
    
    # AI Configuration
    CLAUDE_API_KEY: Optional[str] = Field(default=None, env="CLAUDE_API_KEY")
    CLAUDE_MODEL: str = Field(default="claude-3-opus-20240229", env="CLAUDE_MODEL")
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None, env="ANTHROPIC_API_KEY")
    AI_API_KEY: Optional[str] = Field(default=None, env="AI_API_KEY")
    AI_API_URL: Optional[str] = Field(default=None, env="AI_API_URL")
    AI_MODEL_DEFAULT: str = Field(default="logos-ai-v3", env="AI_MODEL_DEFAULT")
    AI_MAX_TOKENS_PER_REQUEST: int = Field(default=4000, env="AI_MAX_TOKENS_PER_REQUEST")
    MAX_TOKENS: int = Field(default=4096, env="MAX_TOKENS")
    TEMPERATURE: float = Field(default=0.7, env="TEMPERATURE")
    USER_TOKEN_LIMIT: int = Field(default=100000, env="USER_TOKEN_LIMIT")
    
    # CORS
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"],
        env="ALLOWED_ORIGINS"
    )
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        env="LOG_FORMAT"
    )
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = Field(default=60, env="RATE_LIMIT_PER_MINUTE")
    RATE_LIMIT_PER_HOUR: int = Field(default=1000, env="RATE_LIMIT_PER_HOUR")
    
    # File Storage
    UPLOAD_DIR: str = Field(default="./uploads", env="UPLOAD_DIR")
    MAX_UPLOAD_SIZE: int = Field(default=10 * 1024 * 1024, env="MAX_UPLOAD_SIZE")  # 10MB
    STATIC_DIR: str = Field(default="./static", env="STATIC_DIR")
    UPLOAD_STORAGE_TYPE: str = Field(default="local", env="UPLOAD_STORAGE_TYPE")  # 'local' or 's3'
    AWS_ACCESS_KEY_ID: Optional[str] = Field(default=None, env="AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = Field(default=None, env="AWS_SECRET_ACCESS_KEY")
    AWS_S3_BUCKET: Optional[str] = Field(default=None, env="AWS_S3_BUCKET")
    AWS_REGION: str = Field(default="us-east-1", env="AWS_REGION")
    
    # Monitoring
    ENABLE_METRICS: bool = Field(default=True, env="ENABLE_METRICS")
    METRICS_PORT: int = Field(default=9090, env="METRICS_PORT")
    
    # Additional configs
    DATABASE_ECHO: bool = Field(default=False, env="DATABASE_ECHO")
    MODELS_DIR: str = Field(default="./models", env="MODELS_DIR")
    
    # Email/SMTP Configuration
    SMTP_HOST: str = Field(default="localhost", env="SMTP_HOST")
    SMTP_PORT: int = Field(default=587, env="SMTP_PORT")
    SMTP_USERNAME: Optional[str] = Field(default=None, env="SMTP_USERNAME")
    SMTP_PASSWORD: Optional[str] = Field(default=None, env="SMTP_PASSWORD")
    SMTP_USE_TLS: bool = Field(default=True, env="SMTP_USE_TLS")
    EMAIL_FROM: str = Field(default="noreply@logos-ecosystem.com", env="EMAIL_FROM")
    EMAIL_FROM_NAME: str = Field(default="LOGOS Ecosystem", env="EMAIL_FROM_NAME")
    
    # Stripe Configuration
    STRIPE_SECRET_KEY: Optional[str] = Field(default=None, env="STRIPE_SECRET_KEY")
    STRIPE_PUBLISHABLE_KEY: Optional[str] = Field(default=None, env="STRIPE_PUBLISHABLE_KEY")
    STRIPE_WEBHOOK_SECRET: Optional[str] = Field(default=None, env="STRIPE_WEBHOOK_SECRET")
    
    # PayPal Configuration
    PAYPAL_CLIENT_ID: Optional[str] = Field(default=None, env="PAYPAL_CLIENT_ID")
    PAYPAL_CLIENT_SECRET: Optional[str] = Field(default=None, env="PAYPAL_CLIENT_SECRET")
    PAYPAL_WEBHOOK_ID: Optional[str] = Field(default=None, env="PAYPAL_WEBHOOK_ID")
    
    # Payment Configuration
    PAYMENT_ENCRYPTION_KEY: Optional[str] = Field(default=None, env="PAYMENT_ENCRYPTION_KEY")
    DEFAULT_CURRENCY: str = Field(default="USD", env="DEFAULT_CURRENCY")
    
    # Blockchain Configuration
    ETH_NODE_URL: str = Field(default="https://mainnet.infura.io/v3/YOUR_INFURA_KEY", env="ETH_NODE_URL")
    BTC_NODE_URL: str = Field(default="https://blockstream.info/api", env="BTC_NODE_URL")
    ETH_WALLET_ADDRESS: Optional[str] = Field(default=None, env="ETH_WALLET_ADDRESS")
    ETH_PRIVATE_KEY: Optional[str] = Field(default=None, env="ETH_PRIVATE_KEY")
    BTC_WALLET_ADDRESS: Optional[str] = Field(default=None, env="BTC_WALLET_ADDRESS")
    USDT_CONTRACT_ADDRESS: str = Field(default="0xdac17f958d2ee523a2206206994597c13d831ec7", env="USDT_CONTRACT_ADDRESS")
    USDC_CONTRACT_ADDRESS: str = Field(default="0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", env="USDC_CONTRACT_ADDRESS")
    BLOCKCYPHER_API_KEY: Optional[str] = Field(default=None, env="BLOCKCYPHER_API_KEY")
    ALGORAND_API_KEY: Optional[str] = Field(default=None, env="ALGORAND_API_KEY")
    ALGORAND_NODE_URL: str = Field(default="https://mainnet-api.algonode.cloud", env="ALGORAND_NODE_URL")
    BINANCE_API_KEY: Optional[str] = Field(default=None, env="BINANCE_API_KEY")
    BINANCE_API_SECRET: Optional[str] = Field(default=None, env="BINANCE_API_SECRET")
    COINBASE_COMMERCE_API_KEY: Optional[str] = Field(default=None, env="COINBASE_COMMERCE_API_KEY")
    DAI_CONTRACT_ADDRESS: str = Field(default="0x6B175474E89094C44Da98b954EedeAC495271d0F", env="DAI_CONTRACT_ADDRESS")
    CRYPTO_MASTER_SEED: Optional[str] = Field(default=None, env="CRYPTO_MASTER_SEED")
    
    # SSL/TLS Configuration
    CERTBOT_EMAIL: str = Field(default="admin@logos-ecosystem.com", env="CERTBOT_EMAIL")
    SSL_CERT_DIR: str = Field(default="./certs", env="SSL_CERT_DIR")
    
    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v):
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"Environment must be one of: {allowed}")
        return v
    
    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v, info):
        if info.data.get("ENVIRONMENT") == "production" and v == "your-secret-key-here":
            raise ValueError("SECRET_KEY must be set in production")
        return v
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "allow"  # Allow extra fields from .env
    }


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()