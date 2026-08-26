import { brandColor, successColor, errorColor, warningColor, transparent } from './colors';

export const darkTheme = {
  mode: 'dark' as const,

  // Brand color (never changes)
  brand: brandColor,
  success: successColor,
  error: errorColor,
  warning: warningColor,

  // Background colors
  background: '#000000',
  // Secondary background – used for cards / secondary screens like favorites
  backgroundSecondary: '#1A1A1A',
  backgroundTertiary: '#2A2A2A',

  // Surface colors
  surface: '#1A1A1A',
  surfaceSecondary: '#242424',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#E0E0E0',
  textTertiary: '#B0B0B0',
  textDisabled: '#707070',
  textInverse: '#1F1F1F',

  // Border colors
  borderDark: '#5A5A5A',
  border: '#3A3A3A',
  borderSecondary: '#2A2A2A',
  borderLight: '#1A1A1A',

  // Shadow colors
  shadow: '#000000',

  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.8)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Status bar
  statusBar: 'light-content' as const,
  statusBarBackground: '#000000',

  // Navigation
  navigationBackground: '#000000',
  tabBarActive: brandColor,
  tabBarInactive: '#B0B0B0',

  // Card colors
  cardBackground: '#000000',
  cardBorder: '#3A3A3A',

  // Input colors
  inputBackground: '#1A1A1A',
  inputBorder: '#3A3A3A',
  inputText: '#FFFFFF',
  inputPlaceholder: '#B0B0B0',

  // Divider
  divider: '#3A3A3A',

  // Fonts (for React Navigation)
  fonts: {
    regular: 'Golos Text',
    medium: 'Golos Text',
    bold: 'Golos Text',
    heavy: 'Golos Text',
  },

  // Transparent
  transparent,
};

export type DarkTheme = typeof darkTheme;

