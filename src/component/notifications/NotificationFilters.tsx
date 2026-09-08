import React from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {AppText} from '../UI';
import {useTheme} from '../../hooks/useTheme';
import type {NotificationCategory} from '../../modules/api/notifications';
import {NOTIFICATION_FILTERS, PUSH_TEXTS} from '../../modules/push/pushConstants';
import {NotificationGlyph} from './CategoryIcon';

type Props = {
  value: NotificationCategory | null;
  onChange: (category: NotificationCategory | null) => void;
  /** Показывать кнопку «Прочитать все» (есть непрочитанные). */
  canReadAll: boolean;
  onReadAll: () => void;
};

/**
 * Ряд чипов-фильтров (горизонтальный скролл): «Все» — brand с белым текстом,
 * остальные — серые (#F5F5F5 / Dark #1A1A1A); справа кнопка «Прочитать все».
 */
const NotificationFilters: React.FC<Props> = ({value, onChange, canReadAll, onReadAll}) => {
  const {theme} = useTheme();
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        keyboardShouldPersistTaps="handled">
        {NOTIFICATION_FILTERS.map(filter => {
          const active = filter.key === 'all' ? value === null : value === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              onPress={() => onChange(filter.key === 'all' ? null : filter.key)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{selected: active}}
              style={[
                styles.chip,
                {backgroundColor: active ? theme.brand : theme.backgroundSecondary},
              ]}>
              <AppText
                style={[styles.chipText, {color: active ? '#FFFFFF' : theme.text}]}
                numberOfLines={1}>
                {filter.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {canReadAll ? (
        <TouchableOpacity
          onPress={onReadAll}
          activeOpacity={0.7}
          style={styles.readAll}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
          accessibilityRole="button">
          <NotificationGlyph kind="check" size={16} color={theme.brand} />
          <AppText style={[styles.readAllText, {color: theme.brand}]}>{PUSH_TEXTS.readAll}</AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  chips: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  readAll: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  readAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default NotificationFilters;
