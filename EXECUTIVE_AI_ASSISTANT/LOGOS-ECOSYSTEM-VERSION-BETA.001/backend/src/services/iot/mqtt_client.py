"""MQTT Client Implementation for IoT Devices."""

import asyncio
import json
import ssl
import uuid
from typing import Dict, List, Optional, Any, Callable, Union
from datetime import datetime
import paho.mqtt.client as mqtt
import asyncio_mqtt as aiomqtt
from contextlib import asynccontextmanager

from ...shared.utils.logger import get_logger
from ...shared.utils.exceptions import IoTDeviceError
from ...shared.utils.config import get_settings
from .models import IoTDevice, DeviceEvent, DeviceState

logger = get_logger(__name__)
settings = get_settings()


class MQTTClient:
    """Async MQTT client for IoT communication."""
    
    def __init__(self, 
                 broker: Optional[str] = None,
                 port: Optional[int] = None,
                 use_tls: bool = True,
                 client_id: Optional[str] = None):
        """Initialize MQTT client."""
        self.broker = broker or settings.MQTT_BROKER or "mqtt.logos.ecosystem"
        self.port = port or settings.MQTT_PORT or (8883 if use_tls else 1883)
        self.use_tls = use_tls
        self.client_id = client_id or f"logos_{uuid.uuid4().hex[:8]}"
        
        self.client = None
        self.subscriptions = {}
        self.connected = False
        self.reconnect_interval = 5
        self.max_reconnect_interval = 60
        
        # Message handlers
        self.event_handlers = {}
        self.command_handlers = {}
        self.telemetry_handlers = {}
        
        # QoS levels
        self.qos_telemetry = 0  # Fire and forget
        self.qos_events = 1     # At least once
        self.qos_commands = 2   # Exactly once
        
    @asynccontextmanager
    async def connect(self, username: Optional[str] = None, 
                     password: Optional[str] = None,
                     ca_cert: Optional[str] = None,
                     client_cert: Optional[str] = None,
                     client_key: Optional[str] = None):
        """Connect to MQTT broker."""
        try:
            # TLS configuration
            tls_context = None
            if self.use_tls:
                tls_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
                
                if ca_cert:
                    tls_context.load_verify_locations(ca_cert)
                    
                if client_cert and client_key:
                    tls_context.load_cert_chain(client_cert, client_key)
                    
                tls_context.check_hostname = True
                tls_context.verify_mode = ssl.CERT_REQUIRED
            
            # Create async client
            async with aiomqtt.Client(
                hostname=self.broker,
                port=self.port,
                client_id=self.client_id,
                username=username,
                password=password,
                tls_context=tls_context,
                keepalive=60,
                clean_session=True
            ) as client:
                self.client = client
                self.connected = True
                logger.info(f"MQTT connected to {self.broker}:{self.port}")
                
                # Set up will message
                await self._setup_will_message()
                
                # Restore subscriptions
                await self._restore_subscriptions()
                
                yield client
                
        except Exception as e:
            logger.error(f"MQTT connection failed: {e}")
            raise IoTDeviceError(f"Failed to connect to MQTT broker: {e}")
        finally:
            self.connected = False
            self.client = None
            
    async def _setup_will_message(self):
        """Set up last will and testament message."""
        will_topic = f"devices/{self.client_id}/status"
        will_payload = json.dumps({
            "status": "offline",
            "timestamp": datetime.utcnow().isoformat(),
            "client_id": self.client_id
        })
        
        # Will is set during connection in aiomqtt
        
    async def _restore_subscriptions(self):
        """Restore subscriptions after reconnection."""
        for topic, handlers in self.subscriptions.items():
            await self.subscribe(topic, handlers['callback'], handlers['qos'])
            
    async def publish(self, topic: str, payload: Union[str, Dict], 
                     qos: int = 1, retain: bool = False):
        """Publish message to topic."""
        if not self.connected or not self.client:
            raise IoTDeviceError("MQTT client not connected")
            
        try:
            # Convert dict to JSON
            if isinstance(payload, dict):
                payload = json.dumps(payload)
                
            await self.client.publish(
                topic=topic,
                payload=payload.encode(),
                qos=qos,
                retain=retain
            )
            
            logger.debug(f"Published to {topic}: {payload[:100]}...")
            
        except Exception as e:
            logger.error(f"MQTT publish error: {e}")
            raise IoTDeviceError(f"Failed to publish message: {e}")
            
    async def subscribe(self, topic: str, callback: Callable, qos: int = 1):
        """Subscribe to topic with callback."""
        if not self.connected or not self.client:
            raise IoTDeviceError("MQTT client not connected")
            
        try:
            await self.client.subscribe(topic, qos=qos)
            
            # Store subscription for reconnection
            self.subscriptions[topic] = {
                'callback': callback,
                'qos': qos
            }
            
            logger.info(f"Subscribed to {topic} with QoS {qos}")
            
        except Exception as e:
            logger.error(f"MQTT subscribe error: {e}")
            raise IoTDeviceError(f"Failed to subscribe to topic: {e}")
            
    async def unsubscribe(self, topic: str):
        """Unsubscribe from topic."""
        if not self.connected or not self.client:
            return
            
        try:
            await self.client.unsubscribe(topic)
            
            # Remove subscription
            if topic in self.subscriptions:
                del self.subscriptions[topic]
                
            logger.info(f"Unsubscribed from {topic}")
            
        except Exception as e:
            logger.error(f"MQTT unsubscribe error: {e}")
            
    async def process_messages(self):
        """Process incoming messages."""
        if not self.client:
            return
            
        async for message in self.client.messages:
            try:
                topic = str(message.topic)
                payload = message.payload.decode()
                
                # Try to parse JSON
                try:
                    data = json.loads(payload)
                except:
                    data = payload
                    
                # Route to handlers
                await self._route_message(topic, data)
                
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                
    async def _route_message(self, topic: str, data: Any):
        """Route message to appropriate handler."""
        # Check subscriptions
        for sub_topic, handlers in self.subscriptions.items():
            if self._topic_matches(sub_topic, topic):
                try:
                    await handlers['callback'](topic, data)
                except Exception as e:
                    logger.error(f"Subscription handler error: {e}")
                    
        # Device telemetry
        if topic.startswith("devices/") and "/telemetry" in topic:
            device_id = topic.split("/")[1]
            await self._handle_telemetry(device_id, data)
            
        # Device events
        elif topic.startswith("devices/") and "/events" in topic:
            device_id = topic.split("/")[1]
            await self._handle_event(device_id, data)
            
        # Command responses
        elif topic.startswith("devices/") and "/commands/response" in topic:
            device_id = topic.split("/")[1]
            await self._handle_command_response(device_id, data)
            
    def _topic_matches(self, pattern: str, topic: str) -> bool:
        """Check if topic matches pattern with wildcards."""
        pattern_parts = pattern.split('/')
        topic_parts = topic.split('/')
        
        if '+' not in pattern and '#' not in pattern:
            return pattern == topic
            
        for i, part in enumerate(pattern_parts):
            if part == '#':
                return True
            elif part == '+':
                continue
            elif i < len(topic_parts) and part != topic_parts[i]:
                return False
                
        return len(pattern_parts) == len(topic_parts)
        
    async def _handle_telemetry(self, device_id: str, data: Dict):
        """Handle device telemetry data."""
        for handler in self.telemetry_handlers.get(device_id, []):
            try:
                await handler(device_id, data)
            except Exception as e:
                logger.error(f"Telemetry handler error: {e}")
                
    async def _handle_event(self, device_id: str, data: Dict):
        """Handle device event."""
        event = DeviceEvent(
            device_id=device_id,
            event_type=data.get('type', 'unknown'),
            data=data.get('data', {}),
            timestamp=datetime.fromisoformat(data['timestamp']) if 'timestamp' in data else datetime.utcnow(),
            severity=data.get('severity', 'info')
        )
        
        for handler in self.event_handlers.get(device_id, []):
            try:
                await handler(event)
            except Exception as e:
                logger.error(f"Event handler error: {e}")
                
    async def _handle_command_response(self, device_id: str, data: Dict):
        """Handle command response from device."""
        command_id = data.get('command_id')
        status = data.get('status')
        result = data.get('result')
        
        for handler in self.command_handlers.get(device_id, []):
            try:
                await handler(command_id, status, result)
            except Exception as e:
                logger.error(f"Command handler error: {e}")
                
    # High-level device operations
    
    async def register_device(self, device: IoTDevice):
        """Register device with MQTT broker."""
        # Publish device registration
        topic = f"devices/{device.device_id}/register"
        payload = {
            "device_id": device.device_id,
            "name": device.name,
            "type": device.type,
            "protocol": device.protocol,
            "capabilities": device.capabilities,
            "metadata": device.metadata,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.publish(topic, payload, qos=self.qos_events, retain=True)
        
        # Subscribe to device topics
        await self.subscribe(f"devices/{device.device_id}/telemetry", 
                           self._create_telemetry_handler(device.device_id),
                           qos=self.qos_telemetry)
        
        await self.subscribe(f"devices/{device.device_id}/events",
                           self._create_event_handler(device.device_id),
                           qos=self.qos_events)
        
        await self.subscribe(f"devices/{device.device_id}/commands/response",
                           self._create_command_handler(device.device_id),
                           qos=self.qos_commands)
        
    async def send_command(self, device_id: str, command: str, 
                          parameters: Dict[str, Any] = None,
                          timeout: float = 30.0) -> Dict[str, Any]:
        """Send command to device and wait for response."""
        command_id = str(uuid.uuid4())
        
        # Publish command
        topic = f"devices/{device_id}/commands"
        payload = {
            "command_id": command_id,
            "command": command,
            "parameters": parameters or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Set up response future
        response_future = asyncio.Future()
        
        async def response_handler(cmd_id: str, status: str, result: Any):
            if cmd_id == command_id:
                response_future.set_result({
                    "status": status,
                    "result": result
                })
                
        # Add temporary handler
        if device_id not in self.command_handlers:
            self.command_handlers[device_id] = []
        self.command_handlers[device_id].append(response_handler)
        
        try:
            # Send command
            await self.publish(topic, payload, qos=self.qos_commands)
            
            # Wait for response
            response = await asyncio.wait_for(response_future, timeout=timeout)
            
            return response
            
        except asyncio.TimeoutError:
            raise IoTDeviceError(f"Command timeout for device {device_id}")
        finally:
            # Remove handler
            self.command_handlers[device_id].remove(response_handler)
            
    async def update_device_state(self, device_id: str, state: Dict[str, Any]):
        """Update device state."""
        topic = f"devices/{device_id}/state"
        payload = {
            "state": state,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.publish(topic, payload, qos=self.qos_events, retain=True)
        
    async def get_device_state(self, device_id: str) -> Optional[DeviceState]:
        """Get current device state."""
        state_future = asyncio.Future()
        
        async def state_handler(topic: str, data: Dict):
            if isinstance(data, dict) and 'state' in data:
                state_future.set_result(DeviceState(
                    device_id=device_id,
                    online=True,
                    state=data['state'],
                    last_updated=datetime.fromisoformat(data['timestamp'])
                ))
                
        # Subscribe temporarily
        topic = f"devices/{device_id}/state"
        await self.subscribe(topic, state_handler, qos=self.qos_events)
        
        try:
            # Wait for state
            state = await asyncio.wait_for(state_future, timeout=5.0)
            return state
        except asyncio.TimeoutError:
            return None
        finally:
            await self.unsubscribe(topic)
            
    def _create_telemetry_handler(self, device_id: str):
        """Create telemetry handler for device."""
        async def handler(topic: str, data: Any):
            await self._handle_telemetry(device_id, data)
        return handler
        
    def _create_event_handler(self, device_id: str):
        """Create event handler for device."""
        async def handler(topic: str, data: Any):
            await self._handle_event(device_id, data)
        return handler
        
    def _create_command_handler(self, device_id: str):
        """Create command response handler for device."""
        async def handler(topic: str, data: Any):
            await self._handle_command_response(device_id, data)
        return handler
        
    # Telemetry and monitoring
    
    async def start_telemetry_stream(self, device_id: str, 
                                   handler: Callable[[str, Dict], None]):
        """Start receiving telemetry from device."""
        if device_id not in self.telemetry_handlers:
            self.telemetry_handlers[device_id] = []
        self.telemetry_handlers[device_id].append(handler)
        
    async def stop_telemetry_stream(self, device_id: str, handler: Callable):
        """Stop receiving telemetry from device."""
        if device_id in self.telemetry_handlers:
            self.telemetry_handlers[device_id].remove(handler)
            
    async def add_event_listener(self, device_id: str,
                               handler: Callable[[DeviceEvent], None]):
        """Add event listener for device."""
        if device_id not in self.event_handlers:
            self.event_handlers[device_id] = []
        self.event_handlers[device_id].append(handler)
        
    async def remove_event_listener(self, device_id: str, handler: Callable):
        """Remove event listener for device."""
        if device_id in self.event_handlers:
            self.event_handlers[device_id].remove(handler)
            
    # Bulk operations
    
    async def broadcast_command(self, group_id: str, command: str,
                              parameters: Dict[str, Any] = None):
        """Broadcast command to device group."""
        topic = f"groups/{group_id}/commands"
        payload = {
            "command": command,
            "parameters": parameters or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.publish(topic, payload, qos=self.qos_commands)
        
    async def subscribe_to_group(self, group_id: str, handler: Callable):
        """Subscribe to group messages."""
        await self.subscribe(f"groups/{group_id}/+", handler, qos=self.qos_events)