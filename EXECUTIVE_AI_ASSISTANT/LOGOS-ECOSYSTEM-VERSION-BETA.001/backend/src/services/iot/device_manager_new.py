"""IoT Device Manager for managing device lifecycle and connections."""

import asyncio
import json
from typing import Dict, List, Optional, Any, Set, Callable
from datetime import datetime, timedelta
import uuid

from ...shared.utils.logger import get_logger
from ...shared.utils.exceptions import IoTDeviceError, DeviceConnectionError
from ...shared.utils.config import get_settings
from ...infrastructure.database.query_optimizer import get_db
from ...infrastructure.cache.multi_level import MultiLevelCache
from .models import (
    IoTDevice, DeviceProtocol, DeviceStatus, DeviceType,
    DeviceState, DeviceEvent, DeviceDiscovery, DeviceCapability
)
from .protocol_handlers import get_protocol_handler
from .automotive_protocols import get_automotive_protocol

logger = get_logger(__name__)
settings = get_settings()


class DeviceManager:
    """Manages IoT devices and their connections."""
    
    def __init__(self, cache: Optional[MultiLevelCache] = None):
        """Initialize device manager."""
        self.cache = cache or MultiLevelCache()
        
        # Device registry
        self.devices: Dict[str, IoTDevice] = {}
        self.device_connections: Dict[str, Any] = {}
        self.device_handlers: Dict[str, Any] = {}
        
        # Event handlers
        self.event_handlers: Dict[str, List[Callable]] = {}
        
        # Discovery
        self.discovery_enabled = True
        self.discovery_tasks: Dict[DeviceProtocol, asyncio.Task] = {}
        
        # Health monitoring
        self.health_check_interval = 60  # seconds
        self.health_check_task = None
        
    async def start(self):
        """Start device manager."""
        # Load devices from database
        await self._load_devices()
        
        # Start health monitoring
        self.health_check_task = asyncio.create_task(self._health_check_loop())
        
        # Start discovery if enabled
        if self.discovery_enabled:
            await self.start_discovery()
            
        logger.info("Device manager started")
        
    async def stop(self):
        """Stop device manager."""
        # Stop discovery
        await self.stop_discovery()
        
        # Stop health monitoring
        if self.health_check_task:
            self.health_check_task.cancel()
            
        # Disconnect all devices
        for device_id in list(self.devices.keys()):
            await self.disconnect_device(device_id)
            
        logger.info("Device manager stopped")
        
    async def _load_devices(self):
        """Load devices from database."""
        async with get_db() as db:
            rows = await db.fetch(
                """
                SELECT * FROM iot_devices
                WHERE enabled = true
                """
            )
            
            for row in rows:
                device = IoTDevice(
                    device_id=row['device_id'],
                    name=row['name'],
                    type=DeviceType(row['device_type']),
                    protocol=DeviceProtocol(row['protocol']),
                    manufacturer=row['manufacturer'],
                    model=row['model'],
                    firmware_version=row['firmware_version'],
                    hardware_version=row['hardware_version'],
                    serial_number=row['serial_number'],
                    ip_address=row['ip_address'],
                    mac_address=row['mac_address'],
                    port=row['port'],
                    auth_token=row['auth_token'],
                    api_key=row['api_key'],
                    username=row['username'],
                    password=row['password'],
                    capabilities=json.loads(row['capabilities']) if row['capabilities'] else [],
                    attributes=json.loads(row['attributes']) if row['attributes'] else {},
                    metadata=json.loads(row['metadata']) if row['metadata'] else {},
                    encryption_key=row['encryption_key'],
                    certificate=row['certificate'],
                    location=row['location'],
                    room=row['room'],
                    groups=json.loads(row['groups']) if row['groups'] else [],
                    tags=json.loads(row['tags']) if row['tags'] else []
                )
                
                self.devices[device.device_id] = device
                
                # Auto-connect if configured
                if row.get('auto_connect', False):
                    asyncio.create_task(self.connect_device(device.device_id))
                    
    # Device management
    
    async def register_device(self, device: IoTDevice) -> str:
        """Register new device."""
        # Validate device
        if not device.device_id:
            device.device_id = str(uuid.uuid4())
            
        if device.device_id in self.devices:
            raise IoTDeviceError(f"Device {device.device_id} already registered")
            
        # Store in database
        async with get_db() as db:
            await db.execute(
                """
                INSERT INTO iot_devices
                (device_id, name, device_type, protocol, manufacturer, model,
                 firmware_version, hardware_version, serial_number,
                 ip_address, mac_address, port, auth_token, api_key,
                 username, password, capabilities, attributes, metadata,
                 encryption_key, certificate, location, room, groups, tags,
                 created_at, enabled)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
                        $23, $24, $25, $26, $27)
                """,
                device.device_id, device.name, device.type.value, device.protocol.value,
                device.manufacturer, device.model, device.firmware_version,
                device.hardware_version, device.serial_number, device.ip_address,
                device.mac_address, device.port, device.auth_token, device.api_key,
                device.username, device.password,
                json.dumps([c.value for c in device.capabilities]),
                json.dumps(device.attributes), json.dumps(device.metadata),
                device.encryption_key, device.certificate, device.location,
                device.room, json.dumps(device.groups), json.dumps(device.tags),
                device.created_at, True
            )
            
        # Add to registry
        self.devices[device.device_id] = device
        
        # Cache device
        await self.cache.set(
            f"device:{device.device_id}",
            device.dict(),
            ttl=3600
        )
        
        logger.info(f"Device {device.device_id} registered")
        return device.device_id
        
    async def unregister_device(self, device_id: str):
        """Unregister device."""
        if device_id not in self.devices:
            raise IoTDeviceError(f"Device {device_id} not found")
            
        # Disconnect first
        await self.disconnect_device(device_id)
        
        # Remove from database
        async with get_db() as db:
            await db.execute(
                "UPDATE iot_devices SET enabled = false WHERE device_id = $1",
                device_id
            )
            
        # Remove from registry
        del self.devices[device_id]
        
        # Clear cache
        await self.cache.delete(f"device:{device_id}")
        
        logger.info(f"Device {device_id} unregistered")
        
    async def get_device(self, device_id: str) -> Optional[IoTDevice]:
        """Get device by ID."""
        # Check cache first
        cached = await self.cache.get(f"device:{device_id}")
        if cached:
            return IoTDevice(**cached)
            
        return self.devices.get(device_id)
        
    async def list_devices(self, filters: Optional[Dict[str, Any]] = None) -> List[IoTDevice]:
        """List devices with optional filters."""
        devices = list(self.devices.values())
        
        if filters:
            # Filter by type
            if 'type' in filters:
                devices = [d for d in devices if d.type == filters['type']]
                
            # Filter by protocol
            if 'protocol' in filters:
                devices = [d for d in devices if d.protocol == filters['protocol']]
                
            # Filter by status
            if 'status' in filters:
                devices = [d for d in devices if d.status == filters['status']]
                
            # Filter by location
            if 'location' in filters:
                devices = [d for d in devices if d.location == filters['location']]
                
            # Filter by room
            if 'room' in filters:
                devices = [d for d in devices if d.room == filters['room']]
                
            # Filter by group
            if 'group' in filters:
                devices = [d for d in devices if filters['group'] in d.groups]
                
            # Filter by tag
            if 'tag' in filters:
                devices = [d for d in devices if filters['tag'] in d.tags]
                
            # Filter by capability
            if 'capability' in filters:
                cap = DeviceCapability(filters['capability'])
                devices = [d for d in devices if cap in d.capabilities]
                
        return devices
        
    async def update_device(self, device_id: str, updates: Dict[str, Any]):
        """Update device information."""
        device = await self.get_device(device_id)
        if not device:
            raise IoTDeviceError(f"Device {device_id} not found")
            
        # Update fields
        for field, value in updates.items():
            if hasattr(device, field):
                setattr(device, field, value)
                
        device.last_updated = datetime.utcnow()
        
        # Update database
        async with get_db() as db:
            # Build update query dynamically
            update_fields = []
            params = []
            param_count = 1
            
            for field, value in updates.items():
                if field in ['capabilities', 'attributes', 'metadata', 'groups', 'tags']:
                    value = json.dumps(value)
                update_fields.append(f"{field} = ${param_count}")
                params.append(value)
                param_count += 1
                
            params.append(device_id)
            
            if update_fields:
                query = f"""
                    UPDATE iot_devices 
                    SET {', '.join(update_fields)}, last_updated = NOW()
                    WHERE device_id = ${param_count}
                """
                await db.execute(query, *params)
                
        # Update cache
        await self.cache.set(
            f"device:{device_id}",
            device.dict(),
            ttl=3600
        )
        
    # Connection management
    
    async def connect_device(self, device_id: str, **kwargs) -> bool:
        """Connect to device."""
        device = await self.get_device(device_id)
        if not device:
            raise IoTDeviceError(f"Device {device_id} not found")
            
        # Check if already connected
        if device_id in self.device_connections:
            logger.warning(f"Device {device_id} already connected")
            return True
            
        # Get protocol handler
        if device.protocol in [DeviceProtocol.ANDROID_AUTO, DeviceProtocol.APPLE_CARPLAY]:
            handler = get_automotive_protocol(device.protocol)
        else:
            handler = get_protocol_handler(device.protocol)
            
        if not handler:
            raise IoTDeviceError(f"No handler for protocol {device.protocol}")
            
        # Update status
        device.status = DeviceStatus.CONNECTING
        
        try:
            # Connect using protocol handler
            connected = await handler.connect(device, **kwargs)
            
            if connected:
                device.status = DeviceStatus.ONLINE
                device.last_seen = datetime.utcnow()
                
                # Store connection info
                self.device_connections[device_id] = handler
                self.device_handlers[device_id] = handler
                
                # Update database
                await self._update_device_status(device_id, DeviceStatus.ONLINE)
                
                # Fire connected event
                await self._fire_device_event(DeviceEvent(
                    device_id=device_id,
                    event_type='connected',
                    data={'protocol': device.protocol.value}
                ))
                
                logger.info(f"Device {device_id} connected via {device.protocol}")
                return True
            else:
                device.status = DeviceStatus.ERROR
                return False
                
        except Exception as e:
            device.status = DeviceStatus.ERROR
            logger.error(f"Failed to connect device {device_id}: {e}")
            raise IoTDeviceError(f"Connection failed: {e}")
            
    async def disconnect_device(self, device_id: str) -> bool:
        """Disconnect from device."""
        if device_id not in self.device_connections:
            return False
            
        device = await self.get_device(device_id)
        if not device:
            return False
            
        try:
            # Get handler
            handler = self.device_handlers.get(device_id)
            if handler:
                await handler.disconnect(device_id)
                
            # Update status
            device.status = DeviceStatus.OFFLINE
            
            # Remove connection info
            del self.device_connections[device_id]
            del self.device_handlers[device_id]
            
            # Update database
            await self._update_device_status(device_id, DeviceStatus.OFFLINE)
            
            # Fire disconnected event
            await self._fire_device_event(DeviceEvent(
                device_id=device_id,
                event_type='disconnected',
                data={}
            ))
            
            logger.info(f"Device {device_id} disconnected")
            return True
            
        except Exception as e:
            logger.error(f"Failed to disconnect device {device_id}: {e}")
            return False
            
    async def _update_device_status(self, device_id: str, status: DeviceStatus):
        """Update device status in database."""
        async with get_db() as db:
            await db.execute(
                """
                UPDATE iot_devices
                SET status = $1, last_seen = $2
                WHERE device_id = $3
                """,
                status.value,
                datetime.utcnow() if status == DeviceStatus.ONLINE else None,
                device_id
            )
            
    # Command and control
    
    async def send_command(self, device_id: str, command: str,
                         parameters: Dict[str, Any] = None) -> Any:
        """Send command to device."""
        if device_id not in self.device_connections:
            raise DeviceConnectionError(f"Device {device_id} not connected")
            
        handler = self.device_handlers.get(device_id)
        if not handler:
            raise IoTDeviceError(f"No handler for device {device_id}")
            
        # Protocol-specific command sending
        device = await self.get_device(device_id)
        
        if hasattr(handler, 'send_command'):
            return await handler.send_command(device_id, command, parameters)
        elif hasattr(handler, 'publish'):
            # MQTT-style
            topic = f"devices/{device_id}/commands"
            payload = {
                'command': command,
                'parameters': parameters or {},
                'timestamp': datetime.utcnow().isoformat()
            }
            return await handler.publish(device_id, topic, payload)
        else:
            raise IoTDeviceError(f"Handler does not support commands")
            
    async def get_device_state(self, device_id: str) -> Optional[DeviceState]:
        """Get current device state."""
        # Check cache first
        cached = await self.cache.get(f"device_state:{device_id}")
        if cached:
            return DeviceState(**cached)
            
        # Query device if connected
        if device_id in self.device_connections:
            handler = self.device_handlers.get(device_id)
            
            if hasattr(handler, 'get_state'):
                state = await handler.get_state(device_id)
                
                # Cache state
                if state:
                    await self.cache.set(
                        f"device_state:{device_id}",
                        state.dict(),
                        ttl=60
                    )
                    
                return state
                
        return None
        
    # Discovery
    
    async def start_discovery(self, protocols: Optional[List[DeviceProtocol]] = None):
        """Start device discovery."""
        if protocols is None:
            protocols = [
                DeviceProtocol.MQTT,
                DeviceProtocol.COAP,
                DeviceProtocol.HTTP,
                DeviceProtocol.BLUETOOTH,
                DeviceProtocol.ZIGBEE
            ]
            
        for protocol in protocols:
            if protocol not in self.discovery_tasks:
                task = asyncio.create_task(self._discover_devices(protocol))
                self.discovery_tasks[protocol] = task
                
        logger.info(f"Started discovery for protocols: {protocols}")
        
    async def stop_discovery(self):
        """Stop device discovery."""
        for task in self.discovery_tasks.values():
            task.cancel()
            
        self.discovery_tasks.clear()
        logger.info("Stopped device discovery")
        
    async def _discover_devices(self, protocol: DeviceProtocol):
        """Discover devices for specific protocol."""
        handler = get_protocol_handler(protocol)
        if not handler or not hasattr(handler, 'discover'):
            return
            
        try:
            while True:
                try:
                    # Run discovery
                    discovered = await handler.discover()
                    
                    # Process discovered devices
                    for device_info in discovered:
                        await self._process_discovered_device(protocol, device_info)
                        
                except Exception as e:
                    logger.error(f"Discovery error for {protocol}: {e}")
                    
                # Wait before next discovery
                await asyncio.sleep(60)  # 1 minute
                
        except asyncio.CancelledError:
            pass
            
    async def _process_discovered_device(self, protocol: DeviceProtocol,
                                       device_info: Dict[str, Any]):
        """Process discovered device."""
        # Check if device already registered
        device_id = device_info.get('id') or device_info.get('address')
        
        if any(d for d in self.devices.values() 
               if d.metadata.get('discovered_id') == device_id):
            return
            
        # Create device object
        device = IoTDevice(
            name=device_info.get('name', f'Discovered {protocol} Device'),
            type=self._infer_device_type(device_info),
            protocol=protocol,
            manufacturer=device_info.get('manufacturer'),
            model=device_info.get('model'),
            ip_address=device_info.get('ip'),
            mac_address=device_info.get('mac'),
            metadata={
                'discovered': True,
                'discovered_id': device_id,
                'discovery_info': device_info
            }
        )
        
        # Fire discovery event
        await self._fire_device_event(DeviceEvent(
            device_id='discovery',
            event_type='device_discovered',
            data={
                'protocol': protocol.value,
                'device': device.dict()
            }
        ))
        
    def _infer_device_type(self, device_info: Dict[str, Any]) -> DeviceType:
        """Infer device type from discovery info."""
        name = device_info.get('name', '').lower()
        service = device_info.get('service', '').lower()
        
        # Check common patterns
        if any(x in name for x in ['light', 'bulb', 'lamp']):
            return DeviceType.LIGHT
        elif any(x in name for x in ['switch', 'plug', 'outlet']):
            return DeviceType.SWITCH
        elif 'thermostat' in name:
            return DeviceType.THERMOSTAT
        elif 'lock' in name:
            return DeviceType.LOCK
        elif any(x in name for x in ['camera', 'cam']):
            return DeviceType.CAMERA
        elif 'sensor' in name:
            return DeviceType.SENSOR
        elif any(x in name for x in ['speaker', 'audio']):
            return DeviceType.SPEAKER
        elif 'gateway' in name:
            return DeviceType.GATEWAY
        else:
            return DeviceType.CUSTOM
            
    # Health monitoring
    
    async def _health_check_loop(self):
        """Periodically check device health."""
        try:
            while True:
                await asyncio.sleep(self.health_check_interval)
                await self._check_all_devices()
        except asyncio.CancelledError:
            pass
            
    async def _check_all_devices(self):
        """Check health of all connected devices."""
        for device_id in list(self.device_connections.keys()):
            try:
                await self._check_device_health(device_id)
            except Exception as e:
                logger.error(f"Health check error for {device_id}: {e}")
                
    async def _check_device_health(self, device_id: str):
        """Check health of specific device."""
        device = await self.get_device(device_id)
        if not device:
            return
            
        handler = self.device_handlers.get(device_id)
        if not handler:
            return
            
        # Try to ping device
        healthy = False
        
        if hasattr(handler, 'ping'):
            healthy = await handler.ping(device_id)
        elif hasattr(handler, 'is_connected'):
            healthy = await handler.is_connected(device_id)
            
        # Update status
        if healthy:
            device.last_seen = datetime.utcnow()
            if device.status != DeviceStatus.ONLINE:
                device.status = DeviceStatus.ONLINE
                await self._update_device_status(device_id, DeviceStatus.ONLINE)
        else:
            if device.status == DeviceStatus.ONLINE:
                device.status = DeviceStatus.ERROR
                await self._update_device_status(device_id, DeviceStatus.ERROR)
                
                # Fire health check failed event
                await self._fire_device_event(DeviceEvent(
                    device_id=device_id,
                    event_type='health_check_failed',
                    severity='warning'
                ))
                
    # Event handling
    
    async def _fire_device_event(self, event: DeviceEvent):
        """Fire device event to handlers."""
        # Store event in database
        async with get_db() as db:
            await db.execute(
                """
                INSERT INTO device_events
                (device_id, event_type, data, timestamp, severity)
                VALUES ($1, $2, $3, $4, $5)
                """,
                event.device_id,
                event.event_type,
                json.dumps(event.data),
                event.timestamp,
                event.severity
            )
            
        # Call event handlers
        handlers = self.event_handlers.get(event.device_id, [])
        handlers.extend(self.event_handlers.get('*', []))  # Global handlers
        
        for handler in handlers:
            try:
                await handler(event)
            except Exception as e:
                logger.error(f"Event handler error: {e}")
                
    def add_event_handler(self, device_id: str, handler: Callable):
        """Add event handler for device."""
        if device_id not in self.event_handlers:
            self.event_handlers[device_id] = []
        self.event_handlers[device_id].append(handler)
        
    def remove_event_handler(self, device_id: str, handler: Callable):
        """Remove event handler."""
        if device_id in self.event_handlers:
            self.event_handlers[device_id].remove(handler)