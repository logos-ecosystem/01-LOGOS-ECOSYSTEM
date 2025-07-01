import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Link,
  Slide,
  Stack,
  IconButton,
  Collapse,
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material';
import { Close as CloseIcon, Cookie as CookieIcon } from '@mui/icons-material';
import { useRouter } from 'next/router';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export const CookieConsent: React.FC = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });

  useEffect(() => {
    // Check if consent has been given
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Show consent banner after a short delay
      setTimeout(() => setOpen(true), 1000);
    } else {
      // Apply saved preferences
      applyConsent(JSON.parse(consent));
    }
  }, []);

  const applyConsent = (consent: CookiePreferences) => {
    // Apply analytics scripts based on consent
    if (consent.analytics && typeof window !== 'undefined') {
      // Google Analytics
      if (process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) {
        window.gtag = window.gtag || function() {
          (window.dataLayer = window.dataLayer || []).push(arguments);
        };
        window.gtag('js', new Date());
        window.gtag('config', process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID);
      }
      
      // Mixpanel
      if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
        // Initialize Mixpanel
      }
    }

    // Apply marketing scripts based on consent
    if (consent.marketing && typeof window !== 'undefined') {
      // Facebook Pixel, LinkedIn Insight Tag, etc.
    }

    // Notify other components about consent changes
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: consent }));
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    
    localStorage.setItem('cookieConsent', JSON.stringify(allAccepted));
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    applyConsent(allAccepted);
    setOpen(false);
  };

  const handleAcceptSelected = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(preferences));
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    applyConsent(preferences);
    setOpen(false);
  };

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
    
    localStorage.setItem('cookieConsent', JSON.stringify(onlyNecessary));
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    applyConsent(onlyNecessary);
    setOpen(false);
  };

  const handlePreferenceChange = (category: keyof CookiePreferences) => {
    if (category === 'necessary') return; // Can't disable necessary cookies
    
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  if (!open) return null;

  return (
    <Slide direction="up" in={open} mountOnEnter unmountOnExit>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          p: 3,
          zIndex: 9999,
          maxHeight: '80vh',
          overflow: 'auto',
          backgroundColor: 'background.paper',
          borderTop: 2,
          borderColor: 'primary.main',
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Stack direction="row" alignItems="flex-start" spacing={2}>
            <CookieIcon color="primary" sx={{ fontSize: 40, mt: 0.5 }} />
            
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" gutterBottom>
                Usamos cookies para mejorar tu experiencia
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Utilizamos cookies y tecnologías similares para personalizar contenido, 
                analizar el tráfico y mejorar tu experiencia. Al hacer clic en "Aceptar todo", 
                aceptas el uso de todas las cookies. Puedes personalizar tus preferencias 
                haciendo clic en "Personalizar cookies".
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Para más información, consulta nuestra{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => router.push('/privacy-policy')}
                  sx={{ textDecoration: 'underline' }}
                >
                  Política de Privacidad
                </Link>
                {' '}y{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => router.push('/cookie-policy')}
                  sx={{ textDecoration: 'underline' }}
                >
                  Política de Cookies
                </Link>
                .
              </Typography>

              <Collapse in={showDetails} timeout="auto" unmountOnExit>
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Personaliza tus preferencias de cookies:
                  </Typography>

                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <Box>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={preferences.necessary}
                            disabled
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              Cookies Necesarias (Siempre activas)
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Esenciales para el funcionamiento del sitio web. No se pueden desactivar.
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>

                    <Box>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={preferences.analytics}
                            onChange={() => handlePreferenceChange('analytics')}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              Cookies de Análisis
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Nos ayudan a entender cómo los visitantes interactúan con nuestro sitio web.
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>

                    <Box>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={preferences.marketing}
                            onChange={() => handlePreferenceChange('marketing')}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              Cookies de Marketing
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Se utilizan para mostrar anuncios relevantes y medir la efectividad de las campañas.
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>

                    <Box>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={preferences.preferences}
                            onChange={() => handlePreferenceChange('preferences')}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              Cookies de Preferencias
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Permiten recordar información que cambia la forma en que el sitio se comporta o se ve.
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                  </Stack>
                </Box>
              </Collapse>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAcceptAll}
                  sx={{ minWidth: 120 }}
                >
                  Aceptar todo
                </Button>
                
                {showDetails ? (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAcceptSelected}
                    sx={{ minWidth: 120 }}
                  >
                    Aceptar selección
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setShowDetails(true)}
                    sx={{ minWidth: 120 }}
                  >
                    Personalizar
                  </Button>
                )}
                
                <Button
                  variant="text"
                  size="small"
                  onClick={handleRejectAll}
                  sx={{ minWidth: 120 }}
                >
                  Rechazar todo
                </Button>
              </Stack>
            </Box>

            <IconButton
              size="small"
              onClick={handleRejectAll}
              sx={{ mt: -1, mr: -1 }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>
      </Paper>
    </Slide>
  );
};

// Cookie management utility functions
export const getCookieConsent = (): CookiePreferences | null => {
  if (typeof window === 'undefined') return null;
  
  const consent = localStorage.getItem('cookieConsent');
  return consent ? JSON.parse(consent) : null;
};

export const updateCookieConsent = (preferences: CookiePreferences) => {
  localStorage.setItem('cookieConsent', JSON.stringify(preferences));
  localStorage.setItem('cookieConsentDate', new Date().toISOString());
  window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: preferences }));
};

export const clearCookieConsent = () => {
  localStorage.removeItem('cookieConsent');
  localStorage.removeItem('cookieConsentDate');
  
  // Clear all non-necessary cookies
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  // Reload to remove tracking scripts
  window.location.reload();
};