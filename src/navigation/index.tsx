import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './authStack';
import { useThemeContext } from '../context/ThemeContext';
import { navigationRef } from './navigationRef';

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
            fontWeight: '400',
          },
          medium: {
            fontFamily: theme.fonts.medium,
            fontWeight: '500',
          },
          bold: {
            fontFamily: theme.fonts.bold,
            fontWeight: '700',
          },
          heavy: {
            fontFamily: theme.fonts.heavy,
            fontWeight: '800',
          },
        },
      }}>
      <AuthStack />
    </NavigationContainer>
  );
}
