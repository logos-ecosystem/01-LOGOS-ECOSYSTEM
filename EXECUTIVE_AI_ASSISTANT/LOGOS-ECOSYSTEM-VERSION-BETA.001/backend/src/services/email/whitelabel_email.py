"""Enhanced Email Service with White-Label Support"""

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
from src.shared.utils.whitelabel import get_whitelabel_config, WhiteLabelConfig
from src.infrastructure.cache import cache_manager
# from src.services.tasks import celery_app  # TODO: Setup Celery

logger = get_logger(__name__)


class WhiteLabelEmailService:
    """Enhanced email service with white-label support"""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        
        # Setup Jinja2 for email templates
        template_dir = Path(__file__).parent / "templates"
        self.env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(['html', 'xml'])
        )
        
        # Add white-label config to Jinja globals
        self.env.globals['get_whitelabel_config'] = get_whitelabel_config
    
    def _get_whitelabel_config(self) -> WhiteLabelConfig:
        """Get current white-label configuration"""
        return get_whitelabel_config()
    
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
    
    def _prepare_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare context with white-label configuration"""
        wl_config = self._get_whitelabel_config()
        
        # Merge white-label config into context
        enhanced_context = {
            **context,
            "settings": settings,
            "whitelabel": wl_config,
            "platform_name": wl_config.platform_name,
            "platform_full_name": wl_config.platform_full_name,
            "platform_tagline": wl_config.platform_tagline,
            "support_email": wl_config.email.support_email,
            "noreply_email": wl_config.email.noreply_email,
            "sender_name": wl_config.email.sender_name,
            "logo_url": f"{settings.FRONTEND_URL}{wl_config.logo_url}",
            "colors": wl_config.colors.model_dump(),
            "social_links": {k: v for k, v in wl_config.social.model_dump().items() if v},
            "legal": wl_config.legal.model_dump(),
            "frontend_url": settings.FRONTEND_URL,
            "current_year": datetime.utcnow().year,
        }
        
        return enhanced_context
    
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
        """Send an email with white-label configuration"""
        wl_config = self._get_whitelabel_config()
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{wl_config.email.sender_name} <{wl_config.email.noreply_email}>"
            msg['To'] = to_email
            
            if cc:
                msg['Cc'] = ', '.join(cc)
            if reply_to:
                msg['Reply-To'] = reply_to or wl_config.email.support_email
            
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
        """Send an email using a template with white-label support"""
        try:
            # Prepare context with white-label config
            enhanced_context = self._prepare_context(context)
            
            # Load template
            template = self.env.get_template(f"{template_name}.html")
            html_content = template.render(**enhanced_context)
            
            # Try to load text version
            text_content = None
            try:
                text_template = self.env.get_template(f"{template_name}.txt")
                text_content = text_template.render(**enhanced_context)
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
        wl_config = self._get_whitelabel_config()
        context = {
            "user_name": user_name,
            "login_url": f"{settings.FRONTEND_URL}/auth/login",
        }
        
        return await self.send_templated_email(
            to_email=user_email,
            template_name="welcome",
            subject=f"Welcome to {wl_config.platform_full_name}!",
            context=context
        )
    
    async def send_password_reset_email(
        self,
        user_email: str,
        user_name: str,
        reset_token: str
    ) -> bool:
        """Send password reset email"""
        wl_config = self._get_whitelabel_config()
        reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?token={reset_token}"
        
        context = {
            "user_name": user_name,
            "reset_url": reset_url,
            "expire_hours": 24,
        }
        
        return await self.send_templated_email(
            to_email=user_email,
            template_name="password_reset",
            subject=f"Reset Your Password - {wl_config.platform_name}",
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
        }
        
        return await self.send_templated_email(
            to_email=user_email,
            template_name="purchase_confirmation",
            subject=f"Purchase Confirmation - {item_title}",
            context=context
        )
    
    async def send_verification_email(
        self,
        user_email: str,
        user_name: str,
        verification_token: str
    ) -> bool:
        """Send email verification"""
        wl_config = self._get_whitelabel_config()
        verification_url = f"{settings.FRONTEND_URL}/auth/verify-email?token={verification_token}"
        
        context = {
            "user_name": user_name,
            "verification_url": verification_url,
            "expire_hours": 48,
        }
        
        return await self.send_templated_email(
            to_email=user_email,
            template_name="email_verification",
            subject=f"Verify Your Email - {wl_config.platform_name}",
            context=context
        )
    
    async def send_custom_email(
        self,
        to_email: str,
        subject: str,
        template_name: str,
        context: Dict[str, Any],
        **kwargs
    ) -> bool:
        """Send a custom email with full white-label support"""
        return await self.send_templated_email(
            to_email=to_email,
            template_name=template_name,
            subject=subject,
            context=context,
            **kwargs
        )


# Celery tasks for async email sending
# @celery_app.task  # TODO: Setup Celery
def send_whitelabel_email_task(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str = None,
    **kwargs
):
    """Celery task for sending white-label emails asynchronously"""
    email_service = WhiteLabelEmailService()
    asyncio.run(email_service.send_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        **kwargs
    ))


# @celery_app.task  # TODO: Setup Celery
def send_whitelabel_templated_email_task(
    to_email: str,
    template_name: str,
    context: Dict[str, Any],
    subject: str = None,
    **kwargs
):
    """Celery task for sending white-label templated emails asynchronously"""
    email_service = WhiteLabelEmailService()
    asyncio.run(email_service.send_templated_email(
        to_email=to_email,
        template_name=template_name,
        context=context,
        subject=subject,
        **kwargs
    ))


# Global white-label email service instance
whitelabel_email_service = WhiteLabelEmailService()