import { createTheme, responsiveFontSizes } from '@mui/material/styles';

let theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#f4f4f5',
    },
    secondary: {
      main: '#f5c542',
    },
    error: {
      main: '#ef4444',
    },
    background: {
      default: '#07080a',
      paper: '#101216',
    },
    text: {
      primary: '#f4f4f5',
      secondary: '#a1a1aa',
    },
  },

  typography: {
    fontFamily: `"Noto Sans SC", "Avenir Next", "Segoe UI", sans-serif`,
    h1: { fontWeight: 900, letterSpacing: '-0.06em' },
    h2: { fontWeight: 900, letterSpacing: '-0.06em' },
    h3: { fontWeight: 900, letterSpacing: '-0.06em' },
    h4: { fontWeight: 900, letterSpacing: '-0.05em' },
    h5: { fontWeight: 900, letterSpacing: '-0.04em' },
    h6: { fontWeight: 900 },
    button: { fontWeight: 900, letterSpacing: '0.08em' },
  },

  shape: {
    borderRadius: 0,
  },
});

theme = responsiveFontSizes(theme);

export default theme;
