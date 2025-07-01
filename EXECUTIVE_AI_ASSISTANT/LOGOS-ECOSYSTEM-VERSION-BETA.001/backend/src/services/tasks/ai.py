from celery import shared_task
from typing import Dict, List, Optional
import asyncio
from datetime import datetime
import anthropic
from sqlalchemy import select, and_

from ...shared.utils.config import get_settings
from ...shared.utils.logger import get_logger
from ...infrastructure.database import async_session_maker
from ...shared.models.ai import AISession, AIMessage

logger = get_logger(__name__)
settings = get_settings()

# Initialize Claude client
claude_client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY) if settings.CLAUDE_API_KEY else None


@shared_task(name="process_ai_batch")
def process_ai_batch(
    session_id: str,
    messages: List[Dict[str, str]],
    user_id: str
) -> Dict[str, any]:
    """Process a batch of AI messages asynchronously."""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_process_ai_batch_async(session_id, messages, user_id))
        return result
    finally:
        loop.close()


async def _process_ai_batch_async(
    session_id: str,
    messages: List[Dict[str, str]],
    user_id: str
) -> Dict[str, any]:
    """Async implementation of batch AI processing."""
    responses = []
    total_tokens = 0
    
    async with async_session_maker() as db:
        # Get session
        session = await db.get(AISession, session_id)
        if not session or str(session.user_id) != user_id:
            raise ValueError("Invalid session")
        
        for message in messages:
            try:
                # Process with Claude
                response = await claude_client.messages.create(
                    model=session.model,
                    messages=[{"role": "user", "content": message["content"]}],
                    max_tokens=session.max_tokens,
                    temperature=session.temperature
                )
                
                # Save to database
                ai_message = AIMessage(
                    session_id=session_id,
                    role="assistant",
                    content=response.content[0].text,
                    model_used=session.model,
                    prompt_tokens=response.usage.input_tokens,
                    completion_tokens=response.usage.output_tokens,
                    total_tokens=response.usage.input_tokens + response.usage.output_tokens
                )
                db.add(ai_message)
                
                responses.append({
                    "content": response.content[0].text,
                    "tokens": ai_message.total_tokens
                })
                total_tokens += ai_message.total_tokens
                
            except Exception as e:
                logger.error(f"Failed to process message in batch: {str(e)}")
                responses.append({
                    "content": None,
                    "error": str(e)
                })
        
        # Update session stats
        session.total_tokens += total_tokens
        session.total_messages += len(messages)
        session.last_message_at = datetime.utcnow()
        
        await db.commit()
    
    return {
        "session_id": session_id,
        "responses": responses,
        "total_tokens": total_tokens
    }


@shared_task(name="analyze_conversation")
def analyze_conversation(session_id: str) -> Dict[str, any]:
    """Analyze a conversation for insights."""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_analyze_conversation_async(session_id))
        return result
    finally:
        loop.close()


async def _analyze_conversation_async(session_id: str) -> Dict[str, any]:
    """Async implementation of conversation analysis."""
    async with async_session_maker() as db:
        # Get session with messages
        session = await db.get(AISession, session_id)
        if not session:
            raise ValueError("Session not found")
        
        # Get all messages
        messages = await db.execute(
            select(AIMessage)
            .where(AIMessage.session_id == session_id)
            .order_by(AIMessage.created_at)
        )
        messages = messages.scalars().all()
        
        # Prepare conversation for analysis
        conversation_text = "\n".join([
            f"{msg.role}: {msg.content}" for msg in messages
        ])
        
        # Analyze with Claude
        if claude_client and len(messages) > 2:
            analysis_prompt = f"""Analyze this conversation and provide insights:
            1. Main topics discussed
            2. User sentiment
            3. Key questions asked
            4. Suggestions for improvement
            
            Conversation:
            {conversation_text[:5000]}  # Limit to 5000 chars
            """
            
            response = await claude_client.messages.create(
                model="claude-3-sonnet-20240229",  # Use faster model for analysis
                messages=[{"role": "user", "content": analysis_prompt}],
                max_tokens=1000
            )
            
            analysis = response.content[0].text
        else:
            analysis = "Not enough messages for analysis"
        
        return {
            "session_id": session_id,
            "message_count": len(messages),
            "total_tokens": session.total_tokens,
            "analysis": analysis
        }


@shared_task(name="generate_ai_summary")
def generate_ai_summary(
    content: str,
    summary_type: str = "brief"
) -> str:
    """Generate a summary of content using AI."""
    if not claude_client:
        return "AI service not available"
    
    try:
        prompts = {
            "brief": "Summarize this content in 2-3 sentences:",
            "detailed": "Provide a detailed summary with key points:",
            "bullets": "Summarize this content as bullet points:"
        }
        
        prompt = prompts.get(summary_type, prompts["brief"])
        
        response = claude_client.messages.create(
            model="claude-3-sonnet-20240229",
            messages=[{
                "role": "user",
                "content": f"{prompt}\n\n{content[:10000]}"  # Limit content
            }],
            max_tokens=500
        )
        
        return response.content[0].text
        
    except Exception as e:
        logger.error(f"Failed to generate summary: {str(e)}")
        return "Failed to generate summary"


@shared_task(name="fine_tune_model")
def fine_tune_model(
    dataset_id: str,
    model_config: Dict[str, any]
) -> Dict[str, any]:
    """Fine-tune an AI model (placeholder for actual implementation)."""
    logger.info(f"Starting fine-tuning for dataset {dataset_id}")
    
    # In production, this would:
    # 1. Load the dataset
    # 2. Prepare training data
    # 3. Fine-tune the model
    # 4. Evaluate performance
    # 5. Save the fine-tuned model
    
    return {
        "status": "completed",
        "model_id": f"ft-model-{dataset_id}",
        "metrics": {
            "accuracy": 0.95,
            "loss": 0.05
        }
    }


@shared_task(name="cleanup_old_sessions")
def cleanup_old_sessions(days: int = 30) -> Dict[str, int]:
    """Clean up old AI sessions."""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_cleanup_old_sessions_async(days))
        return result
    finally:
        loop.close()


async def _cleanup_old_sessions_async(days: int) -> Dict[str, int]:
    """Async implementation of session cleanup."""
    from datetime import timedelta
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    async with async_session_maker() as db:
        # Find old sessions
        result = await db.execute(
            select(AISession)
            .where(
                and_(
                    AISession.last_message_at < cutoff_date,
                    AISession.is_archived == False
                )
            )
        )
        old_sessions = result.scalars().all()
        
        # Archive them
        archived_count = 0
        for session in old_sessions:
            session.is_archived = True
            archived_count += 1
        
        await db.commit()
        
        logger.info(f"Archived {archived_count} old AI sessions")
        
        return {
            "archived": archived_count,
            "cutoff_date": cutoff_date.isoformat()
        }