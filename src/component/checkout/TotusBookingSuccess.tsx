import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { openOrderDetails, openOrdersList } from '../../navigation/historyNavigation';
import { AppButton, AppIcon, AppText } from '../UI';
import { useTheme } from '../../hooks/useTheme';
import TotusBookingBanner from '../orders/totusBooking/TotusBookingBanner';
import {
  formatTotusGuests,
  formatTotusMoney,
  formatTotusShortPeriod,
  formatTotusStayPeriod,
  type TotusBooking,
} from '../../utils/totusBooking';
import { FONT_HEADING } from '../../theme/fonts';

type Props = {
  orderId: string | number;
  /** `totus_booking` из ответа /check_pay или /orders (может отсутствовать — тогда без деталей). */
  booking?: TotusBooking | null;
  /** Оплаченная сумма из параметров экрана оплаты (если booking ещё не загружен). */
  amount?: number | null;
};

const STEPS = [
  {
    title: 'Проверяем наличие мест у отеля',
    text: 'Обычно это занимает несколько часов, максимум — 24 часа',
  },
  {
    title: 'Пришлём решение',
    text: 'Push-уведомление и письмо на e-mail, статус также виден в разделе «Заказы»',
  },
  {
    title: 'Ваучер появится в заказе',
    text: 'Если мест нет — деньги вернутся на карту в течение 1–3 дней',
  },
];

/**
 * Блок после успешной оплаты внутреннего заказа (макет «Оформление — успех»):
 * «Оплата прошла» → баннер «Проверяем бронирование» → 3 шага → «Перейти к заказу» / «К заказам».
 * Показывается на экране ожидания оплаты (PendingPayment) вместо авто-перехода к списку заказов.
 */
const TotusBookingSuccess: React.FC<Props> = ({ orderId, booking, amount }) => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    const paid = formatTotusMoney(booking?.paidAmount ?? booking?.finalPrice ?? amount);
    if (paid) parts.push(`Оплачено ${paid}`);

    const hotel = booking?.hotel;
    if (hotel?.name) {
      parts.push(hotel.stars ? `${hotel.name} ${hotel.stars}*` : hotel.name);
    }
    if (booking?.room) parts.push(booking.room);

    const period = formatTotusShortPeriod(booking) || formatTotusStayPeriod(booking);
    if (period) parts.push(period);

    const guests = formatTotusGuests(booking);
    if (guests) parts.push(guests);

    if (booking?.operator) parts.push(`Туроператор: ${booking.operator}`);

    const head = `Бронирование № ${orderId} отправлено на подтверждение.`;
    return parts.length ? `${head} ${parts.join(' · ')}` : head;
  }, [booking, orderId, amount]);

  // Оплата закончена: экраны оплаты закрываются, «Назад» из заказа — туда, где начиналось бронирование.
  const handleOpenOrder = useCallback(() => {
    openOrderDetails(navigation, orderId, { leaveFlow: true });
  }, [navigation, orderId]);

  const handleOpenOrders = useCallback(() => {
    openOrdersList(navigation, { leaveFlow: true });
  }, [navigation]);

  const bannerBooking: TotusBooking | null = booking
    ? { ...booking, status: 'pending_confirmation' }
    : null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={[styles.iconWrap, { backgroundColor: theme.success + '22' }]}>
        <AppIcon name="checkmark" size={34} color={theme.success} />
      </View>

      <AppText style={[styles.title, { color: theme.text }]}>Оплата прошла</AppText>
      <AppText style={[styles.subtitle, { color: theme.textTertiary }]}>{subtitle}</AppText>

      {bannerBooking ? (
        <TotusBookingBanner
          booking={bannerBooking}
          title="Проверяем бронирование"
          text="Подтвердим в течение 24 часов и пришлём ваучер. Если мест у отеля не окажется — вернём деньги полностью."
          style={styles.banner}
        />
      ) : (
        <View style={[styles.fallbackBanner, { backgroundColor: theme.warning + '2A' }]}>
          <AppText style={[styles.fallbackTitle, { color: theme.text }]}>
            Проверяем бронирование
          </AppText>
          <AppText style={[styles.fallbackText, { color: theme.textSecondary }]}>
            Подтвердим в течение 24 часов и пришлём ваучер. Если мест у отеля не окажется — вернём
            деньги полностью.
          </AppText>
        </View>
      )}

      <View style={[styles.steps, { backgroundColor: theme.backgroundSecondary }]}>
        <AppText style={[styles.stepsTitle, { color: theme.text }]}>Что дальше</AppText>
        {STEPS.map((step, index) => (
          <View style={styles.step} key={step.title}>
            <View style={[styles.stepNum, { backgroundColor: theme.brand }]}>
              <AppText style={styles.stepNumText}>{index + 1}</AppText>
            </View>
            <View style={styles.stepBody}>
              <AppText style={[styles.stepTitle, { color: theme.text }]}>{step.title}</AppText>
              <AppText style={[styles.stepText, { color: theme.textTertiary }]}>{step.text}</AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <AppButton title="Перейти к заказу" size="large" onPress={handleOpenOrder} />
        <AppButton title="К заказам" size="large" type="transparent" onPress={handleOpenOrders} />
      </View>
    </ScrollView>
  );
};

export default TotusBookingSuccess;

const styles = StyleSheet.create({
  scroll: {
    alignSelf: 'stretch',
    width: '100%',
  },
  content: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 24,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONT_HEADING,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  banner: {
    alignSelf: 'stretch',
  },
  fallbackBanner: {
    alignSelf: 'stretch',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  fallbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  fallbackText: {
    fontSize: 13,
    lineHeight: 18,
  },
  steps: {
    alignSelf: 'stretch',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  stepBody: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  stepText: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    alignSelf: 'stretch',
    gap: 8,
  },
});
