"""
WebSocket integration helpers for triggering real-time events from services.
"""

import asyncio
from typing import Optional, Dict, Any
from datetime import datetime
from src.shared.utils.logger import get_logger

logger = get_logger(__name__)


class WebSocketIntegration:
    """Helper class for integrating WebSocket events with other services."""
    
    @staticmethod
    async def notify_marketplace_event(event_type: str, item_data: Dict[str, Any]):
        """Send marketplace event notification via WebSocket."""
        try:
            from .handlers import (
                notify_marketplace_item_created,
                notify_marketplace_item_updated,
                notify_marketplace_item_sold
            )
            from src.shared.models.marketplace import MarketplaceItem
            
            # Create a mock item object for the notification
            item = type('MockItem', (), item_data)()
            
            if event_type == "created":
                await notify_marketplace_item_created(item)
            elif event_type == "updated":
                await notify_marketplace_item_updated(item)
            elif event_type == "sold":
                buyer_id = item_data.get("buyer_id")
                if buyer_id:
                    await notify_marketplace_item_sold(item, buyer_id)
                    
        except Exception as e:
            logger.error(f"Error sending marketplace WebSocket event: {e}")
    
    @staticmethod
    async def notify_wallet_transaction(user_id: str, transaction_data: Dict[str, Any]):
        """Send wallet transaction notification via WebSocket."""
        try:
            from .handlers import notify_wallet_transaction
            from src.shared.models.wallet import Transaction
            
            # Create a mock transaction object
            transaction = type('MockTransaction', (), transaction_data)()
            await notify_wallet_transaction(user_id, transaction)
            
        except Exception as e:
            logger.error(f"Error sending wallet WebSocket notification: {e}")
    
    @staticmethod
    async def send_system_notification(
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "general",
        priority: str = "normal",
        data: Optional[Dict[str, Any]] = None
    ):
        """Send system notification to user via WebSocket."""
        try:
            from .handlers import notify_system_notification
            
            await notify_system_notification(
                user_id=user_id,
                title=title,
                message=message,
                notification_type=notification_type,
                priority=priority,
                data=data
            )
            
        except Exception as e:
            logger.error(f"Error sending system WebSocket notification: {e}")
    
    @staticmethod
    async def broadcast_to_room(room: str, message: Dict[str, Any]):
        """Broadcast message to all users in a specific room."""
        try:
            from . import get_websocket_manager
            
            manager = get_websocket_manager()
            connection_manager = manager.get_connection_manager()
            
            await connection_manager.send_to_room(room, message)
            
        except Exception as e:
            logger.error(f"Error broadcasting to room {room}: {e}")
    
    @staticmethod
    async def send_to_user(user_id: str, message: Dict[str, Any]):
        """Send direct message to a specific user."""
        try:
            from . import get_websocket_manager
            
            manager = get_websocket_manager()
            connection_manager = manager.get_connection_manager()
            
            await connection_manager.send_personal_message(user_id, message)
            
        except Exception as e:
            logger.error(f"Error sending message to user {user_id}: {e}")
    
    @staticmethod
    def get_connected_users() -> list:
        """Get list of currently connected users."""
        try:
            from . import get_websocket_manager
            
            manager = get_websocket_manager()
            connection_manager = manager.get_connection_manager()
            
            return list(connection_manager.active_connections.keys())
            
        except Exception as e:
            logger.error(f"Error getting connected users: {e}")
            return []
    
    @staticmethod
    def is_user_online(user_id: str) -> bool:
        """Check if a specific user is currently connected."""
        try:
            from . import get_websocket_manager
            
            manager = get_websocket_manager()
            connection_manager = manager.get_connection_manager()
            
            return connection_manager.is_user_connected(user_id)
            
        except Exception as e:
            logger.error(f"Error checking user connection status: {e}")
            return False


# Decorator for automatic WebSocket notifications
def websocket_notify(event_type: str, room: Optional[str] = None):
    """
    Decorator to automatically send WebSocket notifications after function execution.
    
    Usage:
        @websocket_notify("item_created", room="marketplace:all")
        async def create_marketplace_item(...):
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            
            # Send WebSocket notification
            try:
                from . import get_websocket_manager
                
                manager = get_websocket_manager()
                connection_manager = manager.get_connection_manager()
                
                message = {
                    "type": event_type,
                    "data": result if isinstance(result, dict) else {"id": str(result)},
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                if room:
                    await connection_manager.send_to_room(room, message)
                else:
                    await connection_manager.broadcast(message)
                    
            except Exception as e:
                logger.error(f"Error in websocket_notify decorator: {e}")
            
            return result
        
        return wrapper
    return decorator


# Example usage in services:
"""
# In marketplace service:
@websocket_notify("marketplace_item_created", room="marketplace:all")
async def create_item(item_data: dict) -> MarketplaceItem:
    # Create item logic
    item = MarketplaceItem(**item_data)
    # Save to database
    return item

# In wallet service:
async def process_transaction(user_id: str, amount: float, transaction_type: str):
    # Process transaction logic
    transaction = create_transaction(...)
    
    # Send WebSocket notification
    await WebSocketIntegration.notify_wallet_transaction(user_id, {
        "id": str(transaction.id),
        "type": transaction_type,
        "amount": amount,
        "status": "completed",
        "created_at": datetime.utcnow()
    })
    
    return transaction

# In AI service:
async def stream_ai_response(user_id: str, message: str, session_id: str):
    # Stream response chunks via WebSocket
    ws_integration = WebSocketIntegration()
    
    async for chunk in generate_ai_response(message):
        await ws_integration.send_to_user(user_id, {
            "type": "ai_chat_stream_chunk",
            "session_id": session_id,
            "chunk": chunk,
            "timestamp": datetime.utcnow().isoformat()
        })
"""