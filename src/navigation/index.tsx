import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './authStack';
import { useThemeContext } from '../context/ThemeContext';
import { navigationRef } from './navigationRef';
import YandexAuthBridge from '../modules/auth/YandexAuthBridge';

export default function Navigation(): React.JSX.Element {
  const { theme, isDark } = useThemeContext();

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        dark: isDark,
        colors: {
          primary: theme.brand,
          background: theme.background,
          card: theme.surface,
          text: theme.text,
          border: theme.border,
          notification: theme.brand,
        },
        fonts: {
          regular: {
            fontFamily: theme.fonts.regular,
            fontWeight: '400', // начертание — в самом файле шрифта (theme/fonts.ts)
          },
          medium: {
            fontFamily: theme.fonts.medium,
            fontWeight: '400', // начертание — в самом файле шрифта (theme/fonts.ts)
          },
          bold: {
            fontFamily: theme.fonts.bold,
            fontWeight: '400', // начертание — в самом файле шрифта (theme/fonts.ts)
          },
          heavy: {
            fontFamily: theme.fonts.heavy,
            fontWeight: '400', // начертание — в самом файле шрифта (theme/fonts.ts)
          },
        },
      }}>
      <AuthStack />
      {/* Возврат из браузера после входа через Яндекс ID (deep link totus://auth/yandex) */}
      <YandexAuthBridge />
    </NavigationContainer>
  );
}
