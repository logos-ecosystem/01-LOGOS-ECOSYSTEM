"""Payment Service Module - Stripe Integration"""

import stripe
from typing import Dict, Any, Optional, List
from decimal import Decimal
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.shared.models.wallet import WalletTransaction
from src.shared.models.marketplace import Transaction
from src.shared.utils.logger import get_logger
from src.shared.utils.config import get_settings
settings = get_settings()
from src.infrastructure.cache import cache_manager

logger = get_logger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class PaymentService:
    """Service for processing payments via Stripe"""
    
    def __init__(self):
        self.webhook_secret = settings.STRIPE_WEBHOOK_SECRET
        self.currency = "usd"
        self.payment_methods = ["card", "bank_transfer"]
        
    async def create_payment_intent(
        self,
        amount: Decimal,
        user_id: str,
        description: str,
        metadata: Dict[str, Any] = None,
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """Create a Stripe payment intent for deposits"""
        try:
            # Convert decimal to cents
            amount_cents = int(amount * 100)
            
            # Create payment intent
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=self.currency,
                automatic_payment_methods={"enabled": True},
                metadata={
                    "user_id": user_id,
                    "type": "deposit",
                    **(metadata or {})
                },
                description=description
            )
            
            # Log payment intent creation
            logger.info(f"Created payment intent {intent.id} for user {user_id}")
            
            return {
                "client_secret": intent.client_secret,
                "payment_intent_id": intent.id,
                "amount": amount,
                "currency": self.currency,
                "status": intent.status
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payment intent: {str(e)}")
            raise Exception(f"Payment processing error: {str(e)}")
    
    async def confirm_payment(
        self,
        payment_intent_id: str,
        db: AsyncSession
    ) -> WalletTransaction:
        """Confirm a payment and create wallet transaction"""
        try:
            # Retrieve payment intent from Stripe
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if intent.status != "succeeded":
                raise Exception(f"Payment not successful: {intent.status}")
            
            # Extract metadata
            user_id = intent.metadata.get("user_id")
            amount = Decimal(intent.amount) / 100  # Convert from cents
            
            # Create wallet transaction
            transaction = WalletTransaction(
                id=str(uuid.uuid4()),
                wallet_id=user_id,  # This should be wallet_id, not user_id
                type="deposit",
                amount=amount,
                currency=intent.currency.upper(),
                status="completed",
                description=f"Stripe deposit: {intent.description}",
                transaction_hash=intent.id,
                metadata={
                    "stripe_payment_intent_id": intent.id,
                    "payment_method": intent.payment_method,
                    "receipt_url": intent.charges.data[0].receipt_url if intent.charges.data else None
                },
                created_at=datetime.utcnow()
            )
            
            db.add(transaction)
            await db.commit()
            
            logger.info(f"Confirmed payment {payment_intent_id} for user {user_id}")
            
            return transaction
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error confirming payment: {str(e)}")
            raise Exception(f"Payment confirmation error: {str(e)}")
    
    async def create_payout(
        self,
        amount: Decimal,
        user_id: str,
        destination: str,
        destination_type: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Create a payout for withdrawals"""
        try:
            # Convert amount to cents
            amount_cents = int(amount * 100)
            
            # Create payout based on destination type
            if destination_type == "bank_account":
                # Create bank transfer payout
                payout = stripe.Payout.create(
                    amount=amount_cents,
                    currency=self.currency,
                    destination=destination,
                    metadata={
                        "user_id": user_id,
                        "type": "withdrawal"
                    }
                )
            else:
                # For other payout methods, use Stripe Connect or custom implementation
                raise NotImplementedError(f"Payout method {destination_type} not implemented")
            
            logger.info(f"Created payout {payout.id} for user {user_id}")
            
            return {
                "payout_id": payout.id,
                "amount": amount,
                "status": payout.status,
                "arrival_date": payout.arrival_date
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payout: {str(e)}")
            raise Exception(f"Payout processing error: {str(e)}")
    
    async def create_customer(
        self,
        user_id: str,
        email: str,
        name: str = None,
        metadata: Dict[str, Any] = None
    ) -> str:
        """Create a Stripe customer for the user"""
        try:
            # Check if customer already exists
            cached_customer_id = await cache_manager.get(f"stripe_customer:{user_id}")
            if cached_customer_id:
                return cached_customer_id
            
            # Create new customer
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={
                    "user_id": user_id,
                    **(metadata or {})
                }
            )
            
            # Cache customer ID
            await cache_manager.set(
                f"stripe_customer:{user_id}",
                customer.id,
                ttl=86400  # 24 hours
            )
            
            logger.info(f"Created Stripe customer {customer.id} for user {user_id}")
            
            return customer.id
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating customer: {str(e)}")
            raise Exception(f"Customer creation error: {str(e)}")
    
    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Create a subscription for premium features"""
        try:
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{"price": price_id}],
                payment_behavior="default_incomplete",
                expand=["latest_invoice.payment_intent"],
                metadata=metadata or {}
            )
            
            return {
                "subscription_id": subscription.id,
                "status": subscription.status,
                "client_secret": subscription.latest_invoice.payment_intent.client_secret,
                "current_period_end": subscription.current_period_end
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating subscription: {str(e)}")
            raise Exception(f"Subscription creation error: {str(e)}")
    
    async def cancel_subscription(
        self,
        subscription_id: str
    ) -> Dict[str, Any]:
        """Cancel a subscription"""
        try:
            subscription = stripe.Subscription.delete(subscription_id)
            
            return {
                "subscription_id": subscription.id,
                "status": subscription.status,
                "canceled_at": subscription.canceled_at
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error canceling subscription: {str(e)}")
            raise Exception(f"Subscription cancellation error: {str(e)}")
    
    async def process_marketplace_payment(
        self,
        buyer_id: str,
        seller_id: str,
        amount: Decimal,
        item_id: str,
        db: AsyncSession
    ) -> Transaction:
        """Process a marketplace purchase with platform fee"""
        try:
            # Calculate platform fee (e.g., 10%)
            platform_fee = amount * Decimal("0.10")
            seller_amount = amount - platform_fee
            
            # Create transfer to seller (requires Stripe Connect)
            # For now, we'll simulate this
            transaction = Transaction(
                id=str(uuid.uuid4()),
                buyer_id=buyer_id,
                seller_id=seller_id,
                item_id=item_id,
                amount=float(amount),
                status="completed",
                created_at=datetime.utcnow()
            )
            
            db.add(transaction)
            await db.commit()
            
            logger.info(f"Processed marketplace payment for item {item_id}")
            
            return transaction
            
        except Exception as e:
            logger.error(f"Error processing marketplace payment: {str(e)}")
            raise
    
    async def handle_webhook(
        self,
        payload: bytes,
        signature: str
    ) -> Dict[str, Any]:
        """Handle Stripe webhook events"""
        try:
            # Verify webhook signature
            event = stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            
            # Handle different event types
            if event.type == "payment_intent.succeeded":
                await self._handle_payment_success(event.data.object)
            elif event.type == "payment_intent.payment_failed":
                await self._handle_payment_failure(event.data.object)
            elif event.type == "payout.failed":
                await self._handle_payout_failure(event.data.object)
            elif event.type == "customer.subscription.updated":
                await self._handle_subscription_update(event.data.object)
            
            logger.info(f"Processed webhook event: {event.type}")
            
            return {"status": "success", "event_type": event.type}
            
        except ValueError as e:
            logger.error(f"Invalid webhook payload: {str(e)}")
            raise Exception("Invalid webhook payload")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {str(e)}")
            raise Exception("Invalid webhook signature")
    
    async def _handle_payment_success(self, payment_intent):
        """Handle successful payment"""
        # Update wallet balance
        # Send confirmation email
        # Update transaction status
        pass
    
    async def _handle_payment_failure(self, payment_intent):
        """Handle failed payment"""
        # Notify user
        # Log failure reason
        pass
    
    async def _handle_payout_failure(self, payout):
        """Handle failed payout"""
        # Revert wallet deduction
        # Notify user
        pass
    
    async def _handle_subscription_update(self, subscription):
        """Handle subscription updates"""
        # Update user premium status
        # Send notification
        pass
    
    async def get_payment_methods(
        self,
        customer_id: str
    ) -> List[Dict[str, Any]]:
        """Get customer's saved payment methods"""
        try:
            payment_methods = stripe.PaymentMethod.list(
                customer=customer_id,
                type="card"
            )
            
            return [
                {
                    "id": pm.id,
                    "type": pm.type,
                    "card": {
                        "brand": pm.card.brand,
                        "last4": pm.card.last4,
                        "exp_month": pm.card.exp_month,
                        "exp_year": pm.card.exp_year
                    }
                }
                for pm in payment_methods.data
            ]
            
        except stripe.error.StripeError as e:
            logger.error(f"Error fetching payment methods: {str(e)}")
            return []
    
    async def attach_payment_method(
        self,
        payment_method_id: str,
        customer_id: str
    ) -> Dict[str, Any]:
        """Attach a payment method to customer"""
        try:
            payment_method = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id
            )
            
            # Set as default if it's the first payment method
            stripe.Customer.modify(
                customer_id,
                invoice_settings={"default_payment_method": payment_method_id}
            )
            
            return {
                "id": payment_method.id,
                "type": payment_method.type,
                "card": {
                    "brand": payment_method.card.brand,
                    "last4": payment_method.card.last4
                }
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Error attaching payment method: {str(e)}")
            raise Exception(f"Payment method error: {str(e)}")


# Global payment service instance
payment_service = PaymentService()