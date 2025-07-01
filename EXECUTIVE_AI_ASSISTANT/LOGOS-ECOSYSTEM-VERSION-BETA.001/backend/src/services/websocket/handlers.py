"""
WebSocket event handlers for different real-time features.
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from src.infrastructure.database import get_db
from src.shared.models.marketplace import MarketplaceItem
from src.shared.models.wallet import Transaction
from src.shared.models.user import User
from src.shared.utils.logger import get_logger
from src.services.ai import AIService
from src.services.marketplace import MarketplaceService
from src.services.wallet import WalletService

logger = get_logger(__name__)


async def handle_custom_message(connection_manager, user_id: str, data: Dict[str, Any]):
    """Route custom WebSocket messages to appropriate handlers."""
    message_type = data.get("type")
    
    handlers = {
        "marketplace_subscribe": handle_marketplace_subscribe,
        "marketplace_unsubscribe": handle_marketplace_unsubscribe,
        "ai_chat_message": handle_ai_chat_message,
        "ai_chat_stream_start": handle_ai_chat_stream_start,
        "wallet_subscribe": handle_wallet_subscribe,
        "notification_subscribe": handle_notification_subscribe,
        "user_status_update": handle_user_status_update,
    }
    
    handler = handlers.get(message_type)
    if handler:
        await handler(connection_manager, user_id, data)
    else:
        logger.warning(f"Unknown message type: {message_type}")
        await connection_manager.send_personal_message(user_id, {
            "type": "error",
            "message": f"Unknown message type: {message_type}",
            "timestamp": datetime.utcnow().isoformat()
        })


async def handle_marketplace_subscribe(connection_manager, user_id: str, data: Dict[str, Any]):
    """Subscribe to marketplace updates."""
    category = data.get("category")
    room_name = f"marketplace:{category}" if category else "marketplace:all"
    
    await connection_manager.join_room(user_id, room_name)
    await connection_manager.send_personal_message(user_id, {
        "type": "marketplace_subscribed",
        "room": room_name,
        "timestamp": datetime.utcnow().isoformat()
    })


async def handle_marketplace_unsubscribe(connection_manager, user_id: str, data: Dict[str, Any]):
    """Unsubscribe from marketplace updates."""
    category = data.get("category")
    room_name = f"marketplace:{category}" if category else "marketplace:all"
    
    await connection_manager.leave_room(user_id, room_name)
    await connection_manager.send_personal_message(user_id, {
        "type": "marketplace_unsubscribed",
        "room": room_name,
        "timestamp": datetime.utcnow().isoformat()
    })


async def broadcast_marketplace_update(connection_manager, event_type: str, item_data: Dict[str, Any]):
    """Broadcast marketplace updates to subscribed users."""
    # Send to all marketplace subscribers
    await connection_manager.send_to_room("marketplace:all", {
        "type": "marketplace_update",
        "event": event_type,
        "item": item_data,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    # Send to category-specific subscribers
    category = item_data.get("category")
    if category:
        await connection_manager.send_to_room(f"marketplace:{category}", {
            "type": "marketplace_update",
            "event": event_type,
            "item": item_data,
            "timestamp": datetime.utcnow().isoformat()
        })


async def handle_ai_chat_message(connection_manager, user_id: str, data: Dict[str, Any]):
    """Handle AI chat messages with streaming responses."""
    message = data.get("message")
    session_id = data.get("session_id")
    model = data.get("model", "gpt-3.5-turbo")
    
    if not message:
        await connection_manager.send_personal_message(user_id, {
            "type": "error",
            "message": "Message content is required",
            "timestamp": datetime.utcnow().isoformat()
        })
        return
    
    # Create AI service instance
    ai_service = AIService()
    
    # Start streaming response
    try:
        # Send stream start event
        await connection_manager.send_personal_message(user_id, {
            "type": "ai_chat_stream_start",
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Stream AI response
        response_buffer = []
        async for chunk in ai_service.stream_chat_response(
            user_id=user_id,
            message=message,
            session_id=session_id,
            model=model
        ):
            response_buffer.append(chunk)
            await connection_manager.send_personal_message(user_id, {
                "type": "ai_chat_stream_chunk",
                "session_id": session_id,
                "chunk": chunk,
                "timestamp": datetime.utcnow().isoformat()
            })
            
        # Send stream end event
        full_response = "".join(response_buffer)
        await connection_manager.send_personal_message(user_id, {
            "type": "ai_chat_stream_end",
            "session_id": session_id,
            "full_response": full_response,
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in AI chat handler: {e}")
        await connection_manager.send_personal_message(user_id, {
            "type": "ai_chat_error",
            "session_id": session_id,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        })


async def handle_ai_chat_stream_start(connection_manager, user_id: str, data: Dict[str, Any]):
    """Handle AI chat stream initialization."""
    session_id = data.get("session_id")
    room_name = f"ai_chat:{session_id}"
    
    await connection_manager.join_room(user_id, room_name)
    await connection_manager.send_personal_message(user_id, {
        "type": "ai_chat_ready",
        "session_id": session_id,
        "timestamp": datetime.utcnow().isoformat()
    })


async def handle_wallet_subscribe(connection_manager, user_id: str, data: Dict[str, Any]):
    """Subscribe to wallet transaction notifications."""
    room_name = f"wallet:{user_id}"
    
    await connection_manager.join_room(user_id, room_name)
    await connection_manager.send_personal_message(user_id, {
        "type": "wallet_subscribed",
        "timestamp": datetime.utcnow().isoformat()
    })


async def broadcast_wallet_update(connection_manager, user_id: str, transaction_data: Dict[str, Any]):
    """Broadcast wallet transaction updates to user."""
    await connection_manager.send_personal_message(user_id, {
        "type": "wallet_update",
        "transaction": transaction_data,
        "timestamp": datetime.utcnow().isoformat()
    })


async def handle_notification_subscribe(connection_manager, user_id: str, data: Dict[str, Any]):
    """Subscribe to system notifications."""
    notification_types = data.get("types", ["all"])
    
    for notif_type in notification_types:
        room_name = f"notifications:{user_id}:{notif_type}"
        await connection_manager.join_room(user_id, room_name)
    
    await connection_manager.send_personal_message(user_id, {
        "type": "notifications_subscribed",
        "types": notification_types,
        "timestamp": datetime.utcnow().isoformat()
    })


async def broadcast_notification(connection_manager, user_id: str, notification: Dict[str, Any]):
    """Send notification to specific user."""
    notif_type = notification.get("type", "general")
    
    # Send to general notifications room
    await connection_manager.send_to_room(f"notifications:{user_id}:all", {
        "type": "notification",
        "notification": notification,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    # Send to specific notification type room
    await connection_manager.send_to_room(f"notifications:{user_id}:{notif_type}", {
        "type": "notification",
        "notification": notification,
        "timestamp": datetime.utcnow().isoformat()
    })


async def handle_user_status_update(connection_manager, user_id: str, data: Dict[str, Any]):
    """Handle user status updates (online/offline/away)."""
    status = data.get("status", "online")
    custom_message = data.get("message")
    
    # Update connection metadata
    if user_id in connection_manager.connection_metadata:
        connection_manager.connection_metadata[user_id]["status"] = status
        connection_manager.connection_metadata[user_id]["status_message"] = custom_message
    
    # Broadcast to user's contacts or relevant rooms
    status_update = {
        "type": "user_status_update",
        "user_id": user_id,
        "status": status,
        "message": custom_message,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Get user's rooms and broadcast status
    user_rooms = connection_manager.get_user_rooms(user_id)
    for room in user_rooms:
        if room.startswith("chat:") or room.startswith("group:"):
            await connection_manager.send_to_room(room, status_update, exclude_user=user_id)


# Helper functions for external services to trigger WebSocket events

async def notify_marketplace_item_created(item: MarketplaceItem):
    """Notify when a new marketplace item is created."""
    from . import get_websocket_manager
    
    manager = get_websocket_manager()
    connection_manager = manager.get_connection_manager()
    
    await broadcast_marketplace_update(connection_manager, "item_created", {
        "id": str(item.id),
        "title": item.title,
        "description": item.description,
        "price": float(item.price),
        "category": item.category,
        "seller_id": str(item.seller_id),
        "image_url": item.image_url,
        "created_at": item.created_at.isoformat()
    })


async def notify_marketplace_item_updated(item: MarketplaceItem):
    """Notify when a marketplace item is updated."""
    from . import get_websocket_manager
    
    manager = get_websocket_manager()
    connection_manager = manager.get_connection_manager()
    
    await broadcast_marketplace_update(connection_manager, "item_updated", {
        "id": str(item.id),
        "title": item.title,
        "description": item.description,
        "price": float(item.price),
        "category": item.category,
        "seller_id": str(item.seller_id),
        "image_url": item.image_url,
        "updated_at": item.updated_at.isoformat()
    })


async def notify_marketplace_item_sold(item: MarketplaceItem, buyer_id: str):
    """Notify when a marketplace item is sold."""
    from . import get_websocket_manager
    
    manager = get_websocket_manager()
    connection_manager = manager.get_connection_manager()
    
    await broadcast_marketplace_update(connection_manager, "item_sold", {
        "id": str(item.id),
        "title": item.title,
        "buyer_id": buyer_id,
        "seller_id": str(item.seller_id),
        "price": float(item.price),
        "sold_at": datetime.utcnow().isoformat()
    })


async def notify_wallet_transaction(user_id: str, transaction: Transaction):
    """Notify user of wallet transaction."""
    from . import get_websocket_manager
    
    manager = get_websocket_manager()
    connection_manager = manager.get_connection_manager()
    
    await broadcast_wallet_update(connection_manager, user_id, {
        "id": str(transaction.id),
        "type": transaction.type,
        "amount": float(transaction.amount),
        "status": transaction.status,
        "description": transaction.description,
        "created_at": transaction.created_at.isoformat()
    })


async def notify_system_notification(user_id: str, title: str, message: str, 
                                   notification_type: str = "general", 
                                   priority: str = "normal",
                                   data: Optional[Dict[str, Any]] = None):
    """Send system notification to user."""
    from . import get_websocket_manager
    
    manager = get_websocket_manager()
    connection_manager = manager.get_connection_manager()
    
    await broadcast_notification(connection_manager, user_id, {
        "id": str(datetime.utcnow().timestamp()),
        "title": title,
        "message": message,
        "type": notification_type,
        "priority": priority,
        "data": data or {},
        "read": False,
        "created_at": datetime.utcnow().isoformat()
    })