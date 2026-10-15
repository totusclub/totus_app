import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppIcon, AppText } from '../../UI';
import { useTheme } from '../../../hooks/useTheme';
import {
  getTotusBookingBanner,
  getTotusBookingPalette,
  getTotusBookingTone,
  type TotusBooking,
} from '../../../utils/totusBooking';

type Props = {
  booking: TotusBooking;
  /** Переопределить заголовок/текст (например, на экране «Оплата прошла»). */
  title?: string;
  text?: string;
  /** Компактный вариант для карточки в списке заказов (только текст). */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TONE_ICON: Record<string, string> = {
  pending: 'info',
  success: 'checkmark',
  danger: 'warning',
  info: 'info',
  neutral: 'info',
};

/**
 * Цветной баннер статуса внутреннего бронирования (жёлтый «Проверяем» / зелёный «Подтверждено» /
 * красный «Отклонено») — макеты «ROOMS · Bookings · iPhone».
 */
const TotusBookingBanner: React.FC<Props> = ({ booking, title, text, compact = false, style }) => {
  const { theme } = useTheme();
  const tone = getTotusBookingTone(booking.status);
  const palette = getTotusBookingPalette(booking.status, theme);
  const content = getTotusBookingBanner(booking);
  const finalTitle = title ?? content.title;
  const finalText = text ?? content.text;

  return (
    <View
      style={[styles.banner, compact && styles.bannerCompact, { backgroundColor: palette.bg }, style]}
      accessibilityRole="text">
      <View style={styles.iconWrap}>
        <AppIcon name={TONE_ICON[tone] ?? 'info'} size={compact ? 16 : 20} color={palette.fg} accent={false} />
      </View>
      <View style={styles.body}>
        {!compact && !!finalTitle && (
          <AppText style={[styles.title, { color: theme.text }]}>{finalTitle}</AppText>
        )}
        {!!finalText && (
          <AppText
            style={[
              compact ? styles.textCompact : styles.text,
              { color: compact ? theme.text : theme.textSecondary },
            ]}>
            {finalText}
          </AppText>
        )}
      </View>
    </View>
  );
};

export default TotusBookingBanner;

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  bannerCompact: {
    paddingVertical: 10,
    borderRadius: 10,
  },
  iconWrap: {
    paddingTop: 1,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
  },
  textCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
});
