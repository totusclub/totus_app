import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import AppText from '../text';
import SbpLogo from './SbpLogo';

type Props = {
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
};

const SbpPayButton = ({
  onPress,
  loading = false,
  disabled = false,
  label = 'Оплатить',
  loadingLabel = 'Создаём QR-код...',
}: Props) => {
  const isDisabled = disabled || loading;

  const handlePress = useCallback(() => {
    if (!isDisabled) onPress?.();
  }, [isDisabled, onPress]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      disabled={isDisabled}
      style={[styles.button, isDisabled && styles.buttonDisabled]}>
      {loading ? (
        <>
          <ActivityIndicator color="#FFFFFF" size="small" />
          <AppText style={styles.label}>{loadingLabel}</AppText>
        </>
      ) : (
        <>
          <AppText style={styles.label}>{label}</AppText>
          <View style={styles.badge}>
            <SbpLogo size={28} />
            <AppText style={styles.badgeText}>сбп</AppText>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
};

export default SbpPayButton;

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#1D1346',
    shadowColor: '#1D1346',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  label: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 4,
    paddingLeft: 6,
    paddingRight: 10,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#5B57A2',
  },
});
