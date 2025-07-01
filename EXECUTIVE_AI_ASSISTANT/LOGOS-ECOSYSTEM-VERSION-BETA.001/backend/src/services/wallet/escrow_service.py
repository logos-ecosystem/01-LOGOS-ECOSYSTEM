"""Escrow service for secure marketplace transactions."""

from typing import Optional, Dict, Any
from decimal import Decimal
from datetime import datetime, timedelta
from enum import Enum
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ...shared.models.wallet import Wallet, WalletTransaction, EscrowTransaction
from ...shared.models.marketplace import MarketplaceItem, Transaction
from ...shared.utils.logger import get_logger
from ...shared.utils.exceptions import (
    ValidationError,
    InsufficientBalanceError,
    TransactionError
)
from .wallet_service import wallet_service

logger = get_logger(__name__)


class EscrowStatus(str, Enum):
    PENDING = "pending"
    HELD = "held"
    RELEASED = "released"
    REFUNDED = "refunded"
    DISPUTED = "disputed"
    EXPIRED = "expired"


class EscrowService:
    """Service for managing escrow transactions."""
    
    def __init__(self):
        self.escrow_duration_days = 7  # Default escrow period
        self.dispute_resolution_days = 3
        self.platform_fee_percentage = Decimal("0.025")  # 2.5%
    
    async def create_escrow(
        self,
        buyer_id: str,
        seller_id: str,
        item_id: str,
        amount: Decimal,
        currency: str = "USD",
        description: str = None,
        db: Session = None
    ) -> EscrowTransaction:
        """Create an escrow transaction for a marketplace purchase."""
        try:
            # Validate participants
            if buyer_id == seller_id:
                raise ValidationError("Buyer and seller cannot be the same")
            
            # Get buyer wallet
            buyer_wallet = await wallet_service.get_wallet(buyer_id, db)
            
            # Check buyer balance
            if currency == "USD" and buyer_wallet.balance_usd < amount:
                raise InsufficientBalanceError("Insufficient balance for escrow")
            
            # Calculate fees
            platform_fee = amount * self.platform_fee_percentage
            seller_amount = amount - platform_fee
            
            # Create escrow transaction
            escrow = EscrowTransaction(
                id=str(uuid.uuid4()),
                buyer_id=buyer_id,
                seller_id=seller_id,
                item_id=item_id,
                amount=amount,
                currency=currency,
                platform_fee=platform_fee,
                seller_amount=seller_amount,
                status=EscrowStatus.PENDING,
                description=description,
                expires_at=datetime.utcnow() + timedelta(days=self.escrow_duration_days)
            )
            
            db.add(escrow)
            
            # Hold funds from buyer
            await self._hold_funds(
                buyer_wallet,
                amount,
                currency,
                escrow.id,
                db
            )
            
            escrow.status = EscrowStatus.HELD
            escrow.held_at = datetime.utcnow()
            
            db.commit()
            logger.info(f"Created escrow {escrow.id} for ${amount}")
            
            return escrow
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating escrow: {str(e)}")
            raise
    
    async def release_escrow(
        self,
        escrow_id: str,
        released_by: str,
        db: Session
    ) -> Dict[str, Any]:
        """Release escrow funds to seller."""
        try:
            # Get escrow transaction
            escrow = db.query(EscrowTransaction).filter_by(id=escrow_id).first()
            if not escrow:
                raise ValidationError("Escrow transaction not found")
            
            # Validate status
            if escrow.status != EscrowStatus.HELD:
                raise ValidationError(f"Cannot release escrow in status: {escrow.status}")
            
            # Check authorization
            if released_by not in [escrow.buyer_id, escrow.seller_id]:
                raise ValidationError("Unauthorized to release escrow")
            
            # Check if buyer confirmation required
            if released_by == escrow.seller_id and not escrow.buyer_confirmed:
                raise ValidationError("Buyer confirmation required")
            
            # Get wallets
            seller_wallet = await wallet_service.get_wallet(escrow.seller_id, db)
            platform_wallet = await wallet_service.get_wallet(
                settings.PLATFORM_WALLET_ID, db
            )
            
            # Release funds to seller
            await wallet_service.add_funds(
                escrow.seller_id,
                float(escrow.seller_amount),
                escrow.currency,
                f"Payment for item #{escrow.item_id}",
                db
            )
            
            # Add platform fee
            await wallet_service.add_funds(
                settings.PLATFORM_WALLET_ID,
                float(escrow.platform_fee),
                escrow.currency,
                f"Platform fee for escrow #{escrow.id}",
                db
            )
            
            # Update escrow status
            escrow.status = EscrowStatus.RELEASED
            escrow.released_at = datetime.utcnow()
            escrow.released_by = released_by
            
            # Create transaction records
            seller_transaction = WalletTransaction(
                wallet_id=seller_wallet.id,
                type="earning",
                amount=float(escrow.seller_amount),
                currency=escrow.currency,
                status="completed",
                description=f"Payment received for item #{escrow.item_id}",
                reference_type="escrow_release",
                reference_id=escrow.id
            )
            
            db.add(seller_transaction)
            db.commit()
            
            logger.info(f"Released escrow {escrow_id} to seller {escrow.seller_id}")
            
            return {
                "escrow_id": escrow_id,
                "status": "released",
                "seller_amount": float(escrow.seller_amount),
                "platform_fee": float(escrow.platform_fee),
                "released_at": escrow.released_at
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error releasing escrow: {str(e)}")
            raise
    
    async def refund_escrow(
        self,
        escrow_id: str,
        reason: str,
        refunded_by: str,
        db: Session
    ) -> Dict[str, Any]:
        """Refund escrow funds to buyer."""
        try:
            # Get escrow transaction
            escrow = db.query(EscrowTransaction).filter_by(id=escrow_id).first()
            if not escrow:
                raise ValidationError("Escrow transaction not found")
            
            # Validate status
            if escrow.status not in [EscrowStatus.HELD, EscrowStatus.DISPUTED]:
                raise ValidationError(f"Cannot refund escrow in status: {escrow.status}")
            
            # Check authorization
            authorized = False
            if refunded_by == escrow.seller_id:
                authorized = True
            elif refunded_by == settings.ADMIN_USER_ID:
                authorized = True
            elif escrow.status == EscrowStatus.DISPUTED and refunded_by == escrow.dispute_resolver_id:
                authorized = True
            
            if not authorized:
                raise ValidationError("Unauthorized to refund escrow")
            
            # Get buyer wallet
            buyer_wallet = await wallet_service.get_wallet(escrow.buyer_id, db)
            
            # Refund to buyer
            await wallet_service.add_funds(
                escrow.buyer_id,
                float(escrow.amount),
                escrow.currency,
                f"Refund for item #{escrow.item_id}: {reason}",
                db
            )
            
            # Update escrow status
            escrow.status = EscrowStatus.REFUNDED
            escrow.refunded_at = datetime.utcnow()
            escrow.refund_reason = reason
            escrow.refunded_by = refunded_by
            
            # Create transaction record
            refund_transaction = WalletTransaction(
                wallet_id=buyer_wallet.id,
                type="refund",
                amount=float(escrow.amount),
                currency=escrow.currency,
                status="completed",
                description=f"Refund for item #{escrow.item_id}",
                reference_type="escrow_refund",
                reference_id=escrow.id
            )
            
            db.add(refund_transaction)
            db.commit()
            
            logger.info(f"Refunded escrow {escrow_id} to buyer {escrow.buyer_id}")
            
            return {
                "escrow_id": escrow_id,
                "status": "refunded",
                "amount": float(escrow.amount),
                "reason": reason,
                "refunded_at": escrow.refunded_at
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error refunding escrow: {str(e)}")
            raise
    
    async def confirm_delivery(
        self,
        escrow_id: str,
        buyer_id: str,
        db: Session
    ) -> EscrowTransaction:
        """Buyer confirms delivery of item."""
        escrow = db.query(EscrowTransaction).filter_by(id=escrow_id).first()
        if not escrow:
            raise ValidationError("Escrow transaction not found")
        
        if escrow.buyer_id != buyer_id:
            raise ValidationError("Only buyer can confirm delivery")
        
        if escrow.status != EscrowStatus.HELD:
            raise ValidationError(f"Cannot confirm delivery for status: {escrow.status}")
        
        escrow.buyer_confirmed = True
        escrow.confirmed_at = datetime.utcnow()
        
        # Auto-release if configured
        if settings.AUTO_RELEASE_ON_CONFIRMATION:
            await self.release_escrow(escrow_id, buyer_id, db)
        else:
            db.commit()
        
        return escrow
    
    async def dispute_escrow(
        self,
        escrow_id: str,
        disputed_by: str,
        reason: str,
        db: Session
    ) -> EscrowTransaction:
        """Initiate a dispute for escrow transaction."""
        escrow = db.query(EscrowTransaction).filter_by(id=escrow_id).first()
        if not escrow:
            raise ValidationError("Escrow transaction not found")
        
        if escrow.status != EscrowStatus.HELD:
            raise ValidationError(f"Cannot dispute escrow in status: {escrow.status}")
        
        if disputed_by not in [escrow.buyer_id, escrow.seller_id]:
            raise ValidationError("Only buyer or seller can dispute")
        
        escrow.status = EscrowStatus.DISPUTED
        escrow.disputed_at = datetime.utcnow()
        escrow.disputed_by = disputed_by
        escrow.dispute_reason = reason
        
        # Set dispute resolution deadline
        escrow.dispute_deadline = datetime.utcnow() + timedelta(
            days=self.dispute_resolution_days
        )
        
        db.commit()
        
        # Notify admins
        await self._notify_dispute(escrow)
        
        logger.info(f"Escrow {escrow_id} disputed by {disputed_by}")
        
        return escrow
    
    async def get_escrow_status(
        self,
        escrow_id: str,
        user_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """Get escrow transaction status."""
        escrow = db.query(EscrowTransaction).filter_by(id=escrow_id).first()
        if not escrow:
            raise ValidationError("Escrow transaction not found")
        
        # Check authorization
        if user_id not in [escrow.buyer_id, escrow.seller_id]:
            raise ValidationError("Unauthorized to view escrow")
        
        return {
            "id": escrow.id,
            "status": escrow.status,
            "amount": float(escrow.amount),
            "currency": escrow.currency,
            "buyer_id": escrow.buyer_id,
            "seller_id": escrow.seller_id,
            "item_id": escrow.item_id,
            "buyer_confirmed": escrow.buyer_confirmed,
            "created_at": escrow.created_at,
            "expires_at": escrow.expires_at,
            "platform_fee": float(escrow.platform_fee),
            "seller_amount": float(escrow.seller_amount)
        }
    
    async def check_expired_escrows(self, db: Session):
        """Check and handle expired escrow transactions."""
        expired_escrows = db.query(EscrowTransaction).filter(
            and_(
                EscrowTransaction.status == EscrowStatus.HELD,
                EscrowTransaction.expires_at < datetime.utcnow()
            )
        ).all()
        
        for escrow in expired_escrows:
            try:
                # Auto-release or refund based on configuration
                if escrow.buyer_confirmed:
                    await self.release_escrow(escrow.id, settings.ADMIN_USER_ID, db)
                else:
                    await self.refund_escrow(
                        escrow.id,
                        "Escrow expired without confirmation",
                        settings.ADMIN_USER_ID,
                        db
                    )
            except Exception as e:
                logger.error(f"Error handling expired escrow {escrow.id}: {str(e)}")
    
    async def _hold_funds(
        self,
        wallet: Wallet,
        amount: Decimal,
        currency: str,
        escrow_id: str,
        db: Session
    ):
        """Hold funds from buyer wallet."""
        # Deduct from wallet
        if currency == "USD":
            if wallet.balance_usd < amount:
                raise InsufficientBalanceError("Insufficient USD balance")
            wallet.balance_usd -= float(amount)
        else:
            raise ValidationError(f"Unsupported currency for escrow: {currency}")
        
        # Create hold transaction
        hold_transaction = WalletTransaction(
            wallet_id=wallet.id,
            type="escrow_hold",
            amount=-float(amount),
            currency=currency,
            status="completed",
            description=f"Escrow hold for transaction #{escrow_id}",
            reference_type="escrow",
            reference_id=escrow_id
        )
        
        db.add(hold_transaction)
    
    async def _notify_dispute(self, escrow: EscrowTransaction):
        """Notify relevant parties about dispute."""
        # Send notifications to admin and both parties
        pass


# Create singleton instance
escrow_service = EscrowService()