import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  PhotoCamera as PhotoCameraIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  VerifiedUser as VerifiedUserIcon,
  Security as SecurityIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  bio: string;
  avatar: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  stats: {
    itemsListed: number;
    itemsSold: number;
    totalSales: number;
    rating: number;
    reviewCount: number;
  };
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    bio: '',
    twoFactorEnabled: false,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users/profile');
      setProfile(response.data);
      setFormData({
        fullName: response.data.fullName || '',
        bio: response.data.bio || '',
        twoFactorEnabled: response.data.twoFactorEnabled || false,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Update profile data
      const updateData = new FormData();
      updateData.append('fullName', formData.fullName);
      updateData.append('bio', formData.bio);
      updateData.append('twoFactorEnabled', formData.twoFactorEnabled.toString());
      
      if (avatarFile) {
        updateData.append('avatar', avatarFile);
      }

      const response = await api.put('/api/users/profile', updateData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProfile(response.data);
      setEditMode(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        bio: profile.bio || '',
        twoFactorEnabled: profile.twoFactorEnabled || false,
      });
    }
    setError(null);
    setSuccess(null);
  };

  const sendVerificationEmail = async () => {
    try {
      setError(null);
      setSuccess(null);
      await api.post('/api/users/verify-email/send');
      setSuccess('Verification email sent successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send verification email');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Failed to load profile</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Profile
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Box position="relative" display="inline-block">
              <Avatar
                src={avatarPreview || profile.avatar}
                sx={{ width: 150, height: 150, mb: 2 }}
              />
              {editMode && (
                <IconButton
                  color="primary"
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    right: -8,
                    backgroundColor: 'background.paper',
                  }}
                  component="label"
                >
                  <input
                    hidden
                    accept="image/*"
                    type="file"
                    onChange={handleAvatarChange}
                  />
                  <PhotoCameraIcon />
                </IconButton>
              )}
            </Box>

            <Typography variant="h5" gutterBottom>
              {profile.username}
            </Typography>

            {profile.emailVerified ? (
              <Chip
                icon={<VerifiedUserIcon />}
                label="Verified"
                color="success"
                size="small"
                sx={{ mb: 2 }}
              />
            ) : (
              <Chip
                label="Unverified"
                color="warning"
                size="small"
                sx={{ mb: 2 }}
              />
            )}

            <Typography variant="body2" color="text.secondary" gutterBottom>
              Member since {new Date(profile.createdAt).toLocaleDateString()}
            </Typography>

            {!editMode && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setEditMode(true)}
                sx={{ mt: 2 }}
              >
                Edit Profile
              </Button>
            )}

            {editMode && (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                  sx={{ mr: 1 }}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </Box>
            )}
          </Paper>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Statistics
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Items Listed:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {profile.stats.itemsListed}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Items Sold:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {profile.stats.itemsSold}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Total Sales:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  ${profile.stats.totalSales.toFixed(2)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Rating:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {profile.stats.rating.toFixed(1)} ({profile.stats.reviewCount} reviews)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Profile Information
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Username"
                  value={profile.username}
                  disabled
                  helperText="Username cannot be changed"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  value={profile.email}
                  disabled
                  InputProps={{
                    endAdornment: !profile.emailVerified && (
                      <Button
                        size="small"
                        onClick={sendVerificationEmail}
                        startIcon={<EmailIcon />}
                      >
                        Verify
                      </Button>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  disabled={!editMode}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  disabled={!editMode}
                  multiline
                  rows={4}
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              <SecurityIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Security Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.twoFactorEnabled}
                  onChange={(e) => handleInputChange('twoFactorEnabled', e.target.checked)}
                  disabled={!editMode}
                />
              }
              label="Two-Factor Authentication"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 1 }}>
              Add an extra layer of security to your account by requiring a verification code
              in addition to your password.
            </Typography>

            <Button
              variant="outlined"
              sx={{ mt: 3 }}
              onClick={() => window.location.href = '/dashboard/settings#security'}
            >
              More Security Settings
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}