"""Whitelabel API Schemas."""

from pydantic import BaseModel, Field, EmailStr, HttpUrl, field_validator, model_validator
from typing import Dict, Any, Optional, List
from datetime import datetime, date
from decimal import Decimal
from enum import Enum


# Tenant Schemas
class TenantCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    subdomain: str = Field(..., min_length=3, max_length=100, pattern="^[a-z0-9-]+$")
    owner_email: EmailStr
    plan: str = Field(default="starter", pattern="^(starter|professional|enterprise)$")
    isolation_strategy: str = Field(default="shared", pattern="^(shared|schema|database|server)$")
    
    @field_validator('subdomain')
    @classmethod
    def validate_subdomain(cls, v):
        reserved = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop']
        if v in reserved:
            raise ValueError(f"Subdomain '{v}' is reserved")
        return v


class TenantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    billing_email: Optional[EmailStr]
    metadata: Optional[Dict[str, Any]]


class TenantResponse(BaseModel):
    id: str
    name: str
    subdomain: str
    owner_email: EmailStr
    plan: str
    status: str
    api_key: str
    created_at: datetime
    updated_at: Optional[datetime]
    
    model_config = {
        "from_attributes": True
    }


# Theme Schemas
class ThemeColorsConfig(BaseModel):
    primary: str = Field(default="#3498db", pattern="^#[0-9A-Fa-f]{6}$")
    secondary: str = Field(default="#2ecc71", pattern="^#[0-9A-Fa-f]{6}$")
    accent: str = Field(default="#e74c3c", pattern="^#[0-9A-Fa-f]{6}$")
    background: str = Field(default="#ffffff", pattern="^#[0-9A-Fa-f]{6}$")
    surface: str = Field(default="#f8f9fa", pattern="^#[0-9A-Fa-f]{6}$")
    text: str = Field(default="#2c3e50", pattern="^#[0-9A-Fa-f]{6}$")
    text_secondary: str = Field(default="#7f8c8d", pattern="^#[0-9A-Fa-f]{6}$")
    success: str = Field(default="#27ae60", pattern="^#[0-9A-Fa-f]{6}$")
    warning: str = Field(default="#f39c12", pattern="^#[0-9A-Fa-f]{6}$")
    error: str = Field(default="#e74c3c", pattern="^#[0-9A-Fa-f]{6}$")
    info: str = Field(default="#3498db", pattern="^#[0-9A-Fa-f]{6}$")


class ThemeTypographyConfig(BaseModel):
    font_family: str = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    font_family_heading: str = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    font_size_base: str = "16px"
    font_weight_normal: str = "400"
    font_weight_medium: str = "500"
    font_weight_bold: str = "700"
    line_height_base: str = "1.5"
    letter_spacing: str = "normal"


class ThemeConfigCreate(BaseModel):
    colors: ThemeColorsConfig = Field(default_factory=ThemeColorsConfig)
    typography: ThemeTypographyConfig = Field(default_factory=ThemeTypographyConfig)
    spacing: Optional[Dict[str, str]] = None
    borders: Optional[Dict[str, str]] = None
    shadows: Optional[Dict[str, str]] = None
    components: Optional[Dict[str, Dict[str, str]]] = None
    animations: Optional[Dict[str, str]] = None
    generate_favicon: bool = True
    custom_css: Optional[str] = None


class ThemeConfigResponse(BaseModel):
    theme_id: Optional[int] = None
    config: Dict[str, Any]
    css_url: Optional[str]
    favicon_url: Optional[str]
    theme_hash: Optional[str]


# Domain Schemas
class DomainCreate(BaseModel):
    domain: str = Field(..., min_length=3, max_length=255)
    
    @field_validator('domain')
    @classmethod
    def validate_domain(cls, v):
        # Basic domain validation
        import re
        pattern = r'^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid domain format')
        return v.lower()
    
    model_config = {
        "from_attributes": True
    }


class DomainVerifyResponse(BaseModel):
    domain: str
    verified: bool
    message: str


# Revenue Sharing Schemas
class CommissionTier(BaseModel):
    min_revenue: Decimal
    max_revenue: Optional[Decimal] = -1
    rate: Decimal = Field(..., ge=0, le=1)


class RevenueSharingCreate(BaseModel):
    commission_model: str = Field(..., pattern="^(flat_rate|tiered|progressive|custom|hybrid)$")
    commission_config: Dict[str, Any]
    payout_frequency: str = Field(
        default="monthly",
        pattern="^(daily|weekly|biweekly|monthly|quarterly|on_demand|threshold)$"
    )
    payout_config: Dict[str, Any] = Field(default_factory=dict)
    
    @model_validator(mode='after')
    def validate_commission_config(self):
        v = self.commission_config
        model = self.commission_model
        if model == 'flat_rate':
            if 'rate' not in v:
                raise ValueError('Rate required for flat_rate model')
            rate = Decimal(str(v['rate']))
            if not (0 <= rate <= 1):
                raise ValueError('Rate must be between 0 and 1')
        elif model == 'tiered':
            if 'tiers' not in v or not v['tiers']:
                raise ValueError('Tiers required for tiered model')
        return self
    
    model_config = {
        "from_attributes": True
    }


class RevenueSharingUpdate(BaseModel):
    commission_model: Optional[str]
    commission_config: Optional[Dict[str, Any]]
    payout_frequency: Optional[str]
    payout_config: Optional[Dict[str, Any]]


# Payout Schemas
class PayoutRequest(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0)
    payment_method: str = Field(..., pattern="^(bank_transfer|paypal|crypto_[A-Z]+)$")
    payment_details: Dict[str, Any]
    
    @model_validator(mode='after')
    def validate_payment_details(self):
        v = self.payment_details
        method = self.payment_method
        if method == 'bank_transfer':
            required = ['account_number', 'bank_name', 'account_holder']
            for field in required:
                if field not in v:
                    raise ValueError(f'{field} required for bank transfer')
        elif method == 'paypal':
            if 'email' not in v:
                raise ValueError('Email required for PayPal')
        elif method.startswith('crypto_'):
            if 'address' not in v:
                raise ValueError('Wallet address required for crypto')
        return self


class PayoutResponse(BaseModel):
    id: int
    tenant_id: str
    amount: Decimal
    fee_amount: Decimal
    net_amount: Decimal
    currency: str
    payment_method: str
    status: str
    transaction_id: Optional[str]
    created_at: datetime
    processed_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
    
    model_config = {
        "from_attributes": True
    }


# Commission Report Schemas
class CommissionSummary(BaseModel):
    total_transactions: int
    total_revenue: Decimal
    total_commission: Decimal
    average_commission_rate: Decimal
    average_transaction_value: Decimal


class CommissionByType(BaseModel):
    count: int
    revenue: Decimal
    commission: Decimal


class DailyCommission(BaseModel):
    revenue: Decimal
    commission: Decimal
    count: int


class CommissionReportResponse(BaseModel):
    tenant_id: str
    period: Dict[str, str]
    summary: CommissionSummary
    by_type: Dict[str, CommissionByType]
    daily_breakdown: Dict[str, DailyCommission]


# Tenant User Schemas
class TenantUserResponse(BaseModel):
    id: str
    email: EmailStr
    username: str
    full_name: Optional[str]
    role: str
    joined_at: datetime
    
    model_config = {
        "from_attributes": True
    }


# Tenant Config Schemas
class TenantFeatures(BaseModel):
    custom_domain: bool = False
    white_label: bool = False
    api_access: bool = True
    webhook_support: bool = False
    priority_support: bool = False
    advanced_analytics: bool = False
    team_management: bool = False
    sso: bool = False
    audit_logs: bool = False
    custom_integrations: bool = False


class TenantLimits(BaseModel):
    users: int = 10
    api_calls_per_month: int = 10000
    storage_gb: int = 10
    ai_requests_per_month: int = 1000
    custom_agents: int = 5
    webhooks: int = 0
    team_members: int = 3


class TenantConfigResponse(BaseModel):
    features: TenantFeatures
    limits: TenantLimits
    branding: Dict[str, Any]
    integrations: Dict[str, Any]
    webhooks: List[Dict[str, Any]]
    custom_domains: List[str]