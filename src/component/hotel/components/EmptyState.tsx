import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../../UI';
import { useTheme } from '../../../hooks/useTheme';

type EmptyStateProps = {
  title: string;
};

export const EmptyState: React.FC<EmptyStateProps> = ({ title }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <AppText style={[styles.text, { color: theme.textTertiary }]}>{title}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
  },
});

