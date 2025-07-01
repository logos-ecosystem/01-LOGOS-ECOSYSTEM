from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import uuid
import logging

from ..models.chat import ChatRequest, ChatResponse
from ..services.ai_service import AIService
from ..services.conversation_service import ConversationService
from ..core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize services
ai_service = AIService()
conversation_service = ConversationService()


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Main chat endpoint for AI assistant interactions"""
    try:
        # Generate or retrieve conversation ID
        conversation_id = request.conversation_id or str(uuid.uuid4())
        
        # Get conversation history if exists
        conversation = await conversation_service.get_or_create(conversation_id)
        
        # Process the message through AI
        response = await ai_service.process_message(
            message=request.message,
            conversation=conversation,
            language=request.language,
            domain=request.domain,
            context=request.context
        )
        
        # Save the interaction
        await conversation_service.add_messages(
            conversation_id=conversation_id,
            user_message=request.message,
            assistant_message=response.response
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process chat request")


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Retrieve a specific conversation"""
    conversation = await conversation_service.get(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation"""
    success = await conversation_service.delete(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation deleted successfully"}


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """Streaming chat endpoint for real-time responses"""
    # TODO: Implement streaming with Server-Sent Events or WebSockets
    raise HTTPException(status_code=501, detail="Streaming not yet implemented")