import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#64FFDA',
      light: '#9FFFEA',
      dark: '#00E5B0',
      contrastText: '#0A192F',
    },
    secondary: {
      main: '#7B5CFF',
      light: '#A48CFF',
      dark: '#5A3FD4',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#0A192F',
      paper: '#112240',
      card: 'rgba(17, 34, 64, 0.8)',
      cardHover: 'rgba(17, 34, 64, 0.95)',
      darkGradient: 'linear-gradient(135deg, #0A192F 0%, #112240 100%)',
      lightGradient: 'linear-gradient(135deg, #112240 0%, #1D3B6F 100%)',
    },
    text: {
      primary: '#E6F1FF',
      secondary: '#8892B0',
      accent: '#64FFDA',
      muted: 'rgba(136, 146, 176, 0.8)',
    },
    success: {
      main: '#36E2B4',
      light: '#7EEFD1',
      dark: '#00B389',
      contrastText: '#112240',
    },
    warning: {
      main: '#FFB86C',
      light: '#FFCF9E',
      dark: '#F5943C',
      contrastText: '#112240',
    },
    error: {
      main: '#FF5555',
      light: '#FF8A8A',
      dark: '#E53935',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#8BE9FD',
      light: '#B2F2FE',
      dark: '#59DFFC',
      contrastText: '#112240',
    },
    divider: 'rgba(136, 146, 176, 0.15)',
    action: {
      active: '#64FFDA',
      hover: 'rgba(100, 255, 218, 0.12)',
      selected: 'rgba(100, 255, 218, 0.2)',
      disabled: 'rgba(136, 146, 176, 0.5)',
      disabledBackground: 'rgba(136, 146, 176, 0.12)',
    }
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.01562em',
      color: '#E6F1FF',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.00833em',
      color: '#E6F1FF',
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      letterSpacing: '0em',
      color: '#E6F1FF',
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '0.00735em',
      color: '#E6F1FF',
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '0em',
      color: '#E6F1FF',
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      letterSpacing: '0.0075em',
      color: '#E6F1FF',
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      letterSpacing: '0.00938em',
      color: '#8892B0',
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      letterSpacing: '0.00714em',
      color: '#8892B0',
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      letterSpacing: '0.00938em',
      color: '#8892B0',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      letterSpacing: '0.01071em',
      color: '#8892B0',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      letterSpacing: '0.02857em',
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      letterSpacing: '0.03333em',
      color: 'rgba(136, 146, 176, 0.8)',
      lineHeight: 1.5,
    },
    overline: {
      fontSize: '0.625rem',
      fontWeight: 400,
      letterSpacing: '0.08333em',
      textTransform: 'uppercase',
      color: 'rgba(136, 146, 176, 0.8)',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0, 0, 0, 0.2)',
    '0px 4px 8px rgba(0, 0, 0, 0.2)',
    '0px 6px 12px rgba(0, 0, 0, 0.2)',
    '0px 8px 16px rgba(0, 0, 0, 0.2)',
    '0px 10px 20px rgba(0, 0, 0, 0.2)',
    '0px 12px 24px rgba(0, 0, 0, 0.2)',
    '0px 14px 28px rgba(0, 0, 0, 0.2)',
    '0px 16px 32px rgba(0, 0, 0, 0.2)',
    '0px 18px 36px rgba(0, 0, 0, 0.2)',
    '0px 20px 40px rgba(0, 0, 0, 0.2)',
    '0px 22px 44px rgba(0, 0, 0, 0.2)',
    '0px 24px 48px rgba(0, 0, 0, 0.2)',
    '0px 26px 52px rgba(0, 0, 0, 0.2)',
    '0px 28px 56px rgba(0, 0, 0, 0.2)',
    '0px 30px 60px rgba(0, 0, 0, 0.2)',
    '0px 32px 64px rgba(0, 0, 0, 0.2)',
    '0px 34px 68px rgba(0, 0, 0, 0.2)',
    '0px 36px 72px rgba(0, 0, 0, 0.2)',
    '0px 38px 76px rgba(0, 0, 0, 0.2)',
    '0px 40px 80px rgba(0, 0, 0, 0.2)',
    '0px 42px 84px rgba(0, 0, 0, 0.2)',
    '0px 44px 88px rgba(0, 0, 0, 0.2)',
    '0px 46px 92px rgba(0, 0, 0, 0.2)',
    '0px 48px 96px rgba(0, 0, 0, 0.2)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#0A192F',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#8892B0',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#64FFDA',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(17, 34, 64, 0.8)',
          backdropFilter: 'blur(8px)',
          borderRadius: 12,
          border: '1px solid rgba(100, 255, 218, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            borderColor: 'rgba(100, 255, 218, 0.2)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(10, 25, 47, 0.8)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(100, 255, 218, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          },
        },
        outlined: {
          borderWidth: '1px',
          '&:hover': {
            borderWidth: '1px',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(100, 255, 218, 0.1)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 8,
          backgroundColor: 'rgba(100, 255, 218, 0.1)',
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        circle: {
          strokeLinecap: 'round',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(17, 34, 64, 0.95)',
          border: '1px solid rgba(100, 255, 218, 0.2)',
          borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
          fontSize: '0.75rem',
          padding: '8px 12px',
        },
        arrow: {
          color: 'rgba(17, 34, 64, 0.95)',
        },
      },
    },
  },
});
