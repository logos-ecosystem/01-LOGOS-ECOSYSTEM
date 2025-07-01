from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Dict, Any
import uuid

from ...infrastructure.database import get_db
from ...shared.models.user import User
from ...shared.utils.logger import get_logger
from ..schemas.auth import UserResponse, UserUpdate
from .auth import get_current_user

router = APIRouter()
logger = get_logger(__name__)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get user profile by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.put("/me", response_model=UserResponse)
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Update current user profile."""
    update_data = user_update.dict(exclude_unset=True)
    
    if update_data:
        for field, value in update_data.items():
            setattr(current_user, field, value)
        
        await db.commit()
        await db.refresh(current_user)
    
    return current_user


@router.get("/me/stats")
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get current user statistics."""
    return {
        "ai_usage": {
            "tokens_used": current_user.ai_tokens_used,
            "tokens_remaining": current_user.ai_monthly_limit - current_user.ai_tokens_used,
            "requests_count": current_user.ai_requests_count,
            "monthly_limit": current_user.ai_monthly_limit
        },
        "account": {
            "is_verified": current_user.is_verified,
            "is_premium": current_user.is_premium,
            "created_at": current_user.created_at,
            "last_login_at": current_user.last_login_at
        }
    }