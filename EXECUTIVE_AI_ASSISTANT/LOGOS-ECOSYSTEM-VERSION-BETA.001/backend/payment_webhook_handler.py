"""
AWS Lambda handler for payment webhooks
Handles Stripe, PayPal, and cryptocurrency payment webhooks
"""

import json
import os
import logging
import hmac
import hashlib
from typing import Dict, Any
import stripe
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize payment providers
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')
PAYPAL_WEBHOOK_ID = os.environ.get('PAYPAL_WEBHOOK_ID')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main webhook handler"""
    
    path = event.get('path', '')
    headers = event.get('headers', {})
    body = event.get('body', '')
    
    logger.info(f"Webhook received: {path}")
    
    try:
        if '/webhooks/stripe' in path:
            return handle_stripe_webhook(headers, body)
        elif '/webhooks/paypal' in path:
            return handle_paypal_webhook(headers, body)
        elif '/webhooks/crypto' in path:
            return handle_crypto_webhook(headers, body)
        else:
            logger.error(f"Unknown webhook path: {path}")
            return {'statusCode': 404, 'body': 'Not Found'}
            
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {'statusCode': 500, 'body': 'Internal Server Error'}

def handle_stripe_webhook(headers: Dict[str, str], body: str) -> Dict[str, Any]:
    """Handle Stripe webhooks"""
    
    # Verify webhook signature
    sig_header = headers.get('stripe-signature', '')
    
    try:
        event = stripe.Webhook.construct_event(
            body, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        logger.error("Invalid payload")
        return {'statusCode': 400, 'body': 'Invalid payload'}
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid signature")
        return {'statusCode': 400, 'body': 'Invalid signature'}
    
    # Handle the event
    logger.info(f"Stripe event: {event['type']}")
    
    try:
        if event['type'] == 'payment_intent.succeeded':
            handle_payment_succeeded(event['data']['object'])
        elif event['type'] == 'payment_intent.payment_failed':
            handle_payment_failed(event['data']['object'])
        elif event['type'] == 'charge.refunded':
            handle_charge_refunded(event['data']['object'])
        elif event['type'] == 'customer.subscription.created':
            handle_subscription_created(event['data']['object'])
        elif event['type'] == 'customer.subscription.updated':
            handle_subscription_updated(event['data']['object'])
        elif event['type'] == 'customer.subscription.deleted':
            handle_subscription_deleted(event['data']['object'])
        elif event['type'] == 'invoice.payment_succeeded':
            handle_invoice_paid(event['data']['object'])
        elif event['type'] == 'invoice.payment_failed':
            handle_invoice_failed(event['data']['object'])
        elif event['type'] == 'checkout.session.completed':
            handle_checkout_completed(event['data']['object'])
        elif event['type'] == 'payment_method.attached':
            handle_payment_method_attached(event['data']['object'])
        else:
            logger.info(f"Unhandled event type: {event['type']}")
            
        return {'statusCode': 200, 'body': 'Success'}
        
    except Exception as e:
        logger.error(f"Error handling Stripe event: {str(e)}")
        # Return 200 to prevent Stripe from retrying
        return {'statusCode': 200, 'body': 'Error processed'}

def handle_paypal_webhook(headers: Dict[str, str], body: str) -> Dict[str, Any]:
    """Handle PayPal webhooks"""
    
    # Verify webhook signature
    if not verify_paypal_webhook(headers, body):
        logger.error("Invalid PayPal signature")
        return {'statusCode': 401, 'body': 'Unauthorized'}
    
    try:
        event = json.loads(body)
        event_type = event.get('event_type', '')
        
        logger.info(f"PayPal event: {event_type}")
        
        if event_type == 'PAYMENT.CAPTURE.COMPLETED':
            handle_paypal_capture_completed(event['resource'])
        elif event_type == 'PAYMENT.CAPTURE.REFUNDED':
            handle_paypal_refunded(event['resource'])
        elif event_type == 'BILLING.SUBSCRIPTION.CREATED':
            handle_paypal_subscription_created(event['resource'])
        elif event_type == 'BILLING.SUBSCRIPTION.CANCELLED':
            handle_paypal_subscription_cancelled(event['resource'])
        else:
            logger.info(f"Unhandled PayPal event: {event_type}")
            
        return {'statusCode': 200, 'body': 'Success'}
        
    except Exception as e:
        logger.error(f"Error handling PayPal event: {str(e)}")
        return {'statusCode': 200, 'body': 'Error processed'}

def handle_crypto_webhook(headers: Dict[str, str], body: str) -> Dict[str, Any]:
    """Handle cryptocurrency payment webhooks"""
    
    # Verify webhook signature (implementation depends on provider)
    if not verify_crypto_webhook(headers, body):
        logger.error("Invalid crypto webhook signature")
        return {'statusCode': 401, 'body': 'Unauthorized'}
    
    try:
        event = json.loads(body)
        event_type = event.get('type', '')
        
        logger.info(f"Crypto event: {event_type}")
        
        if event_type == 'charge:confirmed':
            handle_crypto_payment_confirmed(event['data'])
        elif event_type == 'charge:failed':
            handle_crypto_payment_failed(event['data'])
        else:
            logger.info(f"Unhandled crypto event: {event_type}")
            
        return {'statusCode': 200, 'body': 'Success'}
        
    except Exception as e:
        logger.error(f"Error handling crypto event: {str(e)}")
        return {'statusCode': 200, 'body': 'Error processed'}

# Stripe event handlers
def handle_payment_succeeded(payment_intent: Dict[str, Any]) -> None:
    """Handle successful payment"""
    logger.info(f"Payment succeeded: {payment_intent['id']}")
    
    # Update order status
    order_id = payment_intent.get('metadata', {}).get('order_id')
    if order_id:
        update_order_status(order_id, 'paid')
    
    # Send confirmation email
    send_payment_confirmation(payment_intent)
    
    # Update user balance if needed
    update_user_balance(payment_intent)

def handle_payment_failed(payment_intent: Dict[str, Any]) -> None:
    """Handle failed payment"""
    logger.info(f"Payment failed: {payment_intent['id']}")
    
    # Update order status
    order_id = payment_intent.get('metadata', {}).get('order_id')
    if order_id:
        update_order_status(order_id, 'payment_failed')
    
    # Send failure notification
    send_payment_failure_notification(payment_intent)

def handle_charge_refunded(charge: Dict[str, Any]) -> None:
    """Handle charge refund"""
    logger.info(f"Charge refunded: {charge['id']}")
    
    # Process refund in system
    process_refund(charge)
    
    # Send refund confirmation
    send_refund_confirmation(charge)

def handle_subscription_created(subscription: Dict[str, Any]) -> None:
    """Handle new subscription"""
    logger.info(f"Subscription created: {subscription['id']}")
    
    # Create subscription in database
    create_subscription_record(subscription)
    
    # Grant subscription benefits
    grant_subscription_benefits(subscription)

def handle_subscription_updated(subscription: Dict[str, Any]) -> None:
    """Handle subscription update"""
    logger.info(f"Subscription updated: {subscription['id']}")
    
    # Update subscription in database
    update_subscription_record(subscription)
    
    # Adjust benefits if needed
    adjust_subscription_benefits(subscription)

def handle_subscription_deleted(subscription: Dict[str, Any]) -> None:
    """Handle subscription cancellation"""
    logger.info(f"Subscription cancelled: {subscription['id']}")
    
    # Cancel subscription in database
    cancel_subscription_record(subscription)
    
    # Revoke subscription benefits
    revoke_subscription_benefits(subscription)

def handle_invoice_paid(invoice: Dict[str, Any]) -> None:
    """Handle paid invoice"""
    logger.info(f"Invoice paid: {invoice['id']}")
    
    # Record invoice payment
    record_invoice_payment(invoice)

def handle_invoice_failed(invoice: Dict[str, Any]) -> None:
    """Handle failed invoice payment"""
    logger.info(f"Invoice payment failed: {invoice['id']}")
    
    # Handle failed subscription payment
    handle_failed_subscription_payment(invoice)

def handle_checkout_completed(session: Dict[str, Any]) -> None:
    """Handle completed checkout session"""
    logger.info(f"Checkout completed: {session['id']}")
    
    # Complete order
    complete_order_from_checkout(session)

def handle_payment_method_attached(payment_method: Dict[str, Any]) -> None:
    """Handle new payment method"""
    logger.info(f"Payment method attached: {payment_method['id']}")
    
    # Save payment method
    save_payment_method(payment_method)

# PayPal event handlers
def handle_paypal_capture_completed(capture: Dict[str, Any]) -> None:
    """Handle PayPal payment capture"""
    logger.info(f"PayPal capture completed: {capture['id']}")
    
    # Update order status
    update_paypal_order_status(capture)

def handle_paypal_refunded(refund: Dict[str, Any]) -> None:
    """Handle PayPal refund"""
    logger.info(f"PayPal refund: {refund['id']}")
    
    # Process PayPal refund
    process_paypal_refund(refund)

def handle_paypal_subscription_created(subscription: Dict[str, Any]) -> None:
    """Handle PayPal subscription creation"""
    logger.info(f"PayPal subscription created: {subscription['id']}")
    
    # Create PayPal subscription record
    create_paypal_subscription(subscription)

def handle_paypal_subscription_cancelled(subscription: Dict[str, Any]) -> None:
    """Handle PayPal subscription cancellation"""
    logger.info(f"PayPal subscription cancelled: {subscription['id']}")
    
    # Cancel PayPal subscription
    cancel_paypal_subscription(subscription)

# Crypto event handlers
def handle_crypto_payment_confirmed(charge: Dict[str, Any]) -> None:
    """Handle confirmed crypto payment"""
    logger.info(f"Crypto payment confirmed: {charge['id']}")
    
    # Confirm crypto payment
    confirm_crypto_payment(charge)

def handle_crypto_payment_failed(charge: Dict[str, Any]) -> None:
    """Handle failed crypto payment"""
    logger.info(f"Crypto payment failed: {charge['id']}")
    
    # Handle failed crypto payment
    handle_failed_crypto_payment(charge)

# Verification functions
def verify_paypal_webhook(headers: Dict[str, str], body: str) -> bool:
    """Verify PayPal webhook signature"""
    # Implementation would verify PayPal webhook
    # This is a simplified version
    transmission_id = headers.get('paypal-transmission-id')
    timestamp = headers.get('paypal-transmission-time')
    webhook_id = PAYPAL_WEBHOOK_ID
    
    if not all([transmission_id, timestamp, webhook_id]):
        return False
    
    # In production, verify with PayPal API
    return True

def verify_crypto_webhook(headers: Dict[str, str], body: str) -> bool:
    """Verify cryptocurrency webhook signature"""
    # Implementation depends on crypto payment provider
    signature = headers.get('x-cc-webhook-signature', '')
    
    if not signature:
        return False
    
    # Verify HMAC signature
    secret = os.environ.get('CRYPTO_WEBHOOK_SECRET', '')
    expected_sig = hmac.new(
        secret.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_sig)

# Helper functions (simplified implementations)
def update_order_status(order_id: str, status: str) -> None:
    """Update order status in database"""
    logger.info(f"Updating order {order_id} to status: {status}")
    # Implementation would update database

def send_payment_confirmation(payment_intent: Dict[str, Any]) -> None:
    """Send payment confirmation email"""
    # Implementation would send email via SQS
    pass

def update_user_balance(payment_intent: Dict[str, Any]) -> None:
    """Update user wallet balance"""
    # Implementation would update user balance
    pass

def send_payment_failure_notification(payment_intent: Dict[str, Any]) -> None:
    """Send payment failure notification"""
    # Implementation would send notification
    pass

def process_refund(charge: Dict[str, Any]) -> None:
    """Process refund in system"""
    # Implementation would process refund
    pass

def send_refund_confirmation(charge: Dict[str, Any]) -> None:
    """Send refund confirmation"""
    # Implementation would send email
    pass

def create_subscription_record(subscription: Dict[str, Any]) -> None:
    """Create subscription in database"""
    # Implementation would create subscription
    pass

def grant_subscription_benefits(subscription: Dict[str, Any]) -> None:
    """Grant subscription benefits to user"""
    # Implementation would grant benefits
    pass

def update_subscription_record(subscription: Dict[str, Any]) -> None:
    """Update subscription in database"""
    # Implementation would update subscription
    pass

def adjust_subscription_benefits(subscription: Dict[str, Any]) -> None:
    """Adjust subscription benefits"""
    # Implementation would adjust benefits
    pass

def cancel_subscription_record(subscription: Dict[str, Any]) -> None:
    """Cancel subscription in database"""
    # Implementation would cancel subscription
    pass

def revoke_subscription_benefits(subscription: Dict[str, Any]) -> None:
    """Revoke subscription benefits"""
    # Implementation would revoke benefits
    pass

def record_invoice_payment(invoice: Dict[str, Any]) -> None:
    """Record invoice payment"""
    # Implementation would record payment
    pass

def handle_failed_subscription_payment(invoice: Dict[str, Any]) -> None:
    """Handle failed subscription payment"""
    # Implementation would handle failure
    pass

def complete_order_from_checkout(session: Dict[str, Any]) -> None:
    """Complete order from checkout session"""
    # Implementation would complete order
    pass

def save_payment_method(payment_method: Dict[str, Any]) -> None:
    """Save payment method for user"""
    # Implementation would save payment method
    pass

def update_paypal_order_status(capture: Dict[str, Any]) -> None:
    """Update PayPal order status"""
    # Implementation would update order
    pass

def process_paypal_refund(refund: Dict[str, Any]) -> None:
    """Process PayPal refund"""
    # Implementation would process refund
    pass

def create_paypal_subscription(subscription: Dict[str, Any]) -> None:
    """Create PayPal subscription"""
    # Implementation would create subscription
    pass

def cancel_paypal_subscription(subscription: Dict[str, Any]) -> None:
    """Cancel PayPal subscription"""
    # Implementation would cancel subscription
    pass

def confirm_crypto_payment(charge: Dict[str, Any]) -> None:
    """Confirm crypto payment"""
    # Implementation would confirm payment
    pass

def handle_failed_crypto_payment(charge: Dict[str, Any]) -> None:
    """Handle failed crypto payment"""
    # Implementation would handle failure
    pass