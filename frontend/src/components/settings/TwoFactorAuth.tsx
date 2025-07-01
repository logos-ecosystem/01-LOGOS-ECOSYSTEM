import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  AlertTitle,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  InputAdornment,
  CircularProgress,
  Divider,
  Grid
} from '@mui/material';
import {
  Security,
  QrCode2,
  ContentCopy,
  CheckCircle,
  Warning,
  Lock,
  Visibility,
  VisibilityOff,
  Download,
  Refresh
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { useSnackbar } from 'notistack';

interface TwoFactorStatus {
  enabled: boolean;
  verifiedAt: string | null;
  backupCodesRemaining: number;
}

const TwoFactorAuth: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  const [status, setStatus] = useState<TwoFactorStatus>({
    enabled: user?.twoFactorEnabled || false,
    verifiedAt: null,
    backupCodesRemaining: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);

  // Fetch 2FA status on mount
  React.useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await api.get('/2fa/status');
      setStatus(response.data.data);
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    }
  };

  const handleGenerateSecret = async () => {
    setLoading(true);
    try {
      const response = await api.post('/2fa/generate');
      setQrCode(response.data.data.qrCode);
      setSecret(response.data.data.secret);
      setActiveStep(1);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to generate 2FA secret', {
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!verificationCode || !password) {
      enqueueSnackbar('Please enter verification code and password', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/2fa/enable', {
        token: verificationCode,
        password
      });
      
      setBackupCodes(response.data.data.backupCodes);
      setShowBackupCodes(true);
      setActiveStep(2);
      setStatus({ ...status, enabled: true });
      
      enqueueSnackbar('2FA has been enabled successfully!', { variant: 'success' });
      refreshUser();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to enable 2FA', {
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!verificationCode || !password) {
      enqueueSnackbar('Please enter verification code and password', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/2fa/disable', {
        token: verificationCode,
        password
      });
      
      setStatus({ ...status, enabled: false });
      setDisableDialogOpen(false);
      setVerificationCode('');
      setPassword('');
      
      enqueueSnackbar('2FA has been disabled', { variant: 'success' });
      refreshUser();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to disable 2FA', {
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!verificationCode || !password) {
      enqueueSnackbar('Please enter verification code and password', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/2fa/backup-codes/regenerate', {
        token: verificationCode,
        password
      });
      
      setBackupCodes(response.data.data.backupCodes);
      setShowBackupCodes(true);
      setRegenerateDialogOpen(false);
      setVerificationCode('');
      setPassword('');
      
      enqueueSnackbar('Backup codes regenerated successfully!', { variant: 'success' });
      fetchStatus();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to regenerate backup codes', {
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    enqueueSnackbar('Copied to clipboard', { variant: 'success' });
  };

  const downloadBackupCodes = () => {
    const content = `LOGOS ECOSYSTEM - 2FA Backup Codes
Generated: ${new Date().toISOString()}

IMPORTANT: Store these codes in a secure location.
Each code can only be used once.

${backupCodes.join('\n')}

These codes will allow you to access your account if you lose your 2FA device.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logos-2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (status.enabled && !showBackupCodes) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <Security sx={{ mr: 2, color: 'success.main' }} />
          <Typography variant="h5">Two-Factor Authentication</Typography>
          <Chip
            label="Enabled"
            color="success"
            size="small"
            sx={{ ml: 2 }}
          />
        </Box>

        <Alert severity="success" sx={{ mb: 3 }}>
          <AlertTitle>2FA is Active</AlertTitle>
          Your account is protected with two-factor authentication.
        </Alert>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Status Information
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="2FA Enabled"
                    secondary={status.verifiedAt ? `Since ${new Date(status.verifiedAt).toLocaleDateString()}` : 'Active'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Lock color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Backup Codes"
                    secondary={`${status.backupCodesRemaining} codes remaining`}
                  />
                </ListItem>
              </List>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Actions
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => setRegenerateDialogOpen(true)}
                  disabled={loading}
                >
                  Regenerate Backup Codes
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Warning />}
                  onClick={() => setDisableDialogOpen(true)}
                  disabled={loading}
                >
                  Disable 2FA
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Disable 2FA Dialog */}
        <Dialog open={disableDialogOpen} onClose={() => setDisableDialogOpen(false)}>
          <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Disabling 2FA will make your account less secure. Are you sure?
            </Alert>
            <TextField
              fullWidth
              label="2FA Code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              margin="normal"
              placeholder="000000"
              inputProps={{ maxLength: 6 }}
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDisableDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleDisable2FA}
              color="error"
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Disable 2FA'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Regenerate Backup Codes Dialog */}
        <Dialog open={regenerateDialogOpen} onClose={() => setRegenerateDialogOpen(false)}>
          <DialogTitle>Regenerate Backup Codes</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              This will invalidate all existing backup codes and generate new ones.
            </Alert>
            <TextField
              fullWidth
              label="2FA Code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              margin="normal"
              placeholder="000000"
              inputProps={{ maxLength: 6 }}
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRegenerateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleRegenerateBackupCodes}
              color="primary"
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Regenerate Codes'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <Security sx={{ mr: 2 }} />
        <Typography variant="h5">Two-Factor Authentication</Typography>
      </Box>

      {!status.enabled && activeStep === 0 && (
        <>
          <Alert severity="info" sx={{ mb: 3 }}>
            <AlertTitle>Enhance Your Security</AlertTitle>
            Two-factor authentication adds an extra layer of security to your account by requiring a code from your phone in addition to your password.
          </Alert>

          <Typography variant="body1" paragraph>
            When you enable 2FA, you'll need to enter a code from your authenticator app each time you sign in.
          </Typography>

          <Box mt={3}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Lock />}
              onClick={handleGenerateSecret}
              disabled={loading}
              size="large"
            >
              {loading ? <CircularProgress size={24} /> : 'Enable 2FA'}
            </Button>
          </Box>
        </>
      )}

      {(activeStep > 0 || showBackupCodes) && (
        <Stepper activeStep={activeStep} orientation="vertical">
          <Step>
            <StepLabel>Generate Secret</StepLabel>
            <StepContent>
              <Typography>Setting up your authenticator app...</Typography>
            </StepContent>
          </Step>

          <Step>
            <StepLabel>Scan QR Code</StepLabel>
            <StepContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" paragraph>
                    1. Install an authenticator app like Google Authenticator or Authy
                  </Typography>
                  <Typography variant="body2" paragraph>
                    2. Scan the QR code or enter the secret manually
                  </Typography>
                  
                  {qrCode && (
                    <Box mt={2} mb={2} textAlign="center">
                      <img src={qrCode} alt="2FA QR Code" style={{ maxWidth: '250px' }} />
                    </Box>
                  )}

                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <TextField
                      fullWidth
                      label="Secret Key"
                      value={secret}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => copyToClipboard(secret)}>
                              <ContentCopy />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                      size="small"
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="body2" paragraph>
                    3. Enter the 6-digit code from your app
                  </Typography>

                  <TextField
                    fullWidth
                    label="Verification Code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="000000"
                    inputProps={{ maxLength: 6 }}
                    margin="normal"
                  />

                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    margin="normal"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />

                  <Box mt={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleEnable2FA}
                      disabled={loading || verificationCode.length !== 6 || !password}
                      fullWidth
                    >
                      {loading ? <CircularProgress size={24} /> : 'Verify and Enable'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </StepContent>
          </Step>

          <Step>
            <StepLabel>Save Backup Codes</StepLabel>
            <StepContent>
              {showBackupCodes && backupCodes.length > 0 && (
                <>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <AlertTitle>Important!</AlertTitle>
                    Save these backup codes in a secure location. Each code can only be used once.
                  </Alert>

                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={1}>
                      {backupCodes.map((code, index) => (
                        <Grid item xs={6} sm={4} key={index}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              p: 1,
                              bgcolor: 'grey.100',
                              borderRadius: 1,
                              textAlign: 'center'
                            }}
                          >
                            {code}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>

                  <Box display="flex" gap={2}>
                    <Button
                      variant="contained"
                      startIcon={<Download />}
                      onClick={downloadBackupCodes}
                    >
                      Download Codes
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ContentCopy />}
                      onClick={() => copyToClipboard(backupCodes.join('\n'))}
                    >
                      Copy All
                    </Button>
                  </Box>

                  <Box mt={3}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => {
                        setShowBackupCodes(false);
                        setActiveStep(0);
                        fetchStatus();
                      }}
                    >
                      I've Saved My Codes
                    </Button>
                  </Box>
                </>
              )}
            </StepContent>
          </Step>
        </Stepper>
      )}
    </Paper>
  );
};

export default TwoFactorAuth;