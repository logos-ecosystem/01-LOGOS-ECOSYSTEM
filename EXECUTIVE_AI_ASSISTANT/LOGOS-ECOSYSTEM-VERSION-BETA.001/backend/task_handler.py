"""
AWS Lambda handler for async task processing via SQS
Processes background tasks like AI processing, email sending, etc.
"""

import json
import os
import logging
from typing import Dict, Any, List
import asyncio
from src.services.ai.ai_integration import AIIntegrationService
from src.services.email.whitelabel_email import WhitelabelEmailService
from src.services.tasks.ai import process_ai_request
from src.services.tasks.email import send_email_task

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize services
ai_service = AIIntegrationService()
email_service = WhitelabelEmailService()

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main task handler for SQS events"""
    
    records = event.get('Records', [])
    failed_records = []
    
    for record in records:
        try:
            # Parse message body
            body = json.loads(record.get('body', '{}'))
            task_type = body.get('type')
            task_data = body.get('data', {})
            
            logger.info(f"Processing task: {task_type}")
            
            # Route to appropriate handler
            if task_type == 'ai_process':
                asyncio.run(handle_ai_task(task_data))
            elif task_type == 'send_email':
                handle_email_task(task_data)
            elif task_type == 'generate_report':
                handle_report_task(task_data)
            elif task_type == 'process_payment':
                handle_payment_task(task_data)
            elif task_type == 'train_model':
                handle_training_task(task_data)
            else:
                logger.error(f"Unknown task type: {task_type}")
                failed_records.append(record['messageId'])
                
        except Exception as e:
            logger.error(f"Task processing error: {str(e)}")
            failed_records.append(record.get('messageId', 'unknown'))
    
    # Return failed message IDs for retry
    if failed_records:
        return {
            'batchItemFailures': [
                {'itemIdentifier': msg_id} for msg_id in failed_records
            ]
        }
    
    return {'statusCode': 200, 'body': 'Tasks processed successfully'}

async def handle_ai_task(data: Dict[str, Any]) -> None:
    """Handle AI processing tasks"""
    try:
        user_id = data.get('user_id')
        agent_id = data.get('agent_id')
        prompt = data.get('prompt')
        
        if not all([user_id, agent_id, prompt]):
            raise ValueError("Missing required fields for AI task")
        
        # Process AI request
        result = await process_ai_request(
            user_id=user_id,
            agent_id=agent_id,
            prompt=prompt,
            metadata=data.get('metadata', {})
        )
        
        logger.info(f"AI task completed for user {user_id}")
        
        # Store result in S3 or send notification
        if data.get('callback_url'):
            # Send result to callback URL
            import requests
            requests.post(
                data['callback_url'],
                json={'result': result, 'task_id': data.get('task_id')}
            )
            
    except Exception as e:
        logger.error(f"AI task error: {str(e)}")
        raise

def handle_email_task(data: Dict[str, Any]) -> None:
    """Handle email sending tasks"""
    try:
        email_type = data.get('email_type')
        recipient = data.get('recipient')
        context = data.get('context', {})
        
        if not all([email_type, recipient]):
            raise ValueError("Missing required fields for email task")
        
        # Send email based on type
        if email_type == 'welcome':
            email_service.send_welcome_email(recipient, context)
        elif email_type == 'verification':
            email_service.send_verification_email(recipient, context)
        elif email_type == 'password_reset':
            email_service.send_password_reset_email(recipient, context)
        elif email_type == 'purchase_confirmation':
            email_service.send_purchase_confirmation(recipient, context)
        elif email_type == 'ai_usage_limit':
            email_service.send_ai_usage_limit_notification(recipient, context)
        else:
            logger.error(f"Unknown email type: {email_type}")
            raise ValueError(f"Unknown email type: {email_type}")
            
        logger.info(f"Email sent to {recipient}: {email_type}")
        
    except Exception as e:
        logger.error(f"Email task error: {str(e)}")
        raise

def handle_report_task(data: Dict[str, Any]) -> None:
    """Handle report generation tasks"""
    try:
        report_type = data.get('report_type')
        user_id = data.get('user_id')
        date_range = data.get('date_range', {})
        
        logger.info(f"Generating {report_type} report for user {user_id}")
        
        # Generate report based on type
        if report_type == 'usage':
            generate_usage_report(user_id, date_range)
        elif report_type == 'financial':
            generate_financial_report(user_id, date_range)
        elif report_type == 'analytics':
            generate_analytics_report(user_id, date_range)
        else:
            raise ValueError(f"Unknown report type: {report_type}")
            
    except Exception as e:
        logger.error(f"Report task error: {str(e)}")
        raise

def handle_payment_task(data: Dict[str, Any]) -> None:
    """Handle payment processing tasks"""
    try:
        action = data.get('action')
        payment_id = data.get('payment_id')
        
        logger.info(f"Processing payment {payment_id}: {action}")
        
        # Process payment action
        if action == 'capture':
            capture_payment(payment_id, data)
        elif action == 'refund':
            process_refund(payment_id, data)
        elif action == 'payout':
            process_payout(payment_id, data)
        else:
            raise ValueError(f"Unknown payment action: {action}")
            
    except Exception as e:
        logger.error(f"Payment task error: {str(e)}")
        raise

def handle_training_task(data: Dict[str, Any]) -> None:
    """Handle model training tasks"""
    try:
        model_id = data.get('model_id')
        dataset_id = data.get('dataset_id')
        hyperparameters = data.get('hyperparameters', {})
        
        logger.info(f"Starting training for model {model_id}")
        
        # This would typically trigger a longer-running training job
        # For Lambda, we'd start an ECS task or SageMaker job
        start_training_job(model_id, dataset_id, hyperparameters)
        
    except Exception as e:
        logger.error(f"Training task error: {str(e)}")
        raise

# Helper functions (simplified implementations)
def generate_usage_report(user_id: str, date_range: Dict[str, Any]) -> None:
    """Generate usage report for user"""
    logger.info(f"Generating usage report for user {user_id}")
    # Implementation would generate and store report

def generate_financial_report(user_id: str, date_range: Dict[str, Any]) -> None:
    """Generate financial report for user"""
    logger.info(f"Generating financial report for user {user_id}")
    # Implementation would generate and store report

def generate_analytics_report(user_id: str, date_range: Dict[str, Any]) -> None:
    """Generate analytics report for user"""
    logger.info(f"Generating analytics report for user {user_id}")
    # Implementation would generate and store report

def capture_payment(payment_id: str, data: Dict[str, Any]) -> None:
    """Capture a payment"""
    logger.info(f"Capturing payment {payment_id}")
    # Implementation would capture payment via payment processor

def process_refund(payment_id: str, data: Dict[str, Any]) -> None:
    """Process a refund"""
    logger.info(f"Processing refund for payment {payment_id}")
    # Implementation would process refund via payment processor

def process_payout(payment_id: str, data: Dict[str, Any]) -> None:
    """Process a payout"""
    logger.info(f"Processing payout {payment_id}")
    # Implementation would process payout via payment processor

def start_training_job(model_id: str, dataset_id: str, hyperparameters: Dict[str, Any]) -> None:
    """Start a model training job"""
    logger.info(f"Starting training job for model {model_id}")
    # Implementation would start ECS task or SageMaker job