import { lightTheme } from './light';
import { darkTheme } from './dark';

export type Theme = typeof lightTheme | typeof darkTheme;
export type ThemeMode = 'light' | 'dark' | 'system';

export { lightTheme, darkTheme };

