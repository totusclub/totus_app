import { brandColor, successColor, errorColor, warningColor, transparent } from './colors';
import { FONT_TEXT } from './fontNames';

export const lightTheme = {
  mode: 'light' as const,

  // Brand color (never changes)
  brand: brandColor,
  success: successColor,
  error: errorColor,
  warning: warningColor,

  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  backgroundTertiary: '#E4E4E4',

  // Surface colors
  surface: '#FFFFFF',
  surfaceSecondary: '#F9F9F9',

  // Text colors
  text: '#1F1F1F',
  textSecondary: '#3D3D3D',
  textTertiary: '#7A7A7A',
  textDisabled: '#B8B8B8',
  textInverse: '#FFFFFF',

  // Border colors
  borderDark: '#B8B8B8',
  border: '#E0E0E0',
  borderSecondary: '#E4E4E4',
  borderLight: '#F5F5F5',

  // Shadow colors
  shadow: '#000000',

  // Overlay colors
  overlay: 'rgba(31, 31, 31, 0.58)',
  overlayLight: 'rgba(0, 0, 0, 0.1)',

  // Status bar
  statusBar: 'dark-content' as const,
  statusBarBackground: '#FFFFFF',

  // Navigation
  navigationBackground: '#FFFFFF',
  tabBarActive: brandColor,
  tabBarInactive: '#000000',

  // Card colors
  cardBackground: '#FFFFFF',
  cardBorder: '#FFFFFF',

  // Input colors
  inputBackground: '#FFFFFF',
  inputBorder: '#E0E0E0',
  inputText: '#1F1F1F',
  inputPlaceholder: '#7A7A7A',

  // Divider
  divider: '#E4E4E4',

  // Fonts (for React Navigation) — Museo Sans Cyrl, начертание задаётся файлом (theme/fonts.ts)
  fonts: {
    regular: FONT_TEXT.regular,
    medium: FONT_TEXT.regular,
    bold: FONT_TEXT.bold,
    heavy: FONT_TEXT.black,
  },

  // Transparent
  transparent,
};

export type LightTheme = typeof lightTheme;

