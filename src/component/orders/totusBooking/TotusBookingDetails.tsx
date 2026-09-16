import React, { useCallback, useMemo } from 'react';
import { Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppIcon, AppText } from '../../UI';
import { useTheme } from '../../../hooks/useTheme';
import { resolveDocumentUrl } from '../../../utils/ordersUtils';
import {
  formatTotusMoney,
  formatTotusRefundLine,
  formatTotusStayPeriod,
  getTotusBookingPalette,
  getTotusRefundAmount,
  type TotusBooking,
} from '../../../utils/totusBooking';
import TotusBookingBanner from './TotusBookingBanner';
import TotusBookingActions from './TotusBookingActions';

type Props = {
  booking: TotusBooking;
};

/** Открыть ваучер (PDF на api.totus.club) в браузере / системном просмотрщике. */
export async function openTotusVoucher(url: string | null | undefined): Promise<void> {
  const resolved = resolveDocumentUrl(url) || String(url || '').trim();
  if (!resolved) return;
  try {
    await Linking.openURL(resolved);
  } catch (e) {
    console.warn('[TotusBooking] openURL failed', e);
    Alert.alert('Не удалось открыть ваучер', 'Попробуйте позже или скачайте его в разделе «Документы».');
  }
}

/**
 * Блок статуса внутреннего бронирования на карточке заказа (макеты iPhone «Заказ — ожидает /
 * подтверждено / отклонено»): баннер, номер брони, ваучер, возврат, туроператор, кнопки.
 */
const TotusBookingDetails: React.FC<Props> = ({ booking }) => {
  const { theme } = useTheme();
  const palette = getTotusBookingPalette(booking.status, theme);
  const rejected = booking.status === 'rejected' || booking.status === 'cancelled';
  const confirmed = booking.status === 'confirmed';

  const period = useMemo(() => formatTotusStayPeriod(booking), [booking]);
  const refundLine = useMemo(() => formatTotusRefundLine(booking), [booking]);
  const refundAmount = formatTotusMoney(getTotusRefundAmount(booking));

  const handleVoucher = useCallback(() => {
    void openTotusVoucher(booking.voucher?.url);
  }, [booking.voucher?.url]);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.cardBackground, shadowColor: theme.shadow, borderColor: theme.border },
      ]}>
      <TotusBookingBanner booking={booking} />

      <View style={[styles.infoPanel, { backgroundColor: theme.backgroundSecondary }]}>
        {!!booking.hotel?.name && (
          <>
            <Row
              label="Отель"
              value={[
                booking.hotel.stars ? `${booking.hotel.name} ${booking.hotel.stars}*` : booking.hotel.name,
                booking.hotel.city,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
            <Divider />
          </>
        )}
        {!!booking.room && (
          <>
            <Row
              label="Номер"
              value={[booking.room, booking.mealName].filter(Boolean).join(' · ')}
            />
            <Divider />
          </>
        )}
        {!!period && (
          <>
            <Row label="Даты" value={period} />
            <Divider />
          </>
        )}
        <Row label="Туроператор" value={booking.operator} />

        {confirmed && !!booking.hotelBookingRef && (
          <>
            <Divider />
            <Row label="Номер брони" value={booking.hotelBookingRef} valueColor={palette.fg} />
          </>
        )}

        {rejected && (
          <>
            <Divider />
            <View style={styles.row}>
              <AppText style={[styles.label, { color: theme.textTertiary }]}>
                {booking.refund?.status === 'done' ? 'Возврат выполнен' : 'Возврат'}
              </AppText>
              <AppText style={[styles.refundAmount, { color: palette.accent }]}>
                {refundAmount || '—'}
              </AppText>
              <AppText style={[styles.hint, { color: theme.textTertiary }]}>
                {refundLine
                  ? `${refundLine} — тем же способом, которым была оплата.`
                  : 'Возврат выполним вручную в течение 1–3 дней тем же способом, которым была оплата.'}
              </AppText>
            </View>
          </>
        )}
      </View>

      {confirmed && !!booking.voucher?.url && (
        <TouchableOpacity
          style={[styles.voucherRow, { backgroundColor: theme.backgroundSecondary }]}
          activeOpacity={0.7}
          onPress={handleVoucher}
          accessibilityRole="button"
          accessibilityLabel="Открыть ваучер">
          <View style={[styles.voucherIcon, { backgroundColor: palette.bg }]}>
            <AppIcon name="document" size={22} color={palette.fg} />
          </View>
          <View style={styles.voucherBody}>
            <AppText style={[styles.voucherTitle, { color: theme.text }]}>
              {booking.voucher.title || 'Ваучер'}
            </AppText>
            <AppText style={[styles.voucherText, { color: theme.textTertiary }]}>
              Ваучер отеля (PDF)
              {booking.hotelBookingRef ? ` · бронь ${booking.hotelBookingRef}` : ''}
            </AppText>
          </View>
          <View style={styles.arrowContainer}>
            <AppIcon name="simpleArrow" size={20} color={theme.text} />
          </View>
        </TouchableOpacity>
      )}

      <TotusBookingActions booking={booking} style={styles.actions} />
    </View>
  );
};

export default TotusBookingDetails;

const Row: React.FC<{ label: string; value: string; valueColor?: string }> = ({
  label,
  value,
  valueColor,
}) => {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <AppText style={[styles.label, { color: theme.textTertiary }]}>{label}</AppText>
      <AppText style={[styles.value, { color: valueColor ?? theme.text }]}>{value}</AppText>
    </View>
  );
};

const Divider: React.FC = () => {
  const { theme } = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.divider }]} />;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    marginTop: 16,
    gap: 16,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 1,
  },
  infoPanel: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  row: {
    paddingVertical: 10,
    gap: 4,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  refundAmount: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
  },
  divider: {
    height: 1,
  },
  voucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 12,
  },
  voucherIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherBody: {
    flex: 1,
    gap: 2,
  },
  voucherTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  voucherText: {
    fontSize: 13,
    lineHeight: 18,
  },
  arrowContainer: {
    transform: [{ rotate: '-180deg' }],
  },
  actions: {
    marginTop: 0,
  },
});
