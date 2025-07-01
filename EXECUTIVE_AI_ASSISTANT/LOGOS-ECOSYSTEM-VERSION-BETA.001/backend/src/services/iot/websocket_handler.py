"""WebSocket Handler for Real-time IoT Communication."""

import asyncio
import json
import ssl
import uuid
from typing import Dict, List, Optional, Any, Callable, Set
from datetime import datetime
import websockets
from websockets.server import WebSocketServerProtocol
from websockets.client import WebSocketClientProtocol
import aiohttp
from contextlib import asynccontextmanager

from ...shared.utils.logger import get_logger
from ...shared.utils.exceptions import IoTDeviceError
from ...shared.models.ai import WebSocketMessage
from .models import IoTDevice, DeviceEvent, DeviceState, DeviceCommand

logger = get_logger(__name__)


class IoTWebSocketHandler:
    """WebSocket handler for real-time IoT device communication."""
    
    def __init__(self):
        """Initialize WebSocket handler."""
        self.clients: Dict[str, WebSocketClientProtocol] = {}
        self.servers: Dict[str, websockets.WebSocketServer] = {}
        self.device_connections: Dict[str, Set[WebSocketServerProtocol]] = {}
        self.message_handlers: Dict[str, List[Callable]] = {}
        self.device_states: Dict[str, DeviceState] = {}
        
        # Message types
        self.MSG_TELEMETRY = "telemetry"
        self.MSG_EVENT = "event"
        self.MSG_COMMAND = "command"
        self.MSG_STATE = "state"
        self.MSG_DISCOVERY = "discovery"
        self.MSG_AUTH = "auth"
        self.MSG_PING = "ping"
        self.MSG_PONG = "pong"
        
    # Client operations (connecting to IoT devices)
    
    @asynccontextmanager
    async def connect_to_device(self, device: IoTDevice, 
                              url: Optional[str] = None,
                              ssl_context: Optional[ssl.SSLContext] = None):
        """Connect to IoT device via WebSocket."""
        ws_url = url or f"ws://{device.ip_address}:{device.port or 8080}/ws"
        
        # Add authentication headers
        headers = {}
        if device.auth_token:
            headers['Authorization'] = f'Bearer {device.auth_token}'
        elif device.api_key:
            headers['X-API-Key'] = device.api_key
            
        try:
            # Create SSL context if needed
            if ws_url.startswith('wss://') and not ssl_context:
                ssl_context = ssl.create_default_context()
                # Optional: disable certificate verification for self-signed certs
                # ssl_context.check_hostname = False
                # ssl_context.verify_mode = ssl.CERT_NONE
                
            # Connect to device
            async with websockets.connect(
                ws_url,
                extra_headers=headers,
                ssl=ssl_context,
                ping_interval=20,
                ping_timeout=10,
                close_timeout=10
            ) as websocket:
                self.clients[device.device_id] = websocket
                logger.info(f"WebSocket connected to device {device.device_id}")
                
                # Send authentication if required
                await self._authenticate_device(websocket, device)
                
                # Start message handler
                handler_task = asyncio.create_task(
                    self._handle_device_messages(device.device_id, websocket)
                )
                
                try:
                    yield websocket
                finally:
                    handler_task.cancel()
                    
        except Exception as e:
            logger.error(f"WebSocket connection failed for {device.device_id}: {e}")
            raise IoTDeviceError(f"Failed to connect to device: {e}")
        finally:
            if device.device_id in self.clients:
                del self.clients[device.device_id]
                
    async def _authenticate_device(self, websocket: WebSocketClientProtocol, 
                                  device: IoTDevice):
        """Authenticate with device."""
        if device.auth_token or device.username:
            auth_msg = {
                "type": self.MSG_AUTH,
                "data": {
                    "device_id": device.device_id,
                    "token": device.auth_token,
                    "username": device.username,
                    "password": device.password
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await websocket.send(json.dumps(auth_msg))
            
            # Wait for auth response
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            auth_response = json.loads(response)
            
            if auth_response.get('type') != 'auth_response' or \
               not auth_response.get('data', {}).get('authenticated'):
                raise IoTDeviceError("Device authentication failed")
                
    async def _handle_device_messages(self, device_id: str, 
                                    websocket: WebSocketClientProtocol):
        """Handle messages from device."""
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self._process_device_message(device_id, data)
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON from device {device_id}: {message}")
                except Exception as e:
                    logger.error(f"Error processing message from {device_id}: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Device {device_id} disconnected")
        except Exception as e:
            logger.error(f"WebSocket error for device {device_id}: {e}")
            
    async def _process_device_message(self, device_id: str, message: Dict[str, Any]):
        """Process message from device."""
        msg_type = message.get('type')
        data = message.get('data', {})
        timestamp = message.get('timestamp')
        
        # Update device last seen
        if device_id in self.device_states:
            self.device_states[device_id].last_updated = datetime.utcnow()
            
        # Route message by type
        if msg_type == self.MSG_TELEMETRY:
            await self._handle_telemetry(device_id, data, timestamp)
        elif msg_type == self.MSG_EVENT:
            await self._handle_event(device_id, data, timestamp)
        elif msg_type == self.MSG_STATE:
            await self._handle_state_update(device_id, data, timestamp)
        elif msg_type == self.MSG_PONG:
            # Heartbeat response
            pass
        else:
            # Custom message handlers
            await self._call_message_handlers(device_id, message)
            
    async def _handle_telemetry(self, device_id: str, data: Dict, timestamp: str):
        """Handle telemetry data from device."""
        # Update device state with telemetry
        if device_id not in self.device_states:
            self.device_states[device_id] = DeviceState(
                device_id=device_id,
                online=True
            )
            
        state = self.device_states[device_id]
        
        # Update sensor data
        state.sensor_data.update(data)
        
        # Update common telemetry fields
        if 'temperature' in data:
            state.temperature = data['temperature']
        if 'humidity' in data:
            state.humidity = data['humidity']
        if 'battery_level' in data:
            state.battery_level = data['battery_level']
        if 'signal_strength' in data:
            state.signal_strength = data['signal_strength']
            
        state.last_updated = datetime.fromisoformat(timestamp) if timestamp else datetime.utcnow()
        
        # Broadcast to connected clients
        await self._broadcast_to_device_clients(device_id, {
            "type": self.MSG_TELEMETRY,
            "device_id": device_id,
            "data": data,
            "timestamp": timestamp
        })
        
    async def _handle_event(self, device_id: str, data: Dict, timestamp: str):
        """Handle event from device."""
        event = DeviceEvent(
            device_id=device_id,
            event_type=data.get('event_type', 'unknown'),
            data=data,
            timestamp=datetime.fromisoformat(timestamp) if timestamp else datetime.utcnow(),
            severity=data.get('severity', 'info')
        )
        
        # Broadcast event
        await self._broadcast_to_device_clients(device_id, {
            "type": self.MSG_EVENT,
            "device_id": device_id,
            "event": event.dict()
        })
        
    async def _handle_state_update(self, device_id: str, data: Dict, timestamp: str):
        """Handle state update from device."""
        if device_id not in self.device_states:
            self.device_states[device_id] = DeviceState(
                device_id=device_id,
                online=True
            )
            
        state = self.device_states[device_id]
        state.state.update(data)
        state.last_updated = datetime.fromisoformat(timestamp) if timestamp else datetime.utcnow()
        
        # Update specific state fields
        for field in ['power', 'brightness', 'color', 'locked', 'armed', 
                     'playing', 'volume', 'muted']:
            if field in data:
                setattr(state, field, data[field])
                
        # Broadcast state update
        await self._broadcast_to_device_clients(device_id, {
            "type": self.MSG_STATE,
            "device_id": device_id,
            "state": state.dict()
        })
        
    async def _call_message_handlers(self, device_id: str, message: Dict):
        """Call registered message handlers."""
        handlers = self.message_handlers.get(device_id, [])
        for handler in handlers:
            try:
                await handler(device_id, message)
            except Exception as e:
                logger.error(f"Message handler error: {e}")
                
    # Server operations (for devices to connect to)
    
    async def start_server(self, host: str = '0.0.0.0', port: int = 8765,
                         ssl_context: Optional[ssl.SSLContext] = None) -> str:
        """Start WebSocket server for devices to connect."""
        server_id = str(uuid.uuid4())
        
        async def handle_connection(websocket: WebSocketServerProtocol, path: str):
            await self._handle_device_connection(websocket, path)
            
        server = await websockets.serve(
            handle_connection,
            host,
            port,
            ssl=ssl_context,
            ping_interval=20,
            ping_timeout=10
        )
        
        self.servers[server_id] = server
        logger.info(f"WebSocket server started on {host}:{port}")
        
        return server_id
        
    async def stop_server(self, server_id: str):
        """Stop WebSocket server."""
        if server_id in self.servers:
            server = self.servers[server_id]
            server.close()
            await server.wait_closed()
            del self.servers[server_id]
            logger.info(f"WebSocket server {server_id} stopped")
            
    async def _handle_device_connection(self, websocket: WebSocketServerProtocol, 
                                      path: str):
        """Handle incoming device connection."""
        device_id = None
        
        try:
            # Wait for device identification
            auth_msg = await asyncio.wait_for(websocket.recv(), timeout=10.0)
            auth_data = json.loads(auth_msg)
            
            if auth_data.get('type') != self.MSG_AUTH:
                await websocket.send(json.dumps({
                    "type": "error",
                    "error": "Authentication required"
                }))
                return
                
            # Validate device
            device_id = auth_data.get('data', {}).get('device_id')
            if not device_id:
                await websocket.send(json.dumps({
                    "type": "error",
                    "error": "Device ID required"
                }))
                return
                
            # TODO: Validate device credentials
            
            # Send auth success
            await websocket.send(json.dumps({
                "type": "auth_response",
                "data": {"authenticated": True}
            }))
            
            # Register connection
            if device_id not in self.device_connections:
                self.device_connections[device_id] = set()
            self.device_connections[device_id].add(websocket)
            
            # Update device state
            if device_id not in self.device_states:
                self.device_states[device_id] = DeviceState(
                    device_id=device_id,
                    online=True
                )
            else:
                self.device_states[device_id].online = True
                
            logger.info(f"Device {device_id} connected via WebSocket")
            
            # Handle messages
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self._process_device_message(device_id, data)
                except Exception as e:
                    logger.error(f"Error processing message from {device_id}: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Device {device_id} disconnected")
        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
        finally:
            # Cleanup
            if device_id and device_id in self.device_connections:
                self.device_connections[device_id].discard(websocket)
                if not self.device_connections[device_id]:
                    del self.device_connections[device_id]
                    if device_id in self.device_states:
                        self.device_states[device_id].online = False
                        
    async def _broadcast_to_device_clients(self, device_id: str, message: Dict):
        """Broadcast message to all clients watching a device."""
        if device_id in self.device_connections:
            message_str = json.dumps(message)
            
            # Send to all connected clients
            disconnected = []
            for client in self.device_connections[device_id]:
                try:
                    await client.send(message_str)
                except websockets.exceptions.ConnectionClosed:
                    disconnected.append(client)
                except Exception as e:
                    logger.error(f"Broadcast error: {e}")
                    disconnected.append(client)
                    
            # Remove disconnected clients
            for client in disconnected:
                self.device_connections[device_id].discard(client)
                
    # High-level operations
    
    async def send_command(self, device_id: str, command: DeviceCommand) -> Dict[str, Any]:
        """Send command to device."""
        if device_id not in self.clients:
            raise IoTDeviceError(f"Device {device_id} not connected")
            
        websocket = self.clients[device_id]
        
        # Create command message
        command_id = str(uuid.uuid4())
        message = {
            "type": self.MSG_COMMAND,
            "command_id": command_id,
            "data": {
                "command": command.command,
                "parameters": command.parameters
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send command
        await websocket.send(json.dumps(message))
        
        # Wait for response
        response_future = asyncio.Future()
        
        async def response_handler(dev_id: str, msg: Dict):
            if msg.get('type') == 'command_response' and \
               msg.get('command_id') == command_id:
                response_future.set_result(msg.get('data', {}))
                
        # Add temporary handler
        self.add_message_handler(device_id, response_handler)
        
        try:
            response = await asyncio.wait_for(
                response_future,
                timeout=command.timeout or 30.0
            )
            return response
        except asyncio.TimeoutError:
            raise IoTDeviceError(f"Command timeout for device {device_id}")
        finally:
            self.remove_message_handler(device_id, response_handler)
            
    async def get_device_state(self, device_id: str) -> Optional[DeviceState]:
        """Get current device state."""
        return self.device_states.get(device_id)
        
    async def ping_device(self, device_id: str) -> bool:
        """Ping device to check connectivity."""
        if device_id not in self.clients:
            return False
            
        try:
            websocket = self.clients[device_id]
            await websocket.send(json.dumps({
                "type": self.MSG_PING,
                "timestamp": datetime.utcnow().isoformat()
            }))
            
            # Wait for pong with timeout
            pong_received = asyncio.Future()
            
            async def pong_handler(dev_id: str, msg: Dict):
                if msg.get('type') == self.MSG_PONG:
                    pong_received.set_result(True)
                    
            self.add_message_handler(device_id, pong_handler)
            
            try:
                await asyncio.wait_for(pong_received, timeout=5.0)
                return True
            except asyncio.TimeoutError:
                return False
            finally:
                self.remove_message_handler(device_id, pong_handler)
                
        except Exception as e:
            logger.error(f"Ping error for device {device_id}: {e}")
            return False
            
    def add_message_handler(self, device_id: str, handler: Callable):
        """Add message handler for device."""
        if device_id not in self.message_handlers:
            self.message_handlers[device_id] = []
        self.message_handlers[device_id].append(handler)
        
    def remove_message_handler(self, device_id: str, handler: Callable):
        """Remove message handler for device."""
        if device_id in self.message_handlers:
            self.message_handlers[device_id].remove(handler)
            
    async def broadcast_to_group(self, group_id: str, message: Dict):
        """Broadcast message to device group."""
        # TODO: Implement group management
        pass
        
    async def discover_devices(self, timeout: float = 10.0) -> List[Dict[str, Any]]:
        """Discover devices on the network."""
        discovered = []
        
        # TODO: Implement device discovery protocols
        # - mDNS/Bonjour
        # - SSDP/UPnP
        # - Custom discovery
        
        return discovered