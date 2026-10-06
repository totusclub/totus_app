import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Order } from '../../types';
import { AppText } from '../UI';
import {
  getPackageData,
  formatPrice,
  formatOrderDate,
  formatPeriod,
  formatDeparture,
  collectTourists,
  getStatusColor,
  getStatusLabel,
  getPaymentMethodLabel,
  isOrderAwaitingPayment,
  canPayWithSbp,
} from '../../utils/ordersUtils';
import { SbpPayButton } from '../UI';
import { useTheme } from '../../hooks/useTheme';
import {
  getTotusBooking,
  getTotusBookingPalette,
  getTotusBookingShortLabel,
  getTotusBookingShortText,
} from '../../utils/totusBooking';
import TotusBookingBanner from './totusBooking/TotusBookingBanner';

type Props = {
  order: Order;
};

const OrderListItem: React.FC<Props> = ({ order }) => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const pkg = useMemo(() => getPackageData(order), [order]);

  // Внутреннее бронирование (наш номер, оператор Arlekino, без Level.Travel): статус из `totus_booking`.
  const booking = useMemo(() => getTotusBooking(order), [order]);
  const bookingPalette = useMemo(
    () => (booking ? getTotusBookingPalette(booking.status, theme) : null),
    [booking, theme],
  );

  const statusColor = useMemo(
    () => (bookingPalette ? bookingPalette.accent : getStatusColor(pkg, order)),
    [bookingPalette, pkg, order],
  );
  const statusLabel = useMemo(
    () => (booking ? getTotusBookingShortLabel(booking.status) : getStatusLabel(order, pkg)),
    [booking, order, pkg],
  );

  const location = pkg?.hotel
    ? [pkg.hotel.city, pkg.hotel.country].filter(Boolean).join(', ')
    : '';
  const hotelName = pkg?.hotel?.name || '';
  const tourists = collectTourists(order, pkg);
  const travelPeriod = formatPeriod(pkg);
  const departureInfo = formatDeparture(pkg);
  const nightsCount = order?.package?.package?.nights_count ?? pkg?.nights_count;

  const handleOpenDetails = useCallback(() => {
    navigation.navigate('orderDetails', {
      orderId: order?.order_id ?? order?.id,
      order,
    });
  }, [navigation, order]);

  const handlePaySbp = useCallback(() => {
    const id = order?.order_id ?? order?.id;
    if (id != null) {
      navigation.navigate('checkout', { order_id: id });
    }
  }, [navigation, order]);

  const showPay = isOrderAwaitingPayment(order) && canPayWithSbp(order);

  return (
    <View
      style={[styles.card, { borderColor: theme.border, borderBottomColor: statusColor + '80', backgroundColor: theme.cardBackground, shadowColor: theme.shadow }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={handleOpenDetails}>
      <View style={styles.cardHeader}>
        <AppText style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>
          {booking ? 'Заказ' : 'Тур'} <AppText style={[styles.cardId, { color: theme.textTertiary }]}>№ {order?.order_id ?? order?.id}</AppText>
        </AppText>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: bookingPalette ? bookingPalette.bg : statusColor },
          ]}>
          <AppText style={[styles.statusText, bookingPalette && { color: bookingPalette.fg }]}>
            {statusLabel}
          </AppText>
        </View>
      </View>
      {!!booking && (
        <TotusBookingBanner
          booking={booking}
          text={getTotusBookingShortText(booking)}
          compact
          style={styles.bookingBanner}
        />
      )}

      <AppText style={[styles.cardDate, { color: theme.textTertiary }]}>
        От {formatOrderDate((order as any)?.c_date || pkg?.created_at)}
      </AppText>
      <AppText style={[styles.price, { color: theme.text }]}>{formatPrice(pkg?.price ?? pkg?.full_price)}</AppText>
      {booking ? (
        <AppText style={[styles.payment, { color: theme.textTertiary }]}>
          Туроператор: {booking.operator}
        </AppText>
      ) : (
        !!getPaymentMethodLabel(order) && (
          <AppText style={[styles.payment, { color: theme.textTertiary }]}>
            {getPaymentMethodLabel(order)}
          </AppText>
        )
      )}

      <View style={[styles.divider, { backgroundColor: theme.divider }]} />
      {!!hotelName && (
        <AppText style={[styles.hotelName, { color: theme.text }]}>
          {[hotelName, location].filter(Boolean).join(', ')}
        </AppText>
      )}
      {!!travelPeriod && (
        <AppText style={[styles.period, { color: theme.textTertiary }]}>
          {travelPeriod}
          {nightsCount ? ` · ${nightsCount} ночей` : ''}
        </AppText>
      )}
      {!!departureInfo && <AppText style={[styles.departure, { color: theme.text }]}>{departureInfo}</AppText>}
      {!!tourists && (
        <AppText style={[styles.tourists, { color: theme.textTertiary }]}>
          Туристы: <AppText style={[styles.touristsList, { color: theme.textDisabled }]}>{tourists}</AppText>
        </AppText>
      )}
      </TouchableOpacity>
      {showPay && (
        <View style={styles.payRow}>
          <SbpPayButton onPress={handlePaySbp} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderBottomWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  cardId: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  statusBadge: {
    alignSelf: 'center',
    minHeight: 24,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bookingBanner: {
    marginTop: 10,
  },
  price: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  payment: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    marginTop: 4,
  },
  cardDate: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginBottom: 24,
    marginTop: 4,
  },
  location: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  hotelName: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  period: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 8,
    marginTop: 8,
  },
  departure: {
    fontSize: 14,
    marginBottom: 8,
  },
  tourists: {
    fontSize: 13,
  },
  touristsList: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  payRow: {
    width: '100%',
    marginTop: 16,
  },
});

// The list re-renders on refresh / layout changes; a card only changes when its order object does.
export default React.memo(OrderListItem);
