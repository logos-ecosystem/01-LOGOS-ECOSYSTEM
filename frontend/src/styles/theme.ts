import { createTheme } from '@mui/material/styles';

// Colores principales basados en losandes-ia.com
const colors = {
  primary: {
    main: '#4870FF',
    light: '#7B9FFF',
    dark: '#1A47CC',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#00F6FF',
    light: '#66F9FF',
    dark: '#00C8CC',
    contrastText: '#0A0E21',
  },
  background: {
    default: '#0A0E21',
    paper: '#141B3C',
    surface: '#1C2444',
    elevated: '#242C52',
  },
  text: {
    primary: '#F5F7FA',
    secondary: '#B8C1DD',
    disabled: '#7B859A',
  },
  error: {
    main: '#FF5757',
    light: '#FF8585',
    dark: '#CC2929',
  },
  warning: {
    main: '#FFB547',
    light: '#FFD085',
    dark: '#CC8A1F',
  },
  success: {
    main: '#47FF88',
    light: '#85FFB3',
    dark: '#1FCC5C',
  },
  info: {
    main: '#00D4FF',
    light: '#66E5FF',
    dark: '#00A8CC',
  },
};

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: colors.primary,
    secondary: colors.secondary,
    background: {
      default: colors.background.default,
      paper: colors.background.paper,
    },
    text: colors.text,
    error: colors.error,
    warning: colors.warning,
    success: colors.success,
    info: colors.info,
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '3.5rem',
      fontWeight: 800,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2.75rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '2.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.875rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.6,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.7,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.background.default,
          backgroundImage: 'none',
          scrollbarColor: `${colors.primary.main} ${colors.background.paper}`,
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: colors.primary.main,
            border: `2px solid ${colors.background.default}`,
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            backgroundColor: colors.background.paper,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '1rem',
          fontWeight: 600,
          transition: 'all 0.3s ease',
          textTransform: 'none',
        },
        contained: {
          boxShadow: '0 4px 14px 0 rgba(72, 112, 255, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 20px 0 rgba(72, 112, 255, 0.5)',
            transform: 'translateY(-2px)',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
            backgroundColor: 'rgba(72, 112, 255, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: colors.background.paper,
          borderRadius: 16,
          border: `1px solid rgba(255, 255, 255, 0.1)`,
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 40px 0 rgba(0, 246, 255, 0.2)',
            borderColor: colors.secondary.main,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(10, 14, 33, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: colors.background.surface,
            borderRadius: 8,
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            '&:hover fieldset': {
              borderColor: colors.primary.main,
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary.main,
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: colors.background.paper,
          borderRadius: 12,
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: colors.secondary.main,
          textDecoration: 'none',
          transition: 'color 0.3s ease',
          '&:hover': {
            color: colors.secondary.light,
            textDecoration: 'underline',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(72, 112, 255, 0.2)',
          border: '1px solid rgba(72, 112, 255, 0.3)',
          fontWeight: 600,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  },
});

// Gradientes y efectos especiales
export const gradients = {
  primary: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
  secondary: 'linear-gradient(135deg, #00F6FF 0%, #4870FF 100%)',
  dark: 'linear-gradient(180deg, #0A0E21 0%, #141B3C 100%)',
  radial: 'radial-gradient(circle at top right, rgba(0, 246, 255, 0.2) 0%, transparent 50%)',
};

// Sombras personalizadas
export const shadows = {
  glow: '0 0 30px rgba(0, 246, 255, 0.5)',
  card: '0 8px 32px rgba(0, 0, 0, 0.4)',
  button: '0 4px 14px 0 rgba(72, 112, 255, 0.3)',
};

// Animaciones
export const animations = {
  fadeIn: {
    animation: 'fadeIn 0.6s ease-in-out',
    '@keyframes fadeIn': {
      from: { opacity: 0, transform: 'translateY(20px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
  },
  slideIn: {
    animation: 'slideIn 0.5s ease-out',
    '@keyframes slideIn': {
      from: { transform: 'translateX(-100%)' },
      to: { transform: 'translateX(0)' },
    },
  },
  pulse: {
    animation: 'pulse 2s infinite',
    '@keyframes pulse': {
      '0%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.05)' },
      '100%': { transform: 'scale(1)' },
    },
  },
};

export default theme;