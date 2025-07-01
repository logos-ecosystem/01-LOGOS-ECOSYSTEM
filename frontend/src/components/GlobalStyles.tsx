import { GlobalStyles as MuiGlobalStyles } from '@mui/material';

const GlobalStyles = () => {
  return (
    <MuiGlobalStyles
      styles={{
        ':root': {
          '--primary': '#4870FF',
          '--secondary': '#00F6FF',
          '--accent': '#FFD700',
          '--bg-dark': '#0A0E21',
          '--bg-light': '#F8F9FD',
          '--surface-dark': '#131729',
          '--surface-light': '#FFFFFF',
          '--text-dark': '#FFFFFF',
          '--text-light': '#1A1A2E',
        },
        'html, body': {
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
        },
        body: {
          backgroundColor: 'var(--bg-dark)',
          color: 'var(--text-dark)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          minHeight: '100vh',
          position: 'relative',
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(72, 112, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(0, 246, 255, 0.1) 0%, transparent 50%)
          `,
        },
        'body.light-mode': {
          backgroundColor: 'var(--bg-light)',
          color: 'var(--text-light)',
        },
        a: {
          color: 'inherit',
          textDecoration: 'none',
        },
        '*': {
          boxSizing: 'border-box',
        },
        // Override Material-UI defaults
        '.MuiCssBaseline-root': {
          backgroundColor: 'transparent !important',
        },
        // Ensure header is visible
        header: {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'rgba(10, 14, 33, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(72, 112, 255, 0.2)',
        },
        main: {
          paddingTop: '80px',
          minHeight: '100vh',
        },
        // Animation keyframes
        '@keyframes pulse': {
          '0%': { opacity: 0.4 },
          '50%': { opacity: 1 },
          '100%': { opacity: 0.4 },
        },
        '@keyframes spin': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        '@keyframes gradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        '@keyframes glow': {
          '0%': { boxShadow: '0 0 5px var(--primary)' },
          '50%': { boxShadow: '0 0 20px var(--primary), 0 0 30px var(--secondary)' },
          '100%': { boxShadow: '0 0 5px var(--primary)' },
        },
      }}
    />
  );
};

export default GlobalStyles;