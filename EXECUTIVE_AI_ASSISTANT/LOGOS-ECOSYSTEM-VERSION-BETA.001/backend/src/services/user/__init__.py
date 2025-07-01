"""User Service Module"""

from typing import Optional, Dict, Any, List
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from passlib.context import CryptContext
import jwt
import secrets

from src.shared.models.user import User
from src.shared.utils.logger import get_logger
from src.shared.utils.config import get_settings

settings = get_settings()
from src.infrastructure.cache import cache_manager
from src.services.wallet import wallet_service
from src.services.tasks.email import send_verification_email, send_password_reset

logger = get_logger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserService:
    """Service for managing user operations"""
    
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30
        self.refresh_token_expire_days = 30
    
    async def create_user(
        self,
        username: str,
        email: str,
        password: str,
        db: AsyncSession
    ) -> User:
        """Create a new user"""
        # Check if user exists
        existing = await self.get_user_by_email(email, db)
        if existing:
            raise ValueError("Email already registered")
        
        existing = await self.get_user_by_username(username, db)
        if existing:
            raise ValueError("Username already taken")
        
        # Create user
        user = User(
            id=str(uuid.uuid4()),
            username=username,
            email=email,
            hashed_password=self._hash_password(password),
            is_active=True,
            is_verified=False,
            verification_token=secrets.token_urlsafe(32),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        # Create wallet for user
        await wallet_service.create_wallet(user.id, db)
        
        # Send verification email
        await send_verification_email.delay(user.id, user.email, user.verification_token)
        
        return user
    
    async def get_user(
        self,
        user_id: str,
        db: AsyncSession
    ) -> Optional[User]:
        """Get user by ID"""
        cache_key = f"user:{user_id}"
        cached = await cache_manager.get(cache_key)
        if cached:
            return cached
        
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if user:
            await cache_manager.set(cache_key, user, expire=300)
        
        return user
    
    async def get_user_by_email(
        self,
        email: str,
        db: AsyncSession
    ) -> Optional[User]:
        """Get user by email"""
        result = await db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    async def get_user_by_username(
        self,
        username: str,
        db: AsyncSession
    ) -> Optional[User]:
        """Get user by username"""
        result = await db.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()
    
    async def authenticate_user(
        self,
        email: str,
        password: str,
        db: AsyncSession
    ) -> Optional[User]:
        """Authenticate user with email and password"""
        user = await self.get_user_by_email(email, db)
        if not user:
            return None
        
        if not self._verify_password(password, user.hashed_password):
            return None
        
        if not user.is_active:
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        await db.commit()
        
        return user
    
    async def update_user(
        self,
        user_id: str,
        db: AsyncSession,
        **updates
    ) -> Optional[User]:
        """Update user information"""
        user = await self.get_user(user_id, db)
        if not user:
            return None
        
        # Handle password update separately
        if "password" in updates:
            updates["hashed_password"] = self._hash_password(updates.pop("password"))
        
        for key, value in updates.items():
            if hasattr(user, key) and key not in ["id", "created_at"]:
                setattr(user, key, value)
        
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(user)
        
        # Clear cache
        await cache_manager.delete(f"user:{user_id}")
        
        return user
    
    async def verify_email(
        self,
        token: str,
        db: AsyncSession
    ) -> bool:
        """Verify user email with token"""
        result = await db.execute(
            select(User).where(User.verification_token == token)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return False
        
        user.is_verified = True
        user.verification_token = None
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        
        # Clear cache
        await cache_manager.delete(f"user:{user.id}")
        
        return True
    
    async def request_password_reset(
        self,
        email: str,
        db: AsyncSession
    ) -> bool:
        """Request password reset"""
        user = await self.get_user_by_email(email, db)
        if not user:
            return False
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        
        await db.commit()
        
        # Send reset email
        await send_password_reset.delay(user.email, reset_token)
        
        return True
    
    async def reset_password(
        self,
        token: str,
        new_password: str,
        db: AsyncSession
    ) -> bool:
        """Reset password with token"""
        result = await db.execute(
            select(User).where(
                User.reset_token == token,
                User.reset_token_expires > datetime.utcnow()
            )
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return False
        
        user.hashed_password = self._hash_password(new_password)
        user.reset_token = None
        user.reset_token_expires = None
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        
        # Clear cache
        await cache_manager.delete(f"user:{user.id}")
        
        return True
    
    async def list_users(
        self,
        db: AsyncSession,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        is_verified: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[User]:
        """List users with filters"""
        query = select(User)
        
        if search:
            search_term = f"%{search}%"
            query = query.where(
                User.username.ilike(search_term) | User.email.ilike(search_term)
            )
        
        if is_active is not None:
            query = query.where(User.is_active == is_active)
        
        if is_verified is not None:
            query = query.where(User.is_verified == is_verified)
        
        query = query.order_by(User.created_at.desc())
        query = query.limit(limit).offset(offset)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def search_users(
        self,
        query_str: str,
        db: AsyncSession,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Search users by username or email"""
        search_term = f"%{query_str}%"
        
        result = await db.execute(
            select(User.id, User.username, User.email)
            .where(
                User.username.ilike(search_term) | User.email.ilike(search_term),
                User.is_active == True
            )
            .limit(limit)
        )
        
        return [
            {"id": row.id, "username": row.username, "email": row.email}
            for row in result
        ]
    
    async def get_user_stats(
        self,
        user_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Get user statistics"""
        user = await self.get_user(user_id, db)
        if not user:
            return {}
        
        # Get marketplace stats
        from src.services.marketplace import marketplace_service
        seller_stats = await marketplace_service.get_seller_stats(user_id, db)
        
        # Get wallet balance
        wallet_balance = await wallet_service.get_balance(user_id, db)
        
        # Get AI usage
        from src.services.ai import ai_service
        ai_usage = await ai_service.get_user_token_usage(user_id, db)
        
        return {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_verified": user.is_verified,
                "created_at": user.created_at.isoformat(),
                "last_login": user.last_login.isoformat() if user.last_login else None
            },
            "marketplace": seller_stats,
            "wallet": wallet_balance,
            "ai_usage": ai_usage
        }
    
    def create_access_token(self, user_id: str) -> str:
        """Create JWT access token"""
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        payload = {
            "sub": user_id,
            "exp": expire,
            "type": "access"
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, user_id: str) -> str:
        """Create JWT refresh token"""
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        payload = {
            "sub": user_id,
            "exp": expire,
            "type": "refresh"
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str, token_type: str = "access") -> Optional[str]:
        """Verify JWT token and return user_id"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            if payload.get("type") != token_type:
                return None
            return payload.get("sub")
        except jwt.JWTError:
            return None
    
    def _hash_password(self, password: str) -> str:
        """Hash password"""
        return pwd_context.hash(password)
    
    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password"""
        return pwd_context.verify(plain_password, hashed_password)
    
    async def delete_user(
        self,
        user_id: str,
        db: AsyncSession
    ) -> bool:
        """Soft delete user account"""
        user = await self.get_user(user_id, db)
        if not user:
            return False
        
        user.is_active = False
        user.deleted_at = datetime.utcnow()
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        
        # Clear cache
        await cache_manager.delete(f"user:{user_id}")
        
        return True
    
    async def get_user_preferences(
        self,
        user_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Get user preferences"""
        user = await self.get_user(user_id, db)
        if not user:
            return {}
        
        return user.preferences or {
            "notifications": {
                "email": True,
                "push": True,
                "sms": False
            },
            "privacy": {
                "profile_visible": True,
                "show_email": False
            },
            "display": {
                "theme": "light",
                "language": "en"
            }
        }
    
    async def update_user_preferences(
        self,
        user_id: str,
        preferences: Dict[str, Any],
        db: AsyncSession
    ) -> bool:
        """Update user preferences"""
        user = await self.get_user(user_id, db)
        if not user:
            return False
        
        user.preferences = preferences
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        
        # Clear cache
        await cache_manager.delete(f"user:{user_id}")
        
        return True


# Global user service instance
user_service = UserService()