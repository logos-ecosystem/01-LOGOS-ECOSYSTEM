from sqlalchemy import Column, String, Float, Integer, JSON, ForeignKey, Boolean, DateTime, Numeric, Text
from sqlalchemy.orm import relationship
from ...shared.utils.database_types import UUID
import uuid
from datetime import datetime

from ...infrastructure.database import Base
from .base import BaseModel


class Wallet(Base, BaseModel):
    """User wallet model for managing digital assets."""
    
    __tablename__ = "wallets"
    
    user_id = Column(UUID, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    
    # Balances
    balance_usd = Column(Float, default=0.0, nullable=False)
    balance_tokens = Column(Integer, default=0, nullable=False)
    balance_credits = Column(Integer, default=0, nullable=False)
    
    # Blockchain
    eth_address = Column(String(42), unique=True)
    eth_private_key_encrypted = Column(String(500))  # Encrypted with user's password
    
    # Limits
    daily_spending_limit = Column(Float, default=1000.0, nullable=False)
    monthly_spending_limit = Column(Float, default=10000.0, nullable=False)
    
    # Stats
    total_earned = Column(Float, default=0.0, nullable=False)
    total_spent = Column(Float, default=0.0, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="wallet", uselist=False)
    transactions = relationship("WalletTransaction", back_populates="wallet", cascade="all, delete-orphan")
    payment_methods = relationship("PaymentMethod", back_populates="wallet", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Wallet user_id={self.user_id} balance=${self.balance_usd}>"


class WalletTransaction(Base, BaseModel):
    """Wallet transaction history."""
    
    __tablename__ = "wallet_transactions"
    
    wallet_id = Column(UUID, ForeignKey("wallets.id"), nullable=False, index=True)
    
    # Transaction details
    type = Column(String(20), nullable=False)  # 'deposit', 'withdrawal', 'purchase', 'earning', 'payment', 'refund'
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    
    # Reference
    reference_type = Column(String(50))  # 'marketplace', 'ai_usage', 'subscription', 'payment'
    reference_id = Column(UUID)
    
    # Payment info
    payment_method = Column(String(50))  # 'stripe', 'paypal', 'crypto_btc', etc.
    payment_id = Column(String(255))  # External payment ID
    
    # Status
    status = Column(String(20), default="completed", nullable=False)  # 'pending', 'processing', 'completed', 'failed', 'cancelled'
    transaction_hash = Column(String(255))
    completed_at = Column(DateTime)
    failed_at = Column(DateTime)
    
    # Fee info
    fee_amount = Column(Float, default=0.0)
    net_amount = Column(Float)  # Amount after fees
    
    # Metadata
    description = Column(String(255))
    transaction_metadata = Column(JSON, default={})
    
    # Relationships
    wallet = relationship("Wallet", back_populates="transactions")
    
    def __repr__(self):
        return f"<WalletTransaction {self.type}: {self.amount} {self.currency}>"


class PaymentMethod(Base, BaseModel):
    """User payment methods."""
    
    __tablename__ = "payment_methods"
    
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    wallet_id = Column(UUID, ForeignKey("wallets.id"), nullable=False)
    
    # Type and provider
    type = Column(String(50), nullable=False)  # 'stripe', 'paypal', 'crypto_btc', 'crypto_eth', etc.
    provider = Column(String(50))  # 'stripe', 'paypal', 'coinbase', 'binance', etc.
    provider_id = Column(String(255))  # External provider ID
    
    # Payment ID for tracking
    payment_id = Column(String(255), unique=True)  # Unique payment/subscription ID
    
    # Card details (if applicable)
    last_four = Column(String(4))
    brand = Column(String(20))  # 'visa', 'mastercard', 'amex', etc.
    exp_month = Column(Integer)
    exp_year = Column(Integer)
    
    # Bank details (if applicable)
    bank_name = Column(String(100))
    account_type = Column(String(20))  # 'checking', 'savings'
    
    # Crypto details (if applicable)
    crypto_address = Column(String(255))
    crypto_network = Column(String(50))  # 'mainnet', 'testnet', etc.
    crypto_currency = Column(String(10))  # 'BTC', 'ETH', 'USDT', etc.
    
    # Customer IDs for different providers
    stripe_customer_id = Column(String(255))
    paypal_customer_id = Column(String(255))
    
    # Status
    is_default = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    verified_at = Column(DateTime)
    
    # Security
    encrypted_data = Column(Text)  # Encrypted sensitive data
    fingerprint = Column(String(255))  # For duplicate detection
    
    # Metadata
    payment_method_metadata = Column(JSON, default={})
    
    # Relationships
    wallet = relationship("Wallet", back_populates="payment_methods")
    
    def __repr__(self):
        return f"<PaymentMethod {self.type} ending in {self.last_four}>"


class EscrowTransaction(Base, BaseModel):
    """Escrow transactions for secure marketplace trades."""
    
    __tablename__ = "escrow_transactions"
    
    # Parties
    buyer_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    seller_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    item_id = Column(UUID, ForeignKey("marketplace_items.id"), nullable=False)
    
    # Amounts
    amount = Column(Numeric(precision=19, scale=4), nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    platform_fee = Column(Numeric(precision=19, scale=4), default=0)
    seller_amount = Column(Numeric(precision=19, scale=4), nullable=False)
    
    # Status
    status = Column(String(20), default="pending", nullable=False)
    # 'pending', 'held', 'released', 'refunded', 'disputed', 'expired'
    
    # Timestamps
    held_at = Column(DateTime)
    released_at = Column(DateTime)
    refunded_at = Column(DateTime)
    expires_at = Column(DateTime, nullable=False)
    
    # Confirmation
    buyer_confirmed = Column(Boolean, default=False)
    confirmed_at = Column(DateTime)
    
    # Dispute handling
    disputed_at = Column(DateTime)
    disputed_by = Column(UUID)
    dispute_reason = Column(Text)
    dispute_resolved_at = Column(DateTime)
    dispute_resolution = Column(Text)
    dispute_resolver_id = Column(UUID)
    dispute_deadline = Column(DateTime)
    
    # Release/Refund info
    released_by = Column(UUID)
    refunded_by = Column(UUID)
    refund_reason = Column(Text)
    
    # Metadata
    description = Column(Text)
    escrow_metadata = Column(JSON, default={})
    
    def __repr__(self):
        return f"<EscrowTransaction {self.id} {self.status} ${self.amount}>"


class CryptoPayment(Base, BaseModel):
    """Cryptocurrency payment records."""
    
    __tablename__ = "crypto_payments"
    
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    
    # Payment details
    crypto_currency = Column(String(10), nullable=False)  # 'BTC', 'ETH', 'USDT', etc.
    amount_crypto = Column(Numeric(precision=32, scale=18), nullable=False)
    amount_usd = Column(Numeric(precision=19, scale=4), nullable=False)
    exchange_rate = Column(Numeric(precision=19, scale=8), nullable=False)
    
    # Address info
    payment_address = Column(String(255), nullable=False)
    transaction_hash = Column(String(255))
    
    # Status
    status = Column(String(20), default="pending", nullable=False)
    # 'pending', 'confirmed', 'failed', 'expired'
    confirmations = Column(Integer, default=0)
    confirmed_at = Column(DateTime)
    expires_at = Column(DateTime, nullable=False)
    
    # Metadata
    description = Column(Text)
    crypto_payment_metadata = Column(JSON, default={})
    
    def __repr__(self):
        return f"<CryptoPayment {self.crypto_currency} {self.amount_crypto}>"


class Subscription(Base, BaseModel):
    """Subscription records for recurring payments."""
    
    __tablename__ = "subscriptions"
    
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    payment_method_id = Column(UUID, ForeignKey("payment_methods.id"))
    
    # Subscription identifiers
    subscription_id = Column(String(255), unique=True, nullable=False)  # External subscription ID
    provider = Column(String(50), nullable=False)  # 'stripe', 'paypal'
    plan_id = Column(String(255), nullable=False)  # External plan/price ID
    
    # Details
    name = Column(String(255))
    description = Column(Text)
    
    # Pricing
    amount = Column(Numeric(precision=19, scale=4), nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    interval = Column(String(20), nullable=False)  # 'day', 'week', 'month', 'year'
    interval_count = Column(Integer, default=1)  # Every N intervals
    
    # Status
    status = Column(String(20), nullable=False)  # 'trialing', 'active', 'cancelled', 'past_due', 'unpaid', 'incomplete'
    
    # Trial info
    trial_start = Column(DateTime)
    trial_end = Column(DateTime)
    
    # Billing periods
    current_period_start = Column(DateTime)
    current_period_end = Column(DateTime)
    billing_cycle_anchor = Column(DateTime)
    
    # Cancellation
    cancel_at_period_end = Column(Boolean, default=False)
    cancelled_at = Column(DateTime)
    cancellation_reason = Column(Text)
    
    # Usage-based billing
    usage_based = Column(Boolean, default=False)
    usage_limit = Column(Integer)  # Max usage per period
    current_usage = Column(Integer, default=0)
    
    # Metadata
    subscription_metadata = Column(JSON, default={})
    
    # Relationships
    user = relationship("User", backref="subscriptions")
    payment_method = relationship("PaymentMethod")
    
    def __repr__(self):
        return f"<Subscription {self.subscription_id} {self.status}>"


class Invoice(Base, BaseModel):
    """Invoice records for billing."""
    
    __tablename__ = "invoices"
    
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    
    # Invoice details
    invoice_number = Column(String(50), unique=True, nullable=False)
    
    # Customer info
    customer_name = Column(String(255))
    customer_email = Column(String(255))
    customer_address = Column(Text)
    customer_tax_id = Column(String(50))
    
    # Items and amounts
    items = Column(JSON, nullable=False)  # List of line items
    subtotal = Column(Numeric(precision=19, scale=4), nullable=False)
    tax_rate = Column(Numeric(precision=5, scale=4), default=0)
    tax_amount = Column(Numeric(precision=19, scale=4), default=0)
    total_amount = Column(Numeric(precision=19, scale=4), nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    
    # Status
    status = Column(String(20), default="draft", nullable=False)
    # 'draft', 'sent', 'paid', 'overdue', 'cancelled'
    
    # Dates
    due_date = Column(DateTime)
    sent_at = Column(DateTime)
    paid_at = Column(DateTime)
    
    # Payment info
    payment_method = Column(String(50))
    payment_reference = Column(String(255))
    payment_url = Column(String(500))  # For online payment
    
    # Metadata
    notes = Column(Text)
    invoice_metadata = Column(JSON, default={})
    
    def __repr__(self):
        return f"<Invoice {self.invoice_number} {self.total_amount} {self.currency}>"