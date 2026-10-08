import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import { Appearance, ColorSchemeName, Platform } from 'react-native';
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

// Тема: «Светлая», «Тёмная» или «Системная» (по умолчанию — как в настройках телефона).
// Новый ключ: прежний переключатель сохранял только light/dark — после обновления у всех «Системная».
const THEME_STORAGE_KEY = '@app_theme_mode_v2';
const LEGACY_THEME_STORAGE_KEY = '@app_theme_mode';

const parseThemeMode = (value: unknown): ThemeMode =>
  value === 'light' || value === 'dark' ? value : 'system';

/**
 * iOS: системные элементы (клавиатура, Alert, выбор даты) — в выбранной теме приложения.
 * null — снова как в системе. Android не трогаем: там это пересоздаёт окна звонка (IncomingCallActivity).
 */
const applyNativeColorScheme = (mode: ThemeMode) => {
  if (Platform.OS !== 'ios' || typeof Appearance.setColorScheme !== 'function') return;
  try {
    Appearance.setColorScheme(mode === 'system' ? null : mode);
  } catch {
    // старый React Native без setColorScheme — системные элементы следуют теме устройства
  }
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const initialColorScheme = Appearance.getColorScheme() || 'light';
  const [mode, setMode] = useState<ThemeMode>('system');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    initialColorScheme
  );
  // При ручной теме на iOS Appearance сообщает выбранную тему, а не системную — её не запоминаем
  const modeRef = useRef<ThemeMode>('system');

  const applyMode = useCallback((nextMode: ThemeMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
    applyNativeColorScheme(nextMode);
    if (nextMode === 'system') {
      setSystemColorScheme(Appearance.getColorScheme() || 'light');
    }
  }, []);

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        applyMode(parseThemeMode(savedMode));
        AsyncStorage.removeItem(LEGACY_THEME_STORAGE_KEY).catch(() => undefined);
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };

    loadThemePreference();
  }, [applyMode]);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (modeRef.current === 'system') {
        setSystemColorScheme(colorScheme);
      }
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

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    const nextMode = parseThemeMode(newMode);
    applyMode(nextMode);

    const save = nextMode === 'system'
      ? AsyncStorage.removeItem(THEME_STORAGE_KEY)
      : AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
    save.catch((error) => {
      console.error('Error saving theme preference:', error);
    });
  }, [applyMode]);

  const toggleTheme = useCallback(() => {
    setThemeMode(isDark ? 'light' : 'dark');
  }, [isDark, setThemeMode]);

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
      mode: 'system',
      isDark: false,
      toggleTheme: () => { },
      setThemeMode: () => { },
    };
  }
  return context;
};

