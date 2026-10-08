import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

interface AppTextProps extends TextProps {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}

const AppText: React.FC<AppTextProps> = ({ children, style, ...props }) => {
  return (
    <Text allowFontScaling={false} style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    color: '#1f1f1f',
    fontFamily: 'Golos Text',
    letterSpacing: -0.2

  },
});

export default AppText;
