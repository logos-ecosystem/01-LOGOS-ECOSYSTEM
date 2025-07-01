"""Automotive Protocol Implementations for Android Auto and Apple CarPlay."""

import asyncio
import json
import struct
import ssl
import socket
from typing import Dict, List, Optional, Any, Callable, Tuple
from datetime import datetime
from enum import Enum
import uuid

from ...shared.utils.logger import get_logger
from ...shared.utils.exceptions import IoTDeviceError
from .models import IoTDevice, VehicleData, DeviceProtocol

logger = get_logger(__name__)


class AndroidAutoMessageType(Enum):
    """Android Auto message types."""
    INIT = 0x0001
    HEARTBEAT = 0x0002
    MEDIA_CONTROL = 0x0010
    NAVIGATION = 0x0020
    PHONE = 0x0030
    VOICE = 0x0040
    SENSOR = 0x0050
    NOTIFICATION = 0x0060
    CUSTOM = 0x00FF


class CarPlayMessageType(Enum):
    """Apple CarPlay message types."""
    HANDSHAKE = 0x01
    AUTHENTICATION = 0x02
    SCREEN_INFO = 0x10
    TOUCH_EVENT = 0x11
    MEDIA_PLAYBACK = 0x20
    SIRI = 0x30
    MAPS = 0x40
    PHONE_CALL = 0x50
    MESSAGE = 0x60


class AndroidAutoProtocol:
    """Android Auto protocol implementation."""
    
    def __init__(self):
        """Initialize Android Auto protocol handler."""
        self.connections = {}
        self.message_handlers = {}
        self.vehicle_data = {}
        
        # Protocol constants
        self.PROTOCOL_VERSION = 1
        self.MAX_PACKET_SIZE = 16384
        self.HEARTBEAT_INTERVAL = 5.0
        
    async def connect(self, device: IoTDevice, **kwargs) -> bool:
        """Connect to Android Auto head unit."""
        try:
            # Connection parameters
            host = kwargs.get('host', device.ip_address)
            port = kwargs.get('port', 5277)  # Default Android Auto port
            use_tls = kwargs.get('use_tls', True)
            
            # Create socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.setblocking(False)
            
            # TLS wrapper if needed
            if use_tls:
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
                sock = ssl_context.wrap_socket(sock)
            
            # Connect
            await asyncio.get_event_loop().sock_connect(sock, (host, port))
            
            # Store connection
            self.connections[device.device_id] = {
                'socket': sock,
                'device': device,
                'authenticated': False,
                'capabilities': [],
                'heartbeat_task': None
            }
            
            # Start authentication
            await self._authenticate(device.device_id)
            
            # Start heartbeat
            self.connections[device.device_id]['heartbeat_task'] = \
                asyncio.create_task(self._heartbeat_loop(device.device_id))
            
            # Start message receiver
            asyncio.create_task(self._receive_messages(device.device_id))
            
            logger.info(f"Android Auto connected to {device.device_id}")
            return True
            
        except Exception as e:
            logger.error(f"Android Auto connection failed: {e}")
            return False
    
    async def disconnect(self, device_id: str) -> bool:
        """Disconnect from Android Auto."""
        if device_id not in self.connections:
            return False
            
        try:
            conn = self.connections[device_id]
            
            # Cancel heartbeat
            if conn['heartbeat_task']:
                conn['heartbeat_task'].cancel()
            
            # Close socket
            conn['socket'].close()
            
            # Cleanup
            del self.connections[device_id]
            if device_id in self.vehicle_data:
                del self.vehicle_data[device_id]
                
            logger.info(f"Android Auto disconnected from {device_id}")
            return True
            
        except Exception as e:
            logger.error(f"Android Auto disconnect error: {e}")
            return False
    
    async def _authenticate(self, device_id: str):
        """Authenticate with Android Auto head unit."""
        conn = self.connections[device_id]
        device = conn['device']
        
        # Send init message
        init_msg = {
            'type': AndroidAutoMessageType.INIT.value,
            'version': self.PROTOCOL_VERSION,
            'device_id': device.device_id,
            'device_name': device.name,
            'capabilities': [
                'media_control',
                'navigation',
                'phone',
                'voice',
                'notifications'
            ]
        }
        
        await self._send_message(device_id, init_msg)
        
        # Wait for response
        response = await self._wait_for_message(
            device_id,
            AndroidAutoMessageType.INIT,
            timeout=10.0
        )
        
        if response and response.get('status') == 'ok':
            conn['authenticated'] = True
            conn['capabilities'] = response.get('capabilities', [])
            logger.info(f"Android Auto authenticated for {device_id}")
        else:
            raise IoTDeviceError("Android Auto authentication failed")
    
    async def _send_message(self, device_id: str, message: Dict[str, Any]):
        """Send message to Android Auto head unit."""
        if device_id not in self.connections:
            raise IoTDeviceError(f"Device {device_id} not connected")
            
        conn = self.connections[device_id]
        sock = conn['socket']
        
        # Serialize message
        data = json.dumps(message).encode('utf-8')
        
        # Create packet: [length: 4 bytes][data]
        packet = struct.pack('>I', len(data)) + data
        
        # Send packet
        await asyncio.get_event_loop().sock_sendall(sock, packet)
    
    async def _receive_messages(self, device_id: str):
        """Receive messages from Android Auto head unit."""
        if device_id not in self.connections:
            return
            
        conn = self.connections[device_id]
        sock = conn['socket']
        loop = asyncio.get_event_loop()
        
        try:
            while device_id in self.connections:
                # Read message length
                length_data = await self._recv_exact(sock, 4)
                if not length_data:
                    break
                    
                length = struct.unpack('>I', length_data)[0]
                
                if length > self.MAX_PACKET_SIZE:
                    logger.error(f"Packet too large: {length}")
                    break
                
                # Read message data
                data = await self._recv_exact(sock, length)
                if not data:
                    break
                
                # Parse message
                try:
                    message = json.loads(data.decode('utf-8'))
                    await self._handle_message(device_id, message)
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON from Android Auto: {e}")
                    
        except Exception as e:
            logger.error(f"Android Auto receive error: {e}")
        finally:
            # Cleanup on disconnect
            await self.disconnect(device_id)
    
    async def _recv_exact(self, sock: socket.socket, length: int) -> bytes:
        """Receive exact number of bytes."""
        data = b''
        loop = asyncio.get_event_loop()
        
        while len(data) < length:
            chunk = await loop.sock_recv(sock, length - len(data))
            if not chunk:
                return b''
            data += chunk
            
        return data
    
    async def _handle_message(self, device_id: str, message: Dict[str, Any]):
        """Handle incoming Android Auto message."""
        msg_type = message.get('type')
        
        # Route by message type
        if msg_type == AndroidAutoMessageType.HEARTBEAT.value:
            # Respond to heartbeat
            await self._send_message(device_id, {
                'type': AndroidAutoMessageType.HEARTBEAT.value,
                'timestamp': datetime.utcnow().isoformat()
            })
            
        elif msg_type == AndroidAutoMessageType.SENSOR.value:
            # Update vehicle data
            await self._handle_sensor_data(device_id, message.get('data', {}))
            
        elif msg_type == AndroidAutoMessageType.MEDIA_CONTROL.value:
            # Handle media control request
            await self._handle_media_control(device_id, message.get('data', {}))
            
        # Call custom handlers
        handlers = self.message_handlers.get(device_id, {})
        if msg_type in handlers:
            for handler in handlers[msg_type]:
                try:
                    await handler(message)
                except Exception as e:
                    logger.error(f"Message handler error: {e}")
    
    async def _heartbeat_loop(self, device_id: str):
        """Send periodic heartbeats."""
        try:
            while device_id in self.connections:
                await self._send_message(device_id, {
                    'type': AndroidAutoMessageType.HEARTBEAT.value,
                    'timestamp': datetime.utcnow().isoformat()
                })
                await asyncio.sleep(self.HEARTBEAT_INTERVAL)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Heartbeat error: {e}")
    
    async def _wait_for_message(self, device_id: str, 
                              msg_type: AndroidAutoMessageType,
                              timeout: float = 30.0) -> Optional[Dict[str, Any]]:
        """Wait for specific message type."""
        future = asyncio.Future()
        
        async def handler(message: Dict):
            if message.get('type') == msg_type.value:
                future.set_result(message)
        
        # Add temporary handler
        self.add_message_handler(device_id, msg_type.value, handler)
        
        try:
            return await asyncio.wait_for(future, timeout=timeout)
        except asyncio.TimeoutError:
            return None
        finally:
            self.remove_message_handler(device_id, msg_type.value, handler)
    
    async def _handle_sensor_data(self, device_id: str, data: Dict[str, Any]):
        """Handle vehicle sensor data."""
        if device_id not in self.vehicle_data:
            self.vehicle_data[device_id] = VehicleData()
            
        vehicle = self.vehicle_data[device_id]
        
        # Update vehicle data
        for field, value in data.items():
            if hasattr(vehicle, field):
                setattr(vehicle, field, value)
                
        vehicle.last_updated = datetime.utcnow()
        
        logger.debug(f"Updated vehicle data for {device_id}")
    
    async def _handle_media_control(self, device_id: str, data: Dict[str, Any]):
        """Handle media control commands."""
        command = data.get('command')
        
        # Process media commands
        if command == 'play':
            await self.play_media(device_id, data.get('uri'))
        elif command == 'pause':
            await self.pause_media(device_id)
        elif command == 'next':
            await self.next_track(device_id)
        elif command == 'previous':
            await self.previous_track(device_id)
        elif command == 'volume':
            await self.set_volume(device_id, data.get('level'))
    
    # Public API methods
    
    def add_message_handler(self, device_id: str, msg_type: int, handler: Callable):
        """Add message handler for specific message type."""
        if device_id not in self.message_handlers:
            self.message_handlers[device_id] = {}
        if msg_type not in self.message_handlers[device_id]:
            self.message_handlers[device_id][msg_type] = []
        self.message_handlers[device_id][msg_type].append(handler)
    
    def remove_message_handler(self, device_id: str, msg_type: int, handler: Callable):
        """Remove message handler."""
        if device_id in self.message_handlers and \
           msg_type in self.message_handlers[device_id]:
            self.message_handlers[device_id][msg_type].remove(handler)
    
    async def start_navigation(self, device_id: str, destination: str,
                             waypoints: List[str] = None) -> bool:
        """Start navigation to destination."""
        message = {
            'type': AndroidAutoMessageType.NAVIGATION.value,
            'command': 'start_navigation',
            'data': {
                'destination': destination,
                'waypoints': waypoints or [],
                'timestamp': datetime.utcnow().isoformat()
            }
        }
        
        await self._send_message(device_id, message)
        
        # Wait for confirmation
        response = await self._wait_for_message(
            device_id,
            AndroidAutoMessageType.NAVIGATION,
            timeout=5.0
        )
        
        return response and response.get('status') == 'ok'
    
    async def make_phone_call(self, device_id: str, number: str) -> bool:
        """Initiate phone call."""
        message = {
            'type': AndroidAutoMessageType.PHONE.value,
            'command': 'call',
            'data': {
                'number': number,
                'timestamp': datetime.utcnow().isoformat()
            }
        }
        
        await self._send_message(device_id, message)
        return True
    
    async def send_notification(self, device_id: str, title: str, 
                              text: str, priority: str = 'normal') -> bool:
        """Send notification to Android Auto."""
        message = {
            'type': AndroidAutoMessageType.NOTIFICATION.value,
            'data': {
                'title': title,
                'text': text,
                'priority': priority,
                'timestamp': datetime.utcnow().isoformat()
            }
        }
        
        await self._send_message(device_id, message)
        return True
    
    async def activate_voice_assistant(self, device_id: str) -> bool:
        """Activate Google Assistant."""
        message = {
            'type': AndroidAutoMessageType.VOICE.value,
            'command': 'activate',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        await self._send_message(device_id, message)
        return True
    
    async def play_media(self, device_id: str, uri: str) -> bool:
        """Play media content."""
        message = {
            'type': AndroidAutoMessageType.MEDIA_CONTROL.value,
            'command': 'play',
            'data': {
                'uri': uri,
                'timestamp': datetime.utcnow().isoformat()
            }
        }
        
        await self._send_message(device_id, message)
        return True
    
    async def pause_media(self, device_id: str) -> bool:
        """Pause media playback."""
        message = {
            'type': AndroidAutoMessageType.MEDIA_CONTROL.value,
            'command': 'pause',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        await self._send_message(device_id, message)
        return True
    
    async def next_track(self, device_id: str) -> bool:
        """Skip to next track."""
        message = {
            'type': AndroidAutoMessageType.MEDIA_CONTROL.value,
            'command': 'next',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        await self._send_message(device_id, message)
        return True
    
    async def previous_track(self, device_id: str) -> bool:
        """Go to previous track."""
        message = {
            'type': AndroidAutoMessageType.MEDIA_CONTROL.value,
            'command': 'previous',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        await self._send_message(device_id, message)
        return True
    
    async def set_volume(self, device_id: str, level: int) -> bool:
        """Set volume level (0-100)."""
        message = {
            'type': AndroidAutoMessageType.MEDIA_CONTROL.value,
            'command': 'volume',
            'data': {
                'level': max(0, min(100, level)),
                'timestamp': datetime.utcnow().isoformat()
            }
        }
        
        await self._send_message(device_id, message)
        return True
    
    async def get_vehicle_data(self, device_id: str) -> Optional[VehicleData]:
        """Get current vehicle data."""
        return self.vehicle_data.get(device_id)


class CarPlayProtocol:
    """Apple CarPlay protocol implementation."""
    
    def __init__(self):
        """Initialize CarPlay protocol handler."""
        self.sessions = {}
        self.screen_info = {}
        self.message_handlers = {}
        
        # Protocol constants
        self.PROTOCOL_VERSION = 2
        self.SCREEN_UPDATE_RATE = 60  # FPS
        self.MAX_FRAME_SIZE = 1048576  # 1MB
        
    async def connect(self, device: IoTDevice, **kwargs) -> bool:
        """Connect to CarPlay head unit."""
        try:
            # Connection parameters
            host = kwargs.get('host', device.ip_address)
            port = kwargs.get('port', 7000)  # Default CarPlay port
            
            # Create socket with SSL
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.setblocking(False)
            sock = ssl_context.wrap_socket(sock)
            
            # Connect
            await asyncio.get_event_loop().sock_connect(sock, (host, port))
            
            # Store session
            self.sessions[device.device_id] = {
                'socket': sock,
                'device': device,
                'authenticated': False,
                'screen_width': 0,
                'screen_height': 0,
                'supports_multitouch': False,
                'supports_knob': False,
                'message_queue': asyncio.Queue()
            }
            
            # Perform handshake
            await self._handshake(device.device_id)
            
            # Start message processor
            asyncio.create_task(self._process_messages(device.device_id))
            
            logger.info(f"CarPlay connected to {device.device_id}")
            return True
            
        except Exception as e:
            logger.error(f"CarPlay connection failed: {e}")
            return False
    
    async def disconnect(self, device_id: str) -> bool:
        """Disconnect from CarPlay."""
        if device_id not in self.sessions:
            return False
            
        try:
            session = self.sessions[device_id]
            
            # Close socket
            session['socket'].close()
            
            # Cleanup
            del self.sessions[device_id]
            if device_id in self.screen_info:
                del self.screen_info[device_id]
                
            logger.info(f"CarPlay disconnected from {device_id}")
            return True
            
        except Exception as e:
            logger.error(f"CarPlay disconnect error: {e}")
            return False
    
    async def _handshake(self, device_id: str):
        """Perform CarPlay handshake."""
        session = self.sessions[device_id]
        
        # Send handshake
        handshake_msg = {
            'type': CarPlayMessageType.HANDSHAKE.value,
            'version': self.PROTOCOL_VERSION,
            'device_id': device_id,
            'capabilities': [
                'audio', 'phone', 'messaging',
                'maps', 'nowplaying', 'siri'
            ]
        }
        
        await self._send_message(device_id, handshake_msg)
        
        # Wait for response
        response = await self._wait_for_message(
            device_id,
            CarPlayMessageType.HANDSHAKE,
            timeout=10.0
        )
        
        if response:
            # Get screen info
            screen_msg = await self._wait_for_message(
                device_id,
                CarPlayMessageType.SCREEN_INFO,
                timeout=5.0
            )
            
            if screen_msg:
                session['screen_width'] = screen_msg.get('width', 800)
                session['screen_height'] = screen_msg.get('height', 480)
                session['supports_multitouch'] = screen_msg.get('multitouch', False)
                session['supports_knob'] = screen_msg.get('knob', False)
                session['authenticated'] = True
                
                logger.info(f"CarPlay handshake complete for {device_id}")
            else:
                raise IoTDeviceError("Failed to get screen info")
        else:
            raise IoTDeviceError("CarPlay handshake failed")
    
    async def _send_message(self, device_id: str, message: Dict[str, Any]):
        """Send message to CarPlay head unit."""
        if device_id not in self.sessions:
            raise IoTDeviceError(f"Device {device_id} not connected")
            
        session = self.sessions[device_id]
        sock = session['socket']
        
        # Serialize message
        data = json.dumps(message).encode('utf-8')
        
        # Create packet with header
        header = struct.pack('>HI', message['type'], len(data))
        packet = header + data
        
        # Send packet
        await asyncio.get_event_loop().sock_sendall(sock, packet)
    
    async def _process_messages(self, device_id: str):
        """Process incoming CarPlay messages."""
        if device_id not in self.sessions:
            return
            
        session = self.sessions[device_id]
        sock = session['socket']
        loop = asyncio.get_event_loop()
        
        try:
            while device_id in self.sessions:
                # Read header
                header_data = await self._recv_exact(sock, 6)
                if not header_data:
                    break
                    
                msg_type, length = struct.unpack('>HI', header_data)
                
                if length > self.MAX_FRAME_SIZE:
                    logger.error(f"Frame too large: {length}")
                    break
                
                # Read data
                data = await self._recv_exact(sock, length)
                if not data:
                    break
                
                # Parse message
                try:
                    message = json.loads(data.decode('utf-8'))
                    message['type'] = msg_type
                    await self._handle_message(device_id, message)
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON from CarPlay: {e}")
                    
        except Exception as e:
            logger.error(f"CarPlay receive error: {e}")
        finally:
            await self.disconnect(device_id)
    
    async def _recv_exact(self, sock: socket.socket, length: int) -> bytes:
        """Receive exact number of bytes."""
        data = b''
        loop = asyncio.get_event_loop()
        
        while len(data) < length:
            chunk = await loop.sock_recv(sock, length - len(data))
            if not chunk:
                return b''
            data += chunk
            
        return data
    
    async def _handle_message(self, device_id: str, message: Dict[str, Any]):
        """Handle incoming CarPlay message."""
        msg_type = message.get('type')
        
        # Route by message type
        if msg_type == CarPlayMessageType.TOUCH_EVENT.value:
            await self._handle_touch_event(device_id, message.get('data', {}))
            
        elif msg_type == CarPlayMessageType.SIRI.value:
            await self._handle_siri_request(device_id, message.get('data', {}))
            
        # Add to queue for handlers
        if device_id in self.sessions:
            await self.sessions[device_id]['message_queue'].put(message)
        
        # Call custom handlers
        handlers = self.message_handlers.get(device_id, {})
        if msg_type in handlers:
            for handler in handlers[msg_type]:
                try:
                    await handler(message)
                except Exception as e:
                    logger.error(f"Message handler error: {e}")
    
    async def _wait_for_message(self, device_id: str,
                              msg_type: CarPlayMessageType,
                              timeout: float = 30.0) -> Optional[Dict[str, Any]]:
        """Wait for specific message type."""
        if device_id not in self.sessions:
            return None
            
        queue = self.sessions[device_id]['message_queue']
        start_time = asyncio.get_event_loop().time()
        
        while asyncio.get_event_loop().time() - start_time < timeout:
            try:
                message = await asyncio.wait_for(queue.get(), timeout=1.0)
                if message.get('type') == msg_type.value:
                    return message
                else:
                    # Put back if not the right type
                    await queue.put(message)
            except asyncio.TimeoutError:
                continue
                
        return None
    
    async def _handle_touch_event(self, device_id: str, data: Dict[str, Any]):
        """Handle touch event from CarPlay."""
        # Process touch coordinates
        x = data.get('x', 0)
        y = data.get('y', 0)
        event_type = data.get('event_type', 'tap')
        
        logger.debug(f"Touch event: {event_type} at ({x}, {y})")
    
    async def _handle_siri_request(self, device_id: str, data: Dict[str, Any]):
        """Handle Siri voice request."""
        command = data.get('command', '')
        logger.info(f"Siri command: {command}")
    
    # Public API methods
    
    def add_message_handler(self, device_id: str, msg_type: int, handler: Callable):
        """Add message handler for specific message type."""
        if device_id not in self.message_handlers:
            self.message_handlers[device_id] = {}
        if msg_type not in self.message_handlers[device_id]:
            self.message_handlers[device_id][msg_type] = []
        self.message_handlers[device_id][msg_type].append(handler)
    
    def remove_message_handler(self, device_id: str, msg_type: int, handler: Callable):
        """Remove message handler."""
        if device_id in self.message_handlers and \
           msg_type in self.message_handlers[device_id]:
            self.message_handlers[device_id][msg_type].remove(handler)
    
    async def show_maps(self, device_id: str, destination: str,
                       current_location: Tuple[float, float] = None) -> bool:
        """Show maps with navigation."""
        message = {
            'type': CarPlayMessageType.MAPS.value,
            'command': 'show_route',
            'data': {
                'destination': destination,
                'current_location': current_location,
                'timestamp': datetime.utcnow().isoformat()
            }
        }
        
        await self._send_message(device_id, message)
        return True
    
    async def play_audio(self, device_id: str, audio_url: str,
                        metadata: Dict[str, str] = None) -> bool:
        """Play audio content."""
        message = {
            'type': CarPlayMessageType.MEDIA_PLAYBACK.value,
            'command': 'play',
            'data': {
                'url': audio_url,
                'metadata': metadata or {},
                'timestamp': datetime.utcnow().isoformat()
            }
        }
        
        await self._send_message(device_id, message)
        return True
    
    async def handle_phone_call(self, device_id: str, 
                              action: str, number: str = None) -> bool:
        """Handle phone call actions."""
        message = {
            'type': CarPlayMessageType.PHONE_CALL.value,
            'command': action,
            'data': {
                'number': number,
                'timestamp': datetime.utcnow().isoformat()
            }
        }
        
        await self._send_message(device_id, message)
        return True
    
    async def send_message(self, device_id: str, recipient: str,
                         text: str, message_type: str = 'sms') -> bool:
        """Send message via CarPlay."""
        message = {
            'type': CarPlayMessageType.MESSAGE.value,
            'command': 'send',
            'data': {
                'recipient': recipient,
                'text': text,
                'message_type': message_type,
                'timestamp': datetime.utcnow().isoformat()
            }
        }
        
        await self._send_message(device_id, message)
        return True
    
    async def activate_siri(self, device_id: str, query: str = None) -> bool:
        """Activate Siri with optional query."""
        message = {
            'type': CarPlayMessageType.SIRI.value,
            'command': 'activate',
            'data': {
                'query': query,
                'timestamp': datetime.utcnow().isoformat()
            }
        }
        
        await self._send_message(device_id, message)
        return True
    
    async def get_screen_info(self, device_id: str) -> Dict[str, Any]:
        """Get CarPlay screen information."""
        if device_id not in self.sessions:
            return {}
            
        session = self.sessions[device_id]
        return {
            'width': session['screen_width'],
            'height': session['screen_height'],
            'supports_multitouch': session['supports_multitouch'],
            'supports_knob': session['supports_knob']
        }


# Protocol registry
AUTOMOTIVE_PROTOCOLS = {
    DeviceProtocol.ANDROID_AUTO: AndroidAutoProtocol(),
    DeviceProtocol.APPLE_CARPLAY: CarPlayProtocol()
}


def get_automotive_protocol(protocol: DeviceProtocol):
    """Get automotive protocol handler."""
    return AUTOMOTIVE_PROTOCOLS.get(protocol)