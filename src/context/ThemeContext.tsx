import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, Theme, ThemeMode } from '../theme';

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const defaultTheme: Theme = lightTheme;

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme_mode';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const initialColorScheme = Appearance.getColorScheme() || 'light';
  const [mode, setMode] = useState<ThemeMode>('system');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    initialColorScheme
  );

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
          setMode(savedMode as ThemeMode);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };

    loadThemePreference();
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  const getCurrentTheme = useCallback((): Theme => {
    if (mode === 'system') {
      return (systemColorScheme === 'dark' ? darkTheme : lightTheme) as Theme;
    }
    return (mode === 'dark' ? darkTheme : lightTheme) as Theme;
  }, [mode, systemColorScheme]);

  const theme = useMemo(() => getCurrentTheme(), [getCurrentTheme]);
  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemColorScheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, systemColorScheme]);

  const toggleTheme = useCallback(() => {
    const newMode: ThemeMode = isDark ? 'light' : 'dark';
    setMode(newMode);

    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch((error) => {
      console.error('Error saving theme preference:', error);
    });
  }, [isDark]);

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);

    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch((error) => {
      console.error('Error saving theme preference:', error);
    });
  }, []);

  const value: ThemeContextType = useMemo(() => ({
    theme,
    mode,
    isDark,
    toggleTheme,
    setThemeMode,
  }), [theme, mode, isDark, toggleTheme, setThemeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    console.warn('useThemeContext must be used within a ThemeProvider. Falling back to default theme.');
    return {
      theme: defaultTheme,
      mode: 'light',
      isDark: false,
      toggleTheme: () => { },
      setThemeMode: () => { },
    };
  }
  return context;
};

