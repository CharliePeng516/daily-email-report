'use client';

import { createTheme } from '@mui/material/styles';

// Chrome accent (steel-blue) is deliberately distinct from every hue already
// claimed by CATEGORY_META / PRIORITY_META — it must never be mistaken for a
// category or priority color, only for structure: nav, links, focus, primary
// actions.
const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#3E5C76' },
        background: { default: '#EEF1EC', paper: '#F7F8F4' },
        divider: '#D7DBD1',
      },
    },
    dark: {
      palette: {
        primary: { main: '#8FB2D6' },
        background: { default: '#10141B', paper: '#161B24' },
        divider: '#262C35',
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
});

export default theme;
