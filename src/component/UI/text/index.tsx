import React, { ReactNode, useContext } from 'react';
import { StyleProp, StyleSheet, Text, TextProps, TextStyle } from 'react-native';
import { resolveAppFont } from '../../../theme/fonts';
import { InheritedFontContext } from './FontText';

interface AppTextProps extends TextProps {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}

const AppText: React.FC<AppTextProps> = ({ children, style, ...props }) => {
  // Шрифт приложения (Museo / Forum) по начертанию из стиля — см. theme/fonts.ts
  const inherited = useContext(InheritedFontContext);
  const resolved = resolveAppFont([styles.text, style], inherited);
  return (
    <InheritedFontContext.Provider value={resolved.inherited}>
      <Text allowFontScaling={false} style={resolved.style} {...props}>
        {children}
      </Text>
    </InheritedFontContext.Provider>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    color: '#1f1f1f',
    // fontFamily не задаём: Museo по fontWeight или Forum внутри заголовка — resolveAppFont
    letterSpacing: -0.2

  },
});

export default AppText;
