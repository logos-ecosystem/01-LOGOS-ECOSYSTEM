/**
 * Theme Configuration UI
 * Interactive theme customization with real-time preview
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Grid,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  InputAdornment,
  Collapse,
  Alert,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Brush as BrushIcon,
  ColorLens as ColorLensIcon,
  Tune as TuneIcon,
  AutoAwesome as AutoIcon,
  Accessibility as AccessibilityIcon,
  DarkMode as DarkIcon,
  LightMode as LightIcon,
  Speed as SpeedIcon,
  TextFields as TextIcon,
  Contrast as ContrastIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  WbSunny as SunIcon,
  Nightlight as MoonIcon,
  Cloud as CloudIcon,
  Battery20 as BatteryIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { ChromePicker } from 'react-color';
import { useTheme } from './DynamicThemeProvider';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, label }) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <Box sx={{ position: 'relative' }}>
      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
        {label}
      </Typography>
      <Box
        onClick={() => setShowPicker(!showPicker)}
        sx={{
          width: '100%',
          height: 40,
          backgroundColor: color,
          borderRadius: 1,
          border: '2px solid',
          borderColor: 'divider',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.02)',
            boxShadow: `0 4px 20px ${color}40`,
          },
        }}
      >
        <Typography variant="caption" sx={{ 
          color: (theme) => theme.palette.getContrastText(color),
          fontWeight: 600,
        }}>
          {color}
        </Typography>
      </Box>
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            style={{
              position: 'absolute',
              zIndex: 1000,
              top: '100%',
              left: 0,
              marginTop: 8,
            }}
          >
            <Box
              sx={{
                position: 'fixed',
                inset: 0,
                zIndex: 999,
              }}
              onClick={() => setShowPicker(false)}
            />
            <Box sx={{ position: 'relative', zIndex: 1000 }}>
              <ChromePicker
                color={color}
                onChange={(newColor) => onChange(newColor.hex)}
              />
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

const ThemeConfigurator: React.FC = () => {
  const {
    currentPreset,
    presets,
    preferences,
    environmental,
    setTheme,
    setPreferences,
    generateTheme,
    adaptToEnvironment,
    getColorHarmony,
    optimizeForAccessibility,
  } = useTheme();

  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'accessibility' | 'environment'>('presets');
  const [customColor, setCustomColor] = useState('#4870FF');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedThemes, setSavedThemes] = useState<any[]>([]);

  const handleGenerateTheme = () => {
    generateTheme(customColor);
  };

  const handleExportTheme = () => {
    const themeData = {
      preset: currentPreset,
      preferences,
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${currentPreset.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const themeData = JSON.parse(e.target?.result as string);
        if (themeData.preset) {
          // Add imported theme to presets
          const importedPreset = { ...themeData.preset, id: `imported-${Date.now()}` };
          setSavedThemes(prev => [...prev, importedPreset]);
          setTheme(importedPreset.id);
        }
        if (themeData.preferences) {
          setPreferences(themeData.preferences);
        }
      } catch (error) {
        console.error('Failed to import theme:', error);
      }
    };
    reader.readAsText(file);
  };

  const colorHarmony = getColorHarmony(currentPreset.primary);

  return (
    <Card sx={{
      bgcolor: 'background.paper',
      borderRadius: 2,
      overflow: 'hidden',
      maxWidth: 800,
      mx: 'auto',
    }}>
      <CardContent>
        <Stack spacing={3}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ColorLensIcon /> Theme Configurator
            </Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Export Theme">
                <IconButton onClick={handleExportTheme} size="small">
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Import Theme">
                <IconButton component="label" size="small">
                  <UploadIcon />
                  <input
                    type="file"
                    accept=".json"
                    hidden
                    onChange={handleImportTheme}
                  />
                </IconButton>
              </Tooltip>
              <Tooltip title="Optimize for Accessibility">
                <IconButton onClick={optimizeForAccessibility} size="small">
                  <AccessibilityIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Tab Navigation */}
          <ToggleButtonGroup
            value={activeTab}
            exclusive
            onChange={(_, value) => value && setActiveTab(value)}
            fullWidth
            size="small"
          >
            <ToggleButton value="presets">
              <PaletteIcon sx={{ mr: 1 }} />
              Presets
            </ToggleButton>
            <ToggleButton value="custom">
              <BrushIcon sx={{ mr: 1 }} />
              Custom
            </ToggleButton>
            <ToggleButton value="accessibility">
              <AccessibilityIcon sx={{ mr: 1 }} />
              Accessibility
            </ToggleButton>
            <ToggleButton value="environment">
              <TuneIcon sx={{ mr: 1 }} />
              Environment
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Content */}
          <Box sx={{ minHeight: 400 }}>
            <AnimatePresence mode="wait">
              {/* Presets Tab */}
              {activeTab === 'presets' && (
                <motion.div
                  key="presets"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Grid container spacing={2}>
                    {[...presets, ...savedThemes].map((preset) => (
                      <Grid item xs={12} sm={6} md={4} key={preset.id}>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Paper
                            sx={{
                              p: 2,
                              cursor: 'pointer',
                              border: '2px solid',
                              borderColor: currentPreset.id === preset.id ? 'primary.main' : 'transparent',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                borderColor: 'primary.main',
                                boxShadow: (theme) => `0 4px 20px ${theme.palette.primary.main}40`,
                              },
                            }}
                            onClick={() => setTheme(preset.id)}
                          >
                            <Stack spacing={1}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle2">{preset.name}</Typography>
                                {currentPreset.id === preset.id && (
                                  <CheckIcon fontSize="small" color="primary" />
                                )}
                              </Stack>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {[preset.primary, preset.secondary, preset.accent].map((color, i) => (
                                  <Box
                                    key={i}
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: '50%',
                                      bgcolor: color,
                                      border: '2px solid',
                                      borderColor: 'divider',
                                    }}
                                  />
                                ))}
                              </Box>
                              <Stack direction="row" spacing={0.5}>
                                <Chip 
                                  label={preset.mode} 
                                  size="small"
                                  icon={preset.mode === 'dark' ? <DarkIcon /> : <LightIcon />}
                                />
                                <Chip 
                                  label={preset.personality} 
                                  size="small"
                                  variant="outlined"
                                />
                              </Stack>
                            </Stack>
                          </Paper>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </motion.div>
              )}

              {/* Custom Tab */}
              {activeTab === 'custom' && (
                <motion.div
                  key="custom"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Color Generator
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Base Color"
                            value={customColor}
                            onChange={(e) => setCustomColor(e.target.value)}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Box
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: '50%',
                                      bgcolor: customColor,
                                      border: '2px solid',
                                      borderColor: 'divider',
                                    }}
                                  />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Button
                            fullWidth
                            variant="contained"
                            startIcon={<AutoIcon />}
                            onClick={handleGenerateTheme}
                            sx={{ height: '100%' }}
                          >
                            Generate AI Theme
                          </Button>
                        </Grid>
                      </Grid>
                    </Box>

                    <Divider />

                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Color Harmony
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Complementary Colors
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            {colorHarmony.complementary.map((color, i) => (
                              <Chip
                                key={i}
                                label={color}
                                sx={{
                                  bgcolor: color,
                                  color: (theme) => theme.palette.getContrastText(color),
                                }}
                              />
                            ))}
                          </Stack>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Analogous Colors
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {colorHarmony.analogous.map((color, i) => (
                              <Chip
                                key={i}
                                label={color}
                                sx={{
                                  bgcolor: color,
                                  color: (theme) => theme.palette.getContrastText(color),
                                  mb: 1,
                                }}
                              />
                            ))}
                          </Stack>
                        </Grid>
                      </Grid>
                    </Box>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={showAdvanced}
                          onChange={(e) => setShowAdvanced(e.target.checked)}
                        />
                      }
                      label="Show Advanced Options"
                    />

                    <Collapse in={showAdvanced}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <ColorPicker
                            color={currentPreset.primary}
                            onChange={(color) => console.log('Primary:', color)}
                            label="Primary Color"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <ColorPicker
                            color={currentPreset.secondary}
                            onChange={(color) => console.log('Secondary:', color)}
                            label="Secondary Color"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <ColorPicker
                            color={currentPreset.background}
                            onChange={(color) => console.log('Background:', color)}
                            label="Background Color"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <ColorPicker
                            color={currentPreset.accent}
                            onChange={(color) => console.log('Accent:', color)}
                            label="Accent Color"
                          />
                        </Grid>
                      </Grid>
                    </Collapse>
                  </Stack>
                </motion.div>
              )}

              {/* Accessibility Tab */}
              {activeTab === 'accessibility' && (
                <motion.div
                  key="accessibility"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Stack spacing={3}>
                    <Alert severity="info">
                      Optimize your theme for better accessibility and user comfort.
                    </Alert>

                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Visual Preferences
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel>Color Blind Mode</InputLabel>
                            <Select
                              value={preferences.colorBlindMode}
                              onChange={(e) => setPreferences({ colorBlindMode: e.target.value as any })}
                            >
                              <MenuItem value="none">None</MenuItem>
                              <MenuItem value="protanopia">Protanopia (Red-blind)</MenuItem>
                              <MenuItem value="deuteranopia">Deuteranopia (Green-blind)</MenuItem>
                              <MenuItem value="tritanopia">Tritanopia (Blue-blind)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel>Contrast Level</InputLabel>
                            <Select
                              value={preferences.contrastLevel}
                              onChange={(e) => setPreferences({ contrastLevel: e.target.value as any })}
                            >
                              <MenuItem value="normal">Normal</MenuItem>
                              <MenuItem value="high">High</MenuItem>
                              <MenuItem value="ultra">Ultra High</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Box>

                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Motion & Animation
                      </Typography>
                      <FormControl fullWidth>
                        <InputLabel>Motion Preference</InputLabel>
                        <Select
                          value={preferences.motionPreference}
                          onChange={(e) => setPreferences({ motionPreference: e.target.value as any })}
                        >
                          <MenuItem value="full">Full Animations</MenuItem>
                          <MenuItem value="reduced">Reduced Motion</MenuItem>
                          <MenuItem value="none">No Animations</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Text Size
                      </Typography>
                      <ToggleButtonGroup
                        value={preferences.fontSize}
                        exclusive
                        onChange={(_, value) => value && setPreferences({ fontSize: value })}
                        fullWidth
                      >
                        <ToggleButton value="small">
                          <TextIcon fontSize="small" />
                          Small
                        </ToggleButton>
                        <ToggleButton value="medium">
                          <TextIcon />
                          Medium
                        </ToggleButton>
                        <ToggleButton value="large">
                          <TextIcon fontSize="large" />
                          Large
                        </ToggleButton>
                        <ToggleButton value="extra-large">
                          <TextIcon fontSize="large" />
                          Extra Large
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>

                    <Button
                      variant="contained"
                      startIcon={<AccessibilityIcon />}
                      onClick={optimizeForAccessibility}
                      fullWidth
                    >
                      Apply Recommended Accessibility Settings
                    </Button>
                  </Stack>
                </motion.div>
              )}

              {/* Environment Tab */}
              {activeTab === 'environment' && (
                <motion.div
                  key="environment"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Stack spacing={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.autoAdapt}
                          onChange={(e) => setPreferences({ autoAdapt: e.target.checked })}
                        />
                      }
                      label="Auto-adapt to environment"
                    />

                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Current Environment
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Paper sx={{ p: 2 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              {environmental.timeOfDay === 'morning' && <SunIcon />}
                              {environmental.timeOfDay === 'afternoon' && <SunIcon />}
                              {environmental.timeOfDay === 'evening' && <CloudIcon />}
                              {environmental.timeOfDay === 'night' && <MoonIcon />}
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Time of Day
                                </Typography>
                                <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                                  {environmental.timeOfDay}
                                </Typography>
                              </Box>
                            </Stack>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Paper sx={{ p: 2 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <BatteryIcon />
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Battery Level
                                </Typography>
                                <Typography variant="h6">
                                  {environmental.batteryLevel || 'N/A'}%
                                </Typography>
                              </Box>
                            </Stack>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Box>

                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Manual Adjustments
                      </Typography>
                      <Stack spacing={2}>
                        <Box>
                          <Typography gutterBottom>
                            Ambient Light: {environmental.ambientLight}%
                          </Typography>
                          <Slider
                            value={environmental.ambientLight}
                            onChange={(_, value) => console.log('Ambient:', value)}
                            valueLabelDisplay="auto"
                            min={0}
                            max={100}
                          />
                        </Box>
                        <Box>
                          <Typography gutterBottom>
                            Screen Brightness: {environmental.screenBrightness}%
                          </Typography>
                          <Slider
                            value={environmental.screenBrightness}
                            onChange={(_, value) => console.log('Brightness:', value)}
                            valueLabelDisplay="auto"
                            min={0}
                            max={100}
                          />
                        </Box>
                      </Stack>
                    </Box>

                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={adaptToEnvironment}
                      fullWidth
                    >
                      Re-adapt to Current Environment
                    </Button>
                  </Stack>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ThemeConfigurator;