import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppButton, AppText } from '../UI';
import EmptyCityIcon from '../UI/icons/emptyCity';
import { useTheme } from '../../hooks/useTheme';

type TicketsEmptyStateProps = {
  /** True when user has active ticket filters that can be cleared. */
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  onRetry?: () => void;
};

/**
 * Zero-result screen for the tickets list. Failures are presented as
 * "no variants found" instead of a technical error, matching kedam-WEB copy tone.
 */
const TicketsEmptyState: React.FC<TicketsEmptyStateProps> = ({
  hasActiveFilters = false,
  onResetFilters,
  onRetry,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const body = hasActiveFilters
    ? 'По выбранным фильтрам нет подходящих перелётов. Попробуйте изменить параметры или сбросить фильтры.'
    : 'На эти даты пока нет доступных вариантов перелёта. Попробуйте обновить результаты или выбрать другой тур.';

  const primaryTitle = hasActiveFilters ? 'Сбросить фильтры' : 'Обновить';

  const handlePrimary = () => {
    if (hasActiveFilters && onResetFilters) {
      onResetFilters();
      return;
    }
    onRetry?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: theme.backgroundTertiary },
          ]}>
          <EmptyCityIcon size={72} color={theme.brand} />
        </View>
        <AppText style={[styles.title, { color: theme.text }]}>
          Перелёты не найдены
        </AppText>
        <AppText style={[styles.message, { color: theme.textTertiary }]}>
          {body}
        </AppText>
        <AppButton title={primaryTitle} onPress={handlePrimary} size="large" />
        <View style={styles.secondary}>
          <AppButton
            title={hasActiveFilters ? 'Обновить' : 'Вернуться назад'}
            type="outline"
            onPress={() =>
              hasActiveFilters ? onRetry?.() : navigation.goBack()
            }
            size="large"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    minHeight: 360,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  iconWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
  },
  secondary: {
    marginTop: 12,
    width: '100%',
  },
});

export default TicketsEmptyState;
