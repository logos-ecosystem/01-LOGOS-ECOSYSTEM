import React, { useState } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Grid,
  Card,
  CardContent,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  ArrowBack,
  Save,
  ExpandMore,
  Add,
  Delete,
  Edit,
  ContentCopy,
  Refresh,
  Cloud,
  Security,
  Code,
  Webhook,
  Api,
  Lock,
  Visibility,
  VisibilityOff,
  PlayArrow,
  CheckCircle,
  Warning,
  Error as ErrorIcon
} from '@mui/icons-material';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import withAuth from '@/components/Auth/withAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsAPI } from '@/services/api/products';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { ProductConfiguration, Integration, Webhook as WebhookType, CustomCommand } from '@/types/product';

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
      id={`config-tabpanel-${index}`}
      aria-labelledby={`config-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const ProductConfiguration: NextPage = () => {
  const theme = useTheme();
  const router = useRouter();
  const { id: productId } = router.query;
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [integrationDialog, setIntegrationDialog] = useState(false);
  const [webhookDialog, setWebhookDialog] = useState(false);
  const [commandDialog, setCommandDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Fetch product details
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsAPI.getProductDetails(productId as string),
    enabled: !!productId
  });

  // Mutations
  const updateConfigMutation = useMutation({
    mutationFn: (config: Partial<ProductConfiguration>) =>
      productsAPI.updateConfiguration(productId as string, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    }
  });

  const testConfigMutation = useMutation({
    mutationFn: (input: string) =>
      productsAPI.testConfiguration(productId as string, input)
  });

  const regenerateApiKeyMutation = useMutation({
    mutationFn: () => productsAPI.regenerateApiKey(productId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    }
  });

  const addIntegrationMutation = useMutation({
    mutationFn: (integration: Omit<Integration, 'id'>) =>
      productsAPI.addIntegration(productId as string, integration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      setIntegrationDialog(false);
    }
  });

  const addWebhookMutation = useMutation({
    mutationFn: (webhook: Omit<WebhookType, 'id'>) =>
      productsAPI.addWebhook(productId as string, webhook),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      setWebhookDialog(false);
    }
  });

  const addCommandMutation = useMutation({
    mutationFn: (command: Omit<CustomCommand, 'id'>) =>
      productsAPI.addCustomCommand(productId as string, command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      setCommandDialog(false);
    }
  });

  // Form handlers
  const generalFormik = useFormik({
    initialValues: {
      displayName: product?.configuration.general.displayName || '',
      description: product?.configuration.general.description || '',
      language: product?.configuration.general.language || 'es',
      timezone: product?.configuration.general.timezone || 'America/Mexico_City'
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      await updateConfigMutation.mutateAsync({
        general: values
      });
    }
  });

  const behaviorFormik = useFormik({
    initialValues: {
      personality: product?.configuration.behavior.personality || '',
      responseStyle: product?.configuration.behavior.responseStyle || 'friendly',
      creativity: product?.configuration.behavior.creativity || 50,
      contextWindow: product?.configuration.behavior.contextWindow || 4096,
      maxTokens: product?.configuration.behavior.maxTokens || 2048
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      await updateConfigMutation.mutateAsync({
        behavior: values
      });
    }
  });

  const securityFormik = useFormik({
    initialValues: {
      allowedDomains: product?.configuration.security.allowedDomains.join('\n') || '',
      blockedKeywords: product?.configuration.security.blockedKeywords.join('\n') || '',
      dataRetention: product?.configuration.security.dataRetention || 30,
      encryptionEnabled: product?.configuration.security.encryptionEnabled || true,
      auditLogging: product?.configuration.security.auditLogging || true
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      await updateConfigMutation.mutateAsync({
        security: {
          ...values,
          allowedDomains: values.allowedDomains.split('\n').filter(d => d.trim()),
          blockedKeywords: values.blockedKeywords.split('\n').filter(k => k.trim())
        }
      });
    }
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleTestConfiguration = async () => {
    if (!testInput) return;
    const result = await testConfigMutation.mutateAsync(testInput);
    setTestResult(result);
  };

  const handleRegenerateApiKey = async () => {
    if (confirm('¿Estás seguro? Las aplicaciones existentes dejarán de funcionar con la clave actual.')) {
      await regenerateApiKeyMutation.mutateAsync();
    }
  };

  if (isLoading || !product) {
    return (
      <DashboardLayout>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/dashboard/products')}
            sx={{ mb: 2 }}
          >
            Volver a Productos
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Configurar: {product.name}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Personaliza el comportamiento y características de tu producto AI
              </Typography>
            </Box>
            <Chip
              label={product.status}
              color={product.status === 'active' ? 'success' : 'default'}
            />
          </Box>
        </Box>

        <Paper sx={{ width: '100%' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="General" />
            <Tab label="Comportamiento" />
            <Tab label="Integraciones" />
            <Tab label="Webhooks" />
            <Tab label="Comandos" />
            <Tab label="Seguridad" />
            <Tab label="API y Deployment" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            <TabPanel value={tabValue} index={0}>
              {/* General Configuration */}
              <form onSubmit={generalFormik.handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Nombre para Mostrar"
                      name="displayName"
                      value={generalFormik.values.displayName}
                      onChange={generalFormik.handleChange}
                      helperText="Nombre que verán los usuarios"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Idioma</InputLabel>
                      <Select
                        name="language"
                        value={generalFormik.values.language}
                        onChange={generalFormik.handleChange}
                      >
                        <MenuItem value="es">Español</MenuItem>
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="pt">Português</MenuItem>
                        <MenuItem value="fr">Français</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Descripción"
                      name="description"
                      value={generalFormik.values.description}
                      onChange={generalFormik.handleChange}
                      helperText="Describe qué hace tu bot y cómo ayuda a los usuarios"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Zona Horaria</InputLabel>
                      <Select
                        name="timezone"
                        value={generalFormik.values.timezone}
                        onChange={generalFormik.handleChange}
                      >
                        <MenuItem value="America/Mexico_City">Ciudad de México</MenuItem>
                        <MenuItem value="America/New_York">Nueva York</MenuItem>
                        <MenuItem value="Europe/Madrid">Madrid</MenuItem>
                        <MenuItem value="America/Sao_Paulo">São Paulo</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<Save />}
                      disabled={updateConfigMutation.isPending}
                    >
                      Guardar Cambios
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {/* Behavior Configuration */}
              <form onSubmit={behaviorFormik.handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Personalidad"
                      name="personality"
                      value={behaviorFormik.values.personality}
                      onChange={behaviorFormik.handleChange}
                      helperText="Define la personalidad y tono de las respuestas"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Estilo de Respuesta</InputLabel>
                      <Select
                        name="responseStyle"
                        value={behaviorFormik.values.responseStyle}
                        onChange={behaviorFormik.handleChange}
                      >
                        <MenuItem value="formal">Formal</MenuItem>
                        <MenuItem value="casual">Casual</MenuItem>
                        <MenuItem value="technical">Técnico</MenuItem>
                        <MenuItem value="friendly">Amigable</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography gutterBottom>
                      Creatividad: {behaviorFormik.values.creativity}%
                    </Typography>
                    <Slider
                      name="creativity"
                      value={behaviorFormik.values.creativity}
                      onChange={(e, value) => behaviorFormik.setFieldValue('creativity', value)}
                      valueLabelDisplay="auto"
                      min={0}
                      max={100}
                      marks={[
                        { value: 0, label: 'Conservador' },
                        { value: 50, label: 'Balanceado' },
                        { value: 100, label: 'Creativo' }
                      ]}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Ventana de Contexto"
                      name="contextWindow"
                      value={behaviorFormik.values.contextWindow}
                      onChange={behaviorFormik.handleChange}
                      helperText="Tokens máximos de contexto"
                      InputProps={{
                        endAdornment: 'tokens'
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Tokens Máximos por Respuesta"
                      name="maxTokens"
                      value={behaviorFormik.values.maxTokens}
                      onChange={behaviorFormik.handleChange}
                      helperText="Límite de tokens en respuestas"
                      InputProps={{
                        endAdornment: 'tokens'
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<Save />}
                      disabled={updateConfigMutation.isPending}
                    >
                      Guardar Cambios
                    </Button>
                  </Grid>
                </Grid>
              </form>

              {/* Test Configuration */}
              <Divider sx={{ my: 4 }} />
              <Typography variant="h6" gutterBottom>
                Probar Configuración
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Escribe un mensaje de prueba..."
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<PlayArrow />}
                    onClick={handleTestConfiguration}
                    disabled={testConfigMutation.isPending || !testInput}
                    sx={{ height: '100%' }}
                  >
                    Probar
                  </Button>
                </Grid>
              </Grid>
              {testResult && (
                <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Respuesta:
                  </Typography>
                  <Typography variant="body2">{testResult.response}</Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Chip label={`${testResult.metrics.responseTime}ms`} size="small" />
                    <Chip label={`${testResult.metrics.tokensUsed} tokens`} size="small" />
                  </Box>
                </Paper>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              {/* Integrations */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  Integraciones Activas
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setIntegrationDialog(true)}
                >
                  Agregar Integración
                </Button>
              </Box>

              {product.configuration.capabilities.integrations.length > 0 ? (
                <Grid container spacing={2}>
                  {product.configuration.capabilities.integrations.map((integration) => (
                    <Grid item xs={12} md={6} key={integration.id}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6">
                              {integration.name}
                            </Typography>
                            <Chip
                              label={integration.status}
                              color={integration.status === 'active' ? 'success' : 'default'}
                              size="small"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {integration.type}
                          </Typography>
                          {integration.lastSync && (
                            <Typography variant="caption" color="text.secondary">
                              Última sincronización: {new Date(integration.lastSync).toLocaleString()}
                            </Typography>
                          )}
                          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                            <Button size="small" startIcon={<Edit />}>
                              Configurar
                            </Button>
                            <Button size="small" startIcon={<Refresh />}>
                              Sincronizar
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info">
                  No hay integraciones configuradas. Agrega integraciones para expandir las capacidades de tu producto.
                </Alert>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              {/* Webhooks */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  Webhooks
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setWebhookDialog(true)}
                >
                  Agregar Webhook
                </Button>
              </Box>

              {product.configuration.capabilities.webhooks.length > 0 ? (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>URL</TableCell>
                        <TableCell>Eventos</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>Última Activación</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {product.configuration.capabilities.webhooks.map((webhook) => (
                        <TableRow key={webhook.id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {webhook.url}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {webhook.events.map((event) => (
                                <Chip key={event} label={event} size="small" />
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={webhook.status}
                              color={webhook.status === 'active' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {webhook.lastTriggered
                              ? new Date(webhook.lastTriggered).toLocaleString()
                              : 'Nunca'}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small">
                              <Edit />
                            </IconButton>
                            <IconButton size="small">
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  No hay webhooks configurados. Los webhooks te permiten recibir notificaciones en tiempo real sobre eventos de tu producto.
                </Alert>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={4}>
              {/* Custom Commands */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  Comandos Personalizados
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCommandDialog(true)}
                >
                  Agregar Comando
                </Button>
              </Box>

              {product.configuration.capabilities.customCommands.length > 0 ? (
                <List>
                  {product.configuration.capabilities.customCommands.map((command) => (
                    <Accordion key={command.id}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Code />
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1">/{command.trigger}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {command.description}
                            </Typography>
                          </Box>
                          <Switch
                            checked={command.enabled}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" paragraph>
                          <strong>Acción:</strong> {command.action}
                        </Typography>
                        {command.parameters.length > 0 && (
                          <>
                            <Typography variant="body2" gutterBottom>
                              <strong>Parámetros:</strong>
                            </Typography>
                            <List dense>
                              {command.parameters.map((param) => (
                                <ListItem key={param.name}>
                                  <ListItemText
                                    primary={`${param.name} (${param.type})`}
                                    secondary={param.required ? 'Requerido' : 'Opcional'}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  No hay comandos personalizados. Los comandos permiten a los usuarios ejecutar acciones específicas.
                </Alert>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={5}>
              {/* Security Configuration */}
              <form onSubmit={securityFormik.handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Control de Acceso
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Dominios Permitidos"
                      name="allowedDomains"
                      value={securityFormik.values.allowedDomains}
                      onChange={securityFormik.handleChange}
                      helperText="Un dominio por línea. Deja vacío para permitir todos."
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Palabras Bloqueadas"
                      name="blockedKeywords"
                      value={securityFormik.values.blockedKeywords}
                      onChange={securityFormik.handleChange}
                      helperText="Una palabra por línea. El bot rechazará mensajes con estas palabras."
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Privacidad y Cumplimiento
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Retención de Datos (días)"
                      name="dataRetention"
                      value={securityFormik.values.dataRetention}
                      onChange={securityFormik.handleChange}
                      helperText="Número de días para retener datos de conversaciones"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            name="encryptionEnabled"
                            checked={securityFormik.values.encryptionEnabled}
                            onChange={securityFormik.handleChange}
                          />
                        }
                        label="Encriptación de Datos"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            name="auditLogging"
                            checked={securityFormik.values.auditLogging}
                            onChange={securityFormik.handleChange}
                          />
                        }
                        label="Registro de Auditoría"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<Save />}
                      disabled={updateConfigMutation.isPending}
                    >
                      Guardar Configuración de Seguridad
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </TabPanel>

            <TabPanel value={tabValue} index={6}>
              {/* API & Deployment */}
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Información de API
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Endpoint
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            fullWidth
                            value={product.deployment.endpoint}
                            InputProps={{
                              readOnly: true,
                              sx: { fontFamily: 'monospace' }
                            }}
                          />
                          <IconButton
                            onClick={() => navigator.clipboard.writeText(product.deployment.endpoint)}
                          >
                            <ContentCopy />
                          </IconButton>
                        </Box>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          API Key
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            fullWidth
                            type={showApiKey ? 'text' : 'password'}
                            value={product.deployment.apiKey}
                            InputProps={{
                              readOnly: true,
                              sx: { fontFamily: 'monospace' },
                              endAdornment: (
                                <IconButton
                                  onClick={() => setShowApiKey(!showApiKey)}
                                  edge="end"
                                >
                                  {showApiKey ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              )
                            }}
                          />
                          <IconButton
                            onClick={() => navigator.clipboard.writeText(product.deployment.apiKey)}
                          >
                            <ContentCopy />
                          </IconButton>
                        </Box>
                      </Box>
                      <Button
                        variant="outlined"
                        color="warning"
                        startIcon={<Refresh />}
                        onClick={handleRegenerateApiKey}
                        disabled={regenerateApiKeyMutation.isPending}
                      >
                        Regenerar API Key
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Estado del Deployment
                      </Typography>
                      <List>
                        <ListItem>
                          <ListItemText
                            primary="Ambiente"
                            secondary={product.deployment.environment}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Región"
                            secondary={product.deployment.region}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Versión"
                            secondary={product.deployment.version}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Último Deploy"
                            secondary={new Date(product.deployment.lastDeployed).toLocaleString()}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Salud del Servicio
                      </Typography>
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        {product.deployment.health.status === 'healthy' ? (
                          <CheckCircle sx={{ fontSize: 64, color: 'success.main' }} />
                        ) : product.deployment.health.status === 'degraded' ? (
                          <Warning sx={{ fontSize: 64, color: 'warning.main' }} />
                        ) : (
                          <ErrorIcon sx={{ fontSize: 64, color: 'error.main' }} />
                        )}
                        <Typography variant="h5" sx={{ mt: 2, textTransform: 'capitalize' }}>
                          {product.deployment.health.status}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {product.deployment.health.uptime}% Uptime
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Última verificación: {new Date(product.deployment.health.lastCheck).toLocaleString()}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info">
                    Para cambios avanzados en el deployment o configuración de infraestructura, contacta al soporte técnico.
                  </Alert>
                </Grid>
              </Grid>
            </TabPanel>
          </Box>
        </Paper>

        {/* Integration Dialog */}
        <Dialog
          open={integrationDialog}
          onClose={() => setIntegrationDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Agregar Nueva Integración</DialogTitle>
          <DialogContent>
            {/* Integration form would go here */}
            <Typography>Formulario de integración</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIntegrationDialog(false)}>Cancelar</Button>
            <Button variant="contained">Agregar</Button>
          </DialogActions>
        </Dialog>

        {/* Webhook Dialog */}
        <Dialog
          open={webhookDialog}
          onClose={() => setWebhookDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Agregar Nuevo Webhook</DialogTitle>
          <DialogContent>
            {/* Webhook form would go here */}
            <Typography>Formulario de webhook</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setWebhookDialog(false)}>Cancelar</Button>
            <Button variant="contained">Agregar</Button>
          </DialogActions>
        </Dialog>

        {/* Command Dialog */}
        <Dialog
          open={commandDialog}
          onClose={() => setCommandDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Agregar Comando Personalizado</DialogTitle>
          <DialogContent>
            {/* Command form would go here */}
            <Typography>Formulario de comando</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCommandDialog(false)}>Cancelar</Button>
            <Button variant="contained">Agregar</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  );
};

export default withAuth(ProductConfiguration);