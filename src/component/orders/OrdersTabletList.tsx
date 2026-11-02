import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { Order } from '../../types';
import { AppIcon, AppText, SbpPayButton } from '../UI';
import { useTheme } from '../../hooks/useTheme';
import {
  canPayWithSbp,
  collectTourists,
  formatDeparture,
  formatOrderDate,
  formatPeriod,
  formatPrice,
  getPackageData,
  getPaymentMethodLabel,
  getStatusLabel,
  isOrderAwaitingPayment,
  resolveStatusKey,
} from '../../utils/ordersUtils';
import {
  getTotusBooking,
  getTotusBookingPalette,
  getTotusBookingShortLabel,
  getTotusBookingShortText,
} from '../../utils/totusBooking';
import TotusBookingBanner from './totusBooking/TotusBookingBanner';
import { FONT_HEADING } from '../../theme/fonts';

/**
 * iPad: список заказов по макету «Заказы — вариант A» (утверждён владельцем 02.11.2026).
 * Сверху «Ожидают оплаты» — крупные карточки с кнопкой оплаты, ниже «Все заказы» — строки
 * одной таблицей. Данные и переходы — те же, что у OrderListItem (телефон не меняется).
 */

type Theme = ReturnType<typeof useTheme>['theme'];

type Props = {
  orders: Order[];
  refreshControl: React.ReactElement<any>;
};

const orderIdOf = (order: Order) => (order as any)?.order_id ?? (order as any)?.id;

/** Заказ ждёт оплаты и его можно оплатить по СБП — как кнопка «Оплатить» у OrderListItem. */
export const isPayableOrder = (order: Order): boolean =>
  isOrderAwaitingPayment(order) && canPayWithSbp(order);

type OrderView = {
  id: string;
  kind: string;
  created: string;
  hotel: string;
  place: string;
  period: string;
  departure: string;
  departureShort: string;
  tourists: string;
  sub: string;
  price: string;
  status: { label: string; bg: string; fg: string };
  booking: ReturnType<typeof getTotusBooking>;
};

function buildOrderView(order: Order, theme: Theme): OrderView {
  const pkg = getPackageData(order);
  const booking = getTotusBooking(order);
  const palette = booking ? getTotusBookingPalette(booking.status, theme) : null;
  const dark = theme.mode === 'dark';

  let status: OrderView['status'];
  if (booking && palette) {
    status = { label: getTotusBookingShortLabel(booking.status), bg: palette.bg, fg: palette.fg };
  } else {
    const key = resolveStatusKey(pkg, order);
    const label = getStatusLabel(order, pkg);
    if (key === 'cancel') {
      status = { label, bg: theme.backgroundTertiary, fg: theme.textSecondary };
    } else if (key === 'approved') {
      status = { label, bg: '#288556' + '24', fg: dark ? '#39BF87' : '#1D7A52' };
    } else {
      status = { label, bg: theme.brand + '24', fg: dark ? theme.brand : '#B4460F' };
    }
  }

  const nights = (order as any)?.package?.package?.nights_count ?? pkg?.nights_count;
  const period = formatPeriod(pkg);
  const departure = formatDeparture(pkg);
  const place = pkg?.hotel ? [pkg.hotel.city, pkg.hotel.country].filter(Boolean).join(', ') : '';

  return {
    id: String(orderIdOf(order) ?? ''),
    kind: booking ? 'Заказ' : 'Тур',
    created: formatOrderDate((order as any)?.c_date || pkg?.created_at),
    hotel: pkg?.hotel?.name || '',
    place,
    period: period ? `${period}${nights ? ` · ${nights} ночей` : ''}` : '',
    departure,
    departureShort: departure.replace(/^Вылет:\s*/, ''),
    tourists: collectTourists(order, pkg),
    sub: booking ? `Туроператор: ${booking.operator}` : getPaymentMethodLabel(order),
    price: formatPrice(pkg?.price ?? pkg?.full_price),
    status,
    booking,
  };
}

const StatusPill: React.FC<{ status: OrderView['status'] }> = ({ status }) => (
  <View style={[styles.pill, { backgroundColor: status.bg }]}>
    <AppText style={[styles.pillText, { color: status.fg }]} numberOfLines={1}>
      {status.label}
    </AppText>
  </View>
);

const InfoLine: React.FC<{ icon: string; text: string; theme: Theme; muted?: boolean }> = ({
  icon,
  text,
  theme,
  muted,
}) => (
  <View style={styles.infoLine}>
    <AppIcon name={icon} size={16} color={theme.textTertiary} accent={false} />
    <AppText style={[styles.infoText, { color: muted ? theme.textTertiary : theme.text }]}>{text}</AppText>
  </View>
);

const PayCard: React.FC<{
  view: OrderView;
  theme: Theme;
  onOpen: () => void;
  onPay: () => void;
}> = ({ view, theme, onOpen, onPay }) => (
  <View style={[styles.payCard, { backgroundColor: theme.cardBackground, shadowColor: theme.shadow }]}>
    <TouchableOpacity activeOpacity={0.9} onPress={onOpen} style={styles.payCardBody}>
      <View style={styles.payCardTop}>
        <AppText style={[styles.metaText, { color: theme.textTertiary }]} numberOfLines={1}>
          {view.kind} № {view.id} · от {view.created}
        </AppText>
        <StatusPill status={view.status} />
      </View>
      <View>
        {!!view.hotel && (
          <AppText style={[styles.payHotel, { color: theme.text }]} numberOfLines={2}>
            {view.hotel}
          </AppText>
        )}
        {!!view.place && (
          <AppText style={[styles.placeText, { color: theme.textTertiary }]}>{view.place}</AppText>
        )}
      </View>
      <View style={styles.infoGrid}>
        {!!view.period && (
          <View style={styles.infoCell}>
            <InfoLine icon="calendar" text={view.period} theme={theme} />
          </View>
        )}
        {!!view.departure && (
          <View style={styles.infoCell}>
            <InfoLine icon="plane" text={view.departure} theme={theme} />
          </View>
        )}
        {!!view.tourists && (
          <View style={styles.infoCell}>
            <InfoLine icon="tourists" text={`Туристы: ${view.tourists}`} theme={theme} />
          </View>
        )}
        {!!view.sub && (
          <View style={styles.infoCell}>
            <InfoLine icon="order" text={view.sub} theme={theme} muted />
          </View>
        )}
      </View>
      {!!view.booking && (
        <TotusBookingBanner booking={view.booking} text={getTotusBookingShortText(view.booking)} compact />
      )}
    </TouchableOpacity>
    <View style={styles.payFooter}>
      <AppText style={[styles.payPrice, { color: theme.text }]}>{view.price}</AppText>
      <View style={styles.payButton}>
        <SbpPayButton onPress={onPay} />
      </View>
    </View>
  </View>
);

const OrderRow: React.FC<{ view: OrderView; theme: Theme; last: boolean; onOpen: () => void }> = ({
  view,
  theme,
  last,
  onOpen,
}) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onOpen}
    style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: theme.borderSecondary }]}>
    <View style={styles.colHotel}>
      <AppText style={[styles.rowHotel, { color: theme.text }]} numberOfLines={1}>
        {view.hotel || `${view.kind} № ${view.id}`}
      </AppText>
      <AppText style={[styles.rowMeta, { color: theme.textTertiary }]} numberOfLines={1}>
        {[view.place, `${view.kind} № ${view.id}`].filter(Boolean).join(' · ')}
      </AppText>
    </View>
    <AppText style={[styles.colDates, styles.rowText, { color: theme.text }]}>{view.period || '—'}</AppText>
    <AppText style={[styles.colDeparture, styles.rowText, { color: theme.text }]}>{view.departureShort || '—'}</AppText>
    <AppText style={[styles.colPrice, styles.rowPrice, { color: theme.text }]} numberOfLines={1}>
      {view.price}
    </AppText>
    <View style={styles.colStatus}>
      <StatusPill status={view.status} />
    </View>
    <AppIcon name="arrowRight" size={16} color={theme.textDisabled} accent={false} />
  </TouchableOpacity>
);

const OrdersTabletList: React.FC<Props> = ({ orders, refreshControl }) => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const { payable, rest } = useMemo(() => {
    const p: { order: Order; view: OrderView }[] = [];
    const r: { order: Order; view: OrderView }[] = [];
    for (const order of orders) {
      const item = { order, view: buildOrderView(order, theme) };
      (isPayableOrder(order) ? p : r).push(item);
    }
    return { payable: p, rest: r };
  }, [orders, theme]);

  const openDetails = useCallback(
    (order: Order) => {
      navigation.navigate('orderDetails', { orderId: orderIdOf(order), order });
    },
    [navigation],
  );

  const pay = useCallback(
    (order: Order) => {
      const id = orderIdOf(order);
      if (id != null) {
        navigation.navigate('checkout', { order_id: id });
      }
    },
    [navigation],
  );

  // Карточки «Ожидают оплаты» — по две в ряд одинаковой ширины.
  const payRows: { order: Order; view: OrderView }[][] = [];
  for (let i = 0; i < payable.length; i += 2) {
    payRows.push(payable.slice(i, i + 2));
  }

  return (
    <ScrollView
      refreshControl={refreshControl}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {payable.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText style={[styles.sectionTitle, { color: theme.text }]}>Ожидают оплаты</AppText>
            <View style={[styles.countPill, { backgroundColor: theme.brand + '24' }]}>
              <AppText style={[styles.countText, { color: theme.mode === 'dark' ? theme.brand : '#B4460F' }]}>
                {payable.length}
              </AppText>
            </View>
          </View>
          {payRows.map((row, index) => (
            <View key={`pay-row-${index}`} style={styles.payRow}>
              {row.map(({ order, view }) => (
                <View key={`pay-${view.id}`} style={styles.payCell}>
                  <PayCard
                    view={view}
                    theme={theme}
                    onOpen={() => openDetails(order)}
                    onPay={() => pay(order)}
                  />
                </View>
              ))}
              {row.length === 1 && <View style={styles.payCell} />}
            </View>
          ))}
        </View>
      )}

      {rest.length > 0 && (
        <View style={styles.section}>
          <AppText style={[styles.sectionTitle, { color: theme.text }]}>Все заказы</AppText>
          <View style={[styles.table, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.row, styles.tableHead, { borderBottomColor: theme.borderSecondary }]}>
              <AppText style={[styles.colHotel, styles.headText, { color: theme.textTertiary }]}>Отель</AppText>
              <AppText style={[styles.colDates, styles.headText, { color: theme.textTertiary }]}>Даты</AppText>
              <AppText style={[styles.colDeparture, styles.headText, { color: theme.textTertiary }]}>Вылет</AppText>
              <AppText style={[styles.colPrice, styles.headText, { color: theme.textTertiary }]}>Цена</AppText>
              <AppText style={[styles.colStatus, styles.headText, { color: theme.textTertiary }]}>Статус</AppText>
              <View style={styles.chevronSpace} />
            </View>
            {rest.map(({ order, view }, index) => (
              <OrderRow
                key={`row-${view.id || index}`}
                view={view}
                theme={theme}
                last={index === rest.length - 1}
                onOpen={() => openDetails(order)}
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default OrdersTabletList;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 28,
  },
  section: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  countPill: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
  },
  payRow: {
    flexDirection: 'row',
    gap: 16,
  },
  payCell: {
    flex: 1,
    minWidth: 0,
  },
  payCard: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 20,
    gap: 14,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  payCardBody: {
    gap: 14,
  },
  payCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
  },
  payHotel: {
    fontFamily: FONT_HEADING,
    fontSize: 22,
    lineHeight: 26,
  },
  placeText: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 16,
  },
  infoCell: {
    width: '47%',
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  payFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 'auto',
  },
  payPrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  payButton: {
    width: 220,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: '100%',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  table: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  tableHead: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headText: {
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  colHotel: {
    flex: 2.4,
    minWidth: 0,
  },
  colDates: {
    flex: 1.6,
  },
  colDeparture: {
    flex: 1.3,
  },
  colPrice: {
    flex: 0.9,
    textAlign: 'right',
  },
  colStatus: {
    flex: 1.5,
    alignItems: 'flex-start',
  },
  chevronSpace: {
    width: 16,
  },
  rowHotel: {
    fontFamily: FONT_HEADING,
    fontSize: 18,
    lineHeight: 22,
  },
  rowMeta: {
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },
  rowText: {
    fontSize: 14,
    lineHeight: 19,
  },
  rowPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
});
