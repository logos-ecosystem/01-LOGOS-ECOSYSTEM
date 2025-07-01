"""Apple CarPlay Protocol definitions (simulated)."""

from enum import IntEnum
from typing import Dict, List, Any, Optional
import struct


class iAP2Message:
    """Base iAP2 message for CarPlay communication."""
    def __init__(self, message_id: int = 0):
        self.message_id = message_id
        self.payload = b""
    
    def serialize(self) -> bytes:
        """Serialize iAP2 message."""
        header = struct.pack('>HH', self.message_id, len(self.payload))
        return header + self.payload


class CarPlayCapabilities:
    """CarPlay capability flags."""
    AUDIO = 1 << 0
    PHONE = 1 << 1
    MESSAGES = 1 << 2
    NAVIGATION = 1 << 3
    NOW_PLAYING = 1 << 4
    SIRI = 1 << 5
    QUICK_ORDERING = 1 << 6
    FUELING = 1 << 7
    PARKING = 1 << 8
    
    def __init__(self):
        self.capabilities = 0
    
    def add_capability(self, cap: int):
        """Add a capability."""
        self.capabilities |= cap
    
    def has_capability(self, cap: int) -> bool:
        """Check if capability is supported."""
        return bool(self.capabilities & cap)


class CarPlayHandshake:
    """CarPlay handshake message."""
    def __init__(self):
        self.protocol_version = "2.0"
        self.display_width = 1920
        self.display_height = 720
        self.capabilities = CarPlayCapabilities()
        self.vehicle_name = "LOGOS Vehicle"
    
    def serialize(self) -> bytes:
        """Serialize handshake."""
        data = f"{self.protocol_version}|{self.display_width}|{self.display_height}|"
        data += f"{self.capabilities.capabilities}|{self.vehicle_name}"
        return data.encode()


class SiriRequest:
    """Siri activation request."""
    def __init__(self):
        self.audio_format = "AAC"
        self.sample_rate = 16000
        self.audio_data = b""
        self.session_id = ""
    
    def serialize(self) -> bytes:
        """Serialize Siri request."""
        header = f"{self.audio_format}|{self.sample_rate}|{self.session_id}|".encode()
        return header + self.audio_data


class SiriResponse:
    """Siri response."""
    def __init__(self):
        self.text_response = ""
        self.audio_response = b""
        self.action_taken = False
        self.error_code = 0
    
    def parse(self, data: bytes):
        """Parse Siri response."""
        # Simulated parsing
        self.text_response = "I'll navigate to the nearest gas station"
        self.action_taken = True


class CarPlayUITemplate:
    """CarPlay UI template types."""
    LIST = "list"
    GRID = "grid"
    MAP = "map"
    NOW_PLAYING = "now_playing"
    ALERT = "alert"
    ACTION_SHEET = "action_sheet"
    CONTACT = "contact"
    
    def __init__(self, template_type: str):
        self.type = template_type
        self.items = []
        self.title = ""
        self.subtitle = ""
    
    def add_item(self, item: Dict[str, Any]):
        """Add item to template."""
        self.items.append(item)
    
    def serialize(self) -> bytes:
        """Serialize UI template."""
        import json
        data = {
            'type': self.type,
            'title': self.title,
            'subtitle': self.subtitle,
            'items': self.items
        }
        return json.dumps(data).encode()


class CarPlayNowPlaying:
    """Now Playing information."""
    def __init__(self):
        self.title = ""
        self.artist = ""
        self.album = ""
        self.duration = 0
        self.elapsed = 0
        self.artwork = b""
        self.is_playing = False
    
    def serialize(self) -> bytes:
        """Serialize now playing info."""
        data = struct.pack('>?ff', self.is_playing, self.duration, self.elapsed)
        metadata = f"{self.title}|{self.artist}|{self.album}".encode()
        return data + metadata + self.artwork


class CarPlayNavigation:
    """Navigation template."""
    def __init__(self):
        self.destination = ""
        self.distance_remaining = 0.0
        self.time_remaining = 0
        self.current_instruction = ""
        self.next_instruction = ""
        self.route_points = []
    
    def add_route_point(self, lat: float, lng: float):
        """Add route point."""
        self.route_points.append((lat, lng))
    
    def serialize(self) -> bytes:
        """Serialize navigation data."""
        header = struct.pack('>ff', self.distance_remaining, float(self.time_remaining))
        instructions = f"{self.current_instruction}|{self.next_instruction}".encode()
        
        # Pack route points
        route_data = struct.pack('>I', len(self.route_points))
        for lat, lng in self.route_points:
            route_data += struct.pack('>ff', lat, lng)
        
        return header + instructions + route_data


class CarPlayUserInput:
    """User input types."""
    TOUCH = "touch"
    KNOB_ROTATE = "knob_rotate"
    KNOB_PUSH = "knob_push"
    BUTTON = "button"
    SWIPE = "swipe"
    
    def __init__(self, input_type: str):
        self.type = input_type
        self.x = 0
        self.y = 0
        self.button_id = ""
        self.direction = ""
        self.value = 0
    
    def parse(self, data: bytes):
        """Parse user input."""
        # Simulated parsing
        if self.type == self.TOUCH:
            self.x, self.y = struct.unpack('>HH', data[:4])
        elif self.type == self.KNOB_ROTATE:
            self.direction = "clockwise" if data[0] > 0 else "counter-clockwise"
            self.value = abs(data[0])


class CarPlayVehicleStatus:
    """Vehicle status for CarPlay."""
    def __init__(self):
        self.speed = 0.0
        self.fuel_level = 0.0
        self.range_remaining = 0.0
        self.gear = "P"
        self.turn_signal = None  # None, "left", "right"
        self.parking_brake = False
    
    def serialize(self) -> bytes:
        """Serialize vehicle status."""
        flags = 0
        if self.parking_brake:
            flags |= 1
        if self.turn_signal == "left":
            flags |= 2
        elif self.turn_signal == "right":
            flags |= 4
        
        data = struct.pack('>fffB', self.speed, self.fuel_level, 
                          self.range_remaining, flags)
        data += self.gear.encode()
        return data


class CarPlayAudioRoute:
    """Audio routing options."""
    BLUETOOTH = "bluetooth"
    USB = "usb"
    WIFI = "wifi"
    AUX = "aux"
    
    def __init__(self, route_type: str):
        self.type = route_type
        self.volume = 50
        self.is_active = False
        self.supports_microphone = True
    
    def serialize(self) -> bytes:
        """Serialize audio route."""
        flags = 0
        if self.is_active:
            flags |= 1
        if self.supports_microphone:
            flags |= 2
        
        data = struct.pack('>BB', self.volume, flags)
        data += self.type.encode()
        return data