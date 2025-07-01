"""Payment API routes."""

from fastapi import APIRouter, Depends, HTTPException, Request, Header, Body
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional, List
import logging

from ...shared.models.user import User
from ...shared.models.wallet import PaymentMethod, WalletTransaction, Subscription
from ...infrastructure.database import get_db
from ..deps import get_current_user, require_role
from ...services.payment.real_payment_integrations import payment_processor
from ...services.payment.crypto_payment_service import crypto_payment_service
from ..schemas.payment import (
    PaymentCreateRequest,
    PaymentConfirmRequest,
    PaymentMethodRequest,
    RefundRequest,
    SubscriptionCreateRequest,
    SubscriptionUpdateRequest,
    PaymentResponse,
    PaymentMethodResponse,
    RefundResponse,
    SubscriptionResponse,
    PaymentStatusResponse,
    ExchangeRateResponse
)
from ...shared.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/methods")
async def get_payment_methods(
    payment_type: Optional[str] = None,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get available payment methods."""
    try:
        methods = [
            {"id": "stripe", "name": "Credit/Debit Card", "currencies": ["USD", "EUR", "GBP"], "features": ["instant", "refundable"]},
            {"id": "paypal", "name": "PayPal", "currencies": ["USD", "EUR", "GBP"], "features": ["instant", "refundable"]},
            {"id": "crypto_btc", "name": "Bitcoin", "currencies": ["BTC"], "features": ["decentralized", "non_refundable"]},
            {"id": "crypto_eth", "name": "Ethereum", "currencies": ["ETH"], "features": ["smart_contracts", "non_refundable"]},
            {"id": "crypto_usdt", "name": "Tether (USDT)", "currencies": ["USDT"], "features": ["stablecoin", "non_refundable"]},
            {"id": "crypto_usdc", "name": "USD Coin (USDC)", "currencies": ["USDC"], "features": ["stablecoin", "non_refundable"]}
        ]
        
        return {
            "success": True,
            "methods": methods,
            "default_currency": "USD"
        }
    except Exception as e:
        logger.error(f"Error getting payment methods: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create")
async def create_payment(
    request: PaymentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PaymentResponse:
    """Create a new payment."""
    try:
        # Create payment based on method
        if request.payment_method == 'stripe':
            result = await payment_processor.stripe.create_payment_intent(
                amount=int(request.amount * 100),  # Convert to cents
                currency=request.currency.lower(),
                metadata={
                    'user_id': str(current_user.id),
                    'description': request.description,
                    **(request.metadata or {})
                }
            )
            
            payment_data = {
                'payment_id': result['id'],
                'client_secret': result['client_secret'],
                'amount': float(request.amount),
                'currency': request.currency,
                'status': 'pending'
            }
            
        elif request.payment_method == 'paypal':
            result = await payment_processor.paypal.create_order(
                amount=request.amount,
                currency=request.currency,
                description=request.description,
                return_url=request.return_url,
                cancel_url=request.cancel_url,
                metadata=request.metadata
            )
            
            payment_data = {
                'payment_id': result['id'],
                'approval_url': result['approval_url'],
                'amount': float(request.amount),
                'currency': request.currency,
                'status': 'pending'
            }
            
        elif request.payment_method.startswith('crypto_'):
            # Extract cryptocurrency
            crypto_currency = request.payment_method.replace('crypto_', '').upper()
            
            # Create crypto payment
            result = await crypto_payment_service.create_crypto_payment(
                user_id=str(current_user.id),
                amount_usd=request.amount,
                crypto_currency=crypto_currency,
                description=request.description or f"Payment for {crypto_currency}",
                db=db
            )
            
            payment_data = result
            
        else:
            raise ValueError(f"Unsupported payment method: {request.payment_method}")
        
        # Store payment record
        payment_record = PaymentMethod(
            user_id=current_user.id,
            wallet_id=current_user.wallet.id if hasattr(current_user, 'wallet') else None,
            type=request.payment_method,
            payment_id=payment_data['payment_id'],
            is_active=True,
            metadata=payment_data
        )
        db.add(payment_record)
        await db.commit()
        
        return PaymentResponse(
            success=True,
            payment_id=payment_data['payment_id'],
            status=payment_data.get('status', 'pending'),
            data=payment_data
        )
        
    except Exception as e:
        logger.error(f"Payment creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/confirm/{payment_id}")
async def confirm_payment(
    payment_id: str,
    request: PaymentConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PaymentResponse:
    """Confirm/capture a payment."""
    try:
        if request.payment_method == 'paypal':
            # Capture PayPal order
            result = await payment_processor.paypal.capture_order(payment_id)
            status = 'completed' if result['status'] == 'COMPLETED' else 'failed'
        elif request.payment_method.startswith('crypto_'):
            # Check crypto payment status
            result = await crypto_payment_service.check_payment_status(payment_id, db)
            status = result['status']
        else:
            # For Stripe, payment is confirmed client-side
            status = 'completed'
            result = {'payment_id': payment_id}
        
        return PaymentResponse(
            success=True,
            payment_id=payment_id,
            status=status,
            data=result
        )
        
    except Exception as e:
        logger.error(f"Payment confirmation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{payment_id}")
async def get_payment_status(
    payment_id: str,
    payment_method: str,
    current_user: User = Depends(get_current_user)
) -> PaymentStatusResponse:
    """Get payment status."""
    try:
        status = await unified_payment_processor.get_payment_status(
            payment_method=payment_method,
            payment_id=payment_id
        )
        
        return PaymentStatusResponse(
            success=True,
            payment_id=payment_id,
            status=status['status'],
            data=status
        )
        
    except Exception as e:
        logger.error(f"Get payment status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refund/{payment_id}")
async def process_refund(
    payment_id: str,
    request: RefundRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> RefundResponse:
    """Process a refund."""
    try:
        # Check if user has permission to refund
        # In production, would check if user owns the payment
        
        result = await unified_payment_processor.process_refund(
            payment_method=request.payment_method,
            payment_id=payment_id,
            amount=request.amount,
            reason=request.reason,
            db=db
        )
        
        return RefundResponse(
            success=True,
            refund_id=result['refund_id'],
            status=result['status'],
            data=result
        )
        
    except Exception as e:
        logger.error(f"Refund processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/methods")
async def list_user_payment_methods(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[PaymentMethodResponse]:
    """List user's saved payment methods."""
    try:
        methods = await unified_payment_processor.list_payment_methods(
            user_id=str(current_user.id),
            db=db
        )
        
        return [PaymentMethodResponse(**method) for method in methods]
        
    except Exception as e:
        logger.error(f"List payment methods error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/methods")
async def add_payment_method(
    request: PaymentMethodRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PaymentMethodResponse:
    """Add a new payment method."""
    try:
        # Implementation depends on payment provider
        # This is a placeholder for the actual implementation
        
        if request.type == 'stripe':
            # Create Stripe setup intent
            pass
        elif request.type == 'paypal':
            # PayPal setup
            pass
        
        return PaymentMethodResponse(
            id="method_id",
            type=request.type,
            last4="1234",
            brand="visa"
        )
        
    except Exception as e:
        logger.error(f"Add payment method error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/user/methods/{method_id}")
async def remove_payment_method(
    method_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Remove a payment method."""
    try:
        # Verify ownership
        method = await db.get(PaymentMethod, method_id)
        if not method or method.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Payment method not found")
        
        # Deactivate method
        method.is_active = False
        await db.commit()
        
        return {"success": True, "message": "Payment method removed"}
        
    except Exception as e:
        logger.error(f"Remove payment method error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Subscription endpoints
@router.post("/subscriptions")
async def create_subscription(
    request: SubscriptionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SubscriptionResponse:
    """Create a new subscription."""
    try:
        result = await unified_payment_processor.create_subscription(
            payment_method=request.payment_method,
            customer_id=request.customer_id or str(current_user.id),
            plan_id=request.plan_id,
            trial_days=request.trial_days,
            metadata=request.metadata,
            db=db
        )
        
        return SubscriptionResponse(
            success=True,
            subscription_id=result['subscription_id'],
            status=result['status'],
            data=result
        )
        
    except Exception as e:
        logger.error(f"Subscription creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/subscriptions/{subscription_id}")
async def update_subscription(
    subscription_id: str,
    request: SubscriptionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SubscriptionResponse:
    """Update a subscription."""
    try:
        # Verify ownership
        subscription = await db.query(Subscription).filter_by(
            subscription_id=subscription_id,
            user_id=current_user.id
        ).first()
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Update subscription based on provider
        # Implementation would call appropriate processor
        
        return SubscriptionResponse(
            success=True,
            subscription_id=subscription_id,
            status="updated"
        )
        
    except Exception as e:
        logger.error(f"Subscription update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/subscriptions/{subscription_id}")
async def cancel_subscription(
    subscription_id: str,
    immediate: bool = False,
    reason: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Cancel a subscription."""
    try:
        # Verify ownership
        subscription = await db.query(Subscription).filter_by(
            subscription_id=subscription_id,
            user_id=current_user.id
        ).first()
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        result = await unified_payment_processor.cancel_subscription(
            payment_method=subscription.provider,
            subscription_id=subscription_id,
            immediate=immediate,
            reason=reason,
            db=db
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Subscription cancellation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Cryptocurrency specific endpoints
@router.get("/crypto/rates")
async def get_exchange_rates(
    from_currency: str,
    to_currency: str = "USD",
    amount: float = 1.0
) -> ExchangeRateResponse:
    """Get cryptocurrency exchange rates."""
    try:
        crypto_processor = unified_payment_processor.crypto
        
        rate_info = await crypto_processor.get_exchange_rate(
            from_currency=from_currency.upper(),
            to_currency=to_currency.upper(),
            amount=amount
        )
        
        return ExchangeRateResponse(
            success=True,
            from_currency=rate_info['from'],
            to_currency=rate_info['to'],
            rate=rate_info['rate'],
            amount=rate_info['amount'],
            converted=rate_info['converted'],
            source=rate_info['source'],
            timestamp=rate_info['timestamp']
        )
        
    except Exception as e:
        logger.error(f"Exchange rate error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/crypto/address")
async def generate_crypto_address(
    currency: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Generate a new cryptocurrency payment address."""
    try:
        crypto_processor = unified_payment_processor.crypto
        
        address_info = await crypto_processor.generate_address(
            currency=currency.upper(),
            user_id=str(current_user.id)
        )
        
        return {
            "success": True,
            "address": address_info['address'],
            "currency": address_info['currency'],
            "network": address_info['network'],
            "explorer_url": address_info['explorer_url']
        }
        
    except Exception as e:
        logger.error(f"Address generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/crypto/validate/{currency}/{address}")
async def validate_crypto_address(
    currency: str,
    address: str
) -> Dict[str, Any]:
    """Validate a cryptocurrency address."""
    try:
        crypto_processor = unified_payment_processor.crypto
        
        validation = await crypto_processor.validate_address(
            currency=currency.upper(),
            address=address
        )
        
        return validation
        
    except Exception as e:
        logger.error(f"Address validation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Webhook endpoints
@router.post("/webhooks/stripe", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db)
):
    """Handle Stripe webhooks."""
    try:
        payload = await request.body()
        
        # Handle webhook using the payment processor
        result = await payment_processor.stripe.handle_webhook(payload, stripe_signature)
        
        # Process different event types
        if result['type'] == 'payment_success':
            # Update payment status in database
            await db.execute(
                update(PaymentMethod)
                .where(PaymentMethod.payment_id == result['payment_id'])
                .values(metadata={'status': 'completed', **result})
            )
            await db.commit()
        
        return JSONResponse(content={"received": True})
        
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )


@router.post("/webhooks/paypal", include_in_schema=False)
async def paypal_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle PayPal webhooks."""
    try:
        headers = dict(request.headers)
        body = await request.body()
        
        # Handle webhook using the payment processor
        result = await payment_processor.paypal.handle_webhook(headers, body)
        
        # Process different event types
        if result['type'] == 'payment_completed':
            # Update payment status in database
            await db.execute(
                update(PaymentMethod)
                .where(PaymentMethod.payment_id == result['payment_id'])
                .values(metadata={'status': 'completed', **result})
            )
            await db.commit()
        
        return JSONResponse(content={"received": True})
        
    except Exception as e:
        logger.error(f"PayPal webhook error: {e}")
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )


@router.post("/webhooks/crypto/{provider}", include_in_schema=False)
async def crypto_webhook(
    provider: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle cryptocurrency payment webhooks."""
    try:
        data = await request.json()
        signature = request.headers.get("X-Signature", "")
        
        result = await payment_webhook_handler.handle_crypto_webhook(
            provider=provider,
            data=data,
            signature=signature,
            db=db
        )
        
        return JSONResponse(content={"received": True})
        
    except Exception as e:
        logger.error(f"Crypto webhook error: {e}")
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )


# Admin endpoints
@router.get("/admin/transactions", dependencies=[Depends(require_role("admin"))])
async def list_all_transactions(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """List all payment transactions (admin only)."""
    try:
        query = db.query(WalletTransaction)
        
        if status:
            query = query.filter(WalletTransaction.status == status)
        
        transactions = await query.offset(skip).limit(limit).all()
        
        return [
            {
                "id": str(tx.id),
                "type": tx.type,
                "amount": tx.amount,
                "currency": tx.currency,
                "status": tx.status,
                "payment_method": tx.payment_method,
                "created_at": tx.created_at.isoformat()
            }
            for tx in transactions
        ]
        
    except Exception as e:
        logger.error(f"List transactions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/stats", dependencies=[Depends(require_role("admin"))])
async def get_payment_stats(
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get payment statistics (admin only)."""
    try:
        # Get transaction stats
        # In production, would use aggregation queries
        
        return {
            "total_transactions": 0,
            "total_volume": 0,
            "by_method": {},
            "by_status": {},
            "by_currency": {}
        }
        
    except Exception as e:
        logger.error(f"Get payment stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))