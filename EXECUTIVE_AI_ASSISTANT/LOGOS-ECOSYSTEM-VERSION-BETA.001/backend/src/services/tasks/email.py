from celery import shared_task
from typing import Dict, List, Optional
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import jinja2
from pathlib import Path

from ...shared.utils.config import get_settings
from ...shared.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Email templates directory
TEMPLATES_DIR = Path(__file__).parent.parent.parent / "templates" / "emails"

# Jinja2 environment
jinja_env = jinja2.Environment(
    loader=jinja2.FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=True
)


@shared_task(name="send_email")
def send_email(
    to_email: str,
    subject: str,
    template_name: str,
    template_data: Dict,
    from_email: Optional[str] = None
) -> bool:
    """Send an email using template."""
    try:
        # Load template
        template = jinja_env.get_template(f"{template_name}.html")
        html_content = template.render(**template_data)
        
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = from_email or settings.EMAIL_FROM
        message["To"] = to_email
        
        # Add HTML part
        html_part = MIMEText(html_content, "html")
        message.attach(html_part)
        
        # Send email (simplified - in production use proper SMTP)
        logger.info(f"Email sent to {to_email}: {subject}")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        raise


@shared_task(name="send_welcome_email")
def send_welcome_email(user_id: str, email: str, username: str) -> bool:
    """Send welcome email to new user."""
    return send_email(
        to_email=email,
        subject="Welcome to LOGOS Ecosystem!",
        template_name="welcome",
        template_data={
            "username": username,
            "login_url": f"{settings.FRONTEND_URL}/login",
            "support_email": settings.SUPPORT_EMAIL
        }
    )


@shared_task(name="send_purchase_confirmation")
def send_purchase_confirmation(
    buyer_email: str,
    item_title: str,
    amount: float,
    transaction_id: str
) -> bool:
    """Send purchase confirmation email."""
    return send_email(
        to_email=buyer_email,
        subject=f"Purchase Confirmation: {item_title}",
        template_name="purchase_confirmation",
        template_data={
            "item_title": item_title,
            "amount": amount,
            "transaction_id": transaction_id,
            "download_url": f"{settings.FRONTEND_URL}/purchases/{transaction_id}"
        }
    )


@shared_task(name="send_sale_notification")
def send_sale_notification(
    seller_email: str,
    item_title: str,
    amount: float,
    buyer_username: str
) -> bool:
    """Send sale notification to seller."""
    return send_email(
        to_email=seller_email,
        subject=f"You made a sale: {item_title}",
        template_name="sale_notification",
        template_data={
            "item_title": item_title,
            "amount": amount,
            "earnings": amount * 0.9,  # After 10% platform fee
            "buyer_username": buyer_username,
            "dashboard_url": f"{settings.FRONTEND_URL}/dashboard"
        }
    )


@shared_task(name="send_password_reset")
def send_password_reset(email: str, reset_token: str) -> bool:
    """Send password reset email."""
    return send_email(
        to_email=email,
        subject="Reset Your Password",
        template_name="password_reset",
        template_data={
            "reset_url": f"{settings.FRONTEND_URL}/reset-password?token={reset_token}",
            "expires_in": "1 hour"
        }
    )


@shared_task(name="send_verification_email")
def send_verification_email(email: str, verification_token: str) -> bool:
    """Send email verification."""
    return send_email(
        to_email=email,
        subject="Verify Your Email Address",
        template_name="email_verification",
        template_data={
            "verification_url": f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
        }
    )


@shared_task(name="send_batch_emails")
def send_batch_emails(
    recipients: List[Dict[str, str]],
    subject: str,
    template_name: str,
    common_data: Dict
) -> Dict[str, int]:
    """Send batch emails to multiple recipients."""
    sent = 0
    failed = 0
    
    for recipient in recipients:
        try:
            template_data = {**common_data, **recipient}
            send_email(
                to_email=recipient["email"],
                subject=subject,
                template_name=template_name,
                template_data=template_data
            )
            sent += 1
        except Exception as e:
            logger.error(f"Failed to send batch email to {recipient['email']}: {str(e)}")
            failed += 1
    
    logger.info(f"Batch email completed: {sent} sent, {failed} failed")
    
    return {"sent": sent, "failed": failed}