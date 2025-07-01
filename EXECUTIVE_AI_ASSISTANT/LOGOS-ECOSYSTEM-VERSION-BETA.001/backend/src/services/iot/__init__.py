"""IoT Integration Module for LOGOS ECOSYSTEM.

Provides comprehensive IoT connectivity including:
- MQTT, WebSocket, CoAP, HTTP protocols
- Bluetooth, Zigbee, LoRa wireless protocols
- Modbus, CAN Bus industrial protocols
- Android Auto and Apple CarPlay automotive integration
- Device management and telemetry collection
- Real-time control interfaces
"""

# Core device management
from .device_manager_new import DeviceManager
from .models import (
    IoTDevice, DeviceProtocol, DeviceType, DeviceStatus,
    DeviceCapability, DeviceCommand, DeviceEvent, DeviceState,
    AutomationRule, DeviceGroup, VehicleData
)

# Communication protocols
from .mqtt_client import MQTTClient
from .websocket_handler import IoTWebSocketHandler
from .automotive_protocols import AndroidAutoProtocol, CarPlayProtocol

# Telemetry and control
from .telemetry_collector import TelemetryCollector, TelemetryMetric
from .control_interfaces import DeviceController, ControlMode

# Protocol handlers
from .protocol_handlers import get_protocol_handler, register_protocol_handler

__all__ = [
    # Device management
    "DeviceManager",
    "IoTDevice",
    "DeviceProtocol",
    "DeviceType", 
    "DeviceStatus",
    "DeviceCapability",
    "DeviceCommand",
    "DeviceEvent",
    "DeviceState",
    "AutomationRule",
    "DeviceGroup",
    "VehicleData",
    
    # Communication
    "MQTTClient",
    "IoTWebSocketHandler",
    "AndroidAutoProtocol",
    "CarPlayProtocol",
    
    # Telemetry and control
    "TelemetryCollector",
    "TelemetryMetric",
    "DeviceController",
    "ControlMode",
    
    # Protocol handlers
    "get_protocol_handler",
    "register_protocol_handler"
]