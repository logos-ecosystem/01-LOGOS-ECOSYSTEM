"""
AWS Lambda function for Stripe webhooks
Deploy this as a Lambda function and use API Gateway
"""

import json
import os
import stripe
import boto3
from datetime import datetime

# Initialize Stripe
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
secrets_client = boto3.client('secretsmanager')

def get_secret(secret_name):
    """Get secret from AWS Secrets Manager"""
    try:
        response = secrets_client.get_secret_value(SecretId=secret_name)
        return json.loads(response['SecretString'])
    except Exception as e:
        print(f"Error getting secret: {e}")
        return None

def lambda_handler(event, context):
    """Main Lambda handler"""
    
    # Get webhook secret if not in environment
    if not STRIPE_WEBHOOK_SECRET:
        secrets = get_secret('logos-backend-secrets')
        if secrets:
            stripe.api_key = secrets.get('STRIPE_SECRET_KEY')
            webhook_secret = secrets.get('STRIPE_WEBHOOK_SECRET')
        else:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Configuration error'})
            }
    else:
        webhook_secret = STRIPE_WEBHOOK_SECRET
    
    # Get the webhook data
    body = event.get('body', '')
    signature = event.get('headers', {}).get('stripe-signature', '')
    
    try:
        # Verify webhook signature
        webhook_event = stripe.Webhook.construct_event(
            body, signature, webhook_secret
        )
    except ValueError:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid payload'})
        }
    except stripe.error.SignatureVerificationError:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid signature'})
        }
    
    # Log the event
    print(f"Processing webhook event: {webhook_event['type']}")
    
    # Process different event types
    event_type = webhook_event['type']
    event_data = webhook_event['data']['object']
    
    try:
        if event_type == 'payment_intent.succeeded':
            handle_payment_succeeded(event_data)
        
        elif event_type == 'payment_intent.payment_failed':
            handle_payment_failed(event_data)
        
        elif event_type == 'customer.subscription.created':
            handle_subscription_created(event_data)
        
        elif event_type == 'customer.subscription.updated':
            handle_subscription_updated(event_data)
        
        elif event_type == 'customer.subscription.deleted':
            handle_subscription_deleted(event_data)
        
        elif event_type == 'invoice.payment_succeeded':
            handle_invoice_paid(event_data)
        
        elif event_type == 'invoice.payment_failed':
            handle_invoice_failed(event_data)
        
        else:
            print(f"Unhandled event type: {event_type}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'received': True})
        }
        
    except Exception as e:
        print(f"Error processing webhook: {e}")
        # Return 200 to prevent retries
        return {
            'statusCode': 200,
            'body': json.dumps({'error': 'Processed with error'})
        }

def handle_payment_succeeded(payment_intent):
    """Handle successful payment"""
    print(f"Payment succeeded: {payment_intent['id']}")
    
    # Update database (example using DynamoDB)
    table = dynamodb.Table('logos_payments')
    table.put_item(
        Item={
            'payment_id': payment_intent['id'],
            'status': 'succeeded',
            'amount': payment_intent['amount'],
            'currency': payment_intent['currency'],
            'customer': payment_intent.get('customer'),
            'metadata': payment_intent.get('metadata', {}),
            'updated_at': datetime.utcnow().isoformat()
        }
    )

def handle_payment_failed(payment_intent):
    """Handle failed payment"""
    print(f"Payment failed: {payment_intent['id']}")
    # Add your logic here

def handle_subscription_created(subscription):
    """Handle new subscription"""
    print(f"Subscription created: {subscription['id']}")
    # Add your logic here

def handle_subscription_updated(subscription):
    """Handle subscription update"""
    print(f"Subscription updated: {subscription['id']}")
    # Add your logic here

def handle_subscription_deleted(subscription):
    """Handle subscription cancellation"""
    print(f"Subscription cancelled: {subscription['id']}")
    # Add your logic here

def handle_invoice_paid(invoice):
    """Handle paid invoice"""
    print(f"Invoice paid: {invoice['id']}")
    # Add your logic here

def handle_invoice_failed(invoice):
    """Handle failed invoice"""
    print(f"Invoice payment failed: {invoice['id']}")
    # Add your logic here