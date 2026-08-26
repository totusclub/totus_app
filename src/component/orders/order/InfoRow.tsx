import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { AppText, AppIcon } from '../../UI';
import { useTheme } from '../../../hooks/useTheme';

type InfoRowProps = {
  label: string;
  value: string;
  rightValue?: string;
  showArrow?: boolean;
  onPress?: () => void;
};

const InfoRow: React.FC<InfoRowProps> = ({ label, value, rightValue, showArrow, onPress }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={styles.infoRow}
      activeOpacity={showArrow || onPress ? 0.7 : 1}
      disabled={!showArrow && !onPress}
      onPress={onPress}>
      <View style={styles.infoRowContent}>
        <View style={styles.infoRowLeft}>
          <AppText style={[styles.infoLabel, { color: theme.textTertiary }]}>{label}</AppText>
          <View style={styles.infoValueContainer}>
            <AppText style={[styles.infoValue, { color: theme.text }]}>{value}</AppText>
            {rightValue && <AppText style={[styles.infoRightValue, { color: theme.text }]}>{rightValue}</AppText>}
          </View>
        </View>
        {showArrow && (
          <View style={styles.arrowContainer}>
            <AppIcon name="simpleArrow" size={20} color={theme.text} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default InfoRow;

const styles = StyleSheet.create({
  infoRow: {
    paddingVertical: 12,
  },
  infoRowContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRowLeft: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 4,
  },
  infoValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    flex: 1,
  },
  infoRightValue: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  arrowContainer: {
    transform: [{ rotate: '-180deg' }],
  },
});

