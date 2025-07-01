import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import {
  DirectionsCar,
  Speed,
  LocalGasStation,
  Navigation,
  Battery80,
  AcUnit,
  WbSunny,
  VolumeUp,
  Bluetooth,
  Wifi,
  Lock,
  LockOpen,
  Warning,
  CheckCircle,
  Refresh,
  Settings,
  Map
} from '@mui/icons-material';
import { api } from '../../services/api';

interface CarData {
  make: string;
  model: string;
  year: number;
  vin: string;
  connection_status: 'connected' | 'disconnected' | 'connecting';
  last_sync: string;
  features: {
    voice_control: boolean;
    navigation: boolean;
    climate_control: boolean;
    remote_start: boolean;
    door_locks: boolean;
    diagnostics: boolean;
  };
  current_data?: {
    speed: number;
    fuel_level: number;
    battery_level?: number;
    engine_temp: number;
    odometer: number;
    location?: {
      lat: number;
      lng: number;
    };
    doors_locked: boolean;
    engine_running: boolean;
    climate: {
      temperature: number;
      ac_on: boolean;
    };
  };
  diagnostics?: {
    engine_health: number;
    tire_pressure: {
      front_left: number;
      front_right: number;
      rear_left: number;
      rear_right: number;
    };
    oil_life: number;
    alerts: Array<{
      type: 'warning' | 'error' | 'info';
      message: string;
      code?: string;
    }>;
  };
}

interface CarIntegrationProps {
  onCommand?: (command: string, params?: any) => void;
  onVoiceActivation?: () => void;
}

export default function CarIntegration({ onCommand, onVoiceActivation }: CarIntegrationProps) {
  const [cars, setCars] = useState<CarData[]>([]);
  const [selectedCar, setSelectedCar] = useState<CarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [commandHistory, setCommandHistory] = useState<Array<{
    timestamp: string;
    command: string;
    status: 'success' | 'failed';
  }>>([]);

  useEffect(() => {
    loadConnectedCars();
  }, []);

  const loadConnectedCars = async () => {
    setLoading(true);
    try {
      const response = await api.get('/integrations/cars');
      setCars(response.data.data);
      if (response.data.data.length > 0 && !selectedCar) {
        setSelectedCar(response.data.data[0]);
      }
    } catch (error) {
      console.error('Error loading cars:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectCar = async (formData: any) => {
    try {
      const response = await api.post('/integrations/cars/connect', formData);
      setCars(prev => [...prev, response.data.data]);
      setConnectDialogOpen(false);
      setSelectedCar(response.data.data);
    } catch (error) {
      console.error('Error connecting car:', error);
    }
  };

  const sendCommand = async (command: string, params?: any) => {
    if (!selectedCar) return;

    const historyEntry = {
      timestamp: new Date().toISOString(),
      command,
      status: 'success' as const
    };

    try {
      await api.post(`/integrations/cars/${selectedCar.vin}/command`, {
        command,
        params
      });
      
      setCommandHistory(prev => [historyEntry, ...prev].slice(0, 10));
      
      if (onCommand) {
        onCommand(command, params);
      }
      
      // Refresh car data
      setTimeout(loadConnectedCars, 2000);
    } catch (error) {
      console.error('Error sending command:', error);
      historyEntry.status = 'failed';
      setCommandHistory(prev => [historyEntry, ...prev].slice(0, 10));
    }
  };

  const CarSelector = () => (
    <FormControl fullWidth size="small">
      <InputLabel>Select Vehicle</InputLabel>
      <Select
        value={selectedCar?.vin || ''}
        onChange={(e) => {
          const car = cars.find(c => c.vin === e.target.value);
          setSelectedCar(car || null);
        }}
        label="Select Vehicle"
      >
        {cars.map(car => (
          <MenuItem key={car.vin} value={car.vin}>
            {car.year} {car.make} {car.model}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const CarStatus = () => {
    if (!selectedCar || !selectedCar.current_data) return null;

    const data = selectedCar.current_data;
    
    return (
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Speed color="primary" />
              <Typography variant="h6">{data.speed} mph</Typography>
              <Typography variant="caption">Speed</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <LocalGasStation color={data.fuel_level < 20 ? 'error' : 'primary'} />
              <Typography variant="h6">{data.fuel_level}%</Typography>
              <Typography variant="caption">Fuel Level</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              {data.battery_level !== undefined ? <Battery80 color="primary" /> : <Speed color="primary" />}
              <Typography variant="h6">
                {data.battery_level !== undefined ? `${data.battery_level}%` : `${data.engine_temp}°F`}
              </Typography>
              <Typography variant="caption">
                {data.battery_level !== undefined ? 'Battery' : 'Engine Temp'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              {data.doors_locked ? <Lock color="success" /> : <LockOpen color="warning" />}
              <Typography variant="h6">{data.doors_locked ? 'Locked' : 'Unlocked'}</Typography>
              <Typography variant="caption">Doors</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const QuickActions = () => (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>Quick Actions</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={selectedCar?.current_data?.doors_locked ? <LockOpen /> : <Lock />}
            onClick={() => sendCommand(selectedCar?.current_data?.doors_locked ? 'unlock' : 'lock')}
          >
            {selectedCar?.current_data?.doors_locked ? 'Unlock' : 'Lock'}
          </Button>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<DirectionsCar />}
            onClick={() => sendCommand('remote_start')}
            disabled={selectedCar?.current_data?.engine_running}
          >
            Start Engine
          </Button>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AcUnit />}
            onClick={() => sendCommand('climate_control', { temperature: 72, ac: true })}
          >
            Climate
          </Button>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Navigation />}
            onClick={() => sendCommand('navigation', { destination: 'home' })}
          >
            Navigate Home
          </Button>
        </Grid>
      </Grid>
    </Box>
  );

  const DiagnosticsPanel = () => {
    if (!selectedCar?.diagnostics) return null;

    const diag = selectedCar.diagnostics;
    
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>Vehicle Diagnostics</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="Engine Health"
                  secondary={
                    <LinearProgress 
                      variant="determinate" 
                      value={diag.engine_health} 
                      color={diag.engine_health > 80 ? 'success' : 'warning'}
                    />
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Oil Life"
                  secondary={
                    <LinearProgress 
                      variant="determinate" 
                      value={diag.oil_life} 
                      color={diag.oil_life > 20 ? 'success' : 'error'}
                    />
                  }
                />
              </ListItem>
            </List>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>Tire Pressure (PSI)</Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Chip label={`FL: ${diag.tire_pressure.front_left}`} size="small" />
              </Grid>
              <Grid item xs={6}>
                <Chip label={`FR: ${diag.tire_pressure.front_right}`} size="small" />
              </Grid>
              <Grid item xs={6}>
                <Chip label={`RL: ${diag.tire_pressure.rear_left}`} size="small" />
              </Grid>
              <Grid item xs={6}>
                <Chip label={`RR: ${diag.tire_pressure.rear_right}`} size="small" />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        
        {diag.alerts.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Alerts</Typography>
            {diag.alerts.map((alert, index) => (
              <Alert key={index} severity={alert.type} sx={{ mb: 1 }}>
                {alert.message} {alert.code && `(${alert.code})`}
              </Alert>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Car Integration</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadConnectedCars}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<DirectionsCar />}
            onClick={() => setConnectDialogOpen(true)}
          >
            Connect Car
          </Button>
        </Box>
      </Box>

      {cars.length === 0 ? (
        <Alert severity="info">
          No cars connected yet. Click "Connect Car" to add your vehicle.
        </Alert>
      ) : (
        <>
          <Box sx={{ mb: 3 }}>
            <CarSelector />
          </Box>

          {selectedCar && (
            <>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">
                        {selectedCar.year} {selectedCar.make} {selectedCar.model}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        VIN: {selectedCar.vin}
                      </Typography>
                    </Box>
                    <Chip
                      icon={selectedCar.connection_status === 'connected' ? <CheckCircle /> : <Warning />}
                      label={selectedCar.connection_status}
                      color={selectedCar.connection_status === 'connected' ? 'success' : 'warning'}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    {Object.entries(selectedCar.features).map(([feature, enabled]) => (
                      <Grid item xs={6} sm={4} key={feature}>
                        <FormControlLabel
                          control={<Switch checked={enabled} disabled />}
                          label={feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>

              {selectedCar.connection_status === 'connected' && (
                <>
                  <CarStatus />
                  <QuickActions />
                  <DiagnosticsPanel />
                  
                  {/* Voice Control */}
                  {selectedCar.features.voice_control && (
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<VolumeUp />}
                        onClick={onVoiceActivation}
                      >
                        Activate Voice Control
                      </Button>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Say "Hey LOGOS" followed by your command
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </>
          )}

          {/* Command History */}
          {commandHistory.length > 0 && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Recent Commands</Typography>
                <List dense>
                  {commandHistory.map((cmd, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {cmd.status === 'success' ? (
                          <CheckCircle color="success" fontSize="small" />
                        ) : (
                          <Warning color="error" fontSize="small" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={cmd.command}
                        secondary={new Date(cmd.timestamp).toLocaleString()}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Connect Car Dialog */}
      <Dialog open={connectDialogOpen} onClose={() => setConnectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Connect Your Car</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Car Make</InputLabel>
                <Select label="Car Make" defaultValue="">
                  <MenuItem value="tesla">Tesla</MenuItem>
                  <MenuItem value="bmw">BMW</MenuItem>
                  <MenuItem value="mercedes">Mercedes-Benz</MenuItem>
                  <MenuItem value="audi">Audi</MenuItem>
                  <MenuItem value="ford">Ford</MenuItem>
                  <MenuItem value="gm">General Motors</MenuItem>
                  <MenuItem value="toyota">Toyota</MenuItem>
                  <MenuItem value="honda">Honda</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Model" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Year" type="number" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="VIN" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Account Email/Username" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Account Password" type="password" />
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2 }}>
            We'll securely connect to your car manufacturer's API. Your credentials are encrypted and never stored.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => connectCar({})}>
            Connect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}