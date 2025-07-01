"""User service for managing user accounts and profiles."""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import secrets
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, and_
from passlib.context import CryptContext

from ...shared.models.user import User, ApiKey
from ...shared.utils.exceptions import (
    ResourceNotFoundError,
    ResourceConflictError,
    ValidationError,
    AuthenticationError
)
from ...shared.utils.logger import get_logger
from ..auth.roles_service import RolesService

logger = get_logger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserService:
    """Service for managing users."""
    
    async def create_user(
        self,
        email: str,
        username: str,
        password: str,
        full_name: Optional[str] = None,
        db: Session = None
    ) -> User:
        """Create a new user."""
        # Check if user exists
        existing_user = await db.execute(
            select(User).where(
                or_(
                    User.email == email,
                    User.username == username
                )
            )
        )
        if existing_user.scalar_one_or_none():
            raise ResourceConflictError(
                "User with this email or username already exists",
                code="USER_EXISTS"
            )
        
        # Create user
        user = User(
            email=email,
            username=username,
            password_hash=pwd_context.hash(password),
            full_name=full_name
        )
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        # Assign default role
        try:
            roles_service = RolesService(db)
            await roles_service.initialize_default_user_role(str(user.id))
            await db.commit()
        except Exception as e:
            logger.warning(f"Failed to assign default role to user {user.id}: {str(e)}")
        
        logger.info(f"Created user: {username} ({email})")
        return user
    
    async def get_user(
        self,
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        username: Optional[str] = None,
        db: Session = None
    ) -> User:
        """Get user by ID, email, or username."""
        query = select(User)
        
        if user_id:
            query = query.where(User.id == user_id)
        elif email:
            query = query.where(User.email == email)
        elif username:
            query = query.where(User.username == username)
        else:
            raise ValidationError("Must provide user_id, email, or username")
        
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            raise ResourceNotFoundError("User not found", code="USER_NOT_FOUND")
        
        return user
    
    async def update_user(
        self,
        user_id: str,
        updates: Dict[str, Any],
        db: Session = None
    ) -> User:
        """Update user information."""
        user = await self.get_user(user_id=user_id, db=db)
        
        # Validate and apply updates
        allowed_fields = {
            "full_name", "bio", "avatar_url", "preferences",
            "notification_settings"
        }
        
        for field, value in updates.items():
            if field in allowed_fields:
                setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"Updated user {user_id}")
        return user
    
    async def authenticate_user(
        self,
        email_or_username: str,
        password: str,
        db: Session = None
    ) -> User:
        """Authenticate user with email/username and password."""
        # Find user
        result = await db.execute(
            select(User).where(
                or_(
                    User.email == email_or_username,
                    User.username == email_or_username
                )
            )
        )
        user = result.scalar_one_or_none()
        
        if not user or not pwd_context.verify(password, user.password_hash):
            raise AuthenticationError(
                "Invalid credentials",
                code="INVALID_CREDENTIALS"
            )
        
        if not user.is_active:
            raise AuthenticationError(
                "Account is deactivated",
                code="ACCOUNT_DEACTIVATED"
            )
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        await db.commit()
        
        return user
    
    async def change_password(
        self,
        user_id: str,
        old_password: str,
        new_password: str,
        db: Session = None
    ) -> bool:
        """Change user password."""
        user = await self.get_user(user_id=user_id, db=db)
        
        # Verify old password (skip if empty - for password reset)
        if old_password and not pwd_context.verify(old_password, user.password_hash):
            raise ValidationError(
                "Current password is incorrect",
                code="INVALID_PASSWORD"
            )
        
        # Update password
        user.password_hash = pwd_context.hash(new_password)
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        
        logger.info(f"Password changed for user {user_id}")
        return True
    
    async def verify_email(
        self,
        user_id: str,
        db: Session = None
    ) -> User:
        """Mark user's email as verified."""
        user = await self.get_user(user_id=user_id, db=db)
        
        user.is_verified = True
        user.email_verified_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"Email verified for user {user_id}")
        return user
    
    async def create_api_key(
        self,
        user_id: str,
        name: str,
        permissions: List[str] = None,
        expires_in_days: Optional[int] = None,
        db: Session = None
    ) -> tuple[ApiKey, str]:
        """Create an API key for user."""
        user = await self.get_user(user_id=user_id, db=db)
        
        # Generate key
        raw_key = secrets.token_urlsafe(32)
        key_hash = pwd_context.hash(raw_key)
        
        # Calculate expiration
        expires_at = None
        if expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
        
        # Create API key
        api_key = ApiKey(
            user_id=user.id,
            name=name,
            key_hash=key_hash,
            permissions=permissions or ["read"],
            expires_at=expires_at
        )
        
        db.add(api_key)
        await db.commit()
        await db.refresh(api_key)
        
        logger.info(f"Created API key '{name}' for user {user_id}")
        
        # Return both the model and the raw key (only shown once)
        return api_key, raw_key
    
    async def validate_api_key(
        self,
        raw_key: str,
        db: Session = None
    ) -> ApiKey:
        """Validate an API key."""
        # Find all API keys and check each one
        result = await db.execute(
            select(ApiKey).where(ApiKey.is_active == True)
        )
        api_keys = result.scalars().all()
        
        for api_key in api_keys:
            if pwd_context.verify(raw_key, api_key.key_hash):
                # Check expiration
                if api_key.expires_at and api_key.expires_at < datetime.utcnow():
                    raise AuthenticationError(
                        "API key has expired",
                        code="API_KEY_EXPIRED"
                    )
                
                # Update last used
                api_key.last_used_at = datetime.utcnow()
                api_key.request_count += 1
                await db.commit()
                
                return api_key
        
        raise AuthenticationError(
            "Invalid API key",
            code="INVALID_API_KEY"
        )
    
    async def delete_api_key(
        self,
        user_id: str,
        api_key_id: str,
        db: Session = None
    ) -> bool:
        """Delete an API key."""
        result = await db.execute(
            select(ApiKey).where(
                and_(
                    ApiKey.id == api_key_id,
                    ApiKey.user_id == user_id
                )
            )
        )
        api_key = result.scalar_one_or_none()
        
        if not api_key:
            raise ResourceNotFoundError(
                "API key not found",
                code="API_KEY_NOT_FOUND"
            )
        
        api_key.is_active = False
        await db.commit()
        
        logger.info(f"Deleted API key {api_key_id} for user {user_id}")
        return True
    
    async def get_user_stats(
        self,
        user_id: str,
        db: Session = None
    ) -> Dict[str, Any]:
        """Get user statistics."""
        user = await self.get_user(user_id=user_id, db=db)
        
        return {
            "user_id": str(user.id),
            "username": user.username,
            "email": user.email,
            "is_verified": user.is_verified,
            "is_premium": user.is_premium,
            "created_at": user.created_at,
            "last_login_at": user.last_login_at,
            "ai_usage": {
                "tokens_used": user.ai_tokens_used,
                "requests_count": user.ai_requests_count,
                "monthly_limit": user.ai_monthly_limit,
                "percentage_used": round(
                    (user.ai_tokens_used / user.ai_monthly_limit) * 100, 2
                ) if user.ai_monthly_limit > 0 else 0
            }
        }


# Create singleton instance
user_service = UserService()