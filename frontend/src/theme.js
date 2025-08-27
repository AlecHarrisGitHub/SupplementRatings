// frontend/src/theme.js

import { createTheme } from '@mui/material/styles';

// A clean, minimalist palette with soft contrast
const primary = {
  main: '#1E88E5',
  light: '#64B5F6',
  dark: '#1565C0',
  contrastText: '#FFFFFF'
};

const neutral = {
  50: '#F7F8FA',
  100: '#EFF2F6',
  200: '#E3E8EF',
  300: '#CDD5DF',
  400: '#9AA4B2',
  500: '#697586',
  600: '#4B5565',
  700: '#364152',
  800: '#202939',
  900: '#111827'
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary,
    secondary: {
      main: '#7C4DFF',
      light: '#B388FF',
      dark: '#651FFF',
      contrastText: '#FFFFFF'
    },
    background: {
      default: neutral[50],
      paper: '#FFFFFF'
    },
    divider: neutral[200],
    text: {
      primary: neutral[800],
      secondary: neutral[600]
    }
  },
  shape: {
    borderRadius: 12
  },
  typography: {
    fontFamily: [
      'Inter',
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'Roboto',
      'Helvetica',
      'Arial',
      'sans-serif'
    ].join(','),
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: neutral[50]
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: `1px solid ${neutral[200]}`
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10
        },
        containedPrimary: {
          boxShadow: '0 6px 14px rgba(30,136,229,0.25)'
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined'
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 6px 20px rgba(0,0,0,0.10)'
        }
      }
    }
  }
});

export default theme;


