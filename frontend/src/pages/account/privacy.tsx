import React, { useState } from 'react';
import { NextPage } from 'next';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  FormGroup,
  FormControlLabel,
  Switch,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Cookie as CookieIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { clearCookieConsent, updateCookieConsent, getCookieConsent } from '@/components/gdpr/CookieConsent';

const PrivacySettings: NextPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [dataRequested, setDataRequested] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Privacy preferences
  const [preferences, setPreferences] = useState({
    marketingEmails: user?.preferences?.marketingEmails || false,
    productUpdates: user?.preferences?.productUpdates || true,
    usageAnalytics: user?.preferences?.usageAnalytics || true,
    thirdPartySharing: false,
  });

  // Cookie preferences
  const cookieConsent = getCookieConsent();
  const [cookiePreferences, setCookiePreferences] = useState(cookieConsent || {
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });

  const handlePreferenceChange = (key: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSavePreferences = async () => {
    try {
      setLoading(true);
      await api.put('/users/me/preferences', preferences);
      setMessage({ type: 'success', text: 'Preferencias actualizadas correctamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar preferencias' });
    } finally {
      setLoading(false);
    }
  };

  const handleDataExportRequest = async () => {
    try {
      setLoading(true);
      await api.post('/users/me/data-export');
      setDataRequested(true);
      setMessage({ 
        type: 'success', 
        text: 'Solicitud de exportación recibida. Recibirás un email con tus datos en las próximas 48 horas.' 
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al solicitar exportación de datos' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'ELIMINAR') return;

    try {
      setLoading(true);
      await api.delete('/users/me');
      // Clear all local data
      localStorage.clear();
      sessionStorage.clear();
      // Redirect to home
      window.location.href = '/';
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al eliminar la cuenta' });
      setLoading(false);
    }
  };

  const handleCookiePreferenceChange = (key: string) => {
    if (key === 'necessary') return;
    
    const newPreferences = {
      ...cookiePreferences,
      [key]: !cookiePreferences[key],
    };
    
    setCookiePreferences(newPreferences);
    updateCookieConsent(newPreferences);
  };

  const handleClearAllCookies = () => {
    clearCookieConsent();
    router.reload();
  };

  return (
    <DashboardLayout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          Configuración de Privacidad
        </Typography>

        {message && (
          <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 3 }}>
            {message.text}
          </Alert>
        )}

        {/* Data Privacy Rights */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <SecurityIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">Tus Derechos de Privacidad (GDPR)</Typography>
          </Box>

          <Stack spacing={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Derecho de Acceso
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Tienes derecho a obtener una copia de todos los datos personales que almacenamos sobre ti.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDataExportRequest}
                  disabled={loading || dataRequested}
                >
                  {dataRequested ? 'Solicitud Enviada' : 'Solicitar Exportación de Datos'}
                </Button>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Derecho al Olvido
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Puedes solicitar la eliminación completa de tu cuenta y todos los datos asociados.
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Eliminar mi Cuenta
                </Button>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Portabilidad de Datos
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Puedes descargar tus datos en un formato estructurado y legible por máquina (JSON).
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  disabled
                >
                  Próximamente
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </Paper>

        {/* Communication Preferences */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Preferencias de Comunicación
          </Typography>

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.marketingEmails}
                  onChange={() => handlePreferenceChange('marketingEmails')}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Emails de Marketing</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Recibe ofertas especiales, novedades y promociones
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={preferences.productUpdates}
                  onChange={() => handlePreferenceChange('productUpdates')}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Actualizaciones de Producto</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Notificaciones sobre nuevas funciones y mejoras
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={preferences.usageAnalytics}
                  onChange={() => handlePreferenceChange('usageAnalytics')}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Análisis de Uso</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ayúdanos a mejorar el producto compartiendo datos de uso anónimos
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={preferences.thirdPartySharing}
                  onChange={() => handlePreferenceChange('thirdPartySharing')}
                  disabled
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Compartir con Terceros</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Nunca compartimos tus datos con terceros sin tu consentimiento explícito
                  </Typography>
                </Box>
              }
            />
          </FormGroup>

          <Button
            variant="contained"
            onClick={handleSavePreferences}
            disabled={loading}
            sx={{ mt: 3 }}
          >
            Guardar Preferencias
          </Button>
        </Paper>

        {/* Cookie Settings */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <CookieIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">Configuración de Cookies</Typography>
          </Box>

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={cookiePreferences.necessary}
                  disabled
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Cookies Necesarias</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Esenciales para el funcionamiento del sitio (siempre activas)
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={cookiePreferences.analytics}
                  onChange={() => handleCookiePreferenceChange('analytics')}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Cookies de Análisis</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Google Analytics, Mixpanel - Para entender el uso del sitio
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={cookiePreferences.marketing}
                  onChange={() => handleCookiePreferenceChange('marketing')}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Cookies de Marketing</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Para mostrar anuncios relevantes en otros sitios
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={cookiePreferences.preferences}
                  onChange={() => handleCookiePreferenceChange('preferences')}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Cookies de Preferencias</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Recordar tu idioma, tema y otras preferencias
                  </Typography>
                </Box>
              }
            />
          </FormGroup>

          <Button
            variant="outlined"
            color="error"
            onClick={handleClearAllCookies}
            sx={{ mt: 3 }}
          >
            Borrar Todas las Cookies
          </Button>
        </Paper>

        {/* Data Processing Activities */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Actividades de Procesamiento de Datos
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText
                primary="Autenticación y Seguridad"
                secondary="Procesamos tu email y contraseña para mantener tu cuenta segura"
              />
              <ListItemSecondaryAction>
                <Chip label="Necesario" size="small" color="primary" />
              </ListItemSecondaryAction>
            </ListItem>
            
            <Divider component="li" />
            
            <ListItem>
              <ListItemText
                primary="Procesamiento de Pagos"
                secondary="Stripe procesa los datos de pago. No almacenamos información de tarjetas"
              />
              <ListItemSecondaryAction>
                <Chip label="Necesario" size="small" color="primary" />
              </ListItemSecondaryAction>
            </ListItem>
            
            <Divider component="li" />
            
            <ListItem>
              <ListItemText
                primary="Análisis de Uso"
                secondary="Recopilamos datos anónimos para mejorar nuestros servicios"
              />
              <ListItemSecondaryAction>
                <Chip label="Opcional" size="small" />
              </ListItemSecondaryAction>
            </ListItem>
            
            <Divider component="li" />
            
            <ListItem>
              <ListItemText
                primary="Soporte al Cliente"
                secondary="Procesamos tus mensajes para brindarte asistencia"
              />
              <ListItemSecondaryAction>
                <Chip label="Necesario" size="small" color="primary" />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>

        {/* Delete Account Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon color="error" sx={{ mr: 1 }} />
            Eliminar Cuenta
          </DialogTitle>
          <DialogContent>
            <DialogContentText paragraph>
              Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán:
            </DialogContentText>
            <List dense>
              <ListItem>• Todos tus datos personales</ListItem>
              <ListItem>• Historial de productos y configuraciones</ListItem>
              <ListItem>• Suscripciones activas (se cancelarán)</ListItem>
              <ListItem>• Acceso a la API y claves</ListItem>
              <ListItem>• Historial de soporte</ListItem>
            </List>
            <DialogContentText paragraph sx={{ mt: 2 }}>
              Para confirmar, escribe <strong>ELIMINAR</strong> en el campo de abajo:
            </DialogContentText>
            <TextField
              fullWidth
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              error={confirmText.length > 0 && confirmText !== 'ELIMINAR'}
              helperText={confirmText.length > 0 && confirmText !== 'ELIMINAR' ? 'Texto incorrecto' : ''}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteAccount}
              color="error"
              variant="contained"
              disabled={confirmText !== 'ELIMINAR' || loading}
              startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
            >
              Eliminar mi Cuenta
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  );
};

export default PrivacySettings;