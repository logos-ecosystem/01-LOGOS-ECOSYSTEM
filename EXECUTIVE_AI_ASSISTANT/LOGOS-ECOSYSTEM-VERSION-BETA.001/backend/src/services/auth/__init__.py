"""Authentication Service Module"""

from typing import Optional, Dict, Any, Tuple, List
from datetime import datetime, timedelta
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import redis
import json

from src.shared.models.user import User
from src.services.user import user_service
from src.shared.utils.logger import get_logger
from src.shared.utils.config import get_settings

settings = get_settings()
from src.infrastructure.database import get_db
from src.infrastructure.cache import cache_manager

logger = get_logger(__name__)

# Security scheme
security = HTTPBearer()


class AuthService:
    """Service for managing authentication"""
    
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL)
        self.session_expire_seconds = 3600 * 24  # 24 hours
    
    async def login(
        self,
        email: str,
        password: str,
        db: AsyncSession,
        device_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Authenticate user and create session"""
        # Authenticate user
        user = await user_service.authenticate_user(email, password, db)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled"
            )
        
        # Create tokens
        access_token = user_service.create_access_token(user.id)
        refresh_token = user_service.create_refresh_token(user.id)
        
        # Store session
        session_data = {
            "user_id": user.id,
            "email": user.email,
            "device_info": device_info or {},
            "created_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat()
        }
        
        session_key = f"session:{user.id}:{access_token[-8:]}"
        self.redis_client.setex(
            session_key,
            self.session_expire_seconds,
            json.dumps(session_data)
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_verified": user.is_verified
            }
        }
    
    async def register(
        self,
        username: str,
        email: str,
        password: str,
        db: AsyncSession,
        device_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Register new user"""
        try:
            # Create user
            user = await user_service.create_user(username, email, password, db)
            
            # Auto-login after registration
            return await self.login(email, password, db, device_info)
            
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    
    async def logout(self, token: str, user_id: str) -> bool:
        """Logout user and invalidate session"""
        # Remove session
        session_key = f"session:{user_id}:{token[-8:]}"
        self.redis_client.delete(session_key)
        
        # Add token to blacklist
        blacklist_key = f"blacklist:{token}"
        self.redis_client.setex(
            blacklist_key,
            self.session_expire_seconds,
            "1"
        )
        
        return True
    
    async def refresh_token(
        self,
        refresh_token: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Refresh access token"""
        # Verify refresh token
        user_id = user_service.verify_token(refresh_token, token_type="refresh")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Get user
        user = await user_service.get_user(user_id, db)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new access token
        access_token = user_service.create_access_token(user.id)
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    
    async def get_current_user(
        self,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncSession = Depends(get_db)
    ) -> User:
        """Get current authenticated user"""
        token = credentials.credentials
        
        # Check if token is blacklisted
        if self.redis_client.exists(f"blacklist:{token}"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked"
            )
        
        # Verify token
        user_id = user_service.verify_token(token)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        
        # Get user
        user = await user_service.get_user(user_id, db)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled"
            )
        
        # Update session activity
        session_key = f"session:{user_id}:{token[-8:]}"
        session_data = self.redis_client.get(session_key)
        if session_data:
            session = json.loads(session_data)
            session["last_activity"] = datetime.utcnow().isoformat()
            self.redis_client.setex(
                session_key,
                self.session_expire_seconds,
                json.dumps(session)
            )
        
        return user
    
    async def get_current_active_user(
        self,
        current_user: User = Depends(get_current_user)
    ) -> User:
        """Get current active user"""
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user"
            )
        return current_user
    
    async def get_current_verified_user(
        self,
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        """Get current verified user"""
        if not current_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not verified"
            )
        return current_user
    
    async def verify_email(
        self,
        token: str,
        db: AsyncSession
    ) -> bool:
        """Verify email with token"""
        return await user_service.verify_email(token, db)
    
    async def request_password_reset(
        self,
        email: str,
        db: AsyncSession
    ) -> bool:
        """Request password reset"""
        return await user_service.request_password_reset(email, db)
    
    async def reset_password(
        self,
        token: str,
        new_password: str,
        db: AsyncSession
    ) -> bool:
        """Reset password with token"""
        return await user_service.reset_password(token, new_password, db)
    
    async def change_password(
        self,
        user_id: str,
        current_password: str,
        new_password: str,
        db: AsyncSession
    ) -> bool:
        """Change user password"""
        user = await user_service.get_user(user_id, db)
        if not user:
            return False
        
        # Verify current password
        if not user_service._verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Update password
        await user_service.update_user(user_id, db, password=new_password)
        
        # Invalidate all sessions
        self._invalidate_user_sessions(user_id)
        
        return True
    
    def _invalidate_user_sessions(self, user_id: str):
        """Invalidate all user sessions"""
        # Find all user sessions
        pattern = f"session:{user_id}:*"
        for key in self.redis_client.scan_iter(match=pattern):
            self.redis_client.delete(key)
    
    async def get_user_sessions(
        self,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """Get all active user sessions"""
        sessions = []
        pattern = f"session:{user_id}:*"
        
        for key in self.redis_client.scan_iter(match=pattern):
            session_data = self.redis_client.get(key)
            if session_data:
                session = json.loads(session_data)
                session["session_id"] = key.decode().split(":")[-1]
                sessions.append(session)
        
        return sessions
    
    async def revoke_session(
        self,
        user_id: str,
        session_id: str
    ) -> bool:
        """Revoke specific user session"""
        session_key = f"session:{user_id}:{session_id}"
        return bool(self.redis_client.delete(session_key))
    
    async def check_permission(
        self,
        user: User,
        permission: str
    ) -> bool:
        """Check if user has specific permission"""
        # Simple role-based permission check
        # Can be extended with more complex permission system
        if user.role == "admin":
            return True
        
        user_permissions = {
            "user": ["read:own", "write:own"],
            "moderator": ["read:own", "write:own", "read:all"],
            "seller": ["read:own", "write:own", "sell:items"]
        }
        
        role_permissions = user_permissions.get(user.role, [])
        return permission in role_permissions
    
    def require_permission(self, permission: str):
        """Decorator to require specific permission"""
        async def permission_checker(
            current_user: User = Depends(self.get_current_active_user)
        ):
            if not await self.check_permission(current_user, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
            return current_user
        return permission_checker


# Global auth service instance
auth_service = AuthService()

# Dependency shortcuts
get_current_user = auth_service.get_current_user
get_current_active_user = auth_service.get_current_active_user
get_current_verified_user = auth_service.get_current_verified_user
require_permission = auth_service.require_permission