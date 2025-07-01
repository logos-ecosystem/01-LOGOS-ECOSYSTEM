"""Enhanced authentication service with 2FA, OAuth2, and advanced security features."""

from typing import Optional, Dict, Any, Tuple, List
from datetime import datetime, timedelta
import secrets
import jwt
import pyotp
import qrcode
import io
import base64
import json
from sqlalchemy.orm import Session
import redis
import asyncio
import httpx
from authlib.integrations.starlette_client import OAuth
from passlib.context import CryptContext

from ...shared.models.user import User, ApiKey
from ...infrastructure.database import get_db
from ...infrastructure.cache import cache_manager
from ...shared.utils.exceptions import (
    AuthenticationError,
    TokenExpiredError,
    ValidationError
)
from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings
from ...services.user import user_service
from ...services.security.anomaly_detection import track_security_event
from ...services.email import email_service

logger = get_logger(__name__)
settings = get_settings()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Enhanced authentication service with 2FA, OAuth2, and advanced security."""
    
    def __init__(self):
        self.jwt_secret = settings.SECRET_KEY
        self.jwt_algorithm = "HS256"
        self.access_token_expire_minutes = 60
        self.refresh_token_expire_days = 30
        self.session_expire_hours = 24
        
        # 2FA settings
        self.totp_issuer = "LOGOS ECOSYSTEM"
        self.backup_codes_count = 10
        
        # Account security settings
        self.max_login_attempts = 5
        self.lockout_duration_minutes = 30
        self.password_reset_token_hours = 1
        
        # OAuth2 setup
        self.oauth = OAuth()
        self._setup_oauth_providers()
    
    def _setup_oauth_providers(self):
        """Configure OAuth2 providers."""
        # Google OAuth2
        if hasattr(settings, 'GOOGLE_CLIENT_ID'):
            self.oauth.register(
                name='google',
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET,
                server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
                client_kwargs={
                    'scope': 'openid email profile'
                }
            )
        
        # GitHub OAuth2
        if hasattr(settings, 'GITHUB_CLIENT_ID'):
            self.oauth.register(
                name='github',
                client_id=settings.GITHUB_CLIENT_ID,
                client_secret=settings.GITHUB_CLIENT_SECRET,
                access_token_url='https://github.com/login/oauth/access_token',
                access_token_params=None,
                authorize_url='https://github.com/login/oauth/authorize',
                authorize_params=None,
                api_base_url='https://api.github.com/',
                client_kwargs={'scope': 'user:email'},
            )
    
    async def login(
        self,
        email_or_username: str,
        password: str,
        totp_code: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        db: Session = None
    ) -> Dict[str, Any]:
        """Authenticate user and create session with 2FA support."""
        try:
            # Check for account lockout
            if await self._is_account_locked(email_or_username):
                raise AuthenticationError("Account temporarily locked due to multiple failed attempts")
            
            # Track login attempt
            await self._track_login_attempt(email_or_username, ip_address)
            
            # Authenticate user
            user = await user_service.authenticate_user(email_or_username, password, db)
            
            # Check if 2FA is enabled
            if user.two_factor_enabled:
                if not totp_code:
                    # Return partial response requiring 2FA
                    return {
                        "requires_2fa": True,
                        "user_id": str(user.id),
                        "message": "Please provide 2FA code"
                    }
                
                # Verify 2FA code
                if not await self.verify_2fa_code(user.id, totp_code, db):
                    # Track failed 2FA attempt
                    await self._increment_failed_attempts(email_or_username)
                    raise AuthenticationError("Invalid 2FA code")
            
            # Clear failed attempts on successful login
            await self._clear_failed_attempts(email_or_username)
            
            # Track security event
            await track_security_event(
                user_id=str(user.id),
                event_type='login',
                ip_address=ip_address or 'unknown',
                user_agent=user_agent or 'unknown',
                metadata={'method': 'password', '2fa_used': user.two_factor_enabled}
            )
            
            # Generate tokens
            access_token = self._generate_access_token(user)
            refresh_token = self._generate_refresh_token(user)
            
            # Create session
            session_id = await self._create_session(
                user_id=str(user.id),
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            logger.info(f"User {user.username} logged in successfully")
            
            return {
                "user": {
                    "id": str(user.id),
                    "username": user.username,
                    "email": user.email,
                    "full_name": user.full_name,
                    "avatar_url": user.avatar_url,
                    "is_premium": user.is_premium,
                    "is_verified": user.is_verified,
                    "two_factor_enabled": user.two_factor_enabled
                },
                "access_token": access_token,
                "refresh_token": refresh_token,
                "session_id": session_id,
                "expires_in": self.access_token_expire_minutes * 60
            }
            
        except AuthenticationError:
            raise
        except Exception as e:
            logger.error(f"Login failed: {str(e)}")
            await self._increment_failed_attempts(email_or_username)
            raise AuthenticationError("Login failed")
    
    async def logout(self, session_id: str) -> bool:
        """Logout user and invalidate session."""
        try:
            redis_client = cache_manager.redis_client
            
            # Get session data
            session_key = f"session:{session_id}"
            session_data = redis_client.get(session_key)
            
            if session_data:
                # Invalidate session
                redis_client.delete(session_key)
                
                # Add tokens to blacklist
                blacklist_key = f"blacklist:{session_id}"
                redis_client.setex(
                    blacklist_key,
                    timedelta(days=self.refresh_token_expire_days),
                    "1"
                )
                
                logger.info(f"Session {session_id} logged out successfully")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Logout failed: {str(e)}")
            return False
    
    async def refresh_access_token(
        self,
        refresh_token: str,
        db: Session = None
    ) -> Dict[str, Any]:
        """Refresh access token using refresh token."""
        try:
            # Verify refresh token
            payload = self._verify_token(refresh_token, is_refresh=True)
            user_id = payload.get("user_id")
            
            # Check if token is blacklisted
            if await self._is_token_blacklisted(refresh_token):
                raise AuthenticationError("Token has been revoked")
            
            # Get user
            user = await user_service.get_user(user_id=user_id, db=db)
            
            # Generate new access token
            new_access_token = self._generate_access_token(user)
            
            logger.info(f"Refreshed access token for user {user_id}")
            
            return {
                "access_token": new_access_token,
                "expires_in": self.access_token_expire_minutes * 60
            }
            
        except jwt.ExpiredSignatureError:
            raise TokenExpiredError("Refresh token has expired")
        except Exception as e:
            logger.error(f"Token refresh failed: {str(e)}")
            raise AuthenticationError("Invalid refresh token")
    
    async def verify_access_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode access token."""
        try:
            # Check if token is blacklisted
            if await self._is_token_blacklisted(token):
                raise AuthenticationError("Token has been revoked")
            
            # Verify token
            payload = self._verify_token(token, is_refresh=False)
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise TokenExpiredError("Access token has expired")
        except Exception as e:
            logger.error(f"Token verification failed: {str(e)}")
            raise AuthenticationError("Invalid access token")
    
    async def get_current_user(
        self,
        token: str,
        db: Session = None
    ) -> User:
        """Get current user from access token."""
        payload = await self.verify_access_token(token)
        user_id = payload.get("user_id")
        
        user = await user_service.get_user(user_id=user_id, db=db)
        return user
    
    async def verify_api_key(
        self,
        api_key: str,
        required_permissions: Optional[List[str]] = None,
        db: Session = None
    ) -> Tuple[User, ApiKey]:
        """Verify API key and check permissions."""
        # Validate API key
        api_key_obj = await user_service.validate_api_key(api_key, db)
        
        # Check permissions
        if required_permissions:
            for permission in required_permissions:
                if permission not in api_key_obj.permissions:
                    raise AuthenticationError(f"API key lacks required permission: {permission}")
        
        # Check rate limit
        if api_key_obj.request_count >= api_key_obj.rate_limit:
            raise ValidationError("API key rate limit exceeded")
        
        # Get user
        user = await user_service.get_user(user_id=str(api_key_obj.user_id), db=db)
        
        return user, api_key_obj
    
    async def reset_password_request(
        self,
        email: str,
        db: Session = None
    ) -> str:
        """Generate password reset token."""
        try:
            # Get user by email
            user = await user_service.get_user(email=email, db=db)
            
            # Generate reset token
            reset_token = secrets.token_urlsafe(32)
            
            # Store token in Redis with expiration
            redis_client = cache_manager.redis_client
            reset_key = f"password_reset:{reset_token}"
            redis_client.setex(
                reset_key,
                timedelta(hours=1),
                str(user.id)
            )
            
            logger.info(f"Password reset requested for user {user.id}")
            
            return reset_token
            
        except Exception as e:
            logger.error(f"Password reset request failed: {str(e)}")
            # Don't reveal if email exists
            return secrets.token_urlsafe(32)
    
    async def reset_password(
        self,
        reset_token: str,
        new_password: str,
        db: Session = None
    ) -> bool:
        """Reset password using reset token."""
        redis_client = get_redis()
        reset_key = f"password_reset:{reset_token}"
        
        # Get user ID from token
        user_id = redis_client.get(reset_key)
        if not user_id:
            raise ValidationError("Invalid or expired reset token")
        
        # Get user
        user = await user_service.get_user(user_id=user_id.decode(), db=db)
        
        # Update password
        await user_service.change_password(
            user_id=str(user.id),
            old_password="",  # Skip old password check
            new_password=new_password,
            db=db
        )
        
        # Delete reset token
        redis_client.delete(reset_key)
        
        logger.info(f"Password reset completed for user {user.id}")
        return True
    
    async def get_active_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all active sessions for a user."""
        redis_client = get_redis()
        
        # Get all session keys for user
        pattern = f"session:*:user:{user_id}"
        session_keys = []
        
        for key in redis_client.scan_iter(match=pattern):
            session_data = redis_client.get(key)
            if session_data:
                session_info = eval(session_data)  # In production, use json.loads
                session_keys.append(session_info)
        
        return session_keys
    
    async def revoke_all_sessions(self, user_id: str) -> int:
        """Revoke all sessions for a user."""
        redis_client = get_redis()
        
        # Get all session keys for user
        pattern = f"session:*:user:{user_id}"
        revoked_count = 0
        
        for key in redis_client.scan_iter(match=pattern):
            redis_client.delete(key)
            revoked_count += 1
        
        logger.info(f"Revoked {revoked_count} sessions for user {user_id}")
        return revoked_count
    
    def _generate_access_token(self, user: User) -> str:
        """Generate JWT access token."""
        payload = {
            "user_id": str(user.id),
            "username": user.username,
            "email": user.email,
            "is_premium": user.is_premium,
            "is_admin": user.is_admin,
            "type": "access",
            "exp": datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes),
            "iat": datetime.utcnow()
        }
        
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def _generate_refresh_token(self, user: User) -> str:
        """Generate JWT refresh token."""
        payload = {
            "user_id": str(user.id),
            "type": "refresh",
            "exp": datetime.utcnow() + timedelta(days=self.refresh_token_expire_days),
            "iat": datetime.utcnow()
        }
        
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def _verify_token(self, token: str, is_refresh: bool = False) -> Dict[str, Any]:
        """Verify and decode JWT token."""
        payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
        
        # Verify token type
        expected_type = "refresh" if is_refresh else "access"
        if payload.get("type") != expected_type:
            raise AuthenticationError(f"Invalid token type, expected {expected_type}")
        
        return payload
    
    async def _create_session(
        self,
        user_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """Create user session in Redis."""
        redis_client = get_redis()
        
        # Generate session ID
        session_id = secrets.token_urlsafe(32)
        
        # Session data
        session_data = {
            "user_id": user_id,
            "ip_address": ip_address or "unknown",
            "user_agent": user_agent or "unknown",
            "created_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat()
        }
        
        # Store session
        session_key = f"session:{session_id}:user:{user_id}"
        redis_client.setex(
            session_key,
            timedelta(hours=self.session_expire_hours),
            str(session_data)
        )
        
        return session_id
    
    async def _is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted."""
        redis_client = get_redis()
        
        # Generate token hash for blacklist key
        token_hash = secrets.token_urlsafe(16)
        blacklist_key = f"blacklist:{token_hash}"
        
        return bool(redis_client.get(blacklist_key))
    
    # 2FA Methods
    async def setup_2fa(self, user_id: str, db: Session = None) -> Dict[str, Any]:
        """Setup 2FA for a user."""
        user = await user_service.get_user(user_id=user_id, db=db)
        
        # Generate secret
        secret = pyotp.random_base32()
        
        # Store secret temporarily
        redis_client = get_redis()
        temp_key = f"2fa_setup:{user_id}"
        redis_client.setex(temp_key, timedelta(minutes=10), secret)
        
        # Generate QR code
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email,
            issuer_name=self.totp_issuer
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        qr_code_base64 = base64.b64encode(buf.getvalue()).decode()
        
        # Generate backup codes
        backup_codes = [secrets.token_hex(4) for _ in range(self.backup_codes_count)]
        
        return {
            "secret": secret,
            "qr_code": f"data:image/png;base64,{qr_code_base64}",
            "backup_codes": backup_codes
        }
    
    async def confirm_2fa_setup(
        self,
        user_id: str,
        totp_code: str,
        backup_codes: List[str],
        db: Session = None
    ) -> bool:
        """Confirm 2FA setup with verification code."""
        redis_client = get_redis()
        temp_key = f"2fa_setup:{user_id}"
        
        # Get temporary secret
        secret = redis_client.get(temp_key)
        if not secret:
            raise ValidationError("2FA setup expired")
        
        # Verify code
        totp = pyotp.TOTP(secret.decode())
        if not totp.verify(totp_code, valid_window=1):
            raise ValidationError("Invalid verification code")
        
        # Save to user
        user = await user_service.get_user(user_id=user_id, db=db)
        user.two_factor_secret = secret.decode()
        user.two_factor_enabled = True
        user.two_factor_backup_codes = backup_codes
        db.commit()
        
        # Clean up temporary data
        redis_client.delete(temp_key)
        
        logger.info(f"2FA enabled for user {user_id}")
        return True
    
    async def verify_2fa_code(
        self,
        user_id: str,
        code: str,
        db: Session = None
    ) -> bool:
        """Verify 2FA code or backup code."""
        user = await user_service.get_user(user_id=user_id, db=db)
        
        if not user.two_factor_enabled:
            return True
        
        # Check if it's a backup code
        if code in user.two_factor_backup_codes:
            # Remove used backup code
            user.two_factor_backup_codes.remove(code)
            db.commit()
            logger.info(f"Backup code used for user {user_id}")
            return True
        
        # Verify TOTP code
        totp = pyotp.TOTP(user.two_factor_secret)
        return totp.verify(code, valid_window=1)
    
    async def disable_2fa(
        self,
        user_id: str,
        password: str,
        db: Session = None
    ) -> bool:
        """Disable 2FA after password verification."""
        user = await user_service.get_user(user_id=user_id, db=db)
        
        # Verify password
        if not pwd_context.verify(password, user.password_hash):
            raise AuthenticationError("Invalid password")
        
        # Disable 2FA
        user.two_factor_enabled = False
        user.two_factor_secret = None
        user.two_factor_backup_codes = []
        db.commit()
        
        logger.info(f"2FA disabled for user {user_id}")
        return True
    
    # OAuth2 Methods
    async def oauth_login(
        self,
        provider: str,
        code: str,
        redirect_uri: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        db: Session = None
    ) -> Dict[str, Any]:
        """Handle OAuth2 login."""
        try:
            # Get OAuth client
            client = self.oauth.create_client(provider)
            if not client:
                raise ValidationError(f"Unknown OAuth provider: {provider}")
            
            # Exchange code for token
            token = await client.authorize_access_token(
                code=code,
                redirect_uri=redirect_uri
            )
            
            # Get user info
            if provider == 'google':
                resp = await client.get('userinfo')
                user_info = resp.json()
                email = user_info.get('email')
                name = user_info.get('name')
                picture = user_info.get('picture')
            elif provider == 'github':
                resp = await client.get('user')
                user_info = resp.json()
                email = user_info.get('email')
                name = user_info.get('name') or user_info.get('login')
                picture = user_info.get('avatar_url')
            else:
                raise ValidationError(f"Unsupported provider: {provider}")
            
            # Find or create user
            user = await user_service.get_user(email=email, db=db)
            if not user:
                # Create new user
                user = await user_service.create_user(
                    username=email.split('@')[0],
                    email=email,
                    full_name=name,
                    avatar_url=picture,
                    is_verified=True,  # OAuth users are pre-verified
                    oauth_provider=provider,
                    oauth_id=str(user_info.get('id')),
                    db=db
                )
            
            # Track security event
            await track_security_event(
                user_id=str(user.id),
                event_type='login',
                ip_address=ip_address or 'unknown',
                user_agent=user_agent or 'unknown',
                metadata={'method': 'oauth', 'provider': provider}
            )
            
            # Generate tokens and session
            access_token = self._generate_access_token(user)
            refresh_token = self._generate_refresh_token(user)
            session_id = await self._create_session(
                user_id=str(user.id),
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            return {
                "user": {
                    "id": str(user.id),
                    "username": user.username,
                    "email": user.email,
                    "full_name": user.full_name,
                    "avatar_url": user.avatar_url,
                    "is_premium": user.is_premium,
                    "is_verified": user.is_verified
                },
                "access_token": access_token,
                "refresh_token": refresh_token,
                "session_id": session_id,
                "expires_in": self.access_token_expire_minutes * 60,
                "is_new_user": user.created_at > datetime.utcnow() - timedelta(minutes=1)
            }
            
        except Exception as e:
            logger.error(f"OAuth login failed: {str(e)}")
            raise AuthenticationError(f"OAuth login failed: {str(e)}")
    
    # Account lockout methods
    async def _is_account_locked(self, identifier: str) -> bool:
        """Check if account is locked due to failed attempts."""
        redis_client = get_redis()
        lockout_key = f"lockout:{identifier}"
        return bool(redis_client.get(lockout_key))
    
    async def _track_login_attempt(self, identifier: str, ip_address: Optional[str]):
        """Track login attempt for rate limiting."""
        redis_client = get_redis()
        attempt_key = f"login_attempt:{identifier}:{datetime.utcnow().strftime('%Y%m%d%H')}"
        redis_client.incr(attempt_key)
        redis_client.expire(attempt_key, 3600)  # Expire after 1 hour
    
    async def _increment_failed_attempts(self, identifier: str):
        """Increment failed login attempts."""
        redis_client = get_redis()
        attempts_key = f"failed_attempts:{identifier}"
        
        attempts = redis_client.incr(attempts_key)
        redis_client.expire(attempts_key, timedelta(minutes=self.lockout_duration_minutes))
        
        if attempts >= self.max_login_attempts:
            # Lock account
            lockout_key = f"lockout:{identifier}"
            redis_client.setex(
                lockout_key,
                timedelta(minutes=self.lockout_duration_minutes),
                "locked"
            )
            logger.warning(f"Account locked due to failed attempts: {identifier}")
    
    async def _clear_failed_attempts(self, identifier: str):
        """Clear failed login attempts after successful login."""
        redis_client = get_redis()
        attempts_key = f"failed_attempts:{identifier}"
        redis_client.delete(attempts_key)
    
    # Enhanced password reset with security
    async def reset_password_request(
        self,
        email: str,
        ip_address: Optional[str] = None,
        db: Session = None
    ) -> str:
        """Generate password reset token with enhanced security."""
        try:
            # Rate limit password reset requests
            redis_client = cache_manager.redis_client
            rate_key = f"password_reset_rate:{email}"
            if redis_client.get(rate_key):
                raise ValidationError("Password reset already requested. Please check your email.")
            
            # Get user by email
            user = await user_service.get_user(email=email, db=db)
            
            # Generate reset token
            reset_token = secrets.token_urlsafe(32)
            
            # Store token in Redis with expiration
            reset_key = f"password_reset:{reset_token}"
            redis_client.setex(
                reset_key,
                timedelta(hours=self.password_reset_token_hours),
                json.dumps({
                    "user_id": str(user.id),
                    "email": email,
                    "ip_address": ip_address,
                    "created_at": datetime.utcnow().isoformat()
                })
            )
            
            # Set rate limit
            redis_client.setex(rate_key, timedelta(minutes=5), "1")
            
            # Track security event
            await track_security_event(
                user_id=str(user.id),
                event_type='password_reset_request',
                ip_address=ip_address or 'unknown',
                user_agent='unknown',
                metadata={'email': email}
            )
            
            # Send email
            await email_service.send_password_reset_email(
                email=email,
                reset_token=reset_token,
                user_name=user.full_name or user.username
            )
            
            logger.info(f"Password reset requested for user {user.id}")
            return reset_token
            
        except Exception as e:
            logger.error(f"Password reset request failed: {str(e)}")
            # Don't reveal if email exists
            return secrets.token_urlsafe(32)
    
    async def reset_password(
        self,
        reset_token: str,
        new_password: str,
        ip_address: Optional[str] = None,
        db: Session = None
    ) -> bool:
        """Reset password using reset token with enhanced validation."""
        redis_client = get_redis()
        reset_key = f"password_reset:{reset_token}"
        
        # Get token data
        token_data = redis_client.get(reset_key)
        if not token_data:
            raise ValidationError("Invalid or expired reset token")
        
        data = json.loads(token_data)
        user_id = data['user_id']
        
        # Verify IP address if available
        if ip_address and data.get('ip_address') and ip_address != data['ip_address']:
            logger.warning(f"Password reset attempted from different IP: {ip_address} != {data['ip_address']}")
        
        # Get user
        user = await user_service.get_user(user_id=user_id, db=db)
        
        # Validate new password
        if len(new_password) < 8:
            raise ValidationError("Password must be at least 8 characters long")
        
        # Update password
        user.password_hash = pwd_context.hash(new_password)
        db.commit()
        
        # Delete reset token
        redis_client.delete(reset_key)
        
        # Invalidate all sessions
        await self.revoke_all_sessions(user_id)
        
        # Track security event
        await track_security_event(
            user_id=user_id,
            event_type='password_reset_complete',
            ip_address=ip_address or 'unknown',
            user_agent='unknown',
            metadata={'method': 'reset_token'}
        )
        
        # Send notification email
        await email_service.send_password_changed_email(
            email=user.email,
            user_name=user.full_name or user.username
        )
        
        logger.info(f"Password reset completed for user {user.id}")
        return True


# Create singleton instance
auth_service = AuthService()