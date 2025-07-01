import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tab,
  Tabs
} from '@mui/material';
import {
  ExpandMore,
  Settings,
  CheckCircle,
  Warning,
  Bluetooth,
  Wifi,
  DirectionsCar,
  Home,
  Watch,
  Speaker,
  Smartphone,
  Computer,
  Api,
  Security,
  Link as LinkIcon,
  Delete,
  Add,
  Refresh
} from '@mui/icons-material';
import SEOHead from '../../components/SEO/SEOHead';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { api } from '../../services/api';

interface Integration {
  id: string;
  type: 'car' | 'iot' | 'voice' | 'api' | 'wearable';
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  settings?: Record<string, any>;
  icon: React.ReactNode;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`integration-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function IntegrationsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: '1',
      type: 'car',
      name: 'Tesla Model 3',
      description: 'Connected via Tesla API',
      status: 'connected',
      lastSync: new Date().toISOString(),
      icon: <DirectionsCar />,
    },
    {
      id: '2',
      type: 'iot',
      name: 'Smart Home Hub',
      description: 'Google Home integration',
      status: 'connected',
      lastSync: new Date().toISOString(),
      icon: <Home />,
    },
    {
      id: '3',
      type: 'wearable',
      name: 'Apple Watch',
      description: 'Health and fitness data',
      status: 'disconnected',
      icon: <Watch />,
    },
  ]);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedIntegrationType, setSelectedIntegrationType] = useState<string>('');

  const integrationTypes = [
    {
      type: 'car',
      title: 'Automotive',
      description: 'Connect your car for hands-free AI assistance',
      icon: <DirectionsCar />,
      brands: ['Tesla', 'BMW', 'Mercedes', 'Audi', 'Ford', 'GM', 'Toyota', 'Honda'],
    },
    {
      type: 'iot',
      title: 'Smart Home',
      description: 'Control your home with AI intelligence',
      icon: <Home />,
      brands: ['Google Home', 'Amazon Alexa', 'Apple HomeKit', 'Samsung SmartThings'],
    },
    {
      type: 'wearable',
      title: 'Wearables',
      description: 'Sync health and fitness data',
      icon: <Watch />,
      brands: ['Apple Watch', 'Fitbit', 'Garmin', 'Samsung Galaxy Watch'],
    },
    {
      type: 'voice',
      title: 'Voice Assistants',
      description: 'Enable voice control across devices',
      icon: <Speaker />,
      brands: ['Amazon Alexa', 'Google Assistant', 'Siri', 'Custom Voice'],
    },
    {
      type: 'api',
      title: 'Developer API',
      description: 'Build custom integrations',
      icon: <Api />,
      brands: ['REST API', 'GraphQL', 'Webhooks', 'SDK'],
    },
  ];

  const handleConnect = (type: string) => {
    setSelectedIntegrationType(type);
    setConnectDialogOpen(true);
  };

  const handleDisconnect = (id: string) => {
    setIntegrations(prev => prev.filter(i => i.id !== id));
  };

  const handleToggle = (id: string) => {
    setIntegrations(prev =>
      prev.map(i =>
        i.id === id
          ? { ...i, status: i.status === 'connected' ? 'disconnected' : 'connected' }
          : i
      )
    );
  };

  const handleAddIntegration = (formData: any) => {
    const newIntegration: Integration = {
      id: Date.now().toString(),
      type: selectedIntegrationType as any,
      name: formData.name,
      description: formData.description,
      status: 'connected',
      lastSync: new Date().toISOString(),
      icon: integrationTypes.find(t => t.type === selectedIntegrationType)?.icon || <LinkIcon />,
    };
    setIntegrations(prev => [...prev, newIntegration]);
    setConnectDialogOpen(false);
  };

  const ConnectedIntegration = ({ integration }: { integration: Integration }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ color: integration.status === 'connected' ? 'success.main' : 'text.disabled' }}>
            {integration.icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{integration.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {integration.description}
            </Typography>
            {integration.lastSync && (
              <Typography variant="caption" color="text.secondary">
                Last sync: {new Date(integration.lastSync).toLocaleString()}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={integration.status}
              color={integration.status === 'connected' ? 'success' : 'default'}
              size="small"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={integration.status === 'connected'}
                  onChange={() => handleToggle(integration.id)}
                />
              }
              label=""
            />
            <IconButton size="small">
              <Settings />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => handleDisconnect(integration.id)}>
              <Delete />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <SEOHead
        title="Integrations - LOGOS ECOSYSTEM"
        description="Connect your devices, cars, and smart home to the LOGOS AI ecosystem"
        keywords="AI integrations, smart home AI, car AI integration, IoT AI"
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Integrations
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Connect your devices and services to access AI agents anywhere
        </Typography>

        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body2">
            All integrations use end-to-end encryption and follow strict privacy standards. 
            Your data is never shared without explicit permission.
          </Typography>
        </Alert>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="My Integrations" />
            <Tab label="Available Integrations" />
            <Tab label="Developer Tools" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {integrations.length > 0 ? (
            <>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Connected Devices & Services</Typography>
                <Button startIcon={<Refresh />} variant="outlined" size="small">
                  Sync All
                </Button>
              </Box>
              {integrations.map(integration => (
                <ConnectedIntegration key={integration.id} integration={integration} />
              ))}
            </>
          ) : (
            <Alert severity="info">
              No integrations connected yet. Explore available integrations to get started.
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {integrationTypes.map((type) => (
              <Grid item xs={12} md={6} key={type.type}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                      <Box sx={{ color: 'primary.main', fontSize: 40 }}>
                        {type.icon}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6">{type.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {type.description}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Supported Brands:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      {type.brands.map((brand) => (
                        <Chip key={brand} label={brand} size="small" variant="outlined" />
                      ))}
                    </Box>
                    
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => handleConnect(type.type)}
                    >
                      Connect {type.title}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    API Access
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Build custom integrations with our comprehensive API
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="primary" />
                      </ListItemIcon>
                      <ListItemText primary="RESTful API endpoints" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="primary" />
                      </ListItemIcon>
                      <ListItemText primary="GraphQL support" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="primary" />
                      </ListItemIcon>
                      <ListItemText primary="WebSocket real-time updates" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="primary" />
                      </ListItemIcon>
                      <ListItemText primary="SDK for major platforms" />
                    </ListItem>
                  </List>
                  <Button variant="contained" fullWidth>
                    View API Documentation
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    API Keys
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Manage your API access credentials
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Keep your API keys secure and never share them publicly
                  </Alert>
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      label="Production API Key"
                      value="pk_live_*****************"
                      InputProps={{ readOnly: true }}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      label="Test API Key"
                      value="pk_test_*****************"
                      InputProps={{ readOnly: true }}
                      size="small"
                    />
                  </Box>
                  <Button variant="outlined" fullWidth>
                    Generate New Key
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Container>

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onClose={() => setConnectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Connect {integrationTypes.find(t => t.type === selectedIntegrationType)?.title}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Device/Service Name"
              margin="normal"
              helperText="Give this integration a friendly name"
            />
            <TextField
              fullWidth
              label="Connection Details"
              margin="normal"
              multiline
              rows={3}
              helperText="API key, device ID, or other connection information"
            />
            <Alert severity="info" sx={{ mt: 2 }}>
              Follow the setup instructions in your device's app or settings to complete the connection.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => handleAddIntegration({ 
              name: 'New Device', 
              description: 'Connected successfully' 
            })}
          >
            Connect
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}