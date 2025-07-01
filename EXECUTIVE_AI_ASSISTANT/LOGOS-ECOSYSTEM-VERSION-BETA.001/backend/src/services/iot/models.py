"""IoT Device Models and Base Classes."""

from enum import Enum
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field
import uuid


class DeviceProtocol(str, Enum):
    """Supported IoT protocols."""
    MQTT = "mqtt"
    COAP = "coap"
    HTTP = "http"
    WEBSOCKET = "websocket"
    MODBUS = "modbus"
    BLUETOOTH = "bluetooth"
    ZIGBEE = "zigbee"
    ZWAVE = "zwave"
    LORA = "lora"
    NFC = "nfc"
    CAN_BUS = "can_bus"
    OBD2 = "obd2"
    ANDROID_AUTO = "android_auto"
    APPLE_CARPLAY = "apple_carplay"
    ALEXA = "alexa"
    GOOGLE_HOME = "google_home"
    HOMEKIT = "homekit"
    MATTER = "matter"
    THREAD = "thread"


class DeviceType(str, Enum):
    """IoT device types."""
    # Smart Home
    LIGHT = "light"
    SWITCH = "switch"
    THERMOSTAT = "thermostat"
    LOCK = "lock"
    CAMERA = "camera"
    DOORBELL = "doorbell"
    SENSOR = "sensor"
    OUTLET = "outlet"
    SPEAKER = "speaker"
    DISPLAY = "display"
    
    # Automotive
    VEHICLE = "vehicle"
    EV_CHARGER = "ev_charger"
    
    # Wearables
    SMARTWATCH = "smartwatch"
    FITNESS_TRACKER = "fitness_tracker"
    HEALTH_MONITOR = "health_monitor"
    
    # Industrial
    PLC = "plc"
    SCADA = "scada"
    METER = "meter"
    ACTUATOR = "actuator"
    
    # Other
    GATEWAY = "gateway"
    BRIDGE = "bridge"
    HUB = "hub"
    CUSTOM = "custom"


class DeviceStatus(str, Enum):
    """Device connection status."""
    OFFLINE = "offline"
    CONNECTING = "connecting"
    ONLINE = "online"
    ERROR = "error"
    UPDATING = "updating"
    SLEEPING = "sleeping"


class DeviceCapability(str, Enum):
    """Device capabilities."""
    # Control
    ON_OFF = "on_off"
    DIMMING = "dimming"
    COLOR_CONTROL = "color_control"
    TEMPERATURE_CONTROL = "temperature_control"
    LOCK_UNLOCK = "lock_unlock"
    
    # Sensing
    TEMPERATURE_SENSING = "temperature_sensing"
    HUMIDITY_SENSING = "humidity_sensing"
    MOTION_DETECTION = "motion_detection"
    LIGHT_SENSING = "light_sensing"
    SOUND_DETECTION = "sound_detection"
    PRESENCE_DETECTION = "presence_detection"
    
    # Media
    AUDIO_PLAYBACK = "audio_playback"
    VIDEO_STREAMING = "video_streaming"
    VOICE_CONTROL = "voice_control"
    
    # Energy
    ENERGY_MONITORING = "energy_monitoring"
    POWER_CONTROL = "power_control"
    
    # Automotive
    VEHICLE_DIAGNOSTICS = "vehicle_diagnostics"
    REMOTE_START = "remote_start"
    LOCATION_TRACKING = "location_tracking"
    
    # Health
    HEART_RATE = "heart_rate"
    BLOOD_PRESSURE = "blood_pressure"
    OXYGEN_LEVEL = "oxygen_level"
    ACTIVITY_TRACKING = "activity_tracking"


class IoTDevice(BaseModel):
    """Base IoT device model."""
    device_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: DeviceType
    protocol: DeviceProtocol
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    firmware_version: Optional[str] = None
    hardware_version: Optional[str] = None
    serial_number: Optional[str] = None
    
    # Connection info
    status: DeviceStatus = DeviceStatus.OFFLINE
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    port: Optional[int] = None
    
    # Authentication
    auth_token: Optional[str] = None
    api_key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    
    # Capabilities and attributes
    capabilities: List[DeviceCapability] = []
    attributes: Dict[str, Any] = {}
    metadata: Dict[str, Any] = {}
    
    # Security
    encryption_key: Optional[str] = None
    certificate: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_seen: Optional[datetime] = None
    last_updated: Optional[datetime] = None
    
    # Organization
    location: Optional[str] = None
    room: Optional[str] = None
    groups: List[str] = []
    tags: List[str] = []
    
    class Config:
        use_enum_values = True


class DeviceCommand(BaseModel):
    """Command to send to a device."""
    command: str
    parameters: Dict[str, Any] = {}
    target_device: Optional[str] = None
    priority: int = 0
    timeout: Optional[float] = None
    requires_confirmation: bool = False


class DeviceEvent(BaseModel):
    """Event from a device."""
    device_id: str
    event_type: str
    data: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    severity: str = "info"  # info, warning, error, critical


class DeviceState(BaseModel):
    """Current state of a device."""
    device_id: str
    online: bool = False
    state: Dict[str, Any] = {}
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    
    # Common states
    power: Optional[bool] = None
    brightness: Optional[int] = None  # 0-100
    color: Optional[Dict[str, int]] = None  # RGB
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    battery_level: Optional[int] = None  # 0-100
    signal_strength: Optional[int] = None  # RSSI
    
    # Sensor readings
    sensor_data: Dict[str, Any] = {}
    
    # Control states
    locked: Optional[bool] = None
    armed: Optional[bool] = None
    
    # Media states
    playing: Optional[bool] = None
    volume: Optional[int] = None  # 0-100
    muted: Optional[bool] = None


class DeviceGroup(BaseModel):
    """Group of devices."""
    group_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    devices: List[str] = []  # Device IDs
    type: Optional[str] = None  # room, zone, category, etc.
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AutomationRule(BaseModel):
    """Automation rule for devices."""
    rule_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    enabled: bool = True
    
    # Trigger conditions
    triggers: List[Dict[str, Any]] = []
    
    # Actions to perform
    actions: List[Dict[str, Any]] = []
    
    # Constraints
    conditions: List[Dict[str, Any]] = []
    
    # Schedule
    schedule: Optional[Dict[str, Any]] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_triggered: Optional[datetime] = None
    trigger_count: int = 0


class DeviceDiscovery(BaseModel):
    """Device discovery result."""
    protocol: DeviceProtocol
    devices: List[Dict[str, Any]] = []
    scan_duration: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class EdgeComputeTask(BaseModel):
    """Edge computing task."""
    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # filter, aggregate, analyze, control
    
    # Task configuration
    input_devices: List[str] = []
    output_devices: List[str] = []
    
    # Processing logic
    processor: str  # Name of processor function
    parameters: Dict[str, Any] = {}
    
    # Schedule
    interval: Optional[float] = None  # Seconds
    cron: Optional[str] = None
    
    # State
    enabled: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    run_count: int = 0
    
    # Results
    last_result: Optional[Dict[str, Any]] = None
    error_count: int = 0
    last_error: Optional[str] = None


class VehicleData(BaseModel):
    """Vehicle-specific data model."""
    vin: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    
    # Location
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    heading: Optional[float] = None
    speed: Optional[float] = None
    
    # Vehicle status
    odometer: Optional[float] = None
    fuel_level: Optional[float] = None
    battery_level: Optional[float] = None
    engine_rpm: Optional[int] = None
    engine_temp: Optional[float] = None
    oil_pressure: Optional[float] = None
    
    # Diagnostics
    trouble_codes: List[str] = []
    tire_pressure: Dict[str, float] = {}
    
    # Security
    doors_locked: Optional[bool] = None
    windows_closed: Optional[bool] = None
    alarm_active: Optional[bool] = None
    
    # Climate
    interior_temp: Optional[float] = None
    climate_on: Optional[bool] = None
    
    # Timestamps
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class SmartHomeIntegration(BaseModel):
    """Smart home platform integration."""
    platform: str  # alexa, google_home, homekit, etc.
    enabled: bool = True
    account_linked: bool = False
    
    # Authentication
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    
    # Discovered devices
    discovered_devices: List[str] = []
    
    # Sync status
    last_sync: Optional[datetime] = None
    sync_errors: List[str] = []