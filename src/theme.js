import { createTheme } from '@mui/material/styles';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#6C63FF', // Elegant purple
      contrastText: '#fff',
    },
    secondary: {
      main: '#FF6584', // Vibrant pink
    },
    background: {
      default: '#f4f7fa',
      paper: '#fff',
    },
    success: {
      main: '#43d39e',
    },
    info: {
      main: '#3b82f6',
    },
    warning: {
      main: '#ffb200',
    },
    error: {
      main: '#ff4d4f',
    },
    text: {
      primary: '#22223b',
      secondary: '#4a4e69',
    },
  },
  typography: {
    fontFamily: 'Poppins, Arial, sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-1.5px',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-1px',
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-1px',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.5px',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.5px',
    },
  },
  shape: {
    borderRadius: 18,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontSize: '1.1rem',
          boxShadow: '0 2px 8px 0 rgba(108,99,255,0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 22,
          boxShadow: '0 4px 24px 0 rgba(60,72,100,0.10)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          marginBottom: 22,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 22,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          background: '#6C63FF',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: '#fff',
          fontWeight: 700,
          fontSize: '1.1rem',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
  },
});

export default theme; 