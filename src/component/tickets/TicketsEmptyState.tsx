import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppButton, AppText } from '../UI';
import EmptyCityIcon from '../UI/icons/emptyCity';
import { useTheme } from '../../hooks/useTheme';
import { FONT_HEADING } from '../../theme/fonts';

type TicketsEmptyStateProps = {
  /** True when user has active ticket filters that can be cleared. */
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  onRetry?: () => void;
  /** Сбой загрузки (сеть, таймаут, туроператор) — показать причину вместо «нет вариантов». */
  errorMessage?: string | null;
};

/**
 * Zero-result screen for the tickets list. Failures are presented as
 * "no variants found" instead of a technical error, matching kedam-WEB copy tone.
 */
const TicketsEmptyState: React.FC<TicketsEmptyStateProps> = ({
  hasActiveFilters = false,
  onResetFilters,
  onRetry,
  errorMessage,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const failed = Boolean(errorMessage);
  const body = failed
    ? String(errorMessage)
    : hasActiveFilters
      ? 'По выбранным фильтрам нет подходящих перелётов. Попробуйте изменить параметры или сбросить фильтры.'
      : 'На эти даты пока нет доступных вариантов перелёта. Попробуйте обновить результаты или выбрать другой тур.';

  const primaryTitle = failed ? 'Повторить' : hasActiveFilters ? 'Сбросить фильтры' : 'Обновить';

  const handlePrimary = () => {
    if (!failed && hasActiveFilters && onResetFilters) {
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
          {failed ? 'Не удалось загрузить перелёты' : 'Перелёты не найдены'}
        </AppText>
        <AppText style={[styles.message, { color: theme.textTertiary }]}>
          {body}
        </AppText>
        <AppButton title={primaryTitle} onPress={handlePrimary} size="large" />
        <View style={styles.secondary}>
          <AppButton
            title={!failed && hasActiveFilters ? 'Обновить' : 'Вернуться назад'}
            type="outline"
            onPress={() =>
              !failed && hasActiveFilters ? onRetry?.() : navigation.goBack()
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
    fontFamily: FONT_HEADING,
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
