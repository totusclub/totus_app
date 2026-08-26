import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText, SbpPayButton } from '../../UI';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Order } from '../../../types/orders';
import { useTheme } from '../../../hooks/useTheme';
import { getOrderPayAmount } from '../../../utils/orderPayment';

interface CheckoutCardProps {
  order: Order | null;
  onPay: () => void;
  loading?: boolean;
}

export const CheckoutCard: React.FC<CheckoutCardProps> = ({
  order,
  onPay,
  loading = false,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const formatPrice = (price: number | string | undefined): string => {
    if (!price) return '0';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  if (!order) {
    return null;
  }

  const amount = getOrderPayAmount(order);

  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom, backgroundColor: theme.cardBackground, borderTopColor: theme.borderLight }]}>
      <View style={styles.totalPriceContent}>
        <AppText style={[styles.totalLabel, { color: theme.text }]}>Всего за тур</AppText>
        <AppText style={[styles.totalPrice, { color: theme.text }]}>
          {formatPrice(amount || order.full_price || order.package?.price)} ₽
        </AppText>
      </View>
      <SbpPayButton
        label="Перейти к оплате"
        onPress={onPay}
        loading={loading}
        disabled={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  totalPriceContent: {
    marginBottom: 12,
    gap: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '500',
  },
});

