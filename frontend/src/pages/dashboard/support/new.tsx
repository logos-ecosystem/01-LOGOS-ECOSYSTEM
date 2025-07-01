import React, { useState } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  useTheme,
  alpha
} from '@mui/material';
import {
  ArrowBack,
  AttachFile,
  Delete,
  CloudUpload,
  CheckCircle,
  Article,
  Search
} from '@mui/icons-material';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import withAuth from '@/components/Auth/withAuth';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supportAPI } from '@/services/api/support';
import { TicketCategory, TicketPriority } from '@/types/support';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object({
  subject: Yup.string()
    .min(5, 'El asunto debe tener al menos 5 caracteres')
    .max(200, 'El asunto no puede exceder 200 caracteres')
    .required('El asunto es requerido'),
  description: Yup.string()
    .min(20, 'La descripción debe tener al menos 20 caracteres')
    .max(5000, 'La descripción no puede exceder 5000 caracteres')
    .required('La descripción es requerida'),
  category: Yup.string()
    .oneOf(['technical', 'billing', 'account', 'feature-request', 'bug-report', 'integration', 'other'])
    .required('La categoría es requerida'),
  priority: Yup.string()
    .oneOf(['low', 'medium', 'high', 'urgent'])
    .required('La prioridad es requerida')
});

const NewTicket: NextPage = () => {
  const theme = useTheme();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Search for related articles
  const { data: relatedArticles } = useQuery({
    queryKey: ['support', 'knowledge-base', 'search', searchQuery],
    queryFn: () => supportAPI.searchKnowledgeBase(searchQuery),
    enabled: searchQuery.length > 3
  });

  const createTicketMutation = useMutation({
    mutationFn: (ticketData: {
      subject: string;
      description: string;
      category: TicketCategory;
      priority: TicketPriority;
      attachments?: File[];
    }) => supportAPI.createTicket(ticketData),
    onSuccess: (data) => {
      router.push(`/dashboard/support/tickets/${data.id}`);
    }
  });

  const formik = useFormik({
    initialValues: {
      subject: '',
      description: '',
      category: '' as TicketCategory | '',
      priority: 'medium' as TicketPriority
    },
    validationSchema,
    onSubmit: async (values) => {
      await createTicketMutation.mutateAsync({
        ...values as any,
        attachments
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      // Max 10MB per file
      if (file.size > 10 * 1024 * 1024) {
        alert(`El archivo ${file.name} excede el tamaño máximo de 10MB`);
        return false;
      }
      return true;
    });
    setAttachments([...attachments, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const getCategoryInfo = (category: string) => {
    const info: Record<string, { icon: string; description: string }> = {
      technical: { icon: '🛠️', description: 'Problemas técnicos, errores, configuración' },
      billing: { icon: '💳', description: 'Pagos, facturas, suscripciones' },
      account: { icon: '👤', description: 'Cuenta, perfil, autenticación' },
      'feature-request': { icon: '✨', description: 'Nuevas funcionalidades, mejoras' },
      'bug-report': { icon: '🐛', description: 'Reportar errores o comportamientos inesperados' },
      integration: { icon: '🔌', description: 'Integraciones, APIs, webhooks' },
      other: { icon: '📋', description: 'Otros temas no listados' }
    };
    return info[category] || { icon: '📋', description: '' };
  };

  const getPriorityInfo = (priority: string) => {
    const info: Record<string, { color: string; description: string }> = {
      low: { color: theme.palette.grey[600], description: 'Puede esperar, no afecta operaciones' },
      medium: { color: theme.palette.info.main, description: 'Importante pero no urgente' },
      high: { color: theme.palette.warning.main, description: 'Afecta operaciones, necesita atención pronta' },
      urgent: { color: theme.palette.error.main, description: 'Crítico, requiere atención inmediata' }
    };
    return info[priority] || { color: theme.palette.grey[600], description: '' };
  };

  const steps = [
    'Buscar Soluciones',
    'Detalles del Problema',
    'Información Adicional'
  ];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  return (
    <DashboardLayout>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/dashboard/support')}
            sx={{ mb: 2 }}
          >
            Volver al Centro de Soporte
          </Button>
          <Typography variant="h4" component="h1" gutterBottom>
            Crear Nuevo Ticket
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Describe tu problema y te ayudaremos lo antes posible
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Stepper activeStep={activeStep} orientation="vertical">
                <Step>
                  <StepLabel>
                    Buscar Soluciones Existentes
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" paragraph>
                      Antes de crear un ticket, busca si ya existe una solución a tu problema
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="Describe brevemente tu problema..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (e.target.value && !formik.values.subject) {
                          formik.setFieldValue('subject', e.target.value);
                        }
                      }}
                      InputProps={{
                        startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                      sx={{ mb: 2 }}
                    />
                    
                    {relatedArticles && relatedArticles.length > 0 && showSuggestions && (
                      <Box sx={{ mb: 3 }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Encontramos {relatedArticles.length} artículos que podrían ayudarte
                        </Alert>
                        <Grid container spacing={2}>
                          {relatedArticles.slice(0, 3).map((article) => (
                            <Grid item xs={12} key={article.id}>
                              <Card
                                variant="outlined"
                                sx={{
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) }
                                }}
                                onClick={() => router.push(`/dashboard/support/kb/${article.id}`)}
                              >
                                <CardContent>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Article sx={{ mr: 2, color: 'text.secondary' }} />
                                    <Box>
                                      <Typography variant="subtitle2">
                                        {article.title}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {article.content.slice(0, 100)}...
                                      </Typography>
                                    </Box>
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        onClick={() => {
                          setShowSuggestions(false);
                          handleNext();
                        }}
                      >
                        Mi problema no está resuelto
                      </Button>
                      {searchQuery && (
                        <Button
                          variant="outlined"
                          onClick={() => router.push('/dashboard/support')}
                        >
                          Ver más artículos
                        </Button>
                      )}
                    </Box>
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>
                    Detalles del Problema
                  </StepLabel>
                  <StepContent>
                    <form onSubmit={formik.handleSubmit}>
                      <TextField
                        fullWidth
                        label="Asunto"
                        name="subject"
                        value={formik.values.subject}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.subject && Boolean(formik.errors.subject)}
                        helperText={formik.touched.subject && formik.errors.subject}
                        sx={{ mb: 3 }}
                      />

                      <TextField
                        fullWidth
                        multiline
                        rows={6}
                        label="Descripción detallada"
                        name="description"
                        value={formik.values.description}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.description && Boolean(formik.errors.description)}
                        helperText={
                          formik.touched.description && formik.errors.description ||
                          'Incluye todos los detalles relevantes: qué esperabas, qué sucedió, pasos para reproducir el problema'
                        }
                        sx={{ mb: 3 }}
                      />

                      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button onClick={handleBack}>
                          Atrás
                        </Button>
                        <Button
                          variant="contained"
                          onClick={handleNext}
                          disabled={!formik.values.subject || !formik.values.description}
                        >
                          Continuar
                        </Button>
                      </Box>
                    </form>
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>
                    Información Adicional
                  </StepLabel>
                  <StepContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Categoría</InputLabel>
                          <Select
                            name="category"
                            value={formik.values.category}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            error={formik.touched.category && Boolean(formik.errors.category)}
                          >
                            {(['technical', 'billing', 'account', 'feature-request', 'bug-report', 'integration', 'other'] as const).map((cat) => {
                              const info = getCategoryInfo(cat);
                              return (
                                <MenuItem key={cat} value={cat}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography sx={{ mr: 1 }}>{info.icon}</Typography>
                                    {cat}
                                  </Box>
                                </MenuItem>
                              );
                            })}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Prioridad</InputLabel>
                          <Select
                            name="priority"
                            value={formik.values.priority}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            error={formik.touched.priority && Boolean(formik.errors.priority)}
                          >
                            {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => {
                              const info = getPriorityInfo(priority);
                              return (
                                <MenuItem key={priority} value={priority}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box
                                      sx={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        bgcolor: info.color,
                                        mr: 1
                                      }}
                                    />
                                    {priority}
                                  </Box>
                                </MenuItem>
                              );
                            })}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Archivos Adjuntos (Opcional)
                      </Typography>
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<CloudUpload />}
                        sx={{ mb: 2 }}
                      >
                        Subir Archivos
                        <input
                          type="file"
                          hidden
                          multiple
                          onChange={handleFileUpload}
                          accept="image/*,.pdf,.doc,.docx,.txt,.log"
                        />
                      </Button>
                      
                      {attachments.length > 0 && (
                        <List dense>
                          {attachments.map((file, index) => (
                            <ListItem key={index}>
                              <ListItemText
                                primary={file.name}
                                secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                              />
                              <ListItemSecondaryAction>
                                <IconButton
                                  edge="end"
                                  onClick={() => removeAttachment(index)}
                                >
                                  <Delete />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                      <Button onClick={handleBack}>
                        Atrás
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => formik.handleSubmit()}
                        disabled={createTicketMutation.isPending || !formik.values.category}
                        startIcon={createTicketMutation.isPending ? null : <CheckCircle />}
                      >
                        {createTicketMutation.isPending ? 'Creando...' : 'Crear Ticket'}
                      </Button>
                    </Box>
                  </StepContent>
                </Step>
              </Stepper>

              {createTicketMutation.isPending && (
                <LinearProgress sx={{ mt: 2 }} />
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Información de Prioridades
              </Typography>
              {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => {
                const info = getPriorityInfo(priority);
                return (
                  <Box key={priority} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: info.color,
                          mr: 1
                        }}
                      />
                      <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                        {priority}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {info.description}
                    </Typography>
                  </Box>
                );
              })}
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Tiempos de Respuesta
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Prioridad Urgente"
                    secondary="Respuesta en 2 horas"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Prioridad Alta"
                    secondary="Respuesta en 8 horas"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Prioridad Media"
                    secondary="Respuesta en 24 horas"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Prioridad Baja"
                    secondary="Respuesta en 48 horas"
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </DashboardLayout>
  );
};

export default withAuth(NewTicket);