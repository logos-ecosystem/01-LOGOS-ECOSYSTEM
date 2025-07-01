"""Control Interfaces for IoT Devices."""

import asyncio
import json
from typing import Dict, List, Optional, Any, Callable, Union, Set
from datetime import datetime, timedelta
from enum import Enum
import uuid

from ...shared.utils.logger import get_logger
from ...shared.utils.exceptions import IoTDeviceError
from ...infrastructure.cache.multi_level import MultiLevelCache
from .models import (
    IoTDevice, DeviceCommand, DeviceState, DeviceCapability,
    DeviceType, AutomationRule, DeviceGroup
)
from .device_manager import DeviceManager
from .mqtt_client import MQTTClient
from .websocket_handler import IoTWebSocketHandler

logger = get_logger(__name__)


class ControlMode(str, Enum):
    """Device control modes."""
    MANUAL = "manual"
    AUTOMATIC = "automatic"
    SCHEDULED = "scheduled"
    ADAPTIVE = "adaptive"


class DeviceController:
    """High-level device control interface."""
    
    def __init__(self, 
                 device_manager: DeviceManager,
                 mqtt_client: Optional[MQTTClient] = None,
                 websocket_handler: Optional[IoTWebSocketHandler] = None,
                 cache: Optional[MultiLevelCache] = None):
        """Initialize device controller."""
        self.device_manager = device_manager
        self.mqtt_client = mqtt_client
        self.websocket_handler = websocket_handler
        self.cache = cache or MultiLevelCache()
        
        # Control state
        self.control_modes: Dict[str, ControlMode] = {}
        self.active_schedules: Dict[str, List[asyncio.Task]] = {}
        self.automation_rules: Dict[str, AutomationRule] = {}
        self.device_groups: Dict[str, DeviceGroup] = {}
        
        # Command queue
        self.command_queue = asyncio.Queue()
        self.command_processor_task = None
        
    async def start(self):
        """Start device controller."""
        self.command_processor_task = asyncio.create_task(self._process_commands())
        logger.info("Device controller started")
        
    async def stop(self):
        """Stop device controller."""
        if self.command_processor_task:
            self.command_processor_task.cancel()
            
        # Cancel all schedules
        for device_id, tasks in self.active_schedules.items():
            for task in tasks:
                task.cancel()
                
        logger.info("Device controller stopped")
        
    # Device control methods
    
    async def control_device(self, device_id: str, command: str,
                           parameters: Dict[str, Any] = None,
                           priority: int = 0) -> Dict[str, Any]:
        """Send control command to device."""
        device = await self.device_manager.get_device(device_id)
        if not device:
            raise IoTDeviceError(f"Device {device_id} not found")
            
        # Check if device supports command
        if not self._validate_command(device, command):
            raise IoTDeviceError(f"Device {device_id} does not support command {command}")
            
        # Create command object
        device_command = DeviceCommand(
            command=command,
            parameters=parameters or {},
            target_device=device_id,
            priority=priority,
            timeout=30.0
        )
        
        # Add to queue
        await self.command_queue.put(device_command)
        
        # Wait for result
        result = await self._execute_command(device, device_command)
        
        # Update device state
        await self._update_device_state_after_command(device, command, parameters)
        
        return result
        
    def _validate_command(self, device: IoTDevice, command: str) -> bool:
        """Validate if device supports command."""
        # Map commands to required capabilities
        capability_map = {
            'turn_on': DeviceCapability.ON_OFF,
            'turn_off': DeviceCapability.ON_OFF,
            'set_brightness': DeviceCapability.DIMMING,
            'set_color': DeviceCapability.COLOR_CONTROL,
            'set_temperature': DeviceCapability.TEMPERATURE_CONTROL,
            'lock': DeviceCapability.LOCK_UNLOCK,
            'unlock': DeviceCapability.LOCK_UNLOCK,
            'play': DeviceCapability.AUDIO_PLAYBACK,
            'pause': DeviceCapability.AUDIO_PLAYBACK,
            'start_recording': DeviceCapability.VIDEO_STREAMING
        }
        
        required_capability = capability_map.get(command)
        if required_capability:
            return required_capability in device.capabilities
            
        return True  # Allow unknown commands
        
    async def _execute_command(self, device: IoTDevice, 
                             command: DeviceCommand) -> Dict[str, Any]:
        """Execute command on device."""
        # Try different protocols in order
        result = None
        
        # Try WebSocket first (fastest)
        if self.websocket_handler and device.device_id in self.websocket_handler.clients:
            try:
                result = await self.websocket_handler.send_command(
                    device.device_id, command
                )
                return result
            except Exception as e:
                logger.warning(f"WebSocket command failed: {e}")
                
        # Try MQTT
        if self.mqtt_client and self.mqtt_client.connected:
            try:
                result = await self.mqtt_client.send_command(
                    device.device_id,
                    command.command,
                    command.parameters,
                    command.timeout
                )
                return result
            except Exception as e:
                logger.warning(f"MQTT command failed: {e}")
                
        # Try direct protocol
        try:
            result = await self.device_manager.send_command(
                device.device_id,
                command.command,
                command.parameters
            )
            return result
        except Exception as e:
            logger.error(f"Direct command failed: {e}")
            raise IoTDeviceError(f"Failed to execute command: {e}")
            
    async def _update_device_state_after_command(self, device: IoTDevice,
                                               command: str,
                                               parameters: Dict[str, Any]):
        """Update device state after command execution."""
        state = await self.get_device_state(device.device_id)
        if not state:
            state = DeviceState(device_id=device.device_id, online=True)
            
        # Update state based on command
        if command == 'turn_on':
            state.power = True
        elif command == 'turn_off':
            state.power = False
        elif command == 'set_brightness' and 'level' in parameters:
            state.brightness = parameters['level']
        elif command == 'set_color' and 'color' in parameters:
            state.color = parameters['color']
        elif command == 'set_temperature' and 'temperature' in parameters:
            state.state['target_temperature'] = parameters['temperature']
        elif command == 'lock':
            state.locked = True
        elif command == 'unlock':
            state.locked = False
        elif command == 'play':
            state.playing = True
        elif command == 'pause':
            state.playing = False
        elif command == 'set_volume' and 'level' in parameters:
            state.volume = parameters['level']
            
        state.last_updated = datetime.utcnow()
        
        # Cache state
        await self.cache.set(
            f"device_state:{device.device_id}",
            state.dict(),
            ttl=300
        )
        
    async def _process_commands(self):
        """Process command queue."""
        try:
            while True:
                command = await self.command_queue.get()
                
                try:
                    device = await self.device_manager.get_device(command.target_device)
                    if device:
                        await self._execute_command(device, command)
                except Exception as e:
                    logger.error(f"Command processing error: {e}")
                    
        except asyncio.CancelledError:
            pass
            
    # State management
    
    async def get_device_state(self, device_id: str) -> Optional[DeviceState]:
        """Get current device state."""
        # Check cache
        cached = await self.cache.get(f"device_state:{device_id}")
        if cached:
            return DeviceState(**cached)
            
        # Try WebSocket
        if self.websocket_handler:
            state = await self.websocket_handler.get_device_state(device_id)
            if state:
                return state
                
        # Try MQTT
        if self.mqtt_client:
            state = await self.mqtt_client.get_device_state(device_id)
            if state:
                return state
                
        # Get from device manager
        return await self.device_manager.get_device_state(device_id)
        
    async def set_device_state(self, device_id: str, state: Dict[str, Any]):
        """Set device state."""
        # Convert state to commands
        commands = []
        
        if 'power' in state:
            commands.append(('turn_on' if state['power'] else 'turn_off', {}))
            
        if 'brightness' in state:
            commands.append(('set_brightness', {'level': state['brightness']}))
            
        if 'color' in state:
            commands.append(('set_color', {'color': state['color']}))
            
        if 'temperature' in state:
            commands.append(('set_temperature', {'temperature': state['temperature']}))
            
        if 'locked' in state:
            commands.append(('lock' if state['locked'] else 'unlock', {}))
            
        if 'volume' in state:
            commands.append(('set_volume', {'level': state['volume']}))
            
        # Execute commands
        results = []
        for command, params in commands:
            try:
                result = await self.control_device(device_id, command, params)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to set state {command}: {e}")
                
        return results
        
    # Group control
    
    async def create_device_group(self, name: str, device_ids: List[str],
                                group_type: Optional[str] = None) -> DeviceGroup:
        """Create device group."""
        group = DeviceGroup(
            name=name,
            devices=device_ids,
            type=group_type
        )
        
        self.device_groups[group.group_id] = group
        
        # Cache group
        await self.cache.set(
            f"device_group:{group.group_id}",
            group.dict(),
            ttl=3600
        )
        
        return group
        
    async def control_group(self, group_id: str, command: str,
                          parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Control all devices in group."""
        group = self.device_groups.get(group_id)
        if not group:
            raise IoTDeviceError(f"Group {group_id} not found")
            
        results = {}
        tasks = []
        
        # Send command to all devices
        for device_id in group.devices:
            task = asyncio.create_task(
                self.control_device(device_id, command, parameters)
            )
            tasks.append((device_id, task))
            
        # Wait for results
        for device_id, task in tasks:
            try:
                result = await task
                results[device_id] = {'success': True, 'result': result}
            except Exception as e:
                results[device_id] = {'success': False, 'error': str(e)}
                
        return results
        
    # Scheduling
    
    async def schedule_command(self, device_id: str, command: str,
                             parameters: Dict[str, Any] = None,
                             schedule_time: Optional[datetime] = None,
                             repeat_interval: Optional[timedelta] = None) -> str:
        """Schedule command execution."""
        schedule_id = str(uuid.uuid4())
        
        async def execute_scheduled():
            try:
                # Wait until scheduled time
                if schedule_time:
                    wait_time = (schedule_time - datetime.utcnow()).total_seconds()
                    if wait_time > 0:
                        await asyncio.sleep(wait_time)
                        
                # Execute command
                await self.control_device(device_id, command, parameters)
                
                # Repeat if interval specified
                if repeat_interval:
                    while True:
                        await asyncio.sleep(repeat_interval.total_seconds())
                        await self.control_device(device_id, command, parameters)
                        
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.error(f"Scheduled command error: {e}")
                
        # Create and store task
        task = asyncio.create_task(execute_scheduled())
        
        if device_id not in self.active_schedules:
            self.active_schedules[device_id] = []
        self.active_schedules[device_id].append(task)
        
        return schedule_id
        
    async def cancel_schedule(self, device_id: str, schedule_id: Optional[str] = None):
        """Cancel scheduled commands."""
        if device_id not in self.active_schedules:
            return
            
        if schedule_id:
            # Cancel specific schedule
            # TODO: Implement schedule ID tracking
            pass
        else:
            # Cancel all schedules for device
            for task in self.active_schedules[device_id]:
                task.cancel()
            del self.active_schedules[device_id]
            
    # Automation
    
    async def create_automation_rule(self, rule: AutomationRule) -> str:
        """Create automation rule."""
        self.automation_rules[rule.rule_id] = rule
        
        # Start rule processor
        asyncio.create_task(self._process_automation_rule(rule))
        
        return rule.rule_id
        
    async def _process_automation_rule(self, rule: AutomationRule):
        """Process automation rule."""
        try:
            while rule.enabled and rule.rule_id in self.automation_rules:
                # Check triggers
                triggered = await self._check_triggers(rule.triggers)
                
                if triggered:
                    # Check conditions
                    if await self._check_conditions(rule.conditions):
                        # Execute actions
                        await self._execute_actions(rule.actions)
                        
                        # Update rule stats
                        rule.last_triggered = datetime.utcnow()
                        rule.trigger_count += 1
                        
                # Wait before next check
                await asyncio.sleep(1.0)
                
        except Exception as e:
            logger.error(f"Automation rule error: {e}")
            
    async def _check_triggers(self, triggers: List[Dict[str, Any]]) -> bool:
        """Check if any trigger is activated."""
        for trigger in triggers:
            trigger_type = trigger.get('type')
            
            if trigger_type == 'device_state':
                device_id = trigger.get('device_id')
                attribute = trigger.get('attribute')
                value = trigger.get('value')
                operator = trigger.get('operator', 'eq')
                
                state = await self.get_device_state(device_id)
                if state:
                    current_value = getattr(state, attribute, None)
                    if current_value is None:
                        current_value = state.state.get(attribute)
                        
                    if self._compare_values(current_value, value, operator):
                        return True
                        
            elif trigger_type == 'time':
                # Check time-based triggers
                current_time = datetime.utcnow().time()
                trigger_time = datetime.strptime(trigger.get('time'), '%H:%M').time()
                
                if abs((datetime.combine(datetime.today(), current_time) -
                       datetime.combine(datetime.today(), trigger_time)).total_seconds()) < 60:
                    return True
                    
            elif trigger_type == 'event':
                # Check for specific events
                # TODO: Implement event checking
                pass
                
        return False
        
    async def _check_conditions(self, conditions: List[Dict[str, Any]]) -> bool:
        """Check if all conditions are met."""
        if not conditions:
            return True
            
        for condition in conditions:
            condition_type = condition.get('type')
            
            if condition_type == 'time_range':
                start_time = datetime.strptime(condition.get('start'), '%H:%M').time()
                end_time = datetime.strptime(condition.get('end'), '%H:%M').time()
                current_time = datetime.utcnow().time()
                
                if not (start_time <= current_time <= end_time):
                    return False
                    
            elif condition_type == 'day_of_week':
                allowed_days = condition.get('days', [])
                current_day = datetime.utcnow().strftime('%A').lower()
                
                if current_day not in allowed_days:
                    return False
                    
            elif condition_type == 'device_state':
                # Similar to triggers but must be true
                device_id = condition.get('device_id')
                attribute = condition.get('attribute')
                value = condition.get('value')
                operator = condition.get('operator', 'eq')
                
                state = await self.get_device_state(device_id)
                if state:
                    current_value = getattr(state, attribute, None)
                    if current_value is None:
                        current_value = state.state.get(attribute)
                        
                    if not self._compare_values(current_value, value, operator):
                        return False
                        
        return True
        
    async def _execute_actions(self, actions: List[Dict[str, Any]]):
        """Execute automation actions."""
        for action in actions:
            action_type = action.get('type')
            
            if action_type == 'device_command':
                device_id = action.get('device_id')
                command = action.get('command')
                parameters = action.get('parameters', {})
                
                try:
                    await self.control_device(device_id, command, parameters)
                except Exception as e:
                    logger.error(f"Failed to execute action: {e}")
                    
            elif action_type == 'group_command':
                group_id = action.get('group_id')
                command = action.get('command')
                parameters = action.get('parameters', {})
                
                try:
                    await self.control_group(group_id, command, parameters)
                except Exception as e:
                    logger.error(f"Failed to execute group action: {e}")
                    
            elif action_type == 'notification':
                # Send notification
                # TODO: Implement notification system
                pass
                
            elif action_type == 'delay':
                delay = action.get('seconds', 0)
                await asyncio.sleep(delay)
                
    def _compare_values(self, current: Any, target: Any, operator: str) -> bool:
        """Compare values based on operator."""
        try:
            if operator == 'eq':
                return current == target
            elif operator == 'ne':
                return current != target
            elif operator == 'gt':
                return float(current) > float(target)
            elif operator == 'gte':
                return float(current) >= float(target)
            elif operator == 'lt':
                return float(current) < float(target)
            elif operator == 'lte':
                return float(current) <= float(target)
            elif operator == 'in':
                return current in target
            elif operator == 'contains':
                return target in str(current)
            else:
                return False
        except:
            return False
            
    # Control modes
    
    async def set_control_mode(self, device_id: str, mode: ControlMode):
        """Set device control mode."""
        self.control_modes[device_id] = mode
        
        # Apply mode-specific settings
        if mode == ControlMode.AUTOMATIC:
            # Enable relevant automation rules
            for rule in self.automation_rules.values():
                for trigger in rule.triggers:
                    if trigger.get('device_id') == device_id:
                        rule.enabled = True
                        
        elif mode == ControlMode.MANUAL:
            # Disable automation for device
            for rule in self.automation_rules.values():
                for trigger in rule.triggers:
                    if trigger.get('device_id') == device_id:
                        rule.enabled = False
                        
        elif mode == ControlMode.ADAPTIVE:
            # Enable AI-based control
            # TODO: Implement adaptive control
            pass
            
    def get_control_mode(self, device_id: str) -> ControlMode:
        """Get device control mode."""
        return self.control_modes.get(device_id, ControlMode.MANUAL)
        
    # Scenes
    
    async def create_scene(self, name: str, devices: Dict[str, Dict[str, Any]]) -> str:
        """Create scene with device states."""
        scene_id = str(uuid.uuid4())
        
        # Store scene
        await self.cache.set(
            f"scene:{scene_id}",
            {
                'name': name,
                'devices': devices,
                'created_at': datetime.utcnow().isoformat()
            },
            ttl=0  # Permanent
        )
        
        return scene_id
        
    async def activate_scene(self, scene_id: str) -> Dict[str, Any]:
        """Activate scene."""
        # Get scene
        scene = await self.cache.get(f"scene:{scene_id}")
        if not scene:
            raise IoTDeviceError(f"Scene {scene_id} not found")
            
        results = {}
        
        # Apply device states
        for device_id, state in scene['devices'].items():
            try:
                await self.set_device_state(device_id, state)
                results[device_id] = {'success': True}
            except Exception as e:
                results[device_id] = {'success': False, 'error': str(e)}
                
        return results