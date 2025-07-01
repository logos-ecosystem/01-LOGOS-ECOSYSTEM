"""Email Service Module - SMTP and Template Management"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime
import os
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pathlib import Path

from src.shared.utils.logger import get_logger
from src.shared.utils.config import get_settings
settings = get_settings()
from src.infrastructure.cache import cache_manager
# from src.services.tasks import celery_app  # TODO: Set up Celery

logger = get_logger(__name__)


class EmailService:
    """Service for sending emails via SMTP"""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.EMAIL_FROM or "noreply@logos-ecosystem.com"
        self.from_name = settings.EMAIL_FROM_NAME or "LOGOS Ecosystem"
        
        # Setup Jinja2 for email templates
        template_dir = Path(__file__).parent / "templates"
        self.env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(['html', 'xml'])
        )
    
    def _get_smtp_connection(self):
        """Create SMTP connection"""
        if self.smtp_port == 587:
            # TLS
            smtp = smtplib.SMTP(self.smtp_host, self.smtp_port)
            smtp.starttls()
        elif self.smtp_port == 465:
            # SSL
            smtp = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port)
        else:
            # No encryption
            smtp = smtplib.SMTP(self.smtp_host, self.smtp_port)
        
        if self.smtp_username and self.smtp_password:
            smtp.login(self.smtp_username, self.smtp_password)
        
        return smtp
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str = None,
        attachments: List[Dict[str, Any]] = None,
        cc: List[str] = None,
        bcc: List[str] = None,
        reply_to: str = None
    ) -> bool:
        """Send an email"""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            if cc:
                msg['Cc'] = ', '.join(cc)
            if reply_to:
                msg['Reply-To'] = reply_to
            
            # Add text and HTML parts
            if text_content:
                msg.attach(MIMEText(text_content, 'plain'))
            msg.attach(MIMEText(html_content, 'html'))
            
            # Add attachments
            if attachments:
                for attachment in attachments:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment['content'])
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename= {attachment["filename"]}'
                    )
                    msg.attach(part)
            
            # Send email
            recipients = [to_email]
            if cc:
                recipients.extend(cc)
            if bcc:
                recipients.extend(bcc)
            
            with self._get_smtp_connection() as smtp:
                smtp.send_message(msg, to_addrs=recipients)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {str(e)}")
            return False
    
    async def send_templated_email(
        self,
        to_email: str,
        template_name: str,
        context: Dict[str, Any],
        subject: str = None,
        **kwargs
    ) -> bool:
        """Send an email using a template"""
        try:
            # Load template
            template = self.env.get_template(f"{template_name}.html")
            html_content = template.render(**context)
            
            # Try to load text version
            text_content = None
            try:
                text_template = self.env.get_template(f"{template_name}.txt")
                text_content = text_template.render(**context)
            except:
                pass
            
            # Use template subject if not provided
            if not subject and hasattr(template.module, 'subject'):
                subject = template.module.subject
            
            return await self.send_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                **kwargs
            )
            
        except Exception as e:
            logger.error(f"Error sending templated email: {str(e)}")
            return False
    
    async def send_welcome_email(self, user_email: str, user_name: str) -> bool:
        """Send welcome email to new user"""
        context = {
            "user_name": user_name,
            "platform_name": "LOGOS Ecosystem",
            "login_url": f"{settings.FRONTEND_URL}/auth/login",
            "support_email": "support@logos-ecosystem.com"
        }
        
        return await self.send_templated_email(
            to_email=user_email,
            template_name="welcome",
            subject="Welcome to LOGOS Ecosystem!",
            context=context
        )
    
    async def send_password_reset_email(
        self,
        user_email: str,
        user_name: str,
        reset_token: str
    ) -> bool:
        """Send password reset email"""
        reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?token={reset_token}"
        
        context = {
            "user_name": user_name,
            "reset_url": reset_url,
            "expire_hours": 24,
            "support_email": "support@logos-ecosystem.com"
        }
        
        return await self.send_templated_email(
            to_email=user_email,
            template_name="password_reset",
            subject="Reset Your Password - LOGOS Ecosystem",
            context=context
        )
    
    async def send_purchase_confirmation(
        self,
        user_email: str,
        user_name: str,
        item_title: str,
        amount: float,
        transaction_id: str
    ) -> bool:
        """Send purchase confirmation email"""
        context = {
            "user_name": user_name,
            "item_title": item_title,
            "amount": amount,
            "transaction_id": transaction_id,
            "purchase_date": datetime.utcnow().strftime("%B %d, %Y"),
            "downloads_url": f"{settings.FRONTEND_URL}/dashboard/purchases",
            "support_email": "support@logos-ecosystem.com"
        }
        
        return await self.send_templated_email(
            to_email=user_email,
            template_name="purchase_confirmation",
            subject=f"Purchase Confirmation - {item_title}",
            context=context
        )
    
    async def send_deposit_confirmation(
        self,
        user_email: str,
        user_name: str,
        amount: float,
        transaction_id: str,
        payment_method: str
    ) -> bool:
        """Send deposit confirmation email"""
        context = {
            "user_name": user_name,
            "amount": amount,
            "transaction_id": transaction_id,
            "payment_method": payment_method,
            "deposit_date": datetime.utcnow().strftime("%B %d, %Y"),
            "wallet_url": f"{settings.FRONTEND_URL}/dashboard/wallet",
            "support_email": "support@logos-ecosystem.com"
        }
        
        return await self.send_templated_email(
            to_email=user_email,
            template_name="deposit_confirmation",
            subject=f"Deposit Confirmed - ${amount}",
            context=context
        )
    
    async def send_withdrawal_confirmation(
        self,
        user_email: str,
        user_name: str,
        amount: float,
        destination: str,
        estimated_arrival: str
    ) -> bool:
        """Send withdrawal confirmation email"""
        context = {
            "user_name": user_name,
            "amount": amount,
            "destination": destination,
            "estimated_arrival": estimated_arrival,
            "withdrawal_date": datetime.utcnow().strftime("%B %d, %Y"),
            "support_email": "support@logos-ecosystem.com"
        }
        
        return await self.send_templated_email(
            to_email=user_email,
            template_name="withdrawal_confirmation",
            subject=f"Withdrawal Processed - ${amount}",
            context=context
        )
    
    async def send_new_sale_notification(
        self,
        seller_email: str,
        seller_name: str,
        item_title: str,
        buyer_name: str,
        amount: float,
        net_amount: float
    ) -> bool:
        """Send notification to seller about new sale"""
        context = {
            "seller_name": seller_name,
            "item_title": item_title,
            "buyer_name": buyer_name,
            "amount": amount,
            "net_amount": net_amount,
            "platform_fee": amount - net_amount,
            "sale_date": datetime.utcnow().strftime("%B %d, %Y"),
            "dashboard_url": f"{settings.FRONTEND_URL}/dashboard/sales",
            "support_email": "support@logos-ecosystem.com"
        }
        
        return await self.send_templated_email(
            to_email=seller_email,
            template_name="new_sale",
            subject=f"You made a sale! - {item_title}",
            context=context
        )
    
    async def send_verification_email(
        self,
        user_email: str,
        user_name: str,
        verification_token: str
    ) -> bool:
        """Send email verification"""
        verification_url = f"{settings.FRONTEND_URL}/auth/verify-email?token={verification_token}"
        
        context = {
            "user_name": user_name,
            "verification_url": verification_url,
            "expire_hours": 48,
            "support_email": "support@logos-ecosystem.com"
        }
        
        return await self.send_templated_email(
            to_email=user_email,
            template_name="email_verification",
            subject="Verify Your Email - LOGOS Ecosystem",
            context=context
        )
    
    async def send_security_alert(
        self,
        user_email: str,
        user_name: str,
        alert_type: str,
        ip_address: str,
        location: str = None,
        device: str = None
    ) -> bool:
        """Send security alert email"""
        context = {
            "user_name": user_name,
            "alert_type": alert_type,
            "ip_address": ip_address,
            "location": location or "Unknown",
            "device": device or "Unknown",
            "timestamp": datetime.utcnow().strftime("%B %d, %Y at %I:%M %p UTC"),
            "security_url": f"{settings.FRONTEND_URL}/dashboard/security",
            "support_email": "support@logos-ecosystem.com"
        }
        
        return await self.send_templated_email(
            to_email=user_email,
            template_name="security_alert",
            subject=f"Security Alert - {alert_type}",
            context=context
        )
    
    async def send_newsletter(
        self,
        recipients: List[str],
        subject: str,
        content: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send newsletter to multiple recipients"""
        success_count = 0
        failed_emails = []
        
        for email in recipients:
            # Check if user has unsubscribed
            unsubscribed = await cache_manager.get(f"unsubscribed:{email}")
            if unsubscribed:
                continue
            
            try:
                # Add unsubscribe link to content
                content["unsubscribe_url"] = f"{settings.FRONTEND_URL}/unsubscribe?email={email}"
                
                success = await self.send_templated_email(
                    to_email=email,
                    template_name="newsletter",
                    subject=subject,
                    context=content
                )
                
                if success:
                    success_count += 1
                else:
                    failed_emails.append(email)
                
                # Rate limiting to avoid SMTP throttling
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error sending newsletter to {email}: {str(e)}")
                failed_emails.append(email)
        
        return {
            "total": len(recipients),
            "success": success_count,
            "failed": len(failed_emails),
            "failed_emails": failed_emails
        }


# Celery tasks for async email sending
# @celery_app.task
def send_email_task(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str = None,
    **kwargs
):
    """Celery task for sending emails asynchronously"""
    email_service = EmailService()
    asyncio.run(email_service.send_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        **kwargs
    ))


# @celery_app.task
def send_templated_email_task(
    to_email: str,
    template_name: str,
    context: Dict[str, Any],
    subject: str = None,
    **kwargs
):
    """Celery task for sending templated emails asynchronously"""
    email_service = EmailService()
    asyncio.run(email_service.send_templated_email(
        to_email=to_email,
        template_name=template_name,
        context=context,
        subject=subject,
        **kwargs
    ))


# Global email service instance
email_service = EmailService()