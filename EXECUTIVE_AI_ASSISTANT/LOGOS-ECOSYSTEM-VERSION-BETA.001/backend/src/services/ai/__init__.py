"""AI Service Module - Claude Opus 4 Integration"""

from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime
import json
import uuid
from anthropic import AsyncAnthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.shared.models.ai import AISession as AIConversation, AIMessage
from src.shared.utils.logger import get_logger
from src.shared.utils.config import get_settings
settings = get_settings()
from src.infrastructure.cache import cache_manager

logger = get_logger(__name__)


class AIService:
    """Service for managing AI interactions with Claude Opus 4"""
    
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-3-opus-20240229"
        self.max_tokens = 4096
        self.temperature = 0.7
        
    async def create_conversation(
        self,
        user_id: str,
        title: Optional[str] = None,
        db: AsyncSession = None
    ) -> AIConversation:
        """Create a new AI conversation"""
        conversation = AIConversation(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title or "New Conversation",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            message_count=0,
            total_tokens=0
        )
        
        if db:
            db.add(conversation)
            await db.commit()
            await db.refresh(conversation)
            
        return conversation
    
    async def get_conversation(
        self,
        conversation_id: str,
        user_id: str,
        db: AsyncSession
    ) -> Optional[AIConversation]:
        """Get a conversation by ID"""
        result = await db.execute(
            select(AIConversation).where(
                AIConversation.id == conversation_id,
                AIConversation.user_id == user_id
            )
        )
        return result.scalar_one_or_none()
    
    async def list_conversations(
        self,
        user_id: str,
        db: AsyncSession,
        limit: int = 50,
        offset: int = 0
    ) -> List[AIConversation]:
        """List user's conversations"""
        result = await db.execute(
            select(AIConversation)
            .where(AIConversation.user_id == user_id)
            .order_by(AIConversation.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()
    
    async def get_conversation_messages(
        self,
        conversation_id: str,
        user_id: str,
        db: AsyncSession,
        limit: int = 100
    ) -> List[AIMessage]:
        """Get messages for a conversation"""
        # Verify conversation ownership
        conversation = await self.get_conversation(conversation_id, user_id, db)
        if not conversation:
            return []
            
        result = await db.execute(
            select(AIMessage)
            .where(AIMessage.conversation_id == conversation_id)
            .order_by(AIMessage.created_at)
            .limit(limit)
        )
        return result.scalars().all()
    
    async def send_message(
        self,
        conversation_id: str,
        user_id: str,
        content: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Send a message to the AI and get a response"""
        # Verify conversation ownership
        conversation = await self.get_conversation(conversation_id, user_id, db)
        if not conversation:
            raise ValueError("Conversation not found")
        
        # Create user message
        user_message = AIMessage(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role="user",
            content=content,
            created_at=datetime.utcnow()
        )
        db.add(user_message)
        
        # Get conversation history for context
        messages = await self.get_conversation_messages(
            conversation_id, user_id, db, limit=20
        )
        
        # Prepare messages for Claude
        claude_messages = []
        for msg in messages:
            claude_messages.append({
                "role": msg.role,
                "content": msg.content
            })
        claude_messages.append({
            "role": "user",
            "content": content
        })
        
        try:
            # Call Claude API
            response = await self.client.messages.create(
                model=self.model,
                messages=claude_messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                system="You are a helpful AI assistant in the LOGOS ecosystem. You help users with marketplace activities, wallet management, and general questions about the platform. Be concise, friendly, and professional."
            )
            
            # Extract response content
            ai_content = response.content[0].text
            tokens_used = response.usage.input_tokens + response.usage.output_tokens
            
            # Create AI message
            ai_message = AIMessage(
                id=str(uuid.uuid4()),
                conversation_id=conversation_id,
                role="assistant",
                content=ai_content,
                tokens_used=tokens_used,
                created_at=datetime.utcnow()
            )
            db.add(ai_message)
            
            # Update conversation
            conversation.message_count += 2
            conversation.total_tokens += tokens_used
            conversation.updated_at = datetime.utcnow()
            
            # Update title if it's the first exchange
            if conversation.message_count == 2 and conversation.title == "New Conversation":
                conversation.title = await self._generate_title(content, ai_content)
            
            await db.commit()
            
            return {
                "user_message": user_message,
                "ai_message": ai_message,
                "tokens_used": tokens_used
            }
            
        except Exception as e:
            logger.error(f"Error calling Claude API: {str(e)}")
            await db.rollback()
            raise
    
    async def _generate_title(self, user_content: str, ai_content: str) -> str:
        """Generate a title for the conversation based on the first exchange"""
        try:
            response = await self.client.messages.create(
                model=self.model,
                messages=[{
                    "role": "user",
                    "content": f"Generate a short, descriptive title (max 50 chars) for this conversation:\nUser: {user_content[:200]}\nAssistant: {ai_content[:200]}"
                }],
                max_tokens=50,
                temperature=0.5,
                system="Generate only the title, nothing else. Make it concise and descriptive."
            )
            
            title = response.content[0].text.strip()
            return title[:50]  # Ensure max length
        except:
            # Fallback to simple title
            return user_content[:50] if len(user_content) > 0 else "New Conversation"
    
    async def delete_conversation(
        self,
        conversation_id: str,
        user_id: str,
        db: AsyncSession
    ) -> bool:
        """Delete a conversation and all its messages"""
        conversation = await self.get_conversation(conversation_id, user_id, db)
        if not conversation:
            return False
        
        # Delete all messages
        await db.execute(
            select(AIMessage).where(
                AIMessage.conversation_id == conversation_id
            ).delete()
        )
        
        # Delete conversation
        await db.delete(conversation)
        await db.commit()
        
        return True
    
    async def get_user_token_usage(
        self,
        user_id: str,
        db: AsyncSession
    ) -> Dict[str, int]:
        """Get user's total token usage"""
        result = await db.execute(
            select(func.sum(AIConversation.total_tokens))
            .where(AIConversation.user_id == user_id)
        )
        total_tokens = result.scalar() or 0
        
        # Get user's token limit from settings or user profile
        token_limit = settings.USER_TOKEN_LIMIT  # Default limit
        
        return {
            "used": total_tokens,
            "limit": token_limit,
            "remaining": max(0, token_limit - total_tokens)
        }
    
    async def search_conversations(
        self,
        user_id: str,
        query: str,
        db: AsyncSession,
        limit: int = 20
    ) -> List[AIConversation]:
        """Search user's conversations"""
        # Search in conversation titles and messages
        result = await db.execute(
            select(AIConversation)
            .where(
                AIConversation.user_id == user_id,
                AIConversation.title.ilike(f"%{query}%")
            )
            .order_by(AIConversation.updated_at.desc())
            .limit(limit)
        )
        return result.scalars().all()
    
    async def export_conversation(
        self,
        conversation_id: str,
        user_id: str,
        db: AsyncSession,
        format: str = "json"
    ) -> Dict[str, Any]:
        """Export conversation in specified format"""
        conversation = await self.get_conversation(conversation_id, user_id, db)
        if not conversation:
            raise ValueError("Conversation not found")
        
        messages = await self.get_conversation_messages(
            conversation_id, user_id, db
        )
        
        export_data = {
            "conversation": {
                "id": conversation.id,
                "title": conversation.title,
                "created_at": conversation.created_at.isoformat(),
                "updated_at": conversation.updated_at.isoformat(),
                "message_count": conversation.message_count,
                "total_tokens": conversation.total_tokens
            },
            "messages": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat(),
                    "tokens_used": msg.tokens_used
                }
                for msg in messages
            ]
        }
        
        if format == "json":
            return export_data
        elif format == "markdown":
            # Convert to markdown format
            md_content = f"# {conversation.title}\n\n"
            md_content += f"Created: {conversation.created_at}\n\n"
            
            for msg in messages:
                prefix = "**User:**" if msg.role == "user" else "**Assistant:**"
                md_content += f"{prefix}\n{msg.content}\n\n---\n\n"
            
            return {"content": md_content, "filename": f"{conversation.title}.md"}
        
        return export_data


# Global AI service instance
ai_service = AIService()