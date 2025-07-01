"""Wallet service for managing user balances and transactions."""

from typing import Optional, List, Dict, Any, Tuple
from decimal import Decimal
from datetime import datetime, timedelta
import secrets
import hashlib
import json
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import asyncio
from cryptography.fernet import Fernet
import stripe

from ...shared.models.wallet import Wallet, WalletTransaction, PaymentMethod, EscrowTransaction
from ...shared.models.user import User
from ...infrastructure.database import get_db
from ...shared.utils.exceptions import (
    WalletNotFoundError,
    InsufficientBalanceError,
    TransactionError,
    ValidationError
)
from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings
settings = get_settings()
from ..security.encryption import encrypt_data, decrypt_data
from ..security.anomaly_detection import AnomalyDetector
from ..tasks.email import send_email as send_transaction_email

logger = get_logger(__name__)


class TransactionType(str, Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    PURCHASE = "purchase"
    EARNING = "earning"
    TRANSFER = "transfer"
    REFUND = "refund"
    FEE = "fee"
    ESCROW_HOLD = "escrow_hold"
    ESCROW_RELEASE = "escrow_release"


class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    BTC = "BTC"
    ETH = "ETH"
    TOKENS = "TOKENS"
    CREDITS = "CREDITS"


class WalletService:
    """Service for managing wallets and transactions."""
    
    def __init__(self):
        self.encryption_key = Fernet.generate_key()
        self.cipher = Fernet(self.encryption_key)
        self.anomaly_detector = AnomalyDetector()
        self.platform_fee_percentage = Decimal("0.025")  # 2.5% platform fee
        self.min_transaction_amount = {
            Currency.USD: Decimal("1.00"),
            Currency.EUR: Decimal("1.00"),
            Currency.GBP: Decimal("1.00"),
            Currency.BTC: Decimal("0.0001"),
            Currency.ETH: Decimal("0.001"),
            Currency.TOKENS: Decimal("1"),
            Currency.CREDITS: Decimal("1")
        }
        self.exchange_rates = self._load_exchange_rates()
    
    def _load_exchange_rates(self) -> Dict[str, float]:
        """Load exchange rates (mock for now)."""
        return {
            "USD": 1.0,
            "EUR": 0.85,
            "GBP": 0.73,
            "BTC": 0.000025,
            "ETH": 0.00035,
            "TOKENS": 10.0,
            "CREDITS": 100.0
        }
    
    async def create_wallet(self, user_id: str, db: Session) -> Wallet:
        """Create a new wallet for a user."""
        try:
            # Check if wallet already exists
            existing_wallet = db.query(Wallet).filter_by(user_id=user_id).first()
            if existing_wallet:
                raise ValidationError("Wallet already exists for this user")
            
            # Generate Ethereum address (mock for now)
            eth_address = self._generate_eth_address()
            eth_private_key = self._generate_eth_private_key()
            
            # Create wallet
            wallet = Wallet(
                user_id=user_id,
                eth_address=eth_address,
                eth_private_key_encrypted=self.cipher.encrypt(eth_private_key.encode()).decode(),
                balance_usd=0.0,
                balance_tokens=0,
                balance_credits=100  # Welcome bonus
            )
            
            db.add(wallet)
            db.commit()
            db.refresh(wallet)
            
            # Create welcome bonus transaction
            await self.create_transaction(
                wallet_id=str(wallet.id),
                type="earning",
                amount=100,
                currency="CREDITS",
                description="Welcome bonus",
                reference_type="system",
                db=db
            )
            
            logger.info(f"Created wallet for user {user_id}")
            return wallet
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating wallet: {str(e)}")
            raise
    
    async def get_wallet(self, user_id: str, db: Session) -> Wallet:
        """Get wallet by user ID."""
        wallet = db.query(Wallet).filter_by(user_id=user_id).first()
        if not wallet:
            raise WalletNotFoundError(f"Wallet not found for user {user_id}")
        return wallet
    
    async def get_balance(self, user_id: str, db: Session) -> Dict[str, Any]:
        """Get wallet balance for a user."""
        wallet = await self.get_wallet(user_id, db)
        
        return {
            "usd": wallet.balance_usd,
            "tokens": wallet.balance_tokens,
            "credits": wallet.balance_credits,
            "total_earned": wallet.total_earned,
            "total_spent": wallet.total_spent,
            "eth_address": wallet.eth_address
        }
    
    async def add_funds(
        self,
        user_id: str,
        amount: float,
        currency: str = "USD",
        description: str = "Deposit",
        db: Session = None
    ) -> WalletTransaction:
        """Add funds to a wallet."""
        wallet = await self.get_wallet(user_id, db)
        
        # Validate amount
        if amount <= 0:
            raise ValidationError("Amount must be greater than 0")
        
        # Update balance based on currency
        if currency == "USD":
            wallet.balance_usd += amount
            wallet.total_earned += amount
        elif currency == "TOKENS":
            wallet.balance_tokens += int(amount)
        elif currency == "CREDITS":
            wallet.balance_credits += int(amount)
        else:
            raise ValidationError(f"Invalid currency: {currency}")
        
        # Create transaction record
        transaction = await self.create_transaction(
            wallet_id=str(wallet.id),
            type="deposit",
            amount=amount,
            currency=currency,
            description=description,
            db=db
        )
        
        db.commit()
        logger.info(f"Added {amount} {currency} to wallet {wallet.id}")
        
        return transaction
    
    async def deduct_funds(
        self,
        user_id: str,
        amount: float,
        currency: str = "USD",
        description: str = "Payment",
        reference_type: str = None,
        reference_id: str = None,
        db: Session = None
    ) -> WalletTransaction:
        """Deduct funds from a wallet."""
        wallet = await self.get_wallet(user_id, db)
        
        # Validate amount
        if amount <= 0:
            raise ValidationError("Amount must be greater than 0")
        
        # Check balance and update
        if currency == "USD":
            if wallet.balance_usd < amount:
                raise InsufficientBalanceError("Insufficient USD balance")
            wallet.balance_usd -= amount
            wallet.total_spent += amount
        elif currency == "TOKENS":
            if wallet.balance_tokens < amount:
                raise InsufficientBalanceError("Insufficient token balance")
            wallet.balance_tokens -= int(amount)
        elif currency == "CREDITS":
            if wallet.balance_credits < amount:
                raise InsufficientBalanceError("Insufficient credit balance")
            wallet.balance_credits -= int(amount)
        else:
            raise ValidationError(f"Invalid currency: {currency}")
        
        # Check spending limits for USD
        if currency == "USD":
            await self._check_spending_limits(wallet, amount, db)
        
        # Create transaction record
        transaction = await self.create_transaction(
            wallet_id=str(wallet.id),
            type="purchase",
            amount=-amount,  # Negative for deductions
            currency=currency,
            description=description,
            reference_type=reference_type,
            reference_id=reference_id,
            db=db
        )
        
        db.commit()
        logger.info(f"Deducted {amount} {currency} from wallet {wallet.id}")
        
        return transaction
    
    async def transfer_funds(
        self,
        from_user_id: str,
        to_user_id: str,
        amount: float,
        currency: str = "USD",
        description: str = "Transfer",
        db: Session = None
    ) -> Dict[str, WalletTransaction]:
        """Transfer funds between wallets."""
        try:
            # Deduct from sender
            sender_transaction = await self.deduct_funds(
                user_id=from_user_id,
                amount=amount,
                currency=currency,
                description=f"Transfer to user {to_user_id}",
                reference_type="transfer",
                db=db
            )
            
            # Add to receiver
            receiver_transaction = await self.add_funds(
                user_id=to_user_id,
                amount=amount,
                currency=currency,
                description=f"Transfer from user {from_user_id}",
                db=db
            )
            
            return {
                "sender": sender_transaction,
                "receiver": receiver_transaction
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error transferring funds: {str(e)}")
            raise TransactionError(f"Transfer failed: {str(e)}")
    
    async def get_transactions(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        type: Optional[str] = None,
        db: Session = None
    ) -> List[WalletTransaction]:
        """Get transaction history for a wallet."""
        wallet = await self.get_wallet(user_id, db)
        
        query = db.query(WalletTransaction).filter_by(wallet_id=wallet.id)
        
        if type:
            query = query.filter_by(type=type)
        
        transactions = query.order_by(
            WalletTransaction.created_at.desc()
        ).limit(limit).offset(offset).all()
        
        return transactions
    
    async def get_spending_summary(
        self,
        user_id: str,
        period: str = "month",
        db: Session = None
    ) -> Dict[str, Any]:
        """Get spending summary for a wallet."""
        wallet = await self.get_wallet(user_id, db)
        
        # Calculate date range
        now = datetime.utcnow()
        if period == "day":
            start_date = now - timedelta(days=1)
        elif period == "week":
            start_date = now - timedelta(weeks=1)
        elif period == "month":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=365)
        
        # Get spending by category
        spending = db.query(
            WalletTransaction.reference_type,
            func.sum(WalletTransaction.amount).label("total")
        ).filter(
            WalletTransaction.wallet_id == wallet.id,
            WalletTransaction.type == "purchase",
            WalletTransaction.created_at >= start_date
        ).group_by(WalletTransaction.reference_type).all()
        
        spending_by_category = {
            item.reference_type or "other": abs(item.total or 0)
            for item in spending
        }
        
        # Get total spending
        total_spending = sum(spending_by_category.values())
        
        return {
            "period": period,
            "total_spending": total_spending,
            "spending_by_category": spending_by_category,
            "daily_limit": wallet.daily_spending_limit,
            "monthly_limit": wallet.monthly_spending_limit,
            "remaining_daily": max(0, wallet.daily_spending_limit - self._get_daily_spending(wallet, db)),
            "remaining_monthly": max(0, wallet.monthly_spending_limit - self._get_monthly_spending(wallet, db))
        }
    
    async def update_spending_limits(
        self,
        user_id: str,
        daily_limit: Optional[float] = None,
        monthly_limit: Optional[float] = None,
        db: Session = None
    ) -> Wallet:
        """Update spending limits for a wallet."""
        wallet = await self.get_wallet(user_id, db)
        
        if daily_limit is not None:
            if daily_limit < 0:
                raise ValidationError("Daily limit must be non-negative")
            wallet.daily_spending_limit = daily_limit
        
        if monthly_limit is not None:
            if monthly_limit < 0:
                raise ValidationError("Monthly limit must be non-negative")
            wallet.monthly_spending_limit = monthly_limit
        
        db.commit()
        logger.info(f"Updated spending limits for wallet {wallet.id}")
        
        return wallet
    
    async def create_transaction(
        self,
        wallet_id: str,
        type: str,
        amount: float,
        currency: str = "USD",
        description: str = None,
        reference_type: str = None,
        reference_id: str = None,
        status: str = "completed",
        db: Session = None
    ) -> WalletTransaction:
        """Create a transaction record."""
        transaction = WalletTransaction(
            wallet_id=wallet_id,
            type=type,
            amount=amount,
            currency=currency,
            description=description,
            reference_type=reference_type,
            reference_id=reference_id,
            status=status,
            metadata={
                "timestamp": datetime.utcnow().isoformat(),
                "ip_address": "system"
            }
        )
        
        db.add(transaction)
        return transaction
    
    async def _check_spending_limits(self, wallet: Wallet, amount: float, db: Session):
        """Check if spending is within limits."""
        daily_spending = self._get_daily_spending(wallet, db)
        monthly_spending = self._get_monthly_spending(wallet, db)
        
        if daily_spending + amount > wallet.daily_spending_limit:
            raise ValidationError("Daily spending limit exceeded")
        
        if monthly_spending + amount > wallet.monthly_spending_limit:
            raise ValidationError("Monthly spending limit exceeded")
    
    def _get_daily_spending(self, wallet: Wallet, db: Session) -> float:
        """Get total spending for today."""
        today = datetime.utcnow().date()
        
        result = db.query(func.sum(WalletTransaction.amount)).filter(
            WalletTransaction.wallet_id == wallet.id,
            WalletTransaction.type == "purchase",
            WalletTransaction.currency == "USD",
            func.date(WalletTransaction.created_at) == today
        ).scalar()
        
        return abs(result or 0)
    
    def _get_monthly_spending(self, wallet: Wallet, db: Session) -> float:
        """Get total spending for this month."""
        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)
        
        result = db.query(func.sum(WalletTransaction.amount)).filter(
            WalletTransaction.wallet_id == wallet.id,
            WalletTransaction.type == "purchase",
            WalletTransaction.currency == "USD",
            WalletTransaction.created_at >= month_start
        ).scalar()
        
        return abs(result or 0)
    
    def _generate_eth_address(self) -> str:
        """Generate a mock Ethereum address."""
        # In production, use web3.py to generate real addresses
        random_bytes = secrets.token_bytes(20)
        return "0x" + random_bytes.hex()
    
    def _generate_eth_private_key(self) -> str:
        """Generate a mock Ethereum private key."""
        # In production, use web3.py to generate real keys
        return secrets.token_hex(32)


# Create singleton instance
wallet_service = WalletService()