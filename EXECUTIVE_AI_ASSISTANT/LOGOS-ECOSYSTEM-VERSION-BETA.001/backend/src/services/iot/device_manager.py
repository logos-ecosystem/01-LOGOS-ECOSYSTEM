"""Real IoT Protocol Implementations for all supported protocols."""

import asyncio
import socket
import struct
import ssl
import json
import time
from typing import Dict, List, Optional, Any, Callable, Union, Tuple
from datetime import datetime, timedelta
import uuid
import aiocoap
import aiocoap.resource as resource
from aiocoap import Message, Code
import paho.mqtt.client as mqtt
import websockets
import aiohttp
import bluetooth
import serial
import minimalmodbus
import pymodbus
from pymodbus.client import ModbusTcpClient, ModbusSerialClient
from pymodbus.server.async_io import StartTcpServer, StartSerialServer
from pymodbus.datastore import ModbusSlaveContext, ModbusServerContext
from pymodbus.datastore import ModbusSequentialDataBlock
import can
import obd
import zigpy
import zigpy_znp
import zigpy_deconz
from zigpy.application import ControllerApplication
import bellows
import pyserial
import pybluez
from bleak import BleakClient, BleakScanner
import aioblescan as aiobs
from pyLoRa import LoRa
import sx127x
import RPi.GPIO as GPIO
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import cbor2
import binascii
import asyncio_mqtt
from scapy.all import *

from ...shared.utils.logger import get_logger
from ...shared.utils.exceptions import IoTDeviceError, DeviceConnectionError
from ...shared.utils.config import get_settings
from .device_manager import IoTDevice, DeviceProtocol, DeviceStatus

logger = get_logger(__name__)
settings = get_settings()


class MQTTHandler:
    """Real MQTT protocol handler with full features."""
    
    def __init__(self):
        self.clients = {}
        self.subscriptions = {}
        self.message_handlers = {}
        self.connected_devices = {}
        
    async def connect(self, device: IoTDevice, **kwargs) -> bool:
        """Connect to MQTT broker for device."""
        try:
            # Get connection parameters
            broker = kwargs.get('broker', settings.MQTT_BROKER)
            port = kwargs.get('port', settings.MQTT_PORT)
            use_tls = kwargs.get('use_tls', settings.MQTT_USE_TLS)
            
            # Create unique client ID
            client_id = f"logos_{device.device_id}_{uuid.uuid4().hex[:8]}"
            
            # Create MQTT client
            client = mqtt.Client(client_id=client_id, protocol=mqtt.MQTTv311)
            
            # Set callbacks
            client.on_connect = self._create_on_connect_callback(device.device_id)
            client.on_disconnect = self._create_on_disconnect_callback(device.device_id)
            client.on_message = self._create_on_message_callback(device.device_id)
            
            # Configure authentication
            if device.auth_token:
                username = kwargs.get('username', device.device_id)
                client.username_pw_set(username, device.auth_token)
            
            # Configure TLS if needed
            if use_tls:
                client.tls_set(
                    ca_certs=kwargs.get('ca_certs'),
                    certfile=kwargs.get('certfile'),
                    keyfile=kwargs.get('keyfile'),
                    cert_reqs=ssl.CERT_REQUIRED,
                    tls_version=ssl.PROTOCOL_TLSv1_2
                )
                client.tls_insecure_set(False)
            
            # Set will message for device offline detection
            will_topic = f"devices/{device.device_id}/status"
            will_payload = json.dumps({
                'status': 'offline',
                'timestamp': datetime.utcnow().isoformat()
            })
            client.will_set(will_topic, will_payload, qos=1, retain=True)
            
            # Connect to broker
            client.connect_async(broker, port, keepalive=60)
            client.loop_start()
            
            # Store client
            self.clients[device.device_id] = client
            self.connected_devices[device.device_id] = device
            
            # Wait for connection
            await self._wait_for_connection(device.device_id, timeout=10)
            
            # Publish online status
            await self.publish(device.device_id, will_topic, {
                'status': 'online',
                'timestamp': datetime.utcnow().isoformat()
            }, retain=True)
            
            logger.info(f"MQTT connected for device {device.device_id}")
            return True
            
        except Exception as e:
            logger.error(f"MQTT connection failed for {device.device_id}: {e}")
            return False
    
    async def disconnect(self, device_id: str) -> bool:
        """Disconnect MQTT client."""
        if device_id not in self.clients:
            return False
        
        try:
            client = self.clients[device_id]
            
            # Publish offline status
            await self.publish(device_id, f"devices/{device_id}/status", {
                'status': 'offline',
                'timestamp': datetime.utcnow().isoformat()
            }, retain=True)
            
            # Disconnect
            client.loop_stop()
            client.disconnect()
            
            # Cleanup
            del self.clients[device_id]
            del self.connected_devices[device_id]
            if device_id in self.subscriptions:
                del self.subscriptions[device_id]
            
            return True
            
        except Exception as e:
            logger.error(f"MQTT disconnect error: {e}")
            return False
    
    async def publish(self, device_id: str, topic: str, payload: Union[str, Dict], 
                     qos: int = 1, retain: bool = False) -> bool:
        """Publish message to MQTT topic."""
        if device_id not in self.clients:
            return False
        
        try:
            client = self.clients[device_id]
            
            # Convert dict to JSON
            if isinstance(payload, dict):
                payload = json.dumps(payload)
            
            # Publish message
            result = client.publish(topic, payload, qos=qos, retain=retain)
            
            # Wait for publish to complete
            if qos > 0:
                result.wait_for_publish(timeout=5)
            
            return result.is_published()
            
        except Exception as e:
            logger.error(f"MQTT publish error: {e}")
            return False
    
    async def subscribe(self, device_id: str, topic: str, 
                       handler: Callable, qos: int = 1) -> bool:
        """Subscribe to MQTT topic."""
        if device_id not in self.clients:
            return False
        
        try:
            client = self.clients[device_id]
            
            # Store subscription info
            if device_id not in self.subscriptions:
                self.subscriptions[device_id] = {}
            self.subscriptions[device_id][topic] = handler
            
            # Subscribe
            result = client.subscribe(topic, qos=qos)
            
            # Wait for subscription
            if result[0] == mqtt.MQTT_ERR_SUCCESS:
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"MQTT subscribe error: {e}")
            return False
    
    async def unsubscribe(self, device_id: str, topic: str) -> bool:
        """Unsubscribe from MQTT topic."""
        if device_id not in self.clients:
            return False
        
        try:
            client = self.clients[device_id]
            
            # Unsubscribe
            result = client.unsubscribe(topic)
            
            # Remove from subscriptions
            if device_id in self.subscriptions and topic in self.subscriptions[device_id]:
                del self.subscriptions[device_id][topic]
            
            return result[0] == mqtt.MQTT_ERR_SUCCESS
            
        except Exception as e:
            logger.error(f"MQTT unsubscribe error: {e}")
            return False
    
    def _create_on_connect_callback(self, device_id: str):
        """Create on_connect callback for device."""
        def on_connect(client, userdata, flags, rc):
            if rc == 0:
                logger.info(f"MQTT connected for {device_id}")
                # Resubscribe to topics
                if device_id in self.subscriptions:
                    for topic in self.subscriptions[device_id]:
                        client.subscribe(topic)
            else:
                logger.error(f"MQTT connection failed for {device_id}: {rc}")
        
        return on_connect
    
    def _create_on_disconnect_callback(self, device_id: str):
        """Create on_disconnect callback for device."""
        def on_disconnect(client, userdata, rc):
            if rc != 0:
                logger.warning(f"MQTT unexpected disconnect for {device_id}: {rc}")
                # Attempt reconnection
                client.reconnect_delay_set(min_delay=1, max_delay=120)
        
        return on_disconnect
    
    def _create_on_message_callback(self, device_id: str):
        """Create on_message callback for device."""
        def on_message(client, userdata, msg):
            try:
                # Get handler for topic
                if device_id in self.subscriptions:
                    for topic_pattern, handler in self.subscriptions[device_id].items():
                        if mqtt.topic_matches_sub(topic_pattern, msg.topic):
                            # Decode payload
                            try:
                                payload = json.loads(msg.payload.decode())
                            except:
                                payload = msg.payload.decode()
                            
                            # Call handler asynchronously
                            asyncio.create_task(handler(msg.topic, payload))
            
            except Exception as e:
                logger.error(f"MQTT message handler error: {e}")
        
        return on_message
    
    async def _wait_for_connection(self, device_id: str, timeout: int = 10):
        """Wait for MQTT connection to establish."""
        client = self.clients[device_id]
        start_time = time.time()
        
        while not client.is_connected():
            if time.time() - start_time > timeout:
                raise TimeoutError("MQTT connection timeout")
            await asyncio.sleep(0.1)


class CoAPHandler:
    """Real CoAP protocol handler."""
    
    def __init__(self):
        self.clients = {}
        self.servers = {}
        self.resources = {}
    
    async def connect(self, device: IoTDevice, **kwargs) -> bool:
        """Create CoAP client for device."""
        try:
            # CoAP doesn't maintain persistent connections
            # Create context for the device
            context = await aiocoap.Context.create_client_context()
            
            self.clients[device.device_id] = {
                'context': context,
                'device': device,
                'base_uri': kwargs.get('base_uri', f"coap://{device.metadata.get('ip', 'localhost')}"),
                'dtls_psk': kwargs.get('dtls_psk', device.encryption_key)
            }
            
            # Test connection with a GET request
            uri = f"{self.clients[device.device_id]['base_uri']}/.well-known/core"
            request = Message(code=Code.GET, uri=uri)
            
            try:
                response = await context.request(request).response
                if response.code.is_successful():
                    logger.info(f"CoAP connected for device {device.device_id}")
                    return True
            except Exception as e:
                logger.warning(f"CoAP connection test failed: {e}")
            
            return False
            
        except Exception as e:
            logger.error(f"CoAP setup failed for {device.device_id}: {e}")
            return False
    
    async def disconnect(self, device_id: str) -> bool:
        """Cleanup CoAP client."""
        if device_id in self.clients:
            # CoAP contexts are cleaned up automatically
            del self.clients[device_id]
        
        if device_id in self.servers:
            await self.servers[device_id].shutdown()
            del self.servers[device_id]
        
        return True
    
    async def get(self, device_id: str, path: str, 
                  accept: int = aiocoap.numbers.media_types_rev['application/json']) -> Any:
        """Send CoAP GET request."""
        if device_id not in self.clients:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        client = self.clients[device_id]
        uri = f"{client['base_uri']}{path}"
        
        request = Message(code=Code.GET, uri=uri)
        request.opt.accept = accept
        
        # Add DTLS if configured
        if client['dtls_psk']:
            request.remote = aiocoap.transports.tinydtls.DTLSClientConnection(
                client['context'],
                psk=client['dtls_psk'],
                psk_identity=device_id.encode()
            )
        
        response = await client['context'].request(request).response
        
        if response.code.is_successful():
            # Parse response based on content type
            if response.opt.content_format == aiocoap.numbers.media_types_rev['application/json']:
                return json.loads(response.payload.decode())
            elif response.opt.content_format == aiocoap.numbers.media_types_rev['application/cbor']:
                return cbor2.loads(response.payload)
            else:
                return response.payload.decode()
        else:
            raise IoTDeviceError(f"CoAP GET failed: {response.code}")
    
    async def put(self, device_id: str, path: str, payload: Any,
                  content_format: int = aiocoap.numbers.media_types_rev['application/json']) -> bool:
        """Send CoAP PUT request."""
        if device_id not in self.clients:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        client = self.clients[device_id]
        uri = f"{client['base_uri']}{path}"
        
        # Encode payload
        if content_format == aiocoap.numbers.media_types_rev['application/json']:
            payload_bytes = json.dumps(payload).encode()
        elif content_format == aiocoap.numbers.media_types_rev['application/cbor']:
            payload_bytes = cbor2.dumps(payload)
        else:
            payload_bytes = str(payload).encode()
        
        request = Message(code=Code.PUT, uri=uri, payload=payload_bytes)
        request.opt.content_format = content_format
        
        response = await client['context'].request(request).response
        
        return response.code.is_successful()
    
    async def post(self, device_id: str, path: str, payload: Any,
                   content_format: int = aiocoap.numbers.media_types_rev['application/json']) -> Any:
        """Send CoAP POST request."""
        if device_id not in self.clients:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        client = self.clients[device_id]
        uri = f"{client['base_uri']}{path}"
        
        # Encode payload
        if content_format == aiocoap.numbers.media_types_rev['application/json']:
            payload_bytes = json.dumps(payload).encode()
        elif content_format == aiocoap.numbers.media_types_rev['application/cbor']:
            payload_bytes = cbor2.dumps(payload)
        else:
            payload_bytes = str(payload).encode()
        
        request = Message(code=Code.POST, uri=uri, payload=payload_bytes)
        request.opt.content_format = content_format
        
        response = await client['context'].request(request).response
        
        if response.code.is_successful():
            # Parse response
            if response.opt.content_format == aiocoap.numbers.media_types_rev['application/json']:
                return json.loads(response.payload.decode())
            elif response.opt.content_format == aiocoap.numbers.media_types_rev['application/cbor']:
                return cbor2.loads(response.payload)
            else:
                return response.payload.decode()
        else:
            raise IoTDeviceError(f"CoAP POST failed: {response.code}")
    
    async def observe(self, device_id: str, path: str, callback: Callable) -> Any:
        """Observe CoAP resource."""
        if device_id not in self.clients:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        client = self.clients[device_id]
        uri = f"{client['base_uri']}{path}"
        
        request = Message(code=Code.GET, uri=uri, observe=0)
        
        observation = client['context'].request(request)
        
        # Handle responses
        async for response in observation.observation:
            try:
                if response.opt.content_format == aiocoap.numbers.media_types_rev['application/json']:
                    data = json.loads(response.payload.decode())
                elif response.opt.content_format == aiocoap.numbers.media_types_rev['application/cbor']:
                    data = cbor2.loads(response.payload)
                else:
                    data = response.payload.decode()
                
                await callback(path, data)
                
            except Exception as e:
                logger.error(f"CoAP observe callback error: {e}")
        
        return observation
    
    async def create_server(self, device_id: str, port: int = 5683) -> bool:
        """Create CoAP server for device."""
        try:
            root = resource.Site()
            
            # Add .well-known/core for resource discovery
            root.add_resource(['.well-known', 'core'],
                            resource.WKCResource(root.get_resources_as_linkheader))
            
            # Store server
            self.servers[device_id] = await aiocoap.Context.create_server_context(root, bind=('', port))
            self.resources[device_id] = root
            
            logger.info(f"CoAP server started for {device_id} on port {port}")
            return True
            
        except Exception as e:
            logger.error(f"CoAP server creation failed: {e}")
            return False
    
    def add_resource(self, device_id: str, path: List[str], resource_handler: resource.Resource):
        """Add resource to CoAP server."""
        if device_id in self.resources:
            self.resources[device_id].add_resource(path, resource_handler)


class ModbusHandler:
    """Real Modbus protocol handler for industrial IoT."""
    
    def __init__(self):
        self.clients = {}
        self.servers = {}
        
    async def connect(self, device: IoTDevice, **kwargs) -> bool:
        """Connect to Modbus device."""
        try:
            connection_type = kwargs.get('type', 'tcp')  # tcp or rtu
            
            if connection_type == 'tcp':
                # Modbus TCP
                host = kwargs.get('host', device.metadata.get('ip', 'localhost'))
                port = kwargs.get('port', 502)
                
                client = ModbusTcpClient(host=host, port=port)
                connected = client.connect()
                
            else:
                # Modbus RTU (serial)
                port = kwargs.get('port', '/dev/ttyUSB0')
                baudrate = kwargs.get('baudrate', 9600)
                method = kwargs.get('method', 'rtu')
                stopbits = kwargs.get('stopbits', 1)
                bytesize = kwargs.get('bytesize', 8)
                parity = kwargs.get('parity', 'N')
                
                client = ModbusSerialClient(
                    method=method,
                    port=port,
                    baudrate=baudrate,
                    stopbits=stopbits,
                    bytesize=bytesize,
                    parity=parity
                )
                connected = client.connect()
            
            if connected:
                self.clients[device.device_id] = {
                    'client': client,
                    'type': connection_type,
                    'unit_id': kwargs.get('unit_id', 1)
                }
                logger.info(f"Modbus connected for device {device.device_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Modbus connection failed for {device.device_id}: {e}")
            return False
    
    async def disconnect(self, device_id: str) -> bool:
        """Disconnect Modbus client."""
        if device_id not in self.clients:
            return False
        
        try:
            self.clients[device_id]['client'].close()
            del self.clients[device_id]
            return True
        except Exception as e:
            logger.error(f"Modbus disconnect error: {e}")
            return False
    
    async def read_coils(self, device_id: str, address: int, count: int = 1) -> List[bool]:
        """Read coil status (discrete outputs)."""
        if device_id not in self.clients:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        client_info = self.clients[device_id]
        result = client_info['client'].read_coils(
            address, count, unit=client_info['unit_id']
        )
        
        if result.isError():
            raise IoTDeviceError(f"Modbus read coils error: {result}")
        
        return result.bits[:count]
    
    async def read_discrete_inputs(self, device_id: str, address: int, count: int = 1) -> List[bool]:
        """Read discrete input status."""
        if device_id not in self.clients:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        client_info = self.clients[device_id]
        result = client_info['client'].read_discrete_inputs(
            address, count, unit=client_info['unit_id']
        )
        
        if result.isError():
            raise IoTDeviceError(f"Modbus read discrete inputs error: {result}")
        
        return result.bits[:count]
    
    async def read_holding_registers(self, device_id: str, address: int, count: int = 1) -> List[int]:
        """Read holding registers."""
        if device_id not in self.clients:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        client_info = self.clients[device_id]
        result = client_info['client'].read_holding_registers(
            address, count, unit=client_info['unit_id']
        )
        
        if result.isError():
            raise IoTDeviceError(f"Modbus read holding registers error: {result}")
        
        return result.registers
    
    async def read_input_registers(self, device_id: str, address: int, count: int = 1) -> List[int]:
        """Read input registers."""
        if device_id not in self.clients:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        client_info = self.clients[device_id]
        result = client_info['client'].read_input_registers(
            address, count, unit=client_info['unit_id']
        )
        
        if result.isError():
            raise IoTDeviceError(f"Modbus read input registers error: {result}")
        
        return result.registers
    
    async def write_coil(self, device_id: str, address: int, value: bool) -> bool:
        """Write single coil."""
        if device_id not in self.clients:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        client_info = self.clients[device_id]
        result = client_info['client'].write_coil(
            address, value, unit=client_info['unit_id']
        )
        
        return not result.isError()
    
    async def write_register(self, device_id: str, address: int, value: int) -> bool:
        """Write single register."""
        if device_id not in self.clients:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        client_info = self.clients[device_id]
        result = client_info['client'].write_register(
            address, value, unit=client_info['unit_id']
        )
        
        return not result.isError()
    
    async def write_coils(self, device_id: str, address: int, values: List[bool]) -> bool:
        """Write multiple coils."""
        if device_id not in self.clients:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        client_info = self.clients[device_id]
        result = client_info['client'].write_coils(
            address, values, unit=client_info['unit_id']
        )
        
        return not result.isError()
    
    async def write_registers(self, device_id: str, address: int, values: List[int]) -> bool:
        """Write multiple registers."""
        if device_id not in self.clients:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        client_info = self.clients[device_id]
        result = client_info['client'].write_registers(
            address, values, unit=client_info['unit_id']
        )
        
        return not result.isError()
    
    async def create_server(self, device_id: str, **kwargs) -> bool:
        """Create Modbus server."""
        try:
            # Create data store
            store = ModbusSlaveContext(
                di=ModbusSequentialDataBlock(0, [0]*100),  # Discrete Inputs
                co=ModbusSequentialDataBlock(0, [0]*100),  # Coils
                hr=ModbusSequentialDataBlock(0, [0]*100),  # Holding Registers
                ir=ModbusSequentialDataBlock(0, [0]*100),  # Input Registers
            )
            context = ModbusServerContext(slaves=store, single=True)
            
            server_type = kwargs.get('type', 'tcp')
            
            if server_type == 'tcp':
                # Start TCP server
                address = kwargs.get('address', '0.0.0.0')
                port = kwargs.get('port', 502)
                
                server = await StartTcpServer(
                    context,
                    address=(address, port)
                )
            else:
                # Start RTU server
                port = kwargs.get('port', '/dev/ttyUSB0')
                server = await StartSerialServer(
                    context,
                    port=port,
                    baudrate=kwargs.get('baudrate', 9600)
                )
            
            self.servers[device_id] = {
                'server': server,
                'context': context,
                'type': server_type
            }
            
            logger.info(f"Modbus server started for {device_id}")
            return True
            
        except Exception as e:
            logger.error(f"Modbus server creation failed: {e}")
            return False


class BluetoothHandler:
    """Real Bluetooth/BLE protocol handler."""
    
    def __init__(self):
        self.ble_clients = {}
        self.classic_sockets = {}
        self.gatt_services = {}
        self.scanner = None
        
    async def connect(self, device: IoTDevice, **kwargs) -> bool:
        """Connect to Bluetooth device."""
        try:
            bt_type = kwargs.get('type', 'ble')  # ble or classic
            
            if bt_type == 'ble':
                return await self._connect_ble(device, **kwargs)
            else:
                return await self._connect_classic(device, **kwargs)
                
        except Exception as e:
            logger.error(f"Bluetooth connection failed for {device.device_id}: {e}")
            return False
    
    async def _connect_ble(self, device: IoTDevice, **kwargs) -> bool:
        """Connect to BLE device."""
        try:
            # Get device address
            address = kwargs.get('address', device.metadata.get('bt_address'))
            if not address:
                # Try to discover device
                discovered = await self.discover_ble_devices(name_filter=device.name)
                if discovered:
                    address = discovered[0]['address']
                else:
                    raise DeviceConnectionError("BLE device not found")
            
            # Create BLE client
            client = BleakClient(address)
            connected = await client.connect()
            
            if connected:
                self.ble_clients[device.device_id] = client
                
                # Discover services
                services = await client.get_services()
                self.gatt_services[device.device_id] = services
                
                logger.info(f"BLE connected to {device.device_id} ({address})")
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"BLE connection error: {e}")
            return False
    
    async def _connect_classic(self, device: IoTDevice, **kwargs) -> bool:
        """Connect to classic Bluetooth device."""
        try:
            # Get device address
            address = kwargs.get('address', device.metadata.get('bt_address'))
            port = kwargs.get('port', 1)  # RFCOMM port
            
            if not address:
                # Try to discover device
                discovered = bluetooth.discover_devices(lookup_names=True)
                for addr, name in discovered:
                    if name == device.name:
                        address = addr
                        break
                
                if not address:
                    raise DeviceConnectionError("Bluetooth device not found")
            
            # Create socket
            sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
            sock.connect((address, port))
            
            self.classic_sockets[device.device_id] = sock
            
            logger.info(f"Bluetooth connected to {device.device_id} ({address})")
            return True
            
        except Exception as e:
            logger.error(f"Bluetooth classic connection error: {e}")
            return False
    
    async def disconnect(self, device_id: str) -> bool:
        """Disconnect Bluetooth device."""
        try:
            if device_id in self.ble_clients:
                await self.ble_clients[device_id].disconnect()
                del self.ble_clients[device_id]
                if device_id in self.gatt_services:
                    del self.gatt_services[device_id]
                return True
                
            if device_id in self.classic_sockets:
                self.classic_sockets[device_id].close()
                del self.classic_sockets[device_id]
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"Bluetooth disconnect error: {e}")
            return False
    
    async def discover_ble_devices(self, timeout: float = 10.0, 
                                  name_filter: str = None) -> List[Dict[str, Any]]:
        """Discover BLE devices."""
        devices = []
        
        try:
            discovered = await BleakScanner.discover(timeout=timeout)
            
            for device in discovered:
                if name_filter and name_filter not in (device.name or ''):
                    continue
                    
                devices.append({
                    'address': device.address,
                    'name': device.name,
                    'rssi': device.rssi,
                    'metadata': device.metadata
                })
            
        except Exception as e:
            logger.error(f"BLE discovery error: {e}")
        
        return devices
    
    async def read_gatt_characteristic(self, device_id: str, 
                                     service_uuid: str, 
                                     char_uuid: str) -> bytes:
        """Read GATT characteristic."""
        if device_id not in self.ble_clients:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        client = self.ble_clients[device_id]
        data = await client.read_gatt_char(char_uuid)
        return data
    
    async def write_gatt_characteristic(self, device_id: str,
                                      service_uuid: str,
                                      char_uuid: str,
                                      data: bytes,
                                      response: bool = True) -> bool:
        """Write GATT characteristic."""
        if device_id not in self.ble_clients:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        client = self.ble_clients[device_id]
        await client.write_gatt_char(char_uuid, data, response=response)
        return True
    
    async def subscribe_to_notifications(self, device_id: str,
                                       char_uuid: str,
                                       callback: Callable) -> bool:
        """Subscribe to GATT notifications."""
        if device_id not in self.ble_clients:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        client = self.ble_clients[device_id]
        
        # Wrap callback to handle BLE format
        def notification_handler(sender, data):
            asyncio.create_task(callback(char_uuid, data))
        
        await client.start_notify(char_uuid, notification_handler)
        return True
    
    async def send_classic_data(self, device_id: str, data: bytes) -> bool:
        """Send data via classic Bluetooth."""
        if device_id not in self.classic_sockets:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        sock = self.classic_sockets[device_id]
        sock.send(data)
        return True
    
    async def receive_classic_data(self, device_id: str, 
                                 size: int = 1024) -> bytes:
        """Receive data via classic Bluetooth."""
        if device_id not in self.classic_sockets:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        sock = self.classic_sockets[device_id]
        data = sock.recv(size)
        return data


class ZigbeeHandler:
    """Real Zigbee protocol handler."""
    
    def __init__(self):
        self.coordinators = {}
        self.devices = {}
        self.handlers = {}
        
    async def connect(self, device: IoTDevice, **kwargs) -> bool:
        """Connect to Zigbee network."""
        try:
            # Determine radio type
            radio_type = kwargs.get('radio_type', 'znp')  # znp, deconz, ezsp
            port = kwargs.get('port', '/dev/ttyUSB0')
            baudrate = kwargs.get('baudrate', 115200)
            
            # Create radio connection
            if radio_type == 'znp':
                # Texas Instruments Z-Stack
                import zigpy_znp.zigbee.application
                radio = zigpy_znp.zigbee.application.ControllerApplication
            elif radio_type == 'deconz':
                # Dresden Elektronik deCONZ
                import zigpy_deconz.zigbee.application
                radio = zigpy_deconz.zigbee.application.ControllerApplication
            elif radio_type == 'ezsp':
                # Silicon Labs EmberZNet
                import bellows.zigbee.application
                radio = bellows.zigbee.application.ControllerApplication
            else:
                raise ValueError(f"Unknown radio type: {radio_type}")
            
            # Configure database
            database = kwargs.get('database', f'/tmp/zigbee_{device.device_id}.db')
            
            # Create config
            config = {
                'database': database,
                'device': {
                    'path': port,
                    'baudrate': baudrate
                }
            }
            
            # Start coordinator
            app = await radio.new(config, auto_form=True)
            await app.startup(auto_form=True)
            
            self.coordinators[device.device_id] = app
            
            # Set up device joined handler
            app.add_listener(self._create_device_joined_handler(device.device_id))
            
            logger.info(f"Zigbee coordinator started for {device.device_id}")
            return True
            
        except Exception as e:
            logger.error(f"Zigbee connection failed: {e}")
            return False
    
    async def disconnect(self, device_id: str) -> bool:
        """Disconnect from Zigbee network."""
        if device_id not in self.coordinators:
            return False
        
        try:
            await self.coordinators[device_id].shutdown()
            del self.coordinators[device_id]
            return True
        except Exception as e:
            logger.error(f"Zigbee disconnect error: {e}")
            return False
    
    async def permit_join(self, device_id: str, duration: int = 60) -> bool:
        """Permit devices to join network."""
        if device_id not in self.coordinators:
            raise DeviceConnectionError(f"Coordinator {device_id} not connected")
        
        app = self.coordinators[device_id]
        await app.permit(duration)
        return True
    
    async def get_devices(self, coordinator_id: str) -> List[Dict[str, Any]]:
        """Get list of Zigbee devices."""
        if coordinator_id not in self.coordinators:
            raise DeviceConnectionError(f"Coordinator {coordinator_id} not connected")
        
        app = self.coordinators[coordinator_id]
        devices = []
        
        for ieee, device in app.devices.items():
            if ieee == app.ieee:  # Skip coordinator
                continue
                
            devices.append({
                'ieee': str(ieee),
                'nwk': device.nwk,
                'model': device.model,
                'manufacturer': device.manufacturer,
                'endpoints': list(device.endpoints.keys()),
                'lqi': device.lqi,
                'rssi': device.rssi
            })
        
        return devices
    
    async def send_command(self, coordinator_id: str, 
                          ieee: str, 
                          endpoint: int,
                          cluster: int,
                          command: int,
                          args: List[Any] = None) -> Any:
        """Send Zigbee command to device."""
        if coordinator_id not in self.coordinators:
            raise DeviceConnectionError(f"Coordinator {coordinator_id} not connected")
        
        app = self.coordinators[coordinator_id]
        
        # Get device
        device = app.get_device(ieee)
        if not device:
            raise DeviceConnectionError(f"Device {ieee} not found")
        
        # Get endpoint
        ep = device.endpoints.get(endpoint)
        if not ep:
            raise IoTDeviceError(f"Endpoint {endpoint} not found")
        
        # Get cluster
        cluster_obj = ep.in_clusters.get(cluster) or ep.out_clusters.get(cluster)
        if not cluster_obj:
            raise IoTDeviceError(f"Cluster {cluster} not found")
        
        # Send command
        result = await cluster_obj.command(command, *args if args else [])
        return result
    
    async def read_attribute(self, coordinator_id: str,
                           ieee: str,
                           endpoint: int,
                           cluster: int,
                           attribute: int) -> Any:
        """Read Zigbee attribute."""
        if coordinator_id not in self.coordinators:
            raise DeviceConnectionError(f"Coordinator {coordinator_id} not connected")
        
        app = self.coordinators[coordinator_id]
        device = app.get_device(ieee)
        
        if not device:
            raise DeviceConnectionError(f"Device {ieee} not found")
        
        ep = device.endpoints.get(endpoint)
        cluster_obj = ep.in_clusters.get(cluster) or ep.out_clusters.get(cluster)
        
        result = await cluster_obj.read_attributes([attribute])
        return result[0][attribute]
    
    async def write_attribute(self, coordinator_id: str,
                            ieee: str,
                            endpoint: int,
                            cluster: int,
                            attribute: int,
                            value: Any) -> bool:
        """Write Zigbee attribute."""
        if coordinator_id not in self.coordinators:
            raise DeviceConnectionError(f"Coordinator {coordinator_id} not connected")
        
        app = self.coordinators[coordinator_id]
        device = app.get_device(ieee)
        
        if not device:
            raise DeviceConnectionError(f"Device {ieee} not found")
        
        ep = device.endpoints.get(endpoint)
        cluster_obj = ep.in_clusters.get(cluster) or ep.out_clusters.get(cluster)
        
        result = await cluster_obj.write_attributes({attribute: value})
        return result[0].status == 0
    
    def _create_device_joined_handler(self, coordinator_id: str):
        """Create device joined handler."""
        def device_joined(device):
            logger.info(f"Device joined Zigbee network: {device.ieee}")
            # Store device reference
            self.devices[str(device.ieee)] = device
        
        return device_joined
    
    async def bind_cluster(self, coordinator_id: str,
                         src_ieee: str, src_ep: int,
                         dst_ieee: str, dst_ep: int,
                         cluster: int) -> bool:
        """Create binding between devices."""
        if coordinator_id not in self.coordinators:
            raise DeviceConnectionError(f"Coordinator {coordinator_id} not connected")
        
        app = self.coordinators[coordinator_id]
        src_device = app.get_device(src_ieee)
        dst_device = app.get_device(dst_ieee)
        
        if not src_device or not dst_device:
            raise DeviceConnectionError("Source or destination device not found")
        
        # Create binding
        src_endpoint = src_device.endpoints[src_ep]
        await src_endpoint.add_binding(cluster, dst_ieee, dst_ep)
        
        return True


class LoRaHandler:
    """Real LoRa protocol handler."""
    
    def __init__(self):
        self.devices = {}
        self.gateways = {}
        
    async def connect(self, device: IoTDevice, **kwargs) -> bool:
        """Initialize LoRa device."""
        try:
            # LoRa parameters
            frequency = kwargs.get('frequency', 915.0)  # MHz
            spreading_factor = kwargs.get('sf', 7)
            bandwidth = kwargs.get('bw', 125000)  # Hz
            coding_rate = kwargs.get('cr', 5)
            tx_power = kwargs.get('tx_power', 14)  # dBm
            
            # GPIO pins for Raspberry Pi
            dio_pins = kwargs.get('dio_pins', {0: 4, 1: 17, 2: 18, 3: 27})
            spi_bus = kwargs.get('spi_bus', 0)
            spi_cs = kwargs.get('spi_cs', 0)
            reset_pin = kwargs.get('reset_pin', 22)
            
            # Initialize GPIO
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(reset_pin, GPIO.OUT)
            
            # Reset LoRa module
            GPIO.output(reset_pin, GPIO.LOW)
            await asyncio.sleep(0.01)
            GPIO.output(reset_pin, GPIO.HIGH)
            await asyncio.sleep(0.1)
            
            # Create LoRa instance
            lora = LoRa(
                spi_bus=spi_bus,
                spi_cs=spi_cs,
                dio_pins=dio_pins,
                reset_pin=reset_pin
            )
            
            # Configure LoRa parameters
            lora.set_frequency(frequency)
            lora.set_spreading_factor(spreading_factor)
            lora.set_bandwidth(bandwidth)
            lora.set_coding_rate(coding_rate)
            lora.set_tx_power(tx_power)
            lora.set_sync_word(0x12)  # LoRaWAN sync word
            
            # Set mode
            if kwargs.get('mode', 'node') == 'gateway':
                lora.set_mode(sx127x.MODE_RXCONT)  # Continuous receive
                self.gateways[device.device_id] = lora
            else:
                lora.set_mode(sx127x.MODE_SLEEP)  # Sleep until needed
                self.devices[device.device_id] = lora
            
            logger.info(f"LoRa initialized for device {device.device_id}")
            return True
            
        except Exception as e:
            logger.error(f"LoRa initialization failed: {e}")
            return False
    
    async def disconnect(self, device_id: str) -> bool:
        """Cleanup LoRa device."""
        try:
            if device_id in self.devices:
                self.devices[device_id].set_mode(sx127x.MODE_SLEEP)
                del self.devices[device_id]
            
            if device_id in self.gateways:
                self.gateways[device_id].set_mode(sx127x.MODE_SLEEP)
                del self.gateways[device_id]
            
            GPIO.cleanup()
            return True
            
        except Exception as e:
            logger.error(f"LoRa cleanup error: {e}")
            return False
    
    async def send_packet(self, device_id: str, data: bytes, 
                         target_address: int = 0xFF) -> bool:
        """Send LoRa packet."""
        if device_id not in self.devices:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        lora = self.devices[device_id]
        
        try:
            # Add LoRaWAN-like header
            header = struct.pack('>BH', target_address, len(data))
            packet = header + data
            
            # Switch to standby mode
            lora.set_mode(sx127x.MODE_STDBY)
            
            # Write packet to FIFO
            lora.write_fifo(packet)
            
            # Switch to TX mode
            lora.set_mode(sx127x.MODE_TX)
            
            # Wait for transmission complete
            start_time = time.time()
            while lora.get_irq_flags()['tx_done'] == 0:
                if time.time() - start_time > 10:  # 10 second timeout
                    raise TimeoutError("LoRa TX timeout")
                await asyncio.sleep(0.01)
            
            # Clear IRQ
            lora.clear_irq_flags()
            
            # Back to sleep
            lora.set_mode(sx127x.MODE_SLEEP)
            
            return True
            
        except Exception as e:
            logger.error(f"LoRa send error: {e}")
            return False
    
    async def receive_packet(self, device_id: str, 
                           timeout: float = 10.0) -> Optional[Dict[str, Any]]:
        """Receive LoRa packet."""
        if device_id not in self.devices and device_id not in self.gateways:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        lora = self.devices.get(device_id) or self.gateways.get(device_id)
        
        try:
            # Switch to receive mode
            lora.set_mode(sx127x.MODE_RXSINGLE)
            
            # Wait for packet or timeout
            start_time = time.time()
            while True:
                if lora.get_irq_flags()['rx_done']:
                    # Get packet
                    packet = lora.read_fifo()
                    
                    # Parse header
                    if len(packet) >= 3:
                        address, length = struct.unpack('>BH', packet[:3])
                        data = packet[3:3+length]
                        
                        # Get RSSI and SNR
                        rssi = lora.get_rssi()
                        snr = lora.get_snr()
                        
                        # Clear IRQ
                        lora.clear_irq_flags()
                        
                        return {
                            'address': address,
                            'data': data,
                            'rssi': rssi,
                            'snr': snr,
                            'timestamp': datetime.utcnow()
                        }
                
                if time.time() - start_time > timeout:
                    return None
                
                await asyncio.sleep(0.01)
                
        except Exception as e:
            logger.error(f"LoRa receive error: {e}")
            return None
    
    async def start_gateway(self, device_id: str, callback: Callable) -> bool:
        """Start LoRa gateway mode."""
        if device_id not in self.gateways:
            raise DeviceConnectionError(f"Gateway {device_id} not connected")
        
        lora = self.gateways[device_id]
        
        # Set continuous receive mode
        lora.set_mode(sx127x.MODE_RXCONT)
        
        # Start receive loop
        async def receive_loop():
            while device_id in self.gateways:
                try:
                    packet = await self.receive_packet(device_id, timeout=1.0)
                    if packet:
                        await callback(packet)
                except Exception as e:
                    logger.error(f"Gateway receive error: {e}")
                    await asyncio.sleep(1)
        
        asyncio.create_task(receive_loop())
        
        logger.info(f"LoRa gateway started for {device_id}")
        return True
    
    async def configure_lorawan(self, device_id: str, 
                              dev_eui: bytes,
                              app_eui: bytes,
                              app_key: bytes) -> bool:
        """Configure device for LoRaWAN."""
        if device_id not in self.devices:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        # Store LoRaWAN credentials
        if not hasattr(self, 'lorawan_devices'):
            self.lorawan_devices = {}
        
        self.lorawan_devices[device_id] = {
            'dev_eui': dev_eui,
            'app_eui': app_eui,
            'app_key': app_key,
            'dev_addr': None,
            'nwk_skey': None,
            'app_skey': None,
            'fcnt_up': 0,
            'fcnt_down': 0
        }
        
        return True
    
    async def join_lorawan_otaa(self, device_id: str) -> bool:
        """Perform LoRaWAN OTAA join."""
        if device_id not in self.lorawan_devices:
            raise IoTDeviceError("Device not configured for LoRaWAN")
        
        # Build join request
        # This is simplified - real implementation would follow LoRaWAN spec
        lorawan = self.lorawan_devices[device_id]
        
        join_request = lorawan['app_eui'] + lorawan['dev_eui'] + os.urandom(2)
        
        # Send join request
        await self.send_packet(device_id, join_request, target_address=0x00)
        
        # Wait for join accept
        response = await self.receive_packet(device_id, timeout=5.0)
        
        if response and len(response['data']) >= 17:
            # Parse join accept (simplified)
            lorawan['dev_addr'] = response['data'][1:5]
            lorawan['nwk_skey'] = response['data'][5:13]
            lorawan['app_skey'] = response['data'][13:21]
            
            logger.info(f"LoRaWAN OTAA join successful for {device_id}")
            return True
        
        return False


class WebSocketHandler:
    """Enhanced WebSocket handler for IoT devices."""
    
    def __init__(self):
        self.connections = {}
        self.servers = {}
        
    async def connect(self, device: IoTDevice, **kwargs) -> bool:
        """Connect to WebSocket server."""
        try:
            url = kwargs.get('url', f"ws://{device.metadata.get('ip', 'localhost')}:8080")
            
            # Add authentication headers if needed
            headers = {}
            if device.auth_token:
                headers['Authorization'] = f'Bearer {device.auth_token}'
            
            # SSL context for WSS
            ssl_context = None
            if url.startswith('wss://'):
                ssl_context = ssl.create_default_context()
                if kwargs.get('verify_ssl', True) is False:
                    ssl_context.check_hostname = False
                    ssl_context.verify_mode = ssl.CERT_NONE
            
            # Connect
            websocket = await websockets.connect(
                url,
                extra_headers=headers,
                ssl=ssl_context,
                ping_interval=20,
                ping_timeout=10
            )
            
            self.connections[device.device_id] = {
                'websocket': websocket,
                'url': url,
                'handlers': {}
            }
            
            # Start message handler
            asyncio.create_task(self._message_handler(device.device_id))
            
            logger.info(f"WebSocket connected for device {device.device_id}")
            return True
            
        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            return False
    
    async def disconnect(self, device_id: str) -> bool:
        """Disconnect WebSocket."""
        if device_id not in self.connections:
            return False
        
        try:
            await self.connections[device_id]['websocket'].close()
            del self.connections[device_id]
            return True
        except Exception as e:
            logger.error(f"WebSocket disconnect error: {e}")
            return False
    
    async def send(self, device_id: str, message: Union[str, Dict, bytes]) -> bool:
        """Send WebSocket message."""
        if device_id not in self.connections:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        try:
            websocket = self.connections[device_id]['websocket']
            
            # Convert dict to JSON
            if isinstance(message, dict):
                message = json.dumps(message)
            
            await websocket.send(message)
            return True
            
        except Exception as e:
            logger.error(f"WebSocket send error: {e}")
            return False
    
    async def add_handler(self, device_id: str, 
                         message_type: str, 
                         handler: Callable) -> bool:
        """Add message handler."""
        if device_id not in self.connections:
            return False
        
        self.connections[device_id]['handlers'][message_type] = handler
        return True
    
    async def _message_handler(self, device_id: str):
        """Handle incoming messages."""
        try:
            conn = self.connections[device_id]
            websocket = conn['websocket']
            
            async for message in websocket:
                try:
                    # Parse message
                    if isinstance(message, bytes):
                        data = message
                    else:
                        data = json.loads(message)
                    
                    # Get message type
                    msg_type = data.get('type', 'default') if isinstance(data, dict) else 'raw'
                    
                    # Call handler
                    handler = conn['handlers'].get(msg_type) or conn['handlers'].get('*')
                    if handler:
                        await handler(data)
                        
                except Exception as e:
                    logger.error(f"Message handling error: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"WebSocket closed for {device_id}")
        except Exception as e:
            logger.error(f"WebSocket handler error: {e}")
        finally:
            # Cleanup on disconnect
            if device_id in self.connections:
                del self.connections[device_id]
    
    async def create_server(self, device_id: str, 
                          host: str = '0.0.0.0', 
                          port: int = 8080,
                          handler: Callable = None) -> bool:
        """Create WebSocket server."""
        try:
            async def server_handler(websocket, path):
                client_id = f"{websocket.remote_address}:{path}"
                logger.info(f"Client connected: {client_id}")
                
                try:
                    if handler:
                        await handler(websocket, path)
                    else:
                        # Echo server by default
                        async for message in websocket:
                            await websocket.send(message)
                except Exception as e:
                    logger.error(f"Server handler error: {e}")
                finally:
                    logger.info(f"Client disconnected: {client_id}")
            
            # Start server
            server = await websockets.serve(server_handler, host, port)
            self.servers[device_id] = server
            
            logger.info(f"WebSocket server started on {host}:{port}")
            return True
            
        except Exception as e:
            logger.error(f"WebSocket server creation failed: {e}")
            return False


class HTTPHandler:
    """Enhanced HTTP/HTTPS handler for IoT devices."""
    
    def __init__(self):
        self.sessions = {}
        
    async def connect(self, device: IoTDevice, **kwargs) -> bool:
        """Create HTTP session for device."""
        try:
            # Create session
            timeout = aiohttp.ClientTimeout(total=kwargs.get('timeout', 30))
            
            # SSL verification
            ssl_context = None
            if kwargs.get('verify_ssl', True) is False:
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
            
            # Create session with authentication
            session = aiohttp.ClientSession(
                timeout=timeout,
                connector=aiohttp.TCPConnector(ssl=ssl_context)
            )
            
            # Add authentication
            if device.auth_token:
                session.headers['Authorization'] = f'Bearer {device.auth_token}'
            elif device.metadata.get('api_key'):
                session.headers['X-API-Key'] = device.metadata['api_key']
            
            # Store session
            self.sessions[device.device_id] = {
                'session': session,
                'base_url': kwargs.get('base_url', f"http://{device.metadata.get('ip', 'localhost')}")
            }
            
            # Test connection
            test_endpoint = kwargs.get('test_endpoint', '/health')
            response = await self.get(device.device_id, test_endpoint)
            
            logger.info(f"HTTP session created for device {device.device_id}")
            return True
            
        except Exception as e:
            logger.error(f"HTTP connection failed: {e}")
            if device.device_id in self.sessions:
                await self.sessions[device.device_id]['session'].close()
                del self.sessions[device.device_id]
            return False
    
    async def disconnect(self, device_id: str) -> bool:
        """Close HTTP session."""
        if device_id not in self.sessions:
            return False
        
        try:
            await self.sessions[device_id]['session'].close()
            del self.sessions[device_id]
            return True
        except Exception as e:
            logger.error(f"HTTP disconnect error: {e}")
            return False
    
    async def get(self, device_id: str, endpoint: str, 
                  params: Dict[str, Any] = None) -> Any:
        """HTTP GET request."""
        if device_id not in self.sessions:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        session_info = self.sessions[device_id]
        url = f"{session_info['base_url']}{endpoint}"
        
        async with session_info['session'].get(url, params=params) as response:
            response.raise_for_status()
            
            if 'application/json' in response.headers.get('Content-Type', ''):
                return await response.json()
            else:
                return await response.text()
    
    async def post(self, device_id: str, endpoint: str, 
                   data: Any = None, json_data: Dict[str, Any] = None) -> Any:
        """HTTP POST request."""
        if device_id not in self.sessions:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        session_info = self.sessions[device_id]
        url = f"{session_info['base_url']}{endpoint}"
        
        async with session_info['session'].post(url, data=data, json=json_data) as response:
            response.raise_for_status()
            
            if 'application/json' in response.headers.get('Content-Type', ''):
                return await response.json()
            else:
                return await response.text()
    
    async def put(self, device_id: str, endpoint: str, 
                  data: Any = None, json_data: Dict[str, Any] = None) -> Any:
        """HTTP PUT request."""
        if device_id not in self.sessions:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        session_info = self.sessions[device_id]
        url = f"{session_info['base_url']}{endpoint}"
        
        async with session_info['session'].put(url, data=data, json=json_data) as response:
            response.raise_for_status()
            
            if 'application/json' in response.headers.get('Content-Type', ''):
                return await response.json()
            else:
                return await response.text()
    
    async def delete(self, device_id: str, endpoint: str) -> bool:
        """HTTP DELETE request."""
        if device_id not in self.sessions:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        session_info = self.sessions[device_id]
        url = f"{session_info['base_url']}{endpoint}"
        
        async with session_info['session'].delete(url) as response:
            response.raise_for_status()
            return True


class CANBusHandler:
    """Real CAN Bus handler for automotive/industrial IoT."""
    
    def __init__(self):
        self.buses = {}
        self.listeners = {}
        
    async def connect(self, device: IoTDevice, **kwargs) -> bool:
        """Connect to CAN bus."""
        try:
            channel = kwargs.get('channel', 'can0')
            bustype = kwargs.get('bustype', 'socketcan')
            bitrate = kwargs.get('bitrate', 500000)
            
            # Create CAN bus
            bus = can.interface.Bus(
                channel=channel,
                bustype=bustype,
                bitrate=bitrate
            )
            
            self.buses[device.device_id] = bus
            
            # Start listener if callback provided
            if kwargs.get('callback'):
                listener = can.Listener()
                listener.on_message_received = kwargs['callback']
                self.listeners[device.device_id] = listener
                
                notifier = can.Notifier(bus, [listener])
            
            logger.info(f"CAN bus connected for device {device.device_id}")
            return True
            
        except Exception as e:
            logger.error(f"CAN bus connection failed: {e}")
            return False
    
    async def disconnect(self, device_id: str) -> bool:
        """Disconnect from CAN bus."""
        if device_id not in self.buses:
            return False
        
        try:
            self.buses[device_id].shutdown()
            del self.buses[device_id]
            
            if device_id in self.listeners:
                del self.listeners[device_id]
            
            return True
        except Exception as e:
            logger.error(f"CAN bus disconnect error: {e}")
            return False
    
    async def send_message(self, device_id: str, 
                          arbitration_id: int, 
                          data: bytes,
                          is_extended_id: bool = False) -> bool:
        """Send CAN message."""
        if device_id not in self.buses:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        bus = self.buses[device_id]
        
        msg = can.Message(
            arbitration_id=arbitration_id,
            data=data,
            is_extended_id=is_extended_id
        )
        
        try:
            bus.send(msg)
            return True
        except can.CanError as e:
            logger.error(f"CAN send error: {e}")
            return False
    
    async def receive_message(self, device_id: str, 
                            timeout: float = 1.0) -> Optional[can.Message]:
        """Receive CAN message."""
        if device_id not in self.buses:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        bus = self.buses[device_id]
        
        msg = bus.recv(timeout=timeout)
        return msg
    
    async def add_filter(self, device_id: str, 
                        can_filters: List[Dict[str, Any]]) -> bool:
        """Add CAN filters."""
        if device_id not in self.buses:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        bus = self.buses[device_id]
        bus.set_filters(can_filters)
        return True


class OBD2Handler:
    """Real OBD-II handler for automotive diagnostics."""
    
    def __init__(self):
        self.connections = {}
        
    async def connect(self, device: IoTDevice, **kwargs) -> bool:
        """Connect to OBD-II interface."""
        try:
            port = kwargs.get('port', '/dev/ttyUSB0')
            baudrate = kwargs.get('baudrate', 'auto')
            protocol = kwargs.get('protocol', 'auto')
            fast = kwargs.get('fast', True)
            
            # Create OBD connection
            if kwargs.get('async', True):
                connection = obd.Async(
                    portstr=port,
                    baudrate=baudrate,
                    protocol=protocol,
                    fast=fast
                )
            else:
                connection = obd.OBD(
                    portstr=port,
                    baudrate=baudrate,
                    protocol=protocol,
                    fast=fast
                )
            
            if connection.is_connected():
                self.connections[device.device_id] = connection
                logger.info(f"OBD-II connected for device {device.device_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"OBD-II connection failed: {e}")
            return False
    
    async def disconnect(self, device_id: str) -> bool:
        """Disconnect OBD-II."""
        if device_id not in self.connections:
            return False
        
        try:
            self.connections[device_id].close()
            del self.connections[device_id]
            return True
        except Exception as e:
            logger.error(f"OBD-II disconnect error: {e}")
            return False
    
    async def query(self, device_id: str, command: str) -> Any:
        """Query OBD-II command."""
        if device_id not in self.connections:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        connection = self.connections[device_id]
        
        # Get command object
        if hasattr(obd.commands, command):
            cmd = getattr(obd.commands, command)
        else:
            # Try to parse as custom command
            cmd = obd.OBDCommand(command)
        
        # Query command
        if isinstance(connection, obd.Async):
            response = await connection.query(cmd)
        else:
            response = connection.query(cmd)
        
        if response.is_null():
            return None
        
        return {
            'value': response.value,
            'unit': response.unit if hasattr(response, 'unit') else None,
            'command': command,
            'time': response.time
        }
    
    async def get_dtc(self, device_id: str) -> List[Tuple[str, str]]:
        """Get diagnostic trouble codes."""
        if device_id not in self.connections:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        connection = self.connections[device_id]
        
        if isinstance(connection, obd.Async):
            response = await connection.query(obd.commands.GET_DTC)
        else:
            response = connection.query(obd.commands.GET_DTC)
        
        if response.is_null():
            return []
        
        return response.value
    
    async def clear_dtc(self, device_id: str) -> bool:
        """Clear diagnostic trouble codes."""
        if device_id not in self.connections:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        connection = self.connections[device_id]
        
        if isinstance(connection, obd.Async):
            response = await connection.query(obd.commands.CLEAR_DTC)
        else:
            response = connection.query(obd.commands.CLEAR_DTC)
        
        return not response.is_null()
    
    async def monitor_pid(self, device_id: str, 
                         pid: str, 
                         callback: Callable,
                         interval: float = 1.0) -> bool:
        """Monitor OBD-II PID continuously."""
        if device_id not in self.connections:
            raise DeviceConnectionError(f"Device {device_id} not connected")
        
        connection = self.connections[device_id]
        
        if not isinstance(connection, obd.Async):
            raise IoTDeviceError("Monitoring requires async connection")
        
        # Get command
        if hasattr(obd.commands, pid):
            cmd = getattr(obd.commands, pid)
        else:
            cmd = obd.OBDCommand(pid)
        
        # Watch command
        connection.watch(cmd, callback=callback, interval=interval)
        connection.start()
        
        return True


# Protocol handler registry
PROTOCOL_HANDLERS = {
    DeviceProtocol.MQTT: MQTTHandler(),
    DeviceProtocol.COAP: CoAPHandler(),
    DeviceProtocol.MODBUS: ModbusHandler(),
    DeviceProtocol.BLUETOOTH: BluetoothHandler(),
    DeviceProtocol.ZIGBEE: ZigbeeHandler(),
    DeviceProtocol.LORA: LoRaHandler(),
    DeviceProtocol.WEBSOCKET: WebSocketHandler(),
    DeviceProtocol.HTTP: HTTPHandler(),
    DeviceProtocol.CAN_BUS: CANBusHandler(),
    DeviceProtocol.OBD2: OBD2Handler()
}


def get_protocol_handler(protocol: DeviceProtocol):
    """Get protocol handler instance."""
    return PROTOCOL_HANDLERS.get(protocol)