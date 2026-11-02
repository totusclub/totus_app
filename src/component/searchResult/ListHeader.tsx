import React from 'react';
import { AppText, AppIcon } from "../UI";
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from '../../hooks/useTheme';

type ListHeaderProps = {
  selectedSortLabel: string;
  resultCount: number;
  resultText?: string;
  /**
   * Поиск ещё идёт: «Ищем ещё у N операторов» (макет «Выдача: индикатор загрузки», 02.11.2026).
   * Телефон — отдельной полосой под строкой сортировки (в одну строку не помещалось и
   * обрезалось), iPad — плашкой справа от «Найдено N отелей». Без него — как раньше.
   */
  searchingText?: string;
  onSortPress: () => void;
  /** iPad (Figma): brand-colored sort label 16/500, count 14; no shadow pill. */
  tablet?: boolean;
};

/** Тёмный оранжевый текст на светлой плашке — читается лучше бренда; в тёмной теме — бренд. */
const SEARCHING_TEXT_LIGHT = '#9A3D0C';

export const ListHeader: React.FC<ListHeaderProps> = ({
  selectedSortLabel,
  resultCount,
  resultText,
  searchingText,
  onSortPress,
  tablet = false,
}) => {
  const { theme } = useTheme();
  const sortColor = tablet ? theme.brand : theme.text;
  const countText = resultText || `Найдено ${resultCount} отелей`;
  const searchingColor = theme.mode === 'dark' ? theme.brand : SEARCHING_TEXT_LIGHT;
  const searchingBadge = searchingText ? (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      style={[tablet ? styles.searchingPill : styles.searchingStrip, { backgroundColor: theme.brand + '1A' }]}>
      <ActivityIndicator size="small" color={theme.brand} />
      <AppText style={[styles.searchingText, { color: searchingColor }]} numberOfLines={1}>
        {searchingText}
      </AppText>
    </View>
  ) : null;

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        style={[styles.sortButton, tablet && styles.sortButtonTablet]}
        activeOpacity={0.7}
        onPress={onSortPress}
      >
        <AppText style={[styles.sortButtonText, tablet && styles.sortButtonTextTablet, { color: sortColor }]}>{selectedSortLabel}</AppText>
        <AppIcon name="arrowDown" size={16} color={sortColor} />
      </TouchableOpacity>

      {tablet && searchingBadge ? (
        <View style={styles.countRowTablet}>
          <AppText style={[styles.resultCount, styles.resultCountTablet, { color: theme.textTertiary }]}>
            {countText}
          </AppText>
          {searchingBadge}
        </View>
      ) : (
        <AppText style={[styles.resultCount, tablet && styles.resultCountTablet, { color: theme.textTertiary }]}>
          {countText}
        </AppText>
      )}
    </View>
  );

  if (!tablet && searchingBadge) {
    return (
      <View style={styles.phoneStack}>
        {header}
        {searchingBadge}
      </View>
    );
  }
  return header;
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
  phoneStack: {
    gap: 8,
  },
  searchingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  countRowTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  searchingText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
