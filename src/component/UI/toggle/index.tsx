import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import AppText from '../text';
import { useTheme } from '../../../hooks/useTheme';

type ToggleProps = {
  label: string;
  value: boolean;
  onToggle: () => void;
};

const Toggle: React.FC<ToggleProps> = ({ label, value, onToggle }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.toggleRow}>
      <AppText style={[styles.toggleLabel, { color: theme.text }]}>{label}</AppText>
      <TouchableOpacity
        style={[
          styles.toggleSwitch,
          { backgroundColor: theme.borderSecondary },
          value && { backgroundColor: theme.brand },
        ]}
        onPress={onToggle}
        activeOpacity={1}>
        <View
          style={[
            styles.toggleCircle,
            { backgroundColor: theme.textInverse },
            value && styles.toggleCircleActive,
          ]}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
});

export default Toggle;

