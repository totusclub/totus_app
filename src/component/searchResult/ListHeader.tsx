import React from 'react';
import { AppText, AppIcon } from "../UI";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from '../../hooks/useTheme';

type ListHeaderProps = {
  selectedSortLabel: string;
  resultCount: number;
  resultText?: string;
  onSortPress: () => void;
  /** iPad (Figma): brand-colored sort label 16/500, count 14; no shadow pill. */
  tablet?: boolean;
};

export const ListHeader: React.FC<ListHeaderProps> = ({
  selectedSortLabel,
  resultCount,
  resultText,
  onSortPress,
  tablet = false,
}) => {
  const { theme } = useTheme();
  const sortColor = tablet ? theme.brand : theme.text;
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={[styles.sortButton, tablet && styles.sortButtonTablet]}
        activeOpacity={0.7}
        onPress={onSortPress}
      >
        <AppText style={[styles.sortButtonText, tablet && styles.sortButtonTextTablet, { color: sortColor }]}>{selectedSortLabel}</AppText>
        <AppIcon name="arrowDown" size={16} color={sortColor} />
      </TouchableOpacity>

      <AppText style={[styles.resultCount, tablet && styles.resultCountTablet, { color: theme.textTertiary }]}>
        {resultText || `Найдено ${resultCount} отелей`}
      </AppText>
    </View>
  );
};

export default ListHeader;

const styles = StyleSheet.create({

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 0,
  },
  sortButtonText: {
    fontSize: 14,
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  sortButtonTablet: {
    paddingHorizontal: 0,
    paddingVertical: 8,
    shadowOpacity: 0,
  },
  sortButtonTextTablet: {
    fontSize: 16,
    fontWeight: '500',
  },
  resultCountTablet: {
    fontSize: 14,
    fontWeight: '400',
  },
});
