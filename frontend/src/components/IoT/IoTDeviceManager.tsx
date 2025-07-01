import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Tooltip,
  Badge,
  Menu,
  Avatar,
  LinearProgress
} from '@mui/material';
import {
  Home,
  Lightbulb,
  Thermostat,
  Security,
  CameraAlt,
  Speaker,
  Lock,
  LockOpen,
  Sensors,
  Router,
  DeviceHub,
  Power,
  PowerOff,
  Settings,
  MoreVert,
  Add,
  Refresh,
  Schedule,
  WbSunny,
  NightsStay,
  CloudQueue,
  NotificationsActive,
  Kitchen,
  Weekend,
  Tv,
  SportsEsports,
  FitnessCenter,
  Watch,
  DirectionsBike,
  Delete,
  Battery20
} from '@mui/icons-material';
import { api } from '../../services/api';

interface IoTDevice {
  id: string;
  name: string;
  type: 'light' | 'thermostat' | 'camera' | 'lock' | 'sensor' | 'speaker' | 'appliance' | 'wearable' | 'fitness';
  brand: string;
  model: string;
  room?: string;
  status: 'online' | 'offline' | 'error';
  connected: boolean;
  battery?: number;
  lastSeen: string;
  capabilities: string[];
  state: Record<string, any>;
  automations?: Array<{
    id: string;
    name: string;
    enabled: boolean;
    trigger: string;
    action: string;
  }>;
}

interface Scene {
  id: string;
  name: string;
  icon: string;
  devices: Array<{
    deviceId: string;
    actions: Record<string, any>;
  }>;
}

const deviceIcons: Record<string, React.ReactNode> = {
  light: <Lightbulb />,
  thermostat: <Thermostat />,
  camera: <CameraAlt />,
  lock: <Lock />,
  sensor: <Sensors />,
  speaker: <Speaker />,
  appliance: <Kitchen />,
  wearable: <Watch />,
  fitness: <FitnessCenter />
};

const rooms = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Office', 'Garage', 'Outdoor'];

const scenes: Scene[] = [
  {
    id: '1',
    name: 'Good Morning',
    icon: 'WbSunny',
    devices: []
  },
  {
    id: '2',
    name: 'Good Night',
    icon: 'NightsStay',
    devices: []
  },
  {
    id: '3',
    name: 'Away',
    icon: 'Home',
    devices: []
  },
  {
    id: '4',
    name: 'Movie Time',
    icon: 'Tv',
    devices: []
  }
];

export default function IoTDeviceManager() {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    deviceId: string;
    message: string;
    timestamp: string;
    type: 'info' | 'warning' | 'error';
  }>>([]);

  useEffect(() => {
    loadDevices();
    // Set up WebSocket for real-time updates
    setupWebSocket();
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/iot/devices');
      setDevices(response.data.data);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    // WebSocket connection for real-time device updates
    // This would connect to your IoT hub
  };

  const toggleDevice = async (device: IoTDevice) => {
    try {
      const newState = !device.state.on;
      await api.post(`/iot/devices/${device.id}/command`, {
        command: 'toggle',
        value: newState
      });
      
      setDevices(prev => prev.map(d => 
        d.id === device.id 
          ? { ...d, state: { ...d.state, on: newState } }
          : d
      ));
    } catch (error) {
      console.error('Error toggling device:', error);
    }
  };

  const updateDeviceState = async (device: IoTDevice, state: Record<string, any>) => {
    try {
      await api.post(`/iot/devices/${device.id}/state`, state);
      
      setDevices(prev => prev.map(d => 
        d.id === device.id 
          ? { ...d, state: { ...d.state, ...state } }
          : d
      ));
    } catch (error) {
      console.error('Error updating device:', error);
    }
  };

  const activateScene = async (scene: Scene) => {
    try {
      await api.post('/iot/scenes/activate', { sceneId: scene.id });
      // Refresh devices to show new states
      loadDevices();
    } catch (error) {
      console.error('Error activating scene:', error);
    }
  };

  const addDevice = async (deviceData: any) => {
    try {
      const response = await api.post('/iot/devices/add', deviceData);
      setDevices(prev => [...prev, response.data.data]);
      setAddDeviceOpen(false);
    } catch (error) {
      console.error('Error adding device:', error);
    }
  };

  const filteredDevices = selectedRoom === 'all' 
    ? devices 
    : devices.filter(d => d.room === selectedRoom);

  const DeviceCard = ({ device }: { device: IoTDevice }) => {
    const isOn = device.state.on;
    
    return (
      <Card sx={{ height: '100%', opacity: device.status === 'offline' ? 0.6 : 1 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: isOn ? 'primary.main' : 'grey.500' }}>
                {deviceIcons[device.type]}
              </Avatar>
              <Box>
                <Typography variant="h6">{device.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {device.brand} {device.model}
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={(e) => {
                setAnchorEl(e.currentTarget);
                setSelectedDevice(device);
              }}
            >
              <MoreVert />
            </IconButton>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Chip
              label={device.status}
              size="small"
              color={device.status === 'online' ? 'success' : 'error'}
              sx={{ mr: 1 }}
            />
            {device.room && <Chip label={device.room} size="small" variant="outlined" />}
            {device.battery !== undefined && device.battery < 20 && (
              <Chip
                label={`${device.battery}%`}
                size="small"
                color="warning"
                icon={<Battery20 />}
              />
            )}
          </Box>

          {/* Device Controls */}
          <Box>
            {device.type === 'light' && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Power</Typography>
                  <Switch
                    checked={isOn}
                    onChange={() => toggleDevice(device)}
                    disabled={device.status === 'offline'}
                  />
                </Box>
                {isOn && device.capabilities.includes('brightness') && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>Brightness</Typography>
                    <Slider
                      value={device.state.brightness || 100}
                      onChange={(e, value) => updateDeviceState(device, { brightness: value })}
                      disabled={device.status === 'offline'}
                    />
                  </Box>
                )}
                {isOn && device.capabilities.includes('color') && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>Color</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'].map(color => (
                        <Box
                          key={color}
                          sx={{
                            width: 24,
                            height: 24,
                            bgcolor: color,
                            borderRadius: '50%',
                            cursor: 'pointer',
                            border: device.state.color === color ? '2px solid #000' : 'none'
                          }}
                          onClick={() => updateDeviceState(device, { color })}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {device.type === 'thermostat' && (
              <Box>
                <Typography variant="h4" align="center" sx={{ my: 2 }}>
                  {device.state.currentTemp || 72}°F
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Target</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => updateDeviceState(device, { 
                        targetTemp: (device.state.targetTemp || 72) - 1 
                      })}
                    >
                      -
                    </IconButton>
                    <Typography>{device.state.targetTemp || 72}°F</Typography>
                    <IconButton
                      size="small"
                      onClick={() => updateDeviceState(device, { 
                        targetTemp: (device.state.targetTemp || 72) + 1 
                      })}
                    >
                      +
                    </IconButton>
                  </Box>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Select
                    size="small"
                    fullWidth
                    value={device.state.mode || 'auto'}
                    onChange={(e) => updateDeviceState(device, { mode: e.target.value })}
                  >
                    <MenuItem value="auto">Auto</MenuItem>
                    <MenuItem value="heat">Heat</MenuItem>
                    <MenuItem value="cool">Cool</MenuItem>
                    <MenuItem value="off">Off</MenuItem>
                  </Select>
                </Box>
              </Box>
            )}

            {device.type === 'lock' && (
              <Box sx={{ textAlign: 'center' }}>
                <IconButton
                  size="large"
                  color={device.state.locked ? 'success' : 'error'}
                  onClick={() => updateDeviceState(device, { locked: !device.state.locked })}
                >
                  {device.state.locked ? <Lock /> : <LockOpen />}
                </IconButton>
                <Typography variant="body2">
                  {device.state.locked ? 'Locked' : 'Unlocked'}
                </Typography>
              </Box>
            )}

            {device.type === 'camera' && (
              <Box>
                <Box sx={{ 
                  height: 120, 
                  bgcolor: 'grey.900', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderRadius: 1,
                  mb: 2
                }}>
                  <CameraAlt sx={{ fontSize: 40, color: 'grey.700' }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Chip
                    label={device.state.recording ? 'Recording' : 'Idle'}
                    size="small"
                    color={device.state.recording ? 'error' : 'default'}
                  />
                  <Switch
                    checked={device.state.motionDetection}
                    onChange={(e) => updateDeviceState(device, { motionDetection: e.target.checked })}
                  />
                </Box>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Smart Home Devices</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadDevices}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddDeviceOpen(true)}
          >
            Add Device
          </Button>
        </Box>
      </Box>

      {/* Room Filter */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
        <Chip
          label="All Rooms"
          onClick={() => setSelectedRoom('all')}
          color={selectedRoom === 'all' ? 'primary' : 'default'}
        />
        {rooms.map(room => (
          <Chip
            key={room}
            label={room}
            onClick={() => setSelectedRoom(room)}
            color={selectedRoom === room ? 'primary' : 'default'}
          />
        ))}
      </Box>

      {/* Scenes */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>Quick Scenes</Typography>
        <Grid container spacing={2}>
          {scenes.map(scene => (
            <Grid item xs={6} sm={3} key={scene.id}>
              <Button
                fullWidth
                variant="outlined"
                sx={{ py: 2 }}
                onClick={() => activateScene(scene)}
              >
                <Box sx={{ textAlign: 'center' }}>
                  {scene.icon === 'WbSunny' && <WbSunny />}
                  {scene.icon === 'NightsStay' && <NightsStay />}
                  {scene.icon === 'Home' && <Home />}
                  {scene.icon === 'Tv' && <Tv />}
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {scene.name}
                  </Typography>
                </Box>
              </Button>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Devices Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredDevices.map(device => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={device.id}>
              <DeviceCard device={device} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Device Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          setAutomationDialogOpen(true);
          setAnchorEl(null);
        }}>
          <ListItemIcon><Schedule /></ListItemIcon>
          <ListItemText>Automations</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          // Open device settings
          setAnchorEl(null);
        }}>
          <ListItemIcon><Settings /></ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          // Remove device
          setAnchorEl(null);
        }}>
          <ListItemIcon><Delete /></ListItemIcon>
          <ListItemText>Remove</ListItemText>
        </MenuItem>
      </Menu>

      {/* Add Device Dialog */}
      <Dialog open={addDeviceOpen} onClose={() => setAddDeviceOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Device</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Device Type</InputLabel>
                <Select label="Device Type" defaultValue="">
                  <MenuItem value="light">Smart Light</MenuItem>
                  <MenuItem value="thermostat">Thermostat</MenuItem>
                  <MenuItem value="camera">Security Camera</MenuItem>
                  <MenuItem value="lock">Smart Lock</MenuItem>
                  <MenuItem value="sensor">Sensor</MenuItem>
                  <MenuItem value="speaker">Smart Speaker</MenuItem>
                  <MenuItem value="appliance">Appliance</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Device Name" />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Room</InputLabel>
                <Select label="Room" defaultValue="">
                  {rooms.map(room => (
                    <MenuItem key={room} value={room}>{room}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                Make sure your device is in pairing mode. We'll automatically detect compatible devices.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDeviceOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => addDevice({})}>
            Search & Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Automations Dialog */}
      <Dialog open={automationDialogOpen} onClose={() => setAutomationDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Device Automations</DialogTitle>
        <DialogContent>
          {selectedDevice && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedDevice.name} Automations
              </Typography>
              <List>
                {selectedDevice.automations?.map(automation => (
                  <ListItem key={automation.id}>
                    <ListItemText
                      primary={automation.name}
                      secondary={`${automation.trigger} → ${automation.action}`}
                    />
                    <ListItemSecondaryAction>
                      <Switch checked={automation.enabled} />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                Create New Automation
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAutomationDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}