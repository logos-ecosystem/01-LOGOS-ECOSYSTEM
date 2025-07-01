from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_-]+$")
    password: str = Field(..., min_length=8, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one digit")
        if not any(char.isupper() for char in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.islower() for char in v):
            raise ValueError("Password must contain at least one lowercase letter")
        return v


class UserLogin(BaseModel):
    """Schema for user login."""
    username: str
    password: str


class UserResponse(BaseModel):
    """Schema for user response."""
    id: uuid.UUID
    email: EmailStr
    username: str
    full_name: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    is_verified: bool
    is_premium: bool
    is_admin: bool
    created_at: datetime
    last_login_at: Optional[datetime]
    ai_tokens_used: int
    ai_monthly_limit: int
    
    model_config = {
        "from_attributes": True
    }


class TokenResponse(BaseModel):
    """Schema for token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class PasswordReset(BaseModel):
    """Schema for password reset request."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation."""
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """Schema for user profile update."""
    full_name: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, max_length=500)
    preferences: Optional[Dict[str, Any]] = None
    notification_settings: Optional[Dict[str, bool]] = None


class RoleCreate(BaseModel):
    """Role creation schema."""
    name: str = Field(..., min_length=3, max_length=50)
    description: str = Field(..., max_length=500)
    hierarchy_level: int = Field(default=100, ge=0, le=1000)
    permissions: List[str] = Field(default=[], description="List of permission names")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v.replace('_', '').isalnum():
            raise ValueError('Role name must be alphanumeric with underscores only')
        return v.lower()


class RoleUpdate(BaseModel):
    """Role update schema."""
    description: Optional[str] = Field(None, max_length=500)
    hierarchy_level: Optional[int] = Field(None, ge=0, le=1000)
    permissions: Optional[List[str]] = Field(None, description="List of permission names")


class PermissionCreate(BaseModel):
    """Permission creation schema."""
    name: str = Field(..., min_length=3, max_length=100)
    resource: str = Field(..., min_length=1, max_length=100)
    action: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        # Format: resource.action or resource.subresource.action
        parts = v.split('.')
        if len(parts) < 2 or len(parts) > 3:
            raise ValueError('Permission name must follow format: resource.action or resource.subresource.action')
        return v.lower()


class UserRoleAssignment(BaseModel):
    """User role assignment schema."""
    user_id: uuid.UUID = Field(..., description="User ID")
    role_name: str = Field(..., description="Role name to assign/remove")