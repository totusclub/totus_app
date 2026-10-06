import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { jwtDecode } from 'jwt-decode';

import Content from '../../UI/content';
import { AppHeader, AppText, SbpPayButton } from '../../UI';
import {
  collectTourists,
  formatPrice,
  getPackageData,
  getStatusColor,
  getStatusLabel,
  isOrderAwaitingPayment,
  canPayWithSbp,
  isOrderCancelled,
  ORDER_STATUS_COLORS,
} from '../../../utils/ordersUtils';
import type { Order } from '../../../types';
import type { OrderDocumentApiItem } from '../../../utils/ordersUtils';
import OrderDetailsSections from './OrderDetailsSections';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { getOrder, getOrderDocuments } from '../../../modules/api/levelTravelApi';
import { RootState } from '../../../modules/store';
import { TabletCentered } from '../../UI/tablet';
import {
  getTotusBooking,
  getTotusBookingPalette,
  getTotusBookingShortLabel,
  getTotusBookingSubtitle,
} from '../../../utils/totusBooking';
import TotusBookingDetails from '../totusBooking/TotusBookingDetails';

const OrderDetailsScreen: React.FC = () => {
  const { theme } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user: userFromState, accessToken } = useSelector((state: RootState) => state.auth);
  const initialOrder = (route?.params?.order as Order) || null;
  const orderIdParam =
    route?.params?.orderId ??
    initialOrder?.order_id ??
    initialOrder?.id ??
    null;

  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [apiDocuments, setApiDocuments] = useState<OrderDocumentApiItem[]>([]);
  const [loading, setLoading] = useState(Boolean(orderIdParam));

  useEffect(() => {
    if (!orderIdParam) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      getOrder(Number(orderIdParam)),
      getOrderDocuments(orderIdParam).catch(() => ({ documents: [] })),
    ])
      .then(([orderResponse, documentsResponse]) => {
        if (cancelled) return;
        setOrder(orderResponse);
        setApiDocuments(documentsResponse?.documents ?? []);
      })
      .catch(err => {
        console.error('[OrderDetails] Failed to fetch order:', err);
        if (!cancelled && initialOrder) {
          setOrder(initialOrder);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderIdParam, initialOrder]);

  const pkg = useMemo(() => getPackageData(order || undefined), [order]);

  // Внутреннее бронирование (наш номер, оператор Arlekino, без Level.Travel): статус из `totus_booking`.
  const booking = useMemo(() => getTotusBooking(order), [order]);
  const bookingPalette = useMemo(
    () => (booking ? getTotusBookingPalette(booking.status, theme) : null),
    [booking, theme],
  );
  const bookingRefunded =
    booking?.status === 'rejected' || booking?.status === 'cancelled';

  const handlePaySbp = useCallback(() => {
    const id = order?.order_id ?? order?.id;
    if (id != null) {
      navigation.navigate('checkout', { order_id: id });
    }
  }, [navigation, order]);

  const showPay = order ? isOrderAwaitingPayment(order) && canPayWithSbp(order) : false;
  const isCancelled = order ? isOrderCancelled(order, pkg) : false;
  const paymentSectionTitle = showPay
    ? 'К оплате'
    : bookingRefunded
      ? 'Возврат'
      : isCancelled
        ? 'Отменено'
        : 'Оплачено';

  const statusColor = bookingPalette
    ? bookingPalette.accent
    : order
      ? getStatusColor(pkg, order)
      : ORDER_STATUS_COLORS.pending;
  const orderId = order?.order_id ?? order?.id ?? '—';
  const price = formatPrice(pkg?.price ?? pkg?.full_price ?? order?.package?.price);
  const tourists = order ? collectTourists(order, pkg) : '';
  const statusLabel = booking
    ? getTotusBookingShortLabel(booking.status)
    : order
      ? getStatusLabel(order, pkg)
      : 'Статус заказа';

  const hotelName = pkg?.hotel?.name || '';
  const destination = [pkg?.hotel?.city, pkg?.hotel?.country].filter(Boolean).join(', ');

  const documentsEmail = useMemo(() => {
    const fromState = (userFromState as { email?: string } | null)?.email;
    if (fromState) return fromState;

    if (accessToken) {
      try {
        const decoded = jwtDecode<{ email?: string }>(accessToken);
        if (decoded.email) return decoded.email;
      } catch {
        // ignore decode errors
      }
    }

    return order?.package?.client?.email || '';
  }, [userFromState, accessToken, order?.package?.client?.email]);

  const insets = useSafeAreaInsets();

  return (
    <Content>
      <AppHeader />

      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {loading && !order ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.brand} />
          </View>
        ) : !order ? (
          <View style={styles.loadingWrap}>
            <AppText style={{ color: theme.textTertiary }}>Заказ не найден</AppText>
          </View>
        ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom }]}>
          <TabletCentered>
          <View style={[styles.card, { backgroundColor: theme.cardBackground, shadowColor: theme.shadow, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <AppText style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>
                {booking ? 'Заказ' : 'Тур'} № {orderId}
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
              <AppText style={[styles.bookingSubtitle, { color: theme.textTertiary }]}>
                {getTotusBookingSubtitle(booking)}
              </AppText>
            )}

            <View style={[styles.detailsPanel, { backgroundColor: theme.backgroundSecondary, borderColor: theme.borderSecondary, borderBottomColor: theme.brand }]}>
              <View style={[styles.section, { borderBottomColor: theme.divider }]}>
                <AppText style={[styles.sectionTitle, { color: theme.text }]}>Получение заказа</AppText>
                <AppText style={[styles.sectionSubtitle, { color: theme.textTertiary }]}>
                  Отправим документы на {documentsEmail || '—'}
                </AppText>
              </View>

              <View style={[styles.section, styles.sectionSpacing, { borderBottomColor: theme.divider }]}>
                <AppText style={[styles.sectionTitle, { color: theme.text }]}>
                  {paymentSectionTitle}
                </AppText>
                <AppText style={[styles.sectionSubtitle, { color: theme.textTertiary }]}>
                  {hotelName
                    ? `${booking ? 'Отель' : 'Тур в'} ${hotelName}`
                    : 'Данные уточняются'}
                  {destination ? `, ${destination}` : ''}
                </AppText>
                <AppText
                  style={[
                    styles.sectionSubtitle,
                    { color: bookingRefunded && bookingPalette ? bookingPalette.accent : theme.textTertiary },
                  ]}>
                  {price}
                </AppText>
              </View>

              <View style={[styles.section, styles.sectionSpacing, { borderBottomColor: theme.divider }]}>
                <AppText style={[styles.sectionTitle, { color: theme.text }]}>Туристы</AppText>
                <View style={styles.touristsList}>
                  {(Array.isArray(order.package?.tourists) ? (order.package?.tourists as any[]) : [])
                    .filter((tourist: any) => tourist && typeof tourist === 'object')
                    .map((tourist: any, index: number) => (
                    <View key={tourist.id ?? index}>
                      <AppText style={[styles.sectionSubtitle, { color: theme.textTertiary }]}>{tourist.name} {tourist.surname},  {tourist.birthday} , До: {tourist.passport_expires_on}</AppText>
                      <AppText style={[styles.sectionSubtitle, { color: theme.textTertiary }]}>паспорт: {tourist.passport || ''}</AppText>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[styles.section, styles.sectionLast]}>
                <AppText style={[styles.sectionTitle, { color: theme.text }]}>Итого</AppText>
                <AppText style={[styles.amount, { color: theme.text }]}>{price}</AppText>
              </View>
            </View>

            {showPay && (
              <View style={styles.payWrap}>
                <SbpPayButton onPress={handlePaySbp} />
              </View>
            )}
          </View>

          {!!booking && <TotusBookingDetails booking={booking} />}

          <OrderDetailsSections
            pkg={pkg}
            hotelName={hotelName}
            destination={destination}
            order={order}
            apiDocuments={apiDocuments}
            operatorName={booking?.operator}
          />
          </TabletCentered>
        </ScrollView>
        )}
      </View>
    </Content >
  );
};

export default OrderDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
  },
  scrollContent: {
    paddingTop: 16,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 1,
  },
  detailsPanel: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderBottomWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  statusBadge: {
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
  bookingSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -4,
    marginBottom: 12,
  },
  section: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sectionSpacing: {
    marginTop: 8,
  },
  sectionLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  amount: {
    fontSize: 14,
    fontWeight: '500',
  },
  payWrap: {
    width: '100%',
    marginTop: 16,
  },
  touristsList: {
    flexDirection: 'column',
    gap: 4,
  },
});
