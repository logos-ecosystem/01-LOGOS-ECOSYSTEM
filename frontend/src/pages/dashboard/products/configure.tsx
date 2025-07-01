import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Tooltip,
  Badge,
  Avatar,
  Paper,
  Tabs,
  Tab,
  LinearProgress,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  SmartToy,
  Settings,
  Code,
  Security,
  Speed,
  Psychology,
  Memory,
  Language,
  Api,
  Cloud,
  Storage,
  Analytics,
  Webhook,
  Schedule,
  Add,
  Remove,
  ExpandMore,
  Save,
  Preview,
  Launch,
  Info,
  Warning,
  CheckCircle,
  ContentCopy,
  Refresh,
  Delete,
  Edit,
  Help,
  Tune,
  AutoAwesome,
  BugReport,
  DataObject,
  Functions,
  IntegrationInstructions,
  Terminal,
  CloudUpload,
  Download
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { api } from '@/services/api';
import { useNotification } from '@/contexts/NotificationContext';
import CodeEditor from '@/components/CodeEditor';

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
      id={`product-tabpanel-${index}`}
      aria-labelledby={`product-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const productTypes = [
  {
    id: 'expert_bot',
    name: 'Expert Bot',
    description: 'AI-powered expert system for specialized tasks',
    icon: <Psychology />,
    features: ['Natural Language Processing', 'Domain Expertise', 'Learning Capability', 'Multi-modal Support']
  },
  {
    id: 'ai_assistant',
    name: 'AI Assistant',
    description: 'General-purpose AI assistant for various tasks',
    icon: <SmartToy />,
    features: ['Task Automation', 'Conversational AI', 'Context Awareness', 'Integration Ready']
  },
  {
    id: 'automation_agent',
    name: 'Automation Agent',
    description: 'Automated workflow and process management',
    icon: <Functions />,
    features: ['Workflow Automation', 'Scheduled Tasks', 'Event Triggers', 'Error Handling']
  },
  {
    id: 'analytics_bot',
    name: 'Analytics Bot',
    description: 'Data analysis and insights generation',
    icon: <Analytics />,
    features: ['Data Processing', 'Predictive Analytics', 'Visualization', 'Report Generation']
  }
];

const aiModels = [
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', capabilities: ['Text', 'Code', 'Vision'] },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', capabilities: ['Text', 'Code', 'Analysis'] },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', capabilities: ['Text', 'Code', 'Multimodal'] },
  { id: 'llama-3-70b', name: 'Llama 3 70B', provider: 'Meta', capabilities: ['Text', 'Code', 'Open Source'] }
];

export default function ConfigureProduct() {
  const router = useRouter();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { productId } = router.query;
  
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  
  // Form state
  const [productConfig, setProductConfig] = useState({
    // Basic Info
    name: '',
    type: 'expert_bot',
    description: '',
    tags: [] as string[],
    
    // AI Configuration
    model: 'gpt-4-turbo',
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    systemPrompt: '',
    
    // Features
    features: {
      streaming: true,
      contextMemory: true,
      functionCalling: true,
      multiModal: false,
      codeExecution: false,
      webSearch: false,
      fileUpload: false,
      voiceInput: false,
      voiceOutput: false
    },
    
    // Behavior
    behavior: {
      personality: 'professional',
      responseStyle: 'detailed',
      language: 'en',
      expertise: [] as string[],
      restrictions: [] as string[],
      customInstructions: ''
    },
    
    // Integration
    webhooks: [] as Array<{
      url: string;
      events: string[];
      secret: string;
      active: boolean;
    }>,
    
    // Access Control
    access: {
      public: false,
      apiKeyRequired: true,
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 60,
        requestsPerDay: 1000
      },
      ipWhitelist: [] as string[],
      allowedOrigins: [] as string[]
    },
    
    // Advanced
    advanced: {
      customFunctions: [] as Array<{
        name: string;
        description: string;
        parameters: any;
        code: string;
      }>,
      environmentVariables: {} as Record<string, string>,
      caching: {
        enabled: true,
        ttl: 3600
      },
      logging: {
        enabled: true,
        level: 'info',
        retention: 30
      }
    }
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (productId && productId !== 'new') {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products/${productId}`);
      setProductConfig({
        ...productConfig,
        ...response.data.configuration
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      showNotification('Failed to load product configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 0: // Basic Info
        if (!productConfig.name) errors.name = 'Name is required';
        if (!productConfig.description) errors.description = 'Description is required';
        break;
      
      case 1: // AI Configuration
        if (!productConfig.systemPrompt) errors.systemPrompt = 'System prompt is required';
        break;
      
      case 2: // Features
        // No required fields
        break;
      
      case 3: // Behavior
        if (productConfig.behavior.expertise.length === 0) {
          errors.expertise = 'At least one area of expertise is required';
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  const handleSave = async (deploy = false) => {
    try {
      setSaving(true);
      
      const endpoint = productId === 'new' ? '/products' : `/products/${productId}`;
      const method = productId === 'new' ? 'post' : 'put';
      
      const response = await api[method](endpoint, {
        ...productConfig,
        status: deploy ? 'active' : 'inactive'
      });

      showNotification(
        `Product ${productId === 'new' ? 'created' : 'updated'} successfully${deploy ? ' and deployed' : ''}`,
        'success'
      );

      if (productId === 'new') {
        router.push(`/dashboard/products/${response.data.id}/configure`);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      showNotification('Failed to save product configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResults(null);
      
      const response = await api.post(`/products/${productId}/test`, {
        message: 'Hello, can you introduce yourself and explain your capabilities?'
      });
      
      setTestResults(response.data);
    } catch (error) {
      console.error('Error testing product:', error);
      showNotification('Test failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  const steps = [
    {
      label: 'Basic Information',
      description: 'Set up your AI bot\'s identity'
    },
    {
      label: 'AI Configuration',
      description: 'Configure the AI model and parameters'
    },
    {
      label: 'Features & Capabilities',
      description: 'Enable specific features for your bot'
    },
    {
      label: 'Behavior & Personality',
      description: 'Define how your bot interacts'
    },
    {
      label: 'Integration & Access',
      description: 'Set up webhooks and access control'
    },
    {
      label: 'Review & Deploy',
      description: 'Review configuration and deploy'
    }
  ];

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            {productId === 'new' ? 'Create New AI Product' : 'Configure AI Product'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Build and configure your custom LOGOS AI Expert Bot with advanced capabilities
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Stepper */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Stepper activeStep={activeStep} orientation="vertical">
                  {steps.map((step, index) => (
                    <Step key={step.label}>
                      <StepLabel>{step.label}</StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary">
                          {step.description}
                        </Typography>
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>
          </Grid>

          {/* Main Content */}
          <Grid item xs={12} md={9}>
            <Card>
              <CardContent>
                {/* Step 0: Basic Information */}
                {activeStep === 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Basic Information
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Product Name"
                          value={productConfig.name}
                          onChange={(e) => setProductConfig({ ...productConfig, name: e.target.value })}
                          error={!!validationErrors.name}
                          helperText={validationErrors.name}
                          placeholder="My Expert AI Bot"
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                          Product Type
                        </Typography>
                        <Grid container spacing={2}>
                          {productTypes.map((type) => (
                            <Grid item xs={12} sm={6} key={type.id}>
                              <Card
                                variant={productConfig.type === type.id ? 'elevation' : 'outlined'}
                                sx={{
                                  cursor: 'pointer',
                                  border: productConfig.type === type.id ? '2px solid' : undefined,
                                  borderColor: 'primary.main'
                                }}
                                onClick={() => setProductConfig({ ...productConfig, type: type.id })}
                              >
                                <CardContent>
                                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                                      {type.icon}
                                    </Avatar>
                                    <Typography variant="h6">{type.name}</Typography>
                                  </Box>
                                  <Typography variant="body2" color="text.secondary" paragraph>
                                    {type.description}
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {type.features.map((feature) => (
                                      <Chip key={feature} label={feature} size="small" />
                                    ))}
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={4}
                          label="Description"
                          value={productConfig.description}
                          onChange={(e) => setProductConfig({ ...productConfig, description: e.target.value })}
                          error={!!validationErrors.description}
                          helperText={validationErrors.description || 'Describe what your AI bot does and its main purpose'}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Autocomplete
                          multiple
                          freeSolo
                          options={['customer-service', 'sales', 'technical-support', 'education', 'healthcare', 'finance', 'legal', 'creative']}
                          value={productConfig.tags}
                          onChange={(_, newValue) => setProductConfig({ ...productConfig, tags: newValue })}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                            ))
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Tags"
                              placeholder="Add tags"
                              helperText="Press Enter to add custom tags"
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Step 1: AI Configuration */}
                {activeStep === 1 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      AI Model Configuration
                    </Typography>

                    <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)} sx={{ mb: 3 }}>
                      <Tab label="Model Selection" />
                      <Tab label="Parameters" />
                      <Tab label="System Prompt" />
                    </Tabs>

                    <TabPanel value={selectedTab} index={0}>
                      <Grid container spacing={2}>
                        {aiModels.map((model) => (
                          <Grid item xs={12} sm={6} key={model.id}>
                            <Card
                              variant={productConfig.model === model.id ? 'elevation' : 'outlined'}
                              sx={{
                                cursor: 'pointer',
                                border: productConfig.model === model.id ? '2px solid' : undefined,
                                borderColor: 'primary.main'
                              }}
                              onClick={() => setProductConfig({ ...productConfig, model: model.id })}
                            >
                              <CardContent>
                                <Typography variant="h6">{model.name}</Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  by {model.provider}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                  {model.capabilities.map((cap) => (
                                    <Chip key={cap} label={cap} size="small" color="primary" variant="outlined" />
                                  ))}
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </TabPanel>

                    <TabPanel value={selectedTab} index={1}>
                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <Typography gutterBottom>Temperature: {productConfig.temperature}</Typography>
                          <Slider
                            value={productConfig.temperature}
                            onChange={(_, value) => setProductConfig({ ...productConfig, temperature: value as number })}
                            min={0}
                            max={2}
                            step={0.1}
                            marks={[
                              { value: 0, label: 'Precise' },
                              { value: 1, label: 'Balanced' },
                              { value: 2, label: 'Creative' }
                            ]}
                          />
                          <FormHelperText>Controls randomness in responses</FormHelperText>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Max Tokens"
                            value={productConfig.maxTokens}
                            onChange={(e) => setProductConfig({ ...productConfig, maxTokens: parseInt(e.target.value) })}
                            InputProps={{ inputProps: { min: 100, max: 8000 } }}
                            helperText="Maximum response length"
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Typography gutterBottom>Top P: {productConfig.topP}</Typography>
                          <Slider
                            value={productConfig.topP}
                            onChange={(_, value) => setProductConfig({ ...productConfig, topP: value as number })}
                            min={0}
                            max={1}
                            step={0.05}
                          />
                          <FormHelperText>Nucleus sampling parameter</FormHelperText>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Typography gutterBottom>Frequency Penalty: {productConfig.frequencyPenalty}</Typography>
                          <Slider
                            value={productConfig.frequencyPenalty}
                            onChange={(_, value) => setProductConfig({ ...productConfig, frequencyPenalty: value as number })}
                            min={-2}
                            max={2}
                            step={0.1}
                          />
                          <FormHelperText>Reduces repetition</FormHelperText>
                        </Grid>
                      </Grid>
                    </TabPanel>

                    <TabPanel value={selectedTab} index={2}>
                      <Box>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          The system prompt defines your AI bot's core behavior and expertise. Be specific and clear.
                        </Alert>
                        <TextField
                          fullWidth
                          multiline
                          rows={12}
                          label="System Prompt"
                          value={productConfig.systemPrompt}
                          onChange={(e) => setProductConfig({ ...productConfig, systemPrompt: e.target.value })}
                          error={!!validationErrors.systemPrompt}
                          helperText={validationErrors.systemPrompt || 'Define your bot\'s role, expertise, and behavior guidelines'}
                          placeholder={`You are an expert AI assistant specialized in [domain].

Your role is to:
- Provide accurate and helpful information
- Maintain a professional and friendly tone
- Ask clarifying questions when needed

Your expertise includes:
- [Specific area 1]
- [Specific area 2]

Guidelines:
- Always verify information before responding
- Cite sources when applicable
- Admit when you don't know something`}
                        />
                      </Box>
                    </TabPanel>
                  </Box>
                )}

                {/* Step 2: Features */}
                {activeStep === 2 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Features & Capabilities
                    </Typography>

                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                          Core Features
                        </Typography>
                        <List>
                          <ListItem>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={productConfig.features.streaming}
                                  onChange={(e) => setProductConfig({
                                    ...productConfig,
                                    features: { ...productConfig.features, streaming: e.target.checked }
                                  })}
                                />
                              }
                              label={
                                <Box>
                                  <Typography>Real-time Streaming</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Stream responses as they're generated
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>

                          <ListItem>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={productConfig.features.contextMemory}
                                  onChange={(e) => setProductConfig({
                                    ...productConfig,
                                    features: { ...productConfig.features, contextMemory: e.target.checked }
                                  })}
                                />
                              }
                              label={
                                <Box>
                                  <Typography>Context Memory</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Remember conversation history
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>

                          <ListItem>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={productConfig.features.functionCalling}
                                  onChange={(e) => setProductConfig({
                                    ...productConfig,
                                    features: { ...productConfig.features, functionCalling: e.target.checked }
                                  })}
                                />
                              }
                              label={
                                <Box>
                                  <Typography>Function Calling</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Execute custom functions and APIs
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>

                          <ListItem>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={productConfig.features.multiModal}
                                  onChange={(e) => setProductConfig({
                                    ...productConfig,
                                    features: { ...productConfig.features, multiModal: e.target.checked }
                                  })}
                                />
                              }
                              label={
                                <Box>
                                  <Typography>Multi-Modal Support</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Process images and other media
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>

                          <ListItem>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={productConfig.features.codeExecution}
                                  onChange={(e) => setProductConfig({
                                    ...productConfig,
                                    features: { ...productConfig.features, codeExecution: e.target.checked }
                                  })}
                                />
                              }
                              label={
                                <Box>
                                  <Typography>Code Execution</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Run code snippets safely
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>

                          <ListItem>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={productConfig.features.webSearch}
                                  onChange={(e) => setProductConfig({
                                    ...productConfig,
                                    features: { ...productConfig.features, webSearch: e.target.checked }
                                  })}
                                />
                              }
                              label={
                                <Box>
                                  <Typography>Web Search</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Search the internet for current information
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        </List>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Step 3: Behavior */}
                {activeStep === 3 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Behavior & Personality
                    </Typography>

                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Personality</InputLabel>
                          <Select
                            value={productConfig.behavior.personality}
                            onChange={(e) => setProductConfig({
                              ...productConfig,
                              behavior: { ...productConfig.behavior, personality: e.target.value }
                            })}
                          >
                            <MenuItem value="professional">Professional</MenuItem>
                            <MenuItem value="friendly">Friendly</MenuItem>
                            <MenuItem value="casual">Casual</MenuItem>
                            <MenuItem value="formal">Formal</MenuItem>
                            <MenuItem value="enthusiastic">Enthusiastic</MenuItem>
                            <MenuItem value="concise">Concise</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Response Style</InputLabel>
                          <Select
                            value={productConfig.behavior.responseStyle}
                            onChange={(e) => setProductConfig({
                              ...productConfig,
                              behavior: { ...productConfig.behavior, responseStyle: e.target.value }
                            })}
                          >
                            <MenuItem value="detailed">Detailed</MenuItem>
                            <MenuItem value="concise">Concise</MenuItem>
                            <MenuItem value="technical">Technical</MenuItem>
                            <MenuItem value="simple">Simple</MenuItem>
                            <MenuItem value="creative">Creative</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12}>
                        <Autocomplete
                          multiple
                          freeSolo
                          options={[
                            'Customer Support',
                            'Technical Documentation',
                            'Code Review',
                            'Data Analysis',
                            'Creative Writing',
                            'Research',
                            'Education',
                            'Healthcare',
                            'Finance',
                            'Legal'
                          ]}
                          value={productConfig.behavior.expertise}
                          onChange={(_, newValue) => setProductConfig({
                            ...productConfig,
                            behavior: { ...productConfig.behavior, expertise: newValue }
                          })}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                            ))
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Areas of Expertise"
                              placeholder="Add expertise"
                              error={!!validationErrors.expertise}
                              helperText={validationErrors.expertise || 'Define specific areas where your bot excels'}
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={4}
                          label="Custom Instructions"
                          value={productConfig.behavior.customInstructions}
                          onChange={(e) => setProductConfig({
                            ...productConfig,
                            behavior: { ...productConfig.behavior, customInstructions: e.target.value }
                          })}
                          helperText="Additional behavior guidelines or specific instructions"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Step 4: Integration */}
                {activeStep === 4 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Integration & Access Control
                    </Typography>

                    <Accordion defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography>API Access</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={3}>
                          <Grid item xs={12}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={productConfig.access.apiKeyRequired}
                                  onChange={(e) => setProductConfig({
                                    ...productConfig,
                                    access: { ...productConfig.access, apiKeyRequired: e.target.checked }
                                  })}
                                />
                              }
                              label="Require API Key"
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={productConfig.access.rateLimiting.enabled}
                                  onChange={(e) => setProductConfig({
                                    ...productConfig,
                                    access: {
                                      ...productConfig.access,
                                      rateLimiting: { ...productConfig.access.rateLimiting, enabled: e.target.checked }
                                    }
                                  })}
                                />
                              }
                              label="Enable Rate Limiting"
                            />
                          </Grid>

                          {productConfig.access.rateLimiting.enabled && (
                            <>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  type="number"
                                  label="Requests per Minute"
                                  value={productConfig.access.rateLimiting.requestsPerMinute}
                                  onChange={(e) => setProductConfig({
                                    ...productConfig,
                                    access: {
                                      ...productConfig.access,
                                      rateLimiting: {
                                        ...productConfig.access.rateLimiting,
                                        requestsPerMinute: parseInt(e.target.value)
                                      }
                                    }
                                  })}
                                />
                              </Grid>

                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  type="number"
                                  label="Requests per Day"
                                  value={productConfig.access.rateLimiting.requestsPerDay}
                                  onChange={(e) => setProductConfig({
                                    ...productConfig,
                                    access: {
                                      ...productConfig.access,
                                      rateLimiting: {
                                        ...productConfig.access.rateLimiting,
                                        requestsPerDay: parseInt(e.target.value)
                                      }
                                    }
                                  })}
                                />
                              </Grid>
                            </>
                          )}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>

                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography>Webhooks</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box>
                          <Button
                            startIcon={<Add />}
                            onClick={() => {
                              setProductConfig({
                                ...productConfig,
                                webhooks: [
                                  ...productConfig.webhooks,
                                  { url: '', events: [], secret: '', active: true }
                                ]
                              });
                            }}
                          >
                            Add Webhook
                          </Button>

                          {productConfig.webhooks.map((webhook, index) => (
                            <Paper key={index} sx={{ p: 2, mt: 2 }}>
                              <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    label="Webhook URL"
                                    value={webhook.url}
                                    onChange={(e) => {
                                      const newWebhooks = [...productConfig.webhooks];
                                      newWebhooks[index].url = e.target.value;
                                      setProductConfig({ ...productConfig, webhooks: newWebhooks });
                                    }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={5}>
                                  <Autocomplete
                                    multiple
                                    options={['message.sent', 'message.received', 'error', 'session.start', 'session.end']}
                                    value={webhook.events}
                                    onChange={(_, newValue) => {
                                      const newWebhooks = [...productConfig.webhooks];
                                      newWebhooks[index].events = newValue;
                                      setProductConfig({ ...productConfig, webhooks: newWebhooks });
                                    }}
                                    renderInput={(params) => (
                                      <TextField {...params} label="Events" />
                                    )}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={1}>
                                  <IconButton
                                    color="error"
                                    onClick={() => {
                                      const newWebhooks = productConfig.webhooks.filter((_, i) => i !== index);
                                      setProductConfig({ ...productConfig, webhooks: newWebhooks });
                                    }}
                                  >
                                    <Delete />
                                  </IconButton>
                                </Grid>
                              </Grid>
                            </Paper>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                )}

                {/* Step 5: Review */}
                {activeStep === 5 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Review Configuration
                    </Typography>

                    <Alert severity="info" sx={{ mb: 3 }}>
                      Review your AI bot configuration before deploying. You can test the bot before making it live.
                    </Alert>

                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                            Basic Information
                          </Typography>
                          <List dense>
                            <ListItem>
                              <ListItemText primary="Name" secondary={productConfig.name} />
                            </ListItem>
                            <ListItem>
                              <ListItemText primary="Type" secondary={productConfig.type} />
                            </ListItem>
                            <ListItem>
                              <ListItemText primary="Model" secondary={productConfig.model} />
                            </ListItem>
                          </List>
                        </Paper>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                            Features Enabled
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {Object.entries(productConfig.features).map(([key, value]) => 
                              value && (
                                <Chip
                                  key={key}
                                  label={key.replace(/([A-Z])/g, ' $1').trim()}
                                  color="primary"
                                  size="small"
                                />
                              )
                            )}
                          </Box>
                        </Paper>
                      </Grid>

                      <Grid item xs={12}>
                        <Paper sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              Test Your Bot
                            </Typography>
                            <Button
                              variant="outlined"
                              startIcon={<BugReport />}
                              onClick={handleTest}
                              disabled={testing || !productId || productId === 'new'}
                            >
                              Run Test
                            </Button>
                          </Box>

                          {testing && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <CircularProgress size={20} />
                              <Typography>Testing your bot...</Typography>
                            </Box>
                          )}

                          {testResults && (
                            <Box sx={{ mt: 2 }}>
                              <Alert severity={testResults.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                                {testResults.success ? 'Test completed successfully!' : 'Test failed'}
                              </Alert>
                              {testResults.response && (
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                  <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                    {testResults.response}
                                  </Typography>
                                </Paper>
                              )}
                            </Box>
                          )}
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Navigation Buttons */}
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                  >
                    Back
                  </Button>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    {activeStep < steps.length - 1 ? (
                      <Button
                        variant="contained"
                        onClick={handleNext}
                      >
                        Next
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outlined"
                          startIcon={<Save />}
                          onClick={() => handleSave(false)}
                          disabled={saving}
                        >
                          Save Draft
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<Launch />}
                          onClick={() => handleSave(true)}
                          disabled={saving}
                          color="success"
                        >
                          Save & Deploy
                        </Button>
                      </>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}