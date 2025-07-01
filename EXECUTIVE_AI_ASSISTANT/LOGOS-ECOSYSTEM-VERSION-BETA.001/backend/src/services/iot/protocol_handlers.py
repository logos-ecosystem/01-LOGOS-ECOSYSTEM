"""Protocol Handlers Registry for IoT Devices."""

from typing import Dict, Optional, Any
from .models import DeviceProtocol

# Import individual protocol handlers
from .device_manager import (
    MQTTHandler, CoAPHandler, ModbusHandler, BluetoothHandler,
    ZigbeeHandler, LoRaHandler, WebSocketHandler, HTTPHandler,
    CANBusHandler, OBD2Handler
)

# Protocol handler instances
_protocol_handlers: Dict[DeviceProtocol, Any] = {}

def _initialize_handlers():
    """Initialize protocol handlers."""
    global _protocol_handlers
    
    if not _protocol_handlers:
        _protocol_handlers = {
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

def get_protocol_handler(protocol: DeviceProtocol) -> Optional[Any]:
    """Get protocol handler instance."""
    _initialize_handlers()
    return _protocol_handlers.get(protocol)

def register_protocol_handler(protocol: DeviceProtocol, handler: Any):
    """Register custom protocol handler."""
    _initialize_handlers()
    _protocol_handlers[protocol] = handler

__all__ = [
    'get_protocol_handler',
    'register_protocol_handler'
]