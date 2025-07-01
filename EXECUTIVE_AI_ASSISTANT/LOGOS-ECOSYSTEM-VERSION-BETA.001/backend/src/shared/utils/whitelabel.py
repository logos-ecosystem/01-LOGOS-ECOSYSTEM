"""
White-label configuration system for the LOGOS Ecosystem.
Allows complete platform customization for resellers.
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, HttpUrl, EmailStr
from functools import lru_cache


class BrandColors(BaseModel):
    """Brand color configuration"""
    primary: str = Field(default="#1976d2", description="Primary brand color")
    secondary: str = Field(default="#dc004e", description="Secondary brand color")
    accent: str = Field(default="#ff9800", description="Accent color")
    background: str = Field(default="#f5f5f5", description="Background color")
    surface: str = Field(default="#ffffff", description="Surface color")
    error: str = Field(default="#f44336", description="Error color")
    warning: str = Field(default="#ff9800", description="Warning color")
    info: str = Field(default="#2196f3", description="Info color")
    success: str = Field(default="#4caf50", description="Success color")


class SocialLinks(BaseModel):
    """Social media links configuration"""
    twitter: Optional[HttpUrl] = None
    github: Optional[HttpUrl] = None
    linkedin: Optional[HttpUrl] = None
    discord: Optional[HttpUrl] = None
    youtube: Optional[HttpUrl] = None
    facebook: Optional[HttpUrl] = None
    instagram: Optional[HttpUrl] = None


class EmailConfig(BaseModel):
    """Email configuration"""
    support_email: EmailStr = Field(default="support@logos-ecosystem.ai")
    noreply_email: EmailStr = Field(default="noreply@logos-ecosystem.ai")
    sales_email: Optional[EmailStr] = Field(default="sales@logos-ecosystem.ai")
    sender_name: str = Field(default="LOGOS AI Ecosystem")


class SEOConfig(BaseModel):
    """SEO configuration"""
    site_name: str = Field(default="LOGOS AI Ecosystem")
    site_url: HttpUrl = Field(default="https://logos-ecosystem.ai")
    site_description: str = Field(default="AI-Native Ecosystem for the future of AI development")
    site_keywords: str = Field(default="AI, Machine Learning, AI Marketplace, Claude, GPT")
    og_image: str = Field(default="/og-image.png")
    twitter_handle: Optional[str] = Field(default="@logosai")


class LegalConfig(BaseModel):
    """Legal configuration"""
    company_name: str = Field(default="LOGOS AI Inc.")
    company_address: str = Field(default="123 AI Street, Tech City, TC 12345")
    privacy_policy_url: Optional[HttpUrl] = None
    terms_of_service_url: Optional[HttpUrl] = None
    cookie_policy_url: Optional[HttpUrl] = None


class FeatureFlags(BaseModel):
    """Feature flags for enabling/disabling features"""
    marketplace_enabled: bool = True
    ai_chat_enabled: bool = True
    wallet_enabled: bool = True
    social_login_enabled: bool = True
    email_verification_required: bool = True
    two_factor_auth_enabled: bool = True
    file_upload_enabled: bool = True
    websocket_enabled: bool = True
    analytics_enabled: bool = True
    
    # Model availability
    claude_opus_enabled: bool = True
    gpt4_enabled: bool = True
    open_source_models_enabled: bool = True
    custom_models_enabled: bool = True


class WhiteLabelConfig(BaseModel):
    """Complete white-label configuration"""
    # Basic branding
    platform_name: str = Field(default="LOGOS", description="Short platform name")
    platform_full_name: str = Field(default="LOGOS AI Ecosystem", description="Full platform name")
    platform_tagline: str = Field(default="AI-Native Ecosystem for the Future", description="Platform tagline")
    
    # Visual branding
    logo_url: str = Field(default="/logo.svg", description="Logo URL")
    favicon_url: str = Field(default="/favicon.ico", description="Favicon URL")
    apple_touch_icon_url: str = Field(default="/apple-touch-icon.png", description="Apple touch icon URL")
    
    # Configuration sections
    colors: BrandColors = Field(default_factory=BrandColors)
    social: SocialLinks = Field(default_factory=SocialLinks)
    email: EmailConfig = Field(default_factory=EmailConfig)
    seo: SEOConfig = Field(default_factory=SEOConfig)
    legal: LegalConfig = Field(default_factory=LegalConfig)
    features: FeatureFlags = Field(default_factory=FeatureFlags)
    
    # Custom branding
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None
    custom_head_html: Optional[str] = None
    custom_footer_html: Optional[str] = None
    
    # API customization
    api_base_url: HttpUrl = Field(default="https://api.logos-ecosystem.ai")
    api_docs_title: str = Field(default="LOGOS API Documentation")
    
    # Support links
    documentation_url: Optional[HttpUrl] = None
    support_url: Optional[HttpUrl] = None
    community_url: Optional[HttpUrl] = None


class WhiteLabelManager:
    """Manager for white-label configuration"""
    
    def __init__(self, config_path: Optional[Path] = None):
        self.config_path = config_path or Path("whitelabel.json")
        self._config: Optional[WhiteLabelConfig] = None
        
    @property
    def config(self) -> WhiteLabelConfig:
        """Get the current configuration"""
        if self._config is None:
            self.load_config()
        return self._config
    
    def load_config(self) -> WhiteLabelConfig:
        """Load configuration from file or environment"""
        # Try to load from environment variable first
        env_config = os.getenv("WHITELABEL_CONFIG")
        if env_config:
            try:
                config_data = json.loads(env_config)
                self._config = WhiteLabelConfig(**config_data)
                return self._config
            except Exception:
                pass
        
        # Try to load from file
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r') as f:
                    config_data = json.load(f)
                self._config = WhiteLabelConfig(**config_data)
                return self._config
            except Exception:
                pass
        
        # Return default configuration
        self._config = WhiteLabelConfig()
        return self._config
    
    def save_config(self, config: WhiteLabelConfig, path: Optional[Path] = None) -> None:
        """Save configuration to file"""
        save_path = path or self.config_path
        with open(save_path, 'w') as f:
            json.dump(config.model_dump(), f, indent=2, default=str)
    
    def update_config(self, updates: Dict[str, Any]) -> WhiteLabelConfig:
        """Update configuration with partial updates"""
        current_data = self.config.model_dump()
        
        # Deep merge updates
        def deep_merge(base: dict, updates: dict) -> dict:
            for key, value in updates.items():
                if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                    base[key] = deep_merge(base[key], value)
                else:
                    base[key] = value
            return base
        
        merged_data = deep_merge(current_data, updates)
        self._config = WhiteLabelConfig(**merged_data)
        return self._config
    
    def export_frontend_config(self) -> Dict[str, Any]:
        """Export configuration for frontend consumption"""
        config = self.config
        return {
            "platformName": config.platform_name,
            "platformFullName": config.platform_full_name,
            "platformTagline": config.platform_tagline,
            "logoUrl": config.logo_url,
            "faviconUrl": config.favicon_url,
            "colors": config.colors.model_dump(),
            "social": {k: str(v) if v else None for k, v in config.social.model_dump().items()},
            "seo": {
                "siteName": config.seo.site_name,
                "siteUrl": str(config.seo.site_url),
                "siteDescription": config.seo.site_description,
                "siteKeywords": config.seo.site_keywords,
                "ogImage": config.seo.og_image,
                "twitterHandle": config.seo.twitter_handle,
            },
            "features": config.features.model_dump(),
            "apiBaseUrl": str(config.api_base_url),
            "supportEmail": config.email.support_email,
            "documentationUrl": str(config.documentation_url) if config.documentation_url else None,
            "supportUrl": str(config.support_url) if config.support_url else None,
            "communityUrl": str(config.community_url) if config.community_url else None,
        }
    
    def generate_theme_css(self) -> str:
        """Generate CSS variables for theming"""
        colors = self.config.colors
        return f"""
:root {{
    --color-primary: {colors.primary};
    --color-secondary: {colors.secondary};
    --color-accent: {colors.accent};
    --color-background: {colors.background};
    --color-surface: {colors.surface};
    --color-error: {colors.error};
    --color-warning: {colors.warning};
    --color-info: {colors.info};
    --color-success: {colors.success};
}}
"""


# Singleton instance
@lru_cache()
def get_whitelabel_manager() -> WhiteLabelManager:
    """Get the singleton white-label manager"""
    return WhiteLabelManager()


# Convenience functions
def get_whitelabel_config() -> WhiteLabelConfig:
    """Get the current white-label configuration"""
    return get_whitelabel_manager().config


def get_platform_name() -> str:
    """Get the platform name"""
    return get_whitelabel_config().platform_name


def get_support_email() -> str:
    """Get the support email"""
    return get_whitelabel_config().email.support_email