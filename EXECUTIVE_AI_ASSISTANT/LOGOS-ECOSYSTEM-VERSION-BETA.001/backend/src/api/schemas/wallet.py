from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid


class WalletResponse(BaseModel):
    """Schema for wallet response."""
    id: uuid.UUID
    user_id: uuid.UUID
    balance_usd: float
    balance_tokens: int
    balance_credits: int
    eth_address: Optional[str]
    daily_spending_limit: float
    monthly_spending_limit: float
    total_earned: float
    total_spent: float
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class WalletTransactionResponse(BaseModel):
    """Schema for wallet transaction response."""
    id: uuid.UUID
    wallet_id: uuid.UUID
    type: str
    amount: float
    currency: str
    status: str
    transaction_hash: Optional[str]
    description: Optional[str]
    reference_type: Optional[str]
    reference_id: Optional[uuid.UUID]
    transaction_metadata: Dict[str, Any]
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class DepositRequest(BaseModel):
    """Schema for deposit request."""
    amount: float = Field(..., gt=0, le=10000)
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    payment_method: str = Field(..., pattern="^(credit_card|paypal|crypto|bank_transfer|test)$")
    reference: Optional[str] = Field(None, max_length=255)
    
    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v):
        return round(v, 2)


class WithdrawalRequest(BaseModel):
    """Schema for withdrawal request."""
    amount: float = Field(..., gt=0, le=10000)
    destination: str = Field(..., min_length=3, max_length=255)
    destination_type: str = Field(..., pattern="^(bank_account|paypal|crypto_wallet)$")
    
    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v):
        return round(v, 2)


class TransferRequest(BaseModel):
    """Schema for transfer request."""
    recipient: str = Field(..., min_length=3, max_length=255)
    transfer_type: str = Field(default="username", pattern="^(username|email|phone|wallet)$")
    amount: float = Field(..., gt=0, le=10000)
    description: Optional[str] = Field(None, max_length=255)
    currency: str = Field(default="USD")
    recipient_username: Optional[str] = Field(None, min_length=3, max_length=50)  # Backward compatibility
    note: Optional[str] = Field(None, max_length=255)  # Backward compatibility
    
    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v):
        return round(v, 2)


class WalletStatsResponse(BaseModel):
    """Schema for wallet statistics response."""
    current_balance: float
    total_earned: float
    total_spent: float
    daily_limit: float
    monthly_limit: float
    period: str
    transactions_by_type: Dict[str, Dict[str, Any]]
    deposits: Dict[str, Any]
    withdrawals: Dict[str, Any]
    purchases: Dict[str, Any]
    earnings: Dict[str, Any]


class ValidateRecipientRequest(BaseModel):
    """Schema for recipient validation request."""
    recipient: str
    type: str = Field(..., pattern="^(username|email|phone|wallet)$")


class ValidateRecipientResponse(BaseModel):
    """Schema for recipient validation response."""
    valid: bool
    recipient: Optional[str] = None


class WalletDashboardResponse(BaseModel):
    """Schema for wallet dashboard response."""
    balance: float
    currency: str
    transactions: List[WalletTransactionResponse]
    stats: Dict[str, Any]


class PaymentMethodRequest(BaseModel):
    """Payment method request schema."""
    type: str = Field(..., description="Payment method type")
    details: Dict[str, Any] = Field(..., description="Payment method details")
    is_default: bool = Field(default=False, description="Set as default")


class PaymentMethodResponse(BaseModel):
    """Payment method response schema."""
    id: uuid.UUID
    type: str
    provider: Optional[str]
    last_four: Optional[str]
    brand: Optional[str]
    exp_month: Optional[int]
    exp_year: Optional[int]
    bank_name: Optional[str]
    account_type: Optional[str]
    crypto_address: Optional[str]
    crypto_network: Optional[str]
    is_default: bool
    is_verified: bool
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class CryptoDepositRequest(BaseModel):
    """Crypto deposit request schema."""
    amount_usd: float = Field(..., gt=0, description="Amount in USD")
    currency: str = Field(..., description="Cryptocurrency code")


class CryptoWithdrawalRequest(BaseModel):
    """Crypto withdrawal request schema."""
    amount: float = Field(..., gt=0, description="Amount to withdraw")
    currency: str = Field(..., description="Cryptocurrency code")
    destination_address: str = Field(..., description="Destination wallet address")


class InvoiceCreateRequest(BaseModel):
    """Invoice creation request schema."""
    customer_info: Dict[str, Any] = Field(..., description="Customer information")
    items: List[Dict[str, Any]] = Field(..., description="Invoice line items")
    currency: str = Field(default="USD", description="Currency code")
    due_days: Optional[int] = Field(None, description="Days until due")
    notes: Optional[str] = Field(None, description="Invoice notes")


class InvoiceResponse(BaseModel):
    """Invoice response schema."""
    invoice_id: uuid.UUID
    invoice_number: str
    customer_name: Optional[str]
    total_amount: float
    currency: str
    status: str
    due_date: Optional[datetime]
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class EscrowCreateRequest(BaseModel):
    """Escrow creation request schema."""
    seller_id: uuid.UUID = Field(..., description="Seller user ID")
    item_id: uuid.UUID = Field(..., description="Marketplace item ID")
    amount: float = Field(..., gt=0, description="Transaction amount")
    currency: str = Field(default="USD", description="Currency code")
    description: Optional[str] = Field(None, description="Transaction description")


class EscrowResponse(BaseModel):
    """Escrow response schema."""
    escrow_id: uuid.UUID
    status: str
    amount: float
    currency: str
    expires_at: datetime

    model_config = {
        "from_attributes": True
    }