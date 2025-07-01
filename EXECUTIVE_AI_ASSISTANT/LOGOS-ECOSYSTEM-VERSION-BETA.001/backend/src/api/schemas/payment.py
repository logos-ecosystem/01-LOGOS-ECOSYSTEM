"""Payment schemas for API requests and responses."""

from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List
from decimal import Decimal
from datetime import datetime
from enum import Enum


class PaymentMethodEnum(str, Enum):
    """Supported payment methods."""
    STRIPE = "stripe"
    PAYPAL = "paypal"
    CRYPTO_BTC = "crypto_btc"
    CRYPTO_ETH = "crypto_eth"
    CRYPTO_USDT = "crypto_usdt"
    CRYPTO_USDC = "crypto_usdc"
    CRYPTO_DAI = "crypto_dai"
    CRYPTO_BNB = "crypto_bnb"
    CRYPTO_SOL = "crypto_sol"
    CRYPTO_XLM = "crypto_xlm"
    CRYPTO_ALGO = "crypto_algo"


class PaymentStatusEnum(str, Enum):
    """Payment status options."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class CurrencyEnum(str, Enum):
    """Supported currencies."""
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    CAD = "CAD"
    AUD = "AUD"
    JPY = "JPY"
    # Cryptocurrencies
    BTC = "BTC"
    ETH = "ETH"
    USDT = "USDT"
    USDC = "USDC"
    DAI = "DAI"
    BNB = "BNB"
    SOL = "SOL"
    XLM = "XLM"
    ALGO = "ALGO"


# Request schemas
class PaymentCreateRequest(BaseModel):
    """Request to create a payment."""
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    currency: str = Field(default="USD", description="Payment currency")
    payment_method: str = Field(..., description="Payment method to use")
    description: Optional[str] = Field(None, description="Payment description")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    return_url: Optional[str] = Field(None, description="URL to redirect after payment")
    cancel_url: Optional[str] = Field(None, description="URL to redirect on cancellation")
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        return v
    
    @validator('currency')
    def validate_currency(cls, v):
        return v.upper()


class PaymentConfirmRequest(BaseModel):
    """Request to confirm a payment."""
    payment_method: str = Field(..., description="Payment method used")
    additional_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional confirmation data")


class PaymentMethodRequest(BaseModel):
    """Request to add a payment method."""
    type: str = Field(..., description="Payment method type")
    provider: Optional[str] = Field(None, description="Payment provider")
    token: Optional[str] = Field(None, description="Payment token from provider")
    details: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Payment method details")
    set_as_default: bool = Field(default=False, description="Set as default payment method")


class RefundRequest(BaseModel):
    """Request to process a refund."""
    payment_method: str = Field(..., description="Original payment method")
    amount: Optional[Decimal] = Field(None, gt=0, description="Refund amount (None for full refund)")
    reason: Optional[str] = Field(None, description="Refund reason")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class SubscriptionCreateRequest(BaseModel):
    """Request to create a subscription."""
    payment_method: str = Field(..., description="Payment method to use")
    plan_id: str = Field(..., description="Subscription plan ID")
    customer_id: Optional[str] = Field(None, description="Customer ID (if different from user)")
    trial_days: Optional[int] = Field(None, ge=0, description="Trial period in days")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class SubscriptionUpdateRequest(BaseModel):
    """Request to update a subscription."""
    plan_id: Optional[str] = Field(None, description="New plan ID")
    quantity: Optional[int] = Field(None, gt=0, description="Subscription quantity")
    trial_end: Optional[datetime] = Field(None, description="Trial end date")
    cancel_at_period_end: Optional[bool] = Field(None, description="Cancel at period end")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Updated metadata")


# Response schemas
class PaymentResponse(BaseModel):
    """Payment operation response."""
    success: bool
    payment_id: str
    status: str
    data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    error: Optional[str] = None


class PaymentMethodResponse(BaseModel):
    """Payment method response."""
    id: str
    type: str
    last4: Optional[str] = None
    brand: Optional[str] = None
    exp_month: Optional[int] = None
    exp_year: Optional[int] = None
    crypto_address: Optional[str] = None
    crypto_currency: Optional[str] = None
    is_default: bool = False
    created_at: Optional[datetime] = None


class RefundResponse(BaseModel):
    """Refund operation response."""
    success: bool
    refund_id: str
    status: str
    amount: Optional[float] = None
    currency: Optional[str] = None
    data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    error: Optional[str] = None


class SubscriptionResponse(BaseModel):
    """Subscription operation response."""
    success: bool
    subscription_id: str
    status: str
    plan_id: Optional[str] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    error: Optional[str] = None


class PaymentStatusResponse(BaseModel):
    """Payment status response."""
    success: bool
    payment_id: str
    status: str
    amount: Optional[float] = None
    currency: Optional[str] = None
    confirmations: Optional[int] = None
    data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    error: Optional[str] = None


class ExchangeRateResponse(BaseModel):
    """Exchange rate response."""
    success: bool
    from_currency: str
    to_currency: str
    rate: float
    amount: float
    converted: float
    source: str
    timestamp: datetime
    error: Optional[str] = None


# Webhook schemas
class StripeWebhookEvent(BaseModel):
    """Stripe webhook event."""
    id: str
    type: str
    data: Dict[str, Any]
    created: int
    livemode: bool


class PayPalWebhookEvent(BaseModel):
    """PayPal webhook event."""
    id: str
    event_type: str
    resource_type: str
    resource: Dict[str, Any]
    create_time: datetime
    summary: Optional[str] = None


class CryptoWebhookEvent(BaseModel):
    """Cryptocurrency webhook event."""
    provider: str
    event_type: str
    transaction_hash: Optional[str] = None
    address: Optional[str] = None
    amount: Optional[float] = None
    confirmations: Optional[int] = None
    data: Dict[str, Any]


# Transaction schemas
class TransactionListResponse(BaseModel):
    """Transaction list response."""
    transactions: List[Dict[str, Any]]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool


class TransactionDetailResponse(BaseModel):
    """Transaction detail response."""
    id: str
    type: str
    amount: float
    currency: str
    status: str
    payment_method: Optional[str] = None
    payment_id: Optional[str] = None
    description: Optional[str] = None
    fee_amount: Optional[float] = None
    net_amount: Optional[float] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


# Payment link schemas
class PaymentLinkCreateRequest(BaseModel):
    """Request to create a payment link."""
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    currency: str = Field(default="USD", description="Payment currency")
    description: Optional[str] = Field(None, description="Payment description")
    expires_in_hours: Optional[int] = Field(24, gt=0, le=720, description="Link expiration in hours")
    max_uses: Optional[int] = Field(None, gt=0, description="Maximum number of uses")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class PaymentLinkResponse(BaseModel):
    """Payment link response."""
    success: bool
    link_id: str
    url: str
    amount: float
    currency: str
    expires_at: datetime
    uses_remaining: Optional[int] = None
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


# Invoice schemas
class InvoiceCreateRequest(BaseModel):
    """Request to create an invoice."""
    customer_email: str = Field(..., description="Customer email")
    customer_name: Optional[str] = Field(None, description="Customer name")
    items: List[Dict[str, Any]] = Field(..., description="Invoice line items")
    due_date: Optional[datetime] = Field(None, description="Invoice due date")
    tax_rate: Optional[float] = Field(0, ge=0, le=100, description="Tax rate percentage")
    notes: Optional[str] = Field(None, description="Invoice notes")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class InvoiceResponse(BaseModel):
    """Invoice response."""
    success: bool
    invoice_id: str
    invoice_number: str
    total_amount: float
    currency: str
    status: str
    due_date: Optional[datetime] = None
    payment_url: Optional[str] = None
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


# Batch payment schemas
class BatchPaymentRequest(BaseModel):
    """Request for batch payments."""
    payments: List[Dict[str, Any]] = Field(..., description="List of payments to process")
    payment_method: str = Field(..., description="Payment method for all payments")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Batch metadata")


class BatchPaymentResponse(BaseModel):
    """Batch payment response."""
    success: bool
    batch_id: str
    total_payments: int
    successful: int
    failed: int
    results: List[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)