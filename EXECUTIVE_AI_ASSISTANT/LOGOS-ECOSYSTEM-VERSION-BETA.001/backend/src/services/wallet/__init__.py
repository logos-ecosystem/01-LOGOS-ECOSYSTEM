"""Wallet Service Module"""

from typing import Dict, Any, Optional, List
from decimal import Decimal
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
import stripe
import asyncio

from src.shared.models.wallet import Wallet, WalletTransaction
from src.shared.utils.logger import get_logger
from src.shared.utils.config import get_settings
from src.infrastructure.cache import cache_manager
from src.services.tasks.email import send_email as send_transaction_notification

logger = get_logger(__name__)

# Initialize Stripe
settings = get_settings()
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', None)


class WalletService:
    """Service for managing user wallets and transactions"""
    
    async def create_wallet(
        self,
        user_id: str,
        db: AsyncSession
    ) -> Wallet:
        """Create a new wallet for a user"""
        wallet = Wallet(
            id=str(uuid.uuid4()),
            user_id=user_id,
            balance_usd=Decimal("0.00"),
            balance_tokens=0,
            balance_credits=100,  # Welcome bonus
            total_deposits=Decimal("0.00"),
            total_withdrawals=Decimal("0.00"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(wallet)
        await db.commit()
        await db.refresh(wallet)
        
        return wallet
    
    async def get_wallet(
        self,
        user_id: str,
        db: AsyncSession,
        create_if_not_exists: bool = True
    ) -> Optional[Wallet]:
        """Get user's wallet"""
        result = await db.execute(
            select(Wallet).where(Wallet.user_id == user_id)
        )
        wallet = result.scalar_one_or_none()
        
        if not wallet and create_if_not_exists:
            wallet = await self.create_wallet(user_id, db)
        
        return wallet
    
    async def get_balance(
        self,
        user_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Get user's wallet balance"""
        wallet = await self.get_wallet(user_id, db)
        if not wallet:
            return {
                "balance_usd": 0,
                "balance_tokens": 0,
                "balance_credits": 0
            }
        
        return {
            "balance_usd": float(wallet.balance_usd),
            "balance_tokens": wallet.balance_tokens,
            "balance_credits": wallet.balance_credits,
            "total_deposits": float(wallet.total_deposits),
            "total_withdrawals": float(wallet.total_withdrawals)
        }
    
    async def deposit(
        self,
        user_id: str,
        amount: Decimal,
        payment_method: str,
        db: AsyncSession,
        payment_details: Optional[Dict[str, Any]] = None
    ) -> WalletTransaction:
        """Deposit funds to wallet"""
        wallet = await self.get_wallet(user_id, db)
        if not wallet:
            raise ValueError("Wallet not found")
        
        # Process payment based on method
        payment_id = None
        if payment_method == "stripe":
            payment_id = await self._process_stripe_payment(amount, payment_details)
        elif payment_method == "test":
            # Test mode - instant approval
            payment_id = f"test_{uuid.uuid4()}"
        else:
            raise ValueError(f"Unsupported payment method: {payment_method}")
        
        # Create transaction
        transaction = WalletTransaction(
            id=str(uuid.uuid4()),
            wallet_id=wallet.id,
            type="deposit",
            amount=amount,
            currency="USD",
            status="completed",
            payment_method=payment_method,
            payment_id=payment_id,
            description=f"Deposit via {payment_method}",
            created_at=datetime.utcnow()
        )
        
        # Update wallet balance
        wallet.balance_usd += amount
        wallet.total_deposits += amount
        wallet.updated_at = datetime.utcnow()
        
        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)
        
        # Clear cache
        await cache_manager.delete(f"wallet:balance:{user_id}")
        
        # Send notification
        await send_transaction_notification.delay(transaction.id)
        
        return transaction
    
    async def withdraw(
        self,
        user_id: str,
        amount: Decimal,
        destination_type: str,
        destination_details: Dict[str, Any],
        db: AsyncSession
    ) -> WalletTransaction:
        """Withdraw funds from wallet"""
        wallet = await self.get_wallet(user_id, db)
        if not wallet:
            raise ValueError("Wallet not found")
        
        if wallet.balance_usd < amount:
            raise ValueError("Insufficient balance")
        
        # Create pending transaction
        transaction = WalletTransaction(
            id=str(uuid.uuid4()),
            wallet_id=wallet.id,
            type="withdrawal",
            amount=amount,
            currency="USD",
            status="pending",
            payment_method=destination_type,
            description=f"Withdrawal to {destination_type}",
            metadata=destination_details,
            created_at=datetime.utcnow()
        )
        
        # Update wallet balance
        wallet.balance_usd -= amount
        wallet.total_withdrawals += amount
        wallet.updated_at = datetime.utcnow()
        
        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)
        
        # Process withdrawal asynchronously
        asyncio.create_task(self._process_withdrawal(transaction.id, db))
        
        # Clear cache
        await cache_manager.delete(f"wallet:balance:{user_id}")
        
        return transaction
    
    async def transfer(
        self,
        sender_id: str,
        recipient_id: str,
        amount: Decimal,
        db: AsyncSession,
        notes: Optional[str] = None
    ) -> Dict[str, WalletTransaction]:
        """Transfer funds between wallets"""
        if sender_id == recipient_id:
            raise ValueError("Cannot transfer to self")
        
        # Get wallets
        sender_wallet = await self.get_wallet(sender_id, db)
        recipient_wallet = await self.get_wallet(recipient_id, db)
        
        if not sender_wallet or not recipient_wallet:
            raise ValueError("Wallet not found")
        
        if sender_wallet.balance_usd < amount:
            raise ValueError("Insufficient balance")
        
        # Create transactions
        sender_transaction = WalletTransaction(
            id=str(uuid.uuid4()),
            wallet_id=sender_wallet.id,
            type="transfer_out",
            amount=amount,
            currency="USD",
            status="completed",
            description=f"Transfer to user {recipient_id[:8]}",
            metadata={"recipient_id": recipient_id, "notes": notes},
            created_at=datetime.utcnow()
        )
        
        recipient_transaction = WalletTransaction(
            id=str(uuid.uuid4()),
            wallet_id=recipient_wallet.id,
            type="transfer_in",
            amount=amount,
            currency="USD",
            status="completed",
            description=f"Transfer from user {sender_id[:8]}",
            metadata={"sender_id": sender_id, "notes": notes},
            created_at=datetime.utcnow()
        )
        
        # Update balances
        sender_wallet.balance_usd -= amount
        sender_wallet.updated_at = datetime.utcnow()
        
        recipient_wallet.balance_usd += amount
        recipient_wallet.updated_at = datetime.utcnow()
        
        db.add(sender_transaction)
        db.add(recipient_transaction)
        await db.commit()
        
        # Clear cache
        await cache_manager.delete(f"wallet:balance:{sender_id}")
        await cache_manager.delete(f"wallet:balance:{recipient_id}")
        
        # Send notifications
        await send_transaction_notification.delay(sender_transaction.id)
        await send_transaction_notification.delay(recipient_transaction.id)
        
        return {
            "sender": sender_transaction,
            "recipient": recipient_transaction
        }
    
    async def list_transactions(
        self,
        user_id: str,
        db: AsyncSession,
        transaction_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[WalletTransaction]:
        """List user's transactions"""
        wallet = await self.get_wallet(user_id, db, create_if_not_exists=False)
        if not wallet:
            return []
        
        query = select(WalletTransaction).where(WalletTransaction.wallet_id == wallet.id)
        
        if transaction_type:
            query = query.where(WalletTransaction.type == transaction_type)
        
        if status:
            query = query.where(WalletTransaction.status == status)
        
        query = query.order_by(WalletTransaction.created_at.desc())
        query = query.limit(limit).offset(offset)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_transaction(
        self,
        transaction_id: str,
        user_id: str,
        db: AsyncSession
    ) -> Optional[WalletTransaction]:
        """Get a specific transaction"""
        wallet = await self.get_wallet(user_id, db, create_if_not_exists=False)
        if not wallet:
            return None
        
        result = await db.execute(
            select(WalletTransaction).where(
                WalletTransaction.id == transaction_id,
                WalletTransaction.wallet_id == wallet.id
            )
        )
        return result.scalar_one_or_none()
    
    async def add_funds(
        self,
        user_id: str,
        amount: Decimal,
        description: str,
        db: AsyncSession,
        currency: str = "USD"
    ) -> WalletTransaction:
        """Add funds to wallet (internal use)"""
        wallet = await self.get_wallet(user_id, db)
        if not wallet:
            raise ValueError("Wallet not found")
        
        transaction = WalletTransaction(
            id=str(uuid.uuid4()),
            wallet_id=wallet.id,
            type="credit",
            amount=amount,
            currency=currency,
            status="completed",
            description=description,
            created_at=datetime.utcnow()
        )
        
        if currency == "USD":
            wallet.balance_usd += amount
        elif currency == "tokens":
            wallet.balance_tokens += int(amount)
        elif currency == "credits":
            wallet.balance_credits += int(amount)
        
        wallet.updated_at = datetime.utcnow()
        
        db.add(transaction)
        await db.commit()
        
        # Clear cache
        await cache_manager.delete(f"wallet:balance:{user_id}")
        
        return transaction
    
    async def process_payment(
        self,
        user_id: str,
        amount: Decimal,
        description: str,
        db: AsyncSession
    ) -> WalletTransaction:
        """Process a payment from wallet"""
        wallet = await self.get_wallet(user_id, db)
        if not wallet:
            raise ValueError("Wallet not found")
        
        if wallet.balance_usd < amount:
            raise ValueError("Insufficient balance")
        
        transaction = WalletTransaction(
            id=str(uuid.uuid4()),
            wallet_id=wallet.id,
            type="payment",
            amount=amount,
            currency="USD",
            status="completed",
            description=description,
            created_at=datetime.utcnow()
        )
        
        wallet.balance_usd -= amount
        wallet.updated_at = datetime.utcnow()
        
        db.add(transaction)
        await db.commit()
        
        # Clear cache
        await cache_manager.delete(f"wallet:balance:{user_id}")
        
        return transaction
    
    async def _process_stripe_payment(
        self,
        amount: Decimal,
        payment_details: Dict[str, Any]
    ) -> str:
        """Process Stripe payment"""
        try:
            # Create payment intent
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # Convert to cents
                currency="usd",
                payment_method=payment_details.get("payment_method_id"),
                confirm=True
            )
            
            return intent.id
        except stripe.error.StripeError as e:
            logger.error(f"Stripe payment failed: {str(e)}")
            raise ValueError("Payment processing failed")
    
    async def _process_withdrawal(
        self,
        transaction_id: str,
        db: AsyncSession
    ):
        """Process withdrawal asynchronously"""
        try:
            # Simulate withdrawal processing
            await asyncio.sleep(2)
            
            # Update transaction status
            result = await db.execute(
                select(WalletTransaction).where(WalletTransaction.id == transaction_id)
            )
            transaction = result.scalar_one_or_none()
            
            if transaction:
                transaction.status = "completed"
                await db.commit()
                
                # Send notification
                await send_transaction_notification.delay(transaction_id)
        except Exception as e:
            logger.error(f"Withdrawal processing failed: {str(e)}")
    
    async def get_wallet_stats(
        self,
        user_id: str,
        db: AsyncSession,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get wallet statistics"""
        wallet = await self.get_wallet(user_id, db, create_if_not_exists=False)
        if not wallet:
            return {}
        
        # Get transaction stats
        since_date = datetime.utcnow() - timedelta(days=days)
        
        stats_result = await db.execute(
            select(
                WalletTransaction.type,
                func.count(WalletTransaction.id).label("count"),
                func.sum(WalletTransaction.amount).label("total")
            )
            .where(
                WalletTransaction.wallet_id == wallet.id,
                WalletTransaction.created_at >= since_date,
                WalletTransaction.status == "completed"
            )
            .group_by(WalletTransaction.type)
        )
        
        stats = {}
        for row in stats_result:
            stats[row.type] = {
                "count": row.count,
                "total": float(row.total or 0)
            }
        
        return {
            "balance": {
                "usd": float(wallet.balance_usd),
                "tokens": wallet.balance_tokens,
                "credits": wallet.balance_credits
            },
            "lifetime": {
                "deposits": float(wallet.total_deposits),
                "withdrawals": float(wallet.total_withdrawals)
            },
            "recent": stats
        }


# Global wallet service instance
wallet_service = WalletService()