"""Payment methods management service."""

from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import and_
import stripe

from ...shared.models.wallet import PaymentMethod
from ...shared.models.user import User
from ...shared.utils.logger import get_logger
from ...shared.utils.exceptions import ValidationError
from ...shared.utils.config import get_settings
settings = get_settings()
from ..security.encryption import encrypt_data, decrypt_data

logger = get_logger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class PaymentMethodType:
    CARD = "card"
    BANK_ACCOUNT = "bank_account"
    CRYPTO_WALLET = "crypto_wallet"
    PAYPAL = "paypal"


class PaymentMethodsService:
    """Service for managing user payment methods."""
    
    def __init__(self):
        self.encryption_key = settings.PAYMENT_ENCRYPTION_KEY
        self.supported_types = [
            PaymentMethodType.CARD,
            PaymentMethodType.BANK_ACCOUNT,
            PaymentMethodType.CRYPTO_WALLET,
            PaymentMethodType.PAYPAL
        ]
    
    async def add_payment_method(
        self,
        user_id: str,
        type: str,
        details: Dict[str, Any],
        is_default: bool = False,
        db: Session = None
    ) -> PaymentMethod:
        """Add a new payment method for user."""
        try:
            # Validate type
            if type not in self.supported_types:
                raise ValidationError(f"Unsupported payment method type: {type}")
            
            # Process based on type
            if type == PaymentMethodType.CARD:
                processed_details = await self._process_card(details)
            elif type == PaymentMethodType.BANK_ACCOUNT:
                processed_details = await self._process_bank_account(details)
            elif type == PaymentMethodType.CRYPTO_WALLET:
                processed_details = await self._process_crypto_wallet(details)
            elif type == PaymentMethodType.PAYPAL:
                processed_details = await self._process_paypal(details)
            else:
                processed_details = details
            
            # Encrypt sensitive data
            encrypted_data = encrypt_data(
                processed_details.get("sensitive_data", {}),
                self.encryption_key
            )
            
            # Create payment method
            payment_method = PaymentMethod(
                id=str(uuid.uuid4()),
                user_id=user_id,
                type=type,
                provider=processed_details.get("provider", "manual"),
                last_four=processed_details.get("last_four"),
                brand=processed_details.get("brand"),
                exp_month=processed_details.get("exp_month"),
                exp_year=processed_details.get("exp_year"),
                bank_name=processed_details.get("bank_name"),
                account_type=processed_details.get("account_type"),
                crypto_address=processed_details.get("crypto_address"),
                crypto_network=processed_details.get("crypto_network"),
                encrypted_data=encrypted_data,
                metadata=processed_details.get("metadata", {}),
                is_default=is_default
            )
            
            # If setting as default, unset other defaults
            if is_default:
                db.query(PaymentMethod).filter(
                    and_(
                        PaymentMethod.user_id == user_id,
                        PaymentMethod.is_default == True
                    )
                ).update({"is_default": False})
            
            db.add(payment_method)
            db.commit()
            db.refresh(payment_method)
            
            logger.info(f"Added {type} payment method for user {user_id}")
            
            return payment_method
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error adding payment method: {str(e)}")
            raise
    
    async def get_payment_methods(
        self,
        user_id: str,
        type: Optional[str] = None,
        db: Session = None
    ) -> List[PaymentMethod]:
        """Get user's payment methods."""
        query = db.query(PaymentMethod).filter(
            PaymentMethod.user_id == user_id
        )
        
        if type:
            query = query.filter(PaymentMethod.type == type)
        
        return query.order_by(
            PaymentMethod.is_default.desc(),
            PaymentMethod.created_at.desc()
        ).all()
    
    async def get_default_payment_method(
        self,
        user_id: str,
        type: Optional[str] = None,
        db: Session = None
    ) -> Optional[PaymentMethod]:
        """Get user's default payment method."""
        query = db.query(PaymentMethod).filter(
            and_(
                PaymentMethod.user_id == user_id,
                PaymentMethod.is_default == True
            )
        )
        
        if type:
            query = query.filter(PaymentMethod.type == type)
        
        return query.first()
    
    async def update_payment_method(
        self,
        payment_method_id: str,
        user_id: str,
        updates: Dict[str, Any],
        db: Session = None
    ) -> PaymentMethod:
        """Update a payment method."""
        payment_method = db.query(PaymentMethod).filter(
            and_(
                PaymentMethod.id == payment_method_id,
                PaymentMethod.user_id == user_id
            )
        ).first()
        
        if not payment_method:
            raise ValidationError("Payment method not found")
        
        # Update allowed fields
        allowed_updates = ["is_default", "metadata"]
        for field, value in updates.items():
            if field in allowed_updates:
                setattr(payment_method, field, value)
        
        # Handle default setting
        if updates.get("is_default") == True:
            db.query(PaymentMethod).filter(
                and_(
                    PaymentMethod.user_id == user_id,
                    PaymentMethod.id != payment_method_id,
                    PaymentMethod.is_default == True
                )
            ).update({"is_default": False})
        
        db.commit()
        db.refresh(payment_method)
        
        return payment_method
    
    async def delete_payment_method(
        self,
        payment_method_id: str,
        user_id: str,
        db: Session = None
    ) -> bool:
        """Delete a payment method."""
        payment_method = db.query(PaymentMethod).filter(
            and_(
                PaymentMethod.id == payment_method_id,
                PaymentMethod.user_id == user_id
            )
        ).first()
        
        if not payment_method:
            raise ValidationError("Payment method not found")
        
        # Don't delete if it's the only payment method
        count = db.query(PaymentMethod).filter(
            PaymentMethod.user_id == user_id
        ).count()
        
        if count == 1:
            raise ValidationError("Cannot delete the only payment method")
        
        # If deleting default, set another as default
        if payment_method.is_default:
            other_method = db.query(PaymentMethod).filter(
                and_(
                    PaymentMethod.user_id == user_id,
                    PaymentMethod.id != payment_method_id
                )
            ).first()
            
            if other_method:
                other_method.is_default = True
        
        db.delete(payment_method)
        db.commit()
        
        logger.info(f"Deleted payment method {payment_method_id} for user {user_id}")
        
        return True
    
    async def verify_payment_method(
        self,
        payment_method_id: str,
        user_id: str,
        verification_data: Dict[str, Any],
        db: Session = None
    ) -> Dict[str, Any]:
        """Verify a payment method (e.g., micro-deposits for bank)."""
        payment_method = db.query(PaymentMethod).filter(
            and_(
                PaymentMethod.id == payment_method_id,
                PaymentMethod.user_id == user_id
            )
        ).first()
        
        if not payment_method:
            raise ValidationError("Payment method not found")
        
        if payment_method.is_verified:
            return {"verified": True, "message": "Already verified"}
        
        # Verification logic based on type
        if payment_method.type == PaymentMethodType.BANK_ACCOUNT:
            # Verify micro-deposits
            amounts = verification_data.get("amounts", [])
            # In production, verify with Stripe or payment provider
            verified = len(amounts) == 2  # Mock verification
        else:
            verified = True  # Other types auto-verify for now
        
        if verified:
            payment_method.is_verified = True
            payment_method.verified_at = datetime.utcnow()
            db.commit()
        
        return {
            "verified": verified,
            "message": "Verification successful" if verified else "Verification failed"
        }
    
    async def _process_card(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """Process card payment method."""
        # In production, tokenize with Stripe
        if "stripe_token" in details:
            # Create Stripe payment method
            stripe_pm = stripe.PaymentMethod.create(
                type="card",
                card={"token": details["stripe_token"]}
            )
            
            return {
                "provider": "stripe",
                "provider_id": stripe_pm.id,
                "last_four": stripe_pm.card.last4,
                "brand": stripe_pm.card.brand,
                "exp_month": stripe_pm.card.exp_month,
                "exp_year": stripe_pm.card.exp_year,
                "metadata": {
                    "fingerprint": stripe_pm.card.fingerprint,
                    "country": stripe_pm.card.country
                }
            }
        else:
            # Manual entry (for testing)
            return {
                "provider": "manual",
                "last_four": details.get("number", "")[-4:],
                "brand": self._detect_card_brand(details.get("number", "")),
                "exp_month": details.get("exp_month"),
                "exp_year": details.get("exp_year"),
                "sensitive_data": {
                    "number": details.get("number"),
                    "cvv": details.get("cvv")
                }
            }
    
    async def _process_bank_account(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """Process bank account payment method."""
        return {
            "provider": details.get("provider", "manual"),
            "bank_name": details.get("bank_name"),
            "account_type": details.get("account_type", "checking"),
            "last_four": details.get("account_number", "")[-4:],
            "sensitive_data": {
                "account_number": details.get("account_number"),
                "routing_number": details.get("routing_number")
            }
        }
    
    async def _process_crypto_wallet(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """Process crypto wallet payment method."""
        return {
            "provider": "crypto",
            "crypto_address": details.get("address"),
            "crypto_network": details.get("network", "mainnet"),
            "metadata": {
                "currency": details.get("currency", "BTC"),
                "verified": False  # Require signature verification
            }
        }
    
    async def _process_paypal(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """Process PayPal payment method."""
        return {
            "provider": "paypal",
            "metadata": {
                "email": details.get("email"),
                "paypal_id": details.get("paypal_id")
            }
        }
    
    def _detect_card_brand(self, card_number: str) -> str:
        """Detect card brand from number."""
        if not card_number:
            return "unknown"
        
        # Remove spaces and non-digits
        card_number = "".join(filter(str.isdigit, card_number))
        
        # Check patterns
        if card_number.startswith("4"):
            return "visa"
        elif card_number.startswith(("51", "52", "53", "54", "55")):
            return "mastercard"
        elif card_number.startswith(("34", "37")):
            return "amex"
        elif card_number.startswith("6011") or card_number.startswith("65"):
            return "discover"
        else:
            return "other"


# Create singleton instance
payment_methods_service = PaymentMethodsService()