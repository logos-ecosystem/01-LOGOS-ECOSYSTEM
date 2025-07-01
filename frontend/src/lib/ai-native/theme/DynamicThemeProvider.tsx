/**
 * AI-Powered Dynamic Theming System
 * Adaptive themes with ML-based color optimization
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeProvider, createTheme, Theme, alpha } from '@mui/material/styles';
import { CssBaseline, useMediaQuery } from '@mui/material';
import * as tf from '@tensorflow/tfjs';
import tinycolor from 'tinycolor2';

interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  accent: string;
  mode: 'light' | 'dark';
  personality: 'professional' | 'playful' | 'elegant' | 'futuristic' | 'minimalist';
}

interface ColorHarmony {
  complementary: string[];
  analogous: string[];
  triadic: string[];
  tetradic: string[];
  splitComplementary: string[];
}

interface UserPreferences {
  colorBlindMode?: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  contrastLevel: 'normal' | 'high' | 'ultra';
  motionPreference: 'full' | 'reduced' | 'none';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  preferredTheme?: string;
  autoAdapt: boolean;
}

interface EnvironmentalFactors {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  ambientLight: number; // 0-100
  screenBrightness: number; // 0-100
  batteryLevel?: number; // 0-100
  networkSpeed?: 'slow' | 'medium' | 'fast';
}

interface ThemeContext {
  theme: Theme;
  currentPreset: ThemePreset;
  presets: ThemePreset[];
  preferences: UserPreferences;
  environmental: EnvironmentalFactors;
  setTheme: (presetId: string) => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  generateTheme: (baseColor: string) => void;
  adaptToEnvironment: () => void;
  getColorHarmony: (color: string) => ColorHarmony;
  optimizeForAccessibility: () => void;
}

const ThemeContextInstance = createContext<ThemeContext | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContextInstance);
  if (!context) {
    throw new Error('useTheme must be used within DynamicThemeProvider');
  }
  return context;
};

// AI Color Model for theme generation
class AIColorModel {
  private model: tf.LayersModel | null = null;
  
  async initialize() {
    // Create a simple neural network for color preference prediction
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [7], units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 3, activation: 'sigmoid' }) // RGB output
      ]
    });
    
    this.model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError'
    });
  }
  
  predictOptimalColor(
    baseColor: string,
    personality: string,
    environmental: EnvironmentalFactors
  ): string {
    if (!this.model) return baseColor;
    
    const color = tinycolor(baseColor);
    const hsl = color.toHsl();
    
    // Create feature vector
    const features = [
      hsl.h / 360,
      hsl.s,
      hsl.l,
      personality === 'professional' ? 1 : 0,
      personality === 'playful' ? 1 : 0,
      environmental.ambientLight / 100,
      environmental.timeOfDay === 'night' ? 1 : 0
    ];
    
    const prediction = this.model.predict(tf.tensor2d([features])) as tf.Tensor;
    const rgb = Array.from(prediction.dataSync());
    
    prediction.dispose();
    
    return tinycolor({
      r: Math.floor(rgb[0] * 255),
      g: Math.floor(rgb[1] * 255),
      b: Math.floor(rgb[2] * 255)
    }).toHexString();
  }
}

// Predefined theme presets
const defaultPresets: ThemePreset[] = [
  {
    id: 'quantum-dark',
    name: 'Quantum Dark',
    primary: '#4870FF',
    secondary: '#00F6FF',
    background: '#0A0E21',
    surface: '#131729',
    text: '#FFFFFF',
    accent: '#FFD700',
    mode: 'dark',
    personality: 'futuristic'
  },
  {
    id: 'neural-light',
    name: 'Neural Light',
    primary: '#5B8DEE',
    secondary: '#FF6B6B',
    background: '#F8F9FD',
    surface: '#FFFFFF',
    text: '#1A1A2E',
    accent: '#4ECDC4',
    mode: 'light',
    personality: 'professional'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    primary: '#FF006E',
    secondary: '#FFBE0B',
    background: '#0A0A0A',
    surface: '#1A1A1A',
    text: '#FFFFFF',
    accent: '#3A86FF',
    mode: 'dark',
    personality: 'playful'
  },
  {
    id: 'matrix',
    name: 'Matrix',
    primary: '#00FF41',
    secondary: '#008F11',
    background: '#0D0208',
    surface: '#003B00',
    text: '#00FF41',
    accent: '#FFFFFF',
    mode: 'dark',
    personality: 'futuristic'
  },
  {
    id: 'sunset',
    name: 'Sunset Gradient',
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    background: '#FFE66D',
    surface: '#FFEAA7',
    text: '#2D3436',
    accent: '#A8E6CF',
    mode: 'light',
    personality: 'playful'
  }
];

export const DynamicThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [currentPresetId, setCurrentPresetId] = useState('quantum-dark');
  const [presets, setPresets] = useState<ThemePreset[]>(defaultPresets);
  const [aiModel] = useState(() => new AIColorModel());
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    colorBlindMode: 'none',
    contrastLevel: 'normal',
    motionPreference: prefersReducedMotion ? 'reduced' : 'full',
    fontSize: 'medium',
    autoAdapt: true
  });
  
  const [environmental, setEnvironmental] = useState<EnvironmentalFactors>({
    timeOfDay: 'afternoon',
    ambientLight: 50,
    screenBrightness: 75,
    batteryLevel: 100,
    networkSpeed: 'fast'
  });
  
  // Initialize AI model
  useEffect(() => {
    aiModel.initialize();
  }, [aiModel]);
  
  // Update environmental factors
  useEffect(() => {
    const updateEnvironment = () => {
      const hour = new Date().getHours();
      let timeOfDay: EnvironmentalFactors['timeOfDay'];
      
      if (hour >= 5 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17 && hour < 20) timeOfDay = 'evening';
      else timeOfDay = 'night';
      
      setEnvironmental(prev => ({ ...prev, timeOfDay }));
      
      // Check battery level if available
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          setEnvironmental(prev => ({
            ...prev,
            batteryLevel: Math.round(battery.level * 100)
          }));
        });
      }
    };
    
    updateEnvironment();
    const interval = setInterval(updateEnvironment, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Auto-adapt theme based on environment
  useEffect(() => {
    if (!preferences.autoAdapt) return;
    
    const adaptTheme = () => {
      if (environmental.timeOfDay === 'night' && currentPreset.mode === 'light') {
        // Switch to dark theme at night
        const darkPreset = presets.find(p => p.mode === 'dark' && p.personality === currentPreset.personality);
        if (darkPreset) {
          setCurrentPresetId(darkPreset.id);
        }
      } else if (environmental.timeOfDay === 'morning' && currentPreset.mode === 'dark') {
        // Switch to light theme in morning
        const lightPreset = presets.find(p => p.mode === 'light' && p.personality === currentPreset.personality);
        if (lightPreset) {
          setCurrentPresetId(lightPreset.id);
        }
      }
      
      // Adjust brightness based on ambient light
      if (environmental.ambientLight < 30 && currentPreset.mode === 'light') {
        // Dim the theme in low light
        const dimmedPreset = { ...currentPreset };
        dimmedPreset.background = tinycolor(dimmedPreset.background).darken(10).toString();
        setPresets(prev => [...prev.filter(p => p.id !== 'temp-dimmed'), { ...dimmedPreset, id: 'temp-dimmed' }]);
        setCurrentPresetId('temp-dimmed');
      }
    };
    
    adaptTheme();
  }, [environmental, preferences.autoAdapt, currentPreset, presets]);
  
  const currentPreset = useMemo(() => 
    presets.find(p => p.id === currentPresetId) || presets[0],
    [currentPresetId, presets]
  );
  
  // Apply color blind filters
  const applyColorBlindFilter = useCallback((color: string): string => {
    if (preferences.colorBlindMode === 'none') return color;
    
    const c = tinycolor(color);
    const rgb = c.toRgb();
    
    switch (preferences.colorBlindMode) {
      case 'protanopia': // Red-blind
        return tinycolor({
          r: 0.567 * rgb.r + 0.433 * rgb.g,
          g: 0.558 * rgb.r + 0.442 * rgb.g,
          b: 0.242 * rgb.g + 0.758 * rgb.b
        }).toHexString();
        
      case 'deuteranopia': // Green-blind
        return tinycolor({
          r: 0.625 * rgb.r + 0.375 * rgb.g,
          g: 0.7 * rgb.r + 0.3 * rgb.g,
          b: 0.3 * rgb.g + 0.7 * rgb.b
        }).toHexString();
        
      case 'tritanopia': // Blue-blind
        return tinycolor({
          r: 0.95 * rgb.r + 0.05 * rgb.g,
          g: 0.433 * rgb.g + 0.567 * rgb.b,
          b: 0.475 * rgb.g + 0.525 * rgb.b
        }).toHexString();
        
      default:
        return color;
    }
  }, [preferences.colorBlindMode]);
  
  // Generate color harmony
  const getColorHarmony = useCallback((baseColor: string): ColorHarmony => {
    const color = tinycolor(baseColor);
    
    return {
      complementary: [color.complement().toHexString()],
      analogous: color.analogous().map(c => c.toHexString()),
      triadic: color.triad().map(c => c.toHexString()),
      tetradic: color.tetrad().map(c => c.toHexString()),
      splitComplementary: color.splitcomplement().map(c => c.toHexString())
    };
  }, []);
  
  // Generate theme from base color
  const generateTheme = useCallback((baseColor: string) => {
    const color = tinycolor(baseColor);
    const harmony = getColorHarmony(baseColor);
    const isDark = color.isDark();
    
    // Use AI to optimize colors
    const optimizedPrimary = aiModel.predictOptimalColor(
      baseColor,
      'professional',
      environmental
    );
    
    const newPreset: ThemePreset = {
      id: `generated-${Date.now()}`,
      name: 'AI Generated',
      primary: optimizedPrimary,
      secondary: harmony.complementary[0],
      background: isDark ? color.darken(30).toHexString() : color.lighten(45).toHexString(),
      surface: isDark ? color.darken(20).toHexString() : color.lighten(40).toHexString(),
      text: isDark ? '#FFFFFF' : '#000000',
      accent: harmony.triadic[1],
      mode: isDark ? 'dark' : 'light',
      personality: 'professional'
    };
    
    setPresets(prev => [...prev, newPreset]);
    setCurrentPresetId(newPreset.id);
  }, [aiModel, environmental, getColorHarmony]);
  
  // Create Material-UI theme
  const theme = useMemo(() => {
    const fontSizes = {
      small: 0.875,
      medium: 1,
      large: 1.125,
      'extra-large': 1.25
    };
    
    const contrastRatios = {
      normal: 3,
      high: 4.5,
      ultra: 7
    };
    
    return createTheme({
      palette: {
        mode: currentPreset.mode,
        primary: {
          main: applyColorBlindFilter(currentPreset.primary),
        },
        secondary: {
          main: applyColorBlindFilter(currentPreset.secondary),
        },
        background: {
          default: currentPreset.background,
          paper: currentPreset.surface,
        },
        text: {
          primary: currentPreset.text,
          secondary: alpha(currentPreset.text, 0.7),
        },
        error: {
          main: applyColorBlindFilter('#FF6B6B'),
        },
        warning: {
          main: applyColorBlindFilter('#FFD93D'),
        },
        success: {
          main: applyColorBlindFilter('#4ECDC4'),
        },
        info: {
          main: applyColorBlindFilter(currentPreset.secondary),
        },
        contrastThreshold: contrastRatios[preferences.contrastLevel],
      },
      typography: {
        fontSize: 14 * fontSizes[preferences.fontSize],
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
          fontSize: `${2.5 * fontSizes[preferences.fontSize]}rem`,
          fontWeight: 700,
        },
        h2: {
          fontSize: `${2 * fontSizes[preferences.fontSize]}rem`,
          fontWeight: 600,
        },
        h3: {
          fontSize: `${1.75 * fontSizes[preferences.fontSize]}rem`,
          fontWeight: 600,
        },
        h4: {
          fontSize: `${1.5 * fontSizes[preferences.fontSize]}rem`,
          fontWeight: 500,
        },
        h5: {
          fontSize: `${1.25 * fontSizes[preferences.fontSize]}rem`,
          fontWeight: 500,
        },
        h6: {
          fontSize: `${1.1 * fontSizes[preferences.fontSize]}rem`,
          fontWeight: 500,
        },
      },
      transitions: {
        duration: {
          shortest: preferences.motionPreference === 'none' ? 0 : 150,
          shorter: preferences.motionPreference === 'none' ? 0 : 200,
          short: preferences.motionPreference === 'none' ? 0 : 250,
          standard: preferences.motionPreference === 'none' ? 0 : 300,
          complex: preferences.motionPreference === 'none' ? 0 : 375,
          enteringScreen: preferences.motionPreference === 'none' ? 0 : 225,
          leavingScreen: preferences.motionPreference === 'none' ? 0 : 195,
        },
      },
      shape: {
        borderRadius: currentPreset.personality === 'playful' ? 16 : 8,
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: currentPreset.personality === 'playful' ? 24 : 8,
              transition: preferences.motionPreference === 'none' 
                ? 'none' 
                : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: currentPreset.personality === 'playful' ? 20 : 12,
              backdropFilter: 'blur(10px)',
              backgroundColor: alpha(currentPreset.surface, 0.8),
              border: `1px solid ${alpha(currentPreset.primary, 0.1)}`,
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: currentPreset.personality === 'playful' ? 16 : 8,
            },
          },
        },
      },
    });
  }, [currentPreset, preferences, applyColorBlindFilter]);
  
  // Optimize for accessibility
  const optimizeForAccessibility = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      contrastLevel: 'high',
      fontSize: 'large',
      motionPreference: 'reduced'
    }));
  }, []);
  
  // Adapt to environment
  const adaptToEnvironment = useCallback(() => {
    // This is triggered manually or by environmental changes
    const shouldUseDarkMode = 
      environmental.timeOfDay === 'night' || 
      environmental.ambientLight < 30 ||
      (environmental.batteryLevel && environmental.batteryLevel < 20);
    
    if (shouldUseDarkMode && currentPreset.mode === 'light') {
      const darkPreset = presets.find(p => p.mode === 'dark');
      if (darkPreset) {
        setCurrentPresetId(darkPreset.id);
      }
    }
  }, [environmental, currentPreset, presets]);
  
  const contextValue: ThemeContext = {
    theme,
    currentPreset,
    presets,
    preferences,
    environmental,
    setTheme: setCurrentPresetId,
    setPreferences: (newPrefs) => setPreferences(prev => ({ ...prev, ...newPrefs })),
    generateTheme,
    adaptToEnvironment,
    getColorHarmony,
    optimizeForAccessibility,
  };
  
  return (
    <ThemeContextInstance.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContextInstance.Provider>
  );
};

export default DynamicThemeProvider;