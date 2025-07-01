from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
import json
from datetime import datetime
import logging

from ..database.base import AsyncSessionLocal, ConversationModel
from ..models.chat import Conversation, Message, MessageRole

logger = logging.getLogger(__name__)


class ConversationService:
    async def get_or_create(self, conversation_id: str) -> Conversation:
        """Get an existing conversation or create a new one"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(ConversationModel).where(ConversationModel.id == conversation_id)
            )
            db_conversation = result.scalar_one_or_none()
            
            if db_conversation:
                # Convert stored JSON messages back to Message objects
                messages = [
                    Message(
                        role=MessageRole(msg["role"]),
                        content=msg["content"],
                        timestamp=datetime.fromisoformat(msg["timestamp"]),
                        metadata=msg.get("metadata")
                    )
                    for msg in db_conversation.messages
                ]
                
                return Conversation(
                    id=db_conversation.id,
                    messages=messages,
                    created_at=db_conversation.created_at,
                    updated_at=db_conversation.updated_at,
                    metadata=db_conversation.meta_data
                )
            else:
                # Create new conversation
                now = datetime.utcnow()
                new_conversation = ConversationModel(
                    id=conversation_id,
                    messages=[],
                    created_at=now,
                    updated_at=now
                )
                session.add(new_conversation)
                await session.commit()
                
                return Conversation(
                    id=conversation_id,
                    messages=[],
                    created_at=now,
                    updated_at=now
                )
    
    async def add_messages(
        self,
        conversation_id: str,
        user_message: str,
        assistant_message: str
    ):
        """Add user and assistant messages to a conversation"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(ConversationModel).where(ConversationModel.id == conversation_id)
            )
            db_conversation = result.scalar_one_or_none()
            
            if not db_conversation:
                logger.error(f"Conversation {conversation_id} not found")
                return
            
            # Create message objects
            now = datetime.utcnow()
            user_msg = Message(
                role=MessageRole.USER,
                content=user_message,
                timestamp=now
            )
            assistant_msg = Message(
                role=MessageRole.ASSISTANT,
                content=assistant_message,
                timestamp=now
            )
            
            # Convert to dict for storage
            messages = db_conversation.messages or []
            messages.extend([
                {
                    "role": user_msg.role.value,
                    "content": user_msg.content,
                    "timestamp": user_msg.timestamp.isoformat(),
                    "metadata": user_msg.metadata
                },
                {
                    "role": assistant_msg.role.value,
                    "content": assistant_msg.content,
                    "timestamp": assistant_msg.timestamp.isoformat(),
                    "metadata": assistant_msg.metadata
                }
            ])
            
            db_conversation.messages = messages
            db_conversation.updated_at = now
            
            await session.commit()
    
    async def get(self, conversation_id: str) -> Optional[Conversation]:
        """Get a specific conversation"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(ConversationModel).where(ConversationModel.id == conversation_id)
            )
            db_conversation = result.scalar_one_or_none()
            
            if not db_conversation:
                return None
            
            messages = [
                Message(
                    role=MessageRole(msg["role"]),
                    content=msg["content"],
                    timestamp=datetime.fromisoformat(msg["timestamp"]),
                    metadata=msg.get("metadata")
                )
                for msg in db_conversation.messages
            ]
            
            return Conversation(
                id=db_conversation.id,
                messages=messages,
                created_at=db_conversation.created_at,
                updated_at=db_conversation.updated_at,
                metadata=db_conversation.meta_data
            )
    
    async def delete(self, conversation_id: str) -> bool:
        """Delete a conversation"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(ConversationModel).where(ConversationModel.id == conversation_id)
            )
            db_conversation = result.scalar_one_or_none()
            
            if not db_conversation:
                return False
            
            await session.delete(db_conversation)
            await session.commit()
            return True