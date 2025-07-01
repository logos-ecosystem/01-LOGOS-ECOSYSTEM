"""
WebSocket service for real-time communication in LOGOS ECOSYSTEM.
"""

import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any, List
from datetime import datetime
import uuid
from fastapi import WebSocket, WebSocketDisconnect, HTTPException, status
from jose import JWTError, jwt
from src.shared.utils.config import get_settings

settings = get_settings()
from src.shared.models.user import User
from src.shared.utils.logger import get_logger
from sqlalchemy.orm import Session
from src.infrastructure.database import get_db

logger = get_logger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and room subscriptions."""
    
    def __init__(self):
        # Active connections by user_id
        self.active_connections: Dict[str, WebSocket] = {}
        # Room subscriptions: room_name -> set of user_ids
        self.rooms: Dict[str, Set[str]] = {}
        # User to rooms mapping
        self.user_rooms: Dict[str, Set[str]] = {}
        # Connection metadata
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        # Health check tasks
        self.health_check_tasks: Dict[str, asyncio.Task] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str, metadata: Optional[Dict[str, Any]] = None):
        """Accept WebSocket connection and store it."""
        await websocket.accept()
        
        # Close existing connection if any
        if user_id in self.active_connections:
            await self.disconnect(user_id)
            
        self.active_connections[user_id] = websocket
        self.user_rooms[user_id] = set()
        self.connection_metadata[user_id] = {
            "connected_at": datetime.utcnow(),
            "last_ping": datetime.utcnow(),
            "metadata": metadata or {}
        }
        
        # Start health check task
        self.health_check_tasks[user_id] = asyncio.create_task(
            self._health_check_loop(user_id)
        )
        
        logger.info(f"User {user_id} connected via WebSocket")
        
    async def disconnect(self, user_id: str):
        """Remove connection and clean up."""
        if user_id in self.active_connections:
            # Cancel health check task
            if user_id in self.health_check_tasks:
                self.health_check_tasks[user_id].cancel()
                del self.health_check_tasks[user_id]
                
            # Remove from all rooms
            if user_id in self.user_rooms:
                for room in self.user_rooms[user_id]:
                    if room in self.rooms:
                        self.rooms[room].discard(user_id)
                del self.user_rooms[user_id]
                
            # Remove connection
            del self.active_connections[user_id]
            del self.connection_metadata[user_id]
            
            logger.info(f"User {user_id} disconnected from WebSocket")
            
    async def join_room(self, user_id: str, room: str):
        """Add user to a room."""
        if user_id not in self.active_connections:
            raise ValueError(f"User {user_id} is not connected")
            
        if room not in self.rooms:
            self.rooms[room] = set()
            
        self.rooms[room].add(user_id)
        self.user_rooms[user_id].add(room)
        
        logger.info(f"User {user_id} joined room {room}")
        
        # Notify room members
        await self.send_to_room(room, {
            "type": "room_join",
            "room": room,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }, exclude_user=user_id)
        
    async def leave_room(self, user_id: str, room: str):
        """Remove user from a room."""
        if room in self.rooms:
            self.rooms[room].discard(user_id)
            if not self.rooms[room]:
                del self.rooms[room]
                
        if user_id in self.user_rooms:
            self.user_rooms[user_id].discard(room)
            
        logger.info(f"User {user_id} left room {room}")
        
        # Notify room members
        await self.send_to_room(room, {
            "type": "room_leave",
            "room": room,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
    async def send_personal_message(self, user_id: str, message: Dict[str, Any]):
        """Send message to specific user."""
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                await self.disconnect(user_id)
                
    async def send_to_room(self, room: str, message: Dict[str, Any], exclude_user: Optional[str] = None):
        """Broadcast message to all users in a room."""
        if room not in self.rooms:
            return
            
        disconnected_users = []
        
        for user_id in self.rooms[room]:
            if user_id == exclude_user:
                continue
                
            if user_id in self.active_connections:
                try:
                    await self.active_connections[user_id].send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    disconnected_users.append(user_id)
                    
        # Clean up disconnected users
        for user_id in disconnected_users:
            await self.disconnect(user_id)
            
    async def broadcast(self, message: Dict[str, Any], exclude_user: Optional[str] = None):
        """Broadcast message to all connected users."""
        disconnected_users = []
        
        for user_id, websocket in self.active_connections.items():
            if user_id == exclude_user:
                continue
                
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to user {user_id}: {e}")
                disconnected_users.append(user_id)
                
        # Clean up disconnected users
        for user_id in disconnected_users:
            await self.disconnect(user_id)
            
    async def _health_check_loop(self, user_id: str):
        """Send periodic ping messages to check connection health."""
        try:
            while user_id in self.active_connections:
                await asyncio.sleep(30)  # Ping every 30 seconds
                
                if user_id in self.active_connections:
                    try:
                        await self.active_connections[user_id].send_json({
                            "type": "ping",
                            "timestamp": datetime.utcnow().isoformat()
                        })
                        self.connection_metadata[user_id]["last_ping"] = datetime.utcnow()
                    except Exception as e:
                        logger.error(f"Health check failed for user {user_id}: {e}")
                        await self.disconnect(user_id)
                        break
        except asyncio.CancelledError:
            pass
            
    def get_room_users(self, room: str) -> List[str]:
        """Get list of users in a room."""
        return list(self.rooms.get(room, set()))
        
    def get_user_rooms(self, user_id: str) -> List[str]:
        """Get list of rooms a user is in."""
        return list(self.user_rooms.get(user_id, set()))
        
    def get_connection_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get connection metadata for a user."""
        return self.connection_metadata.get(user_id)
        
    def is_user_connected(self, user_id: str) -> bool:
        """Check if user is connected."""
        return user_id in self.active_connections


class WebSocketManager:
    """Main WebSocket manager for handling authentication and message routing."""
    
    def __init__(self):
        self.connection_manager = ConnectionManager()
        
    async def authenticate_websocket(self, websocket: WebSocket) -> Optional[str]:
        """Authenticate WebSocket connection using JWT token."""
        try:
            # Get token from query params or headers
            token = websocket.query_params.get("token")
            if not token:
                # Try to get from headers
                auth_header = websocket.headers.get("Authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
                    
            if not token:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return None
                
            # Verify token
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            user_id = payload.get("sub")
            
            if not user_id:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return None
                
            return user_id
            
        except JWTError as e:
            logger.error(f"WebSocket authentication failed: {e}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return None
            
    async def handle_connection(self, websocket: WebSocket):
        """Handle WebSocket connection lifecycle."""
        user_id = await self.authenticate_websocket(websocket)
        if not user_id:
            return
            
        await self.connection_manager.connect(websocket, user_id)
        
        try:
            # Send connection success message
            await websocket.send_json({
                "type": "connection_established",
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Handle incoming messages
            while True:
                data = await websocket.receive_json()
                await self.handle_message(user_id, data)
                
        except WebSocketDisconnect:
            await self.connection_manager.disconnect(user_id)
        except Exception as e:
            logger.error(f"WebSocket error for user {user_id}: {e}")
            await self.connection_manager.disconnect(user_id)
            
    async def handle_message(self, user_id: str, data: Dict[str, Any]):
        """Route incoming WebSocket messages."""
        message_type = data.get("type")
        
        if message_type == "join_room":
            room = data.get("room")
            if room:
                await self.connection_manager.join_room(user_id, room)
                
        elif message_type == "leave_room":
            room = data.get("room")
            if room:
                await self.connection_manager.leave_room(user_id, room)
                
        elif message_type == "pong":
            # Update last activity timestamp
            if user_id in self.connection_manager.connection_metadata:
                self.connection_manager.connection_metadata[user_id]["last_activity"] = datetime.utcnow()
                
        else:
            # Handle custom message types in handlers
            from .handlers import handle_custom_message
            await handle_custom_message(self.connection_manager, user_id, data)
            
    def get_connection_manager(self) -> ConnectionManager:
        """Get the connection manager instance."""
        return self.connection_manager


# Global WebSocket manager instance
websocket_manager = WebSocketManager()


def get_websocket_manager() -> WebSocketManager:
    """Get the global WebSocket manager instance."""
    return websocket_manager