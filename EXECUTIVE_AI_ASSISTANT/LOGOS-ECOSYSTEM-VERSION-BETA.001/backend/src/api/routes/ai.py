from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Dict, Any, Optional
from anthropic import AsyncAnthropic
from datetime import datetime
import uuid

from ...infrastructure.database import get_db
from ...infrastructure.cache import cache_manager
from ...shared.models.user import User
from ...shared.models.ai import AISession, AIMessage, AIPromptTemplate, AIModel
from ...shared.utils.config import get_settings
from ...shared.utils.logger import get_logger
from ..schemas.ai import (
    AISessionCreate, AISessionResponse, AIMessageCreate, 
    AIMessageResponse, StreamResponse, PromptTemplateResponse
)
from .auth import get_current_user

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()

# Initialize Claude client
claude_client = AsyncAnthropic(api_key=settings.CLAUDE_API_KEY) if settings.CLAUDE_API_KEY else None


async def check_user_ai_limits(user: User, tokens_needed: int = 0) -> bool:
    """Check if user has remaining AI tokens."""
    if user.is_admin:
        return True
    
    if user.ai_tokens_used + tokens_needed > user.ai_monthly_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Monthly AI token limit exceeded"
        )
    return True


@router.post("/sessions", response_model=AISessionResponse)
async def create_session(
    session_data: AISessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> AISession:
    """Create a new AI conversation session."""
    session = AISession(
        user_id=current_user.id,
        title=session_data.title or "New Conversation",
        model=session_data.model or settings.CLAUDE_MODEL,
        temperature=session_data.temperature or settings.TEMPERATURE,
        max_tokens=session_data.max_tokens or settings.MAX_TOKENS,
        system_prompt=session_data.system_prompt
    )
    
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    logger.info(f"Created AI session {session.id} for user {current_user.username}")
    return session


@router.get("/sessions", response_model=List[AISessionResponse])
async def list_sessions(
    limit: int = 20,
    offset: int = 0,
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[AISession]:
    """List user's AI sessions."""
    query = select(AISession).where(AISession.user_id == current_user.id)
    
    if not include_archived:
        query = query.where(AISession.is_archived == False)
    
    query = query.order_by(AISession.updated_at.desc()).limit(limit).offset(offset)
    
    result = await db.execute(query)
    sessions = result.scalars().all()
    
    return sessions


@router.get("/sessions/{session_id}", response_model=AISessionResponse)
async def get_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> AISession:
    """Get a specific AI session with messages."""
    result = await db.execute(
        select(AISession).where(
            and_(
                AISession.id == session_id,
                AISession.user_id == current_user.id
            )
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return session


@router.post("/sessions/{session_id}/messages", response_model=AIMessageResponse)
async def send_message(
    session_id: uuid.UUID,
    message_data: AIMessageCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> AIMessage:
    """Send a message to Claude and get response."""
    if not claude_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service not configured"
        )
    
    # Get session
    result = await db.execute(
        select(AISession).where(
            and_(
                AISession.id == session_id,
                AISession.user_id == current_user.id
            )
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check user limits
    await check_user_ai_limits(current_user, tokens_needed=1000)  # Estimate
    
    # Create user message
    user_message = AIMessage(
        session_id=session_id,
        role="user",
        content=message_data.content,
        model_used=session.model
    )
    db.add(user_message)
    
    try:
        # Get conversation history
        messages_result = await db.execute(
            select(AIMessage)
            .where(AIMessage.session_id == session_id)
            .order_by(AIMessage.created_at)
            .limit(50)  # Last 50 messages
        )
        history = messages_result.scalars().all()
        
        # Prepare messages for Claude
        claude_messages = []
        
        for msg in history:
            claude_messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        claude_messages.append({
            "role": "user",
            "content": message_data.content
        })
        
        # Call Claude API
        start_time = datetime.utcnow()
        
        kwargs = {
            "model": session.model,
            "messages": claude_messages,
            "max_tokens": session.max_tokens,
            "temperature": session.temperature
        }
        
        if session.system_prompt:
            kwargs["system"] = session.system_prompt
            
        response = await claude_client.messages.create(**kwargs)
        processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        # Create assistant message
        assistant_message = AIMessage(
            session_id=session_id,
            role="assistant",
            content=response.content[0].text,
            model_used=session.model,
            prompt_tokens=response.usage.input_tokens,
            completion_tokens=response.usage.output_tokens,
            total_tokens=response.usage.input_tokens + response.usage.output_tokens,
            processing_time_ms=processing_time
        )
        db.add(assistant_message)
        
        # Update session stats
        session.total_messages += 2
        session.total_tokens += assistant_message.total_tokens
        session.last_message_at = datetime.utcnow()
        
        # Update user stats
        current_user.ai_tokens_used += assistant_message.total_tokens
        current_user.ai_requests_count += 1
        
        await db.commit()
        await db.refresh(assistant_message)
        
        # Cache response
        cache_key = f"ai:response:{session_id}:{user_message.id}"
        await cache_manager.set(cache_key, assistant_message.content, ttl=3600)
        
        logger.info(
            f"AI response generated for session {session_id}, "
            f"tokens: {assistant_message.total_tokens}, "
            f"time: {processing_time}ms"
        )
        
        return assistant_message
        
    except Exception as e:
        logger.error(f"Error generating AI response: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate AI response"
        )


@router.get("/models", response_model=List[Dict[str, Any]])
async def list_models(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """List available AI models."""
    query = select(AIModel).where(AIModel.is_available == True)
    
    if not current_user.is_premium:
        query = query.where(AIModel.requires_premium == False)
    
    result = await db.execute(query)
    models = result.scalars().all()
    
    return [
        {
            "model_id": model.model_id,
            "name": model.name,
            "provider": model.provider,
            "description": model.description,
            "max_tokens": model.max_tokens,
            "context_window": model.context_window,
            "supports_vision": model.supports_vision,
            "supports_tools": model.supports_tools,
            "pricing": {
                "input_per_1k": model.input_token_price,
                "output_per_1k": model.output_token_price
            }
        }
        for model in models
    ]


@router.get("/templates", response_model=List[PromptTemplateResponse])
async def list_templates(
    category: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[AIPromptTemplate]:
    """List available prompt templates."""
    query = select(AIPromptTemplate).where(
        (AIPromptTemplate.is_public == True) | 
        (AIPromptTemplate.created_by_id == current_user.id)
    )
    
    if category:
        query = query.where(AIPromptTemplate.category == category)
    
    query = query.order_by(AIPromptTemplate.usage_count.desc()).limit(limit).offset(offset)
    
    result = await db.execute(query)
    templates = result.scalars().all()
    
    return templates


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, str]:
    """Delete an AI session."""
    result = await db.execute(
        select(AISession).where(
            and_(
                AISession.id == session_id,
                AISession.user_id == current_user.id
            )
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    await db.delete(session)
    await db.commit()
    
    # Invalidate cache
    await cache_manager.invalidate_pattern(f"ai:*:{session_id}:*")
    
    logger.info(f"Deleted AI session {session_id}")
    return {"message": "Session deleted successfully"}