import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Linking } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { AppButton, AppHeader, AppText } from '../UI';
import { createPay, getOrder } from '../../modules/api/levelTravelApi';
import type { Order } from '../../types/orders';
import { CheckoutItems } from './components/CheckoutItems';
import { CheckoutCard } from './components/CheckoutCard';
import CheckoutSkeleton from './CheckoutSkeleton';
import { useTheme } from '../../hooks/useTheme';
import {
  getOrderPayAmount,
  getOrderPaymentPurpose,
} from '../../utils/orderPayment';
import {
  getPayErrorMessage,
  parseSbpPayResponse,
  SBP_PENDING_EXPIRE_MINUTES,
  storeSbpQrcId,
} from '../../utils/sbpPayment';
import { TabletCentered } from '../UI/tablet';

type CheckoutRouteParams = {
  order_id: number | string;
  email?: string;
  phone?: string;
  searchType?: 'package' | 'hotel';
};

type CheckoutRoute = RouteProp<{ checkout: CheckoutRouteParams }, 'checkout'>;

// A freshly created order is not always readable right away
const ORDER_FETCH_ATTEMPTS = 3;
const ORDER_FETCH_RETRY_DELAY_MS = 1200;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isOrderNotFound = (error: any) => error?.response?.status === 404;

export const Checkout: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<CheckoutRoute>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const orderId = route.params?.order_id;

  const refreshOrder = useCallback(async () => {
    if (!orderId) return null;
    const numericId =
      typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;

    let lastError: unknown = null;
    for (let attempt = 0; attempt < ORDER_FETCH_ATTEMPTS; attempt += 1) {
      try {
        const response = await getOrder(numericId);
        const orderData = (response as any)?.order || response;
        setOrder(orderData as Order);
        setLoadError(null);
        return orderData as Order;
      } catch (error) {
        lastError = error;
        if (!isOrderNotFound(error) || attempt === ORDER_FETCH_ATTEMPTS - 1) {
          break;
        }
        await wait(ORDER_FETCH_RETRY_DELAY_MS * (attempt + 1));
      }
    }
    throw lastError;
  }, [orderId]);

  const loadOrder = useCallback(() => {
    if (!orderId) {
      setLoading(false);
      setLoadError('Не удалось определить номер заказа.');
      return;
    }
    setLoading(true);
    refreshOrder()
      .catch((error) => {
        console.warn('Error fetching order:', error?.message || error);
        setLoadError(
          isOrderNotFound(error)
            ? 'Заказ ещё обрабатывается. Попробуйте обновить через несколько секунд или найдите его в разделе «Мои заказы».'
            : 'Не удалось загрузить заказ. Проверьте соединение и попробуйте снова.',
        );
      })
      .finally(() => setLoading(false));
  }, [orderId, refreshOrder]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const payAmount = useMemo(() => getOrderPayAmount(order), [order]);

  const handlePay = async () => {
    if (!orderId || paying) return;
    setPaying(true);
    try {
      const expireDate = new Date(
        Date.now() + SBP_PENDING_EXPIRE_MINUTES * 60 * 1000,
      );
      const returnUrl = `https://totus.club/pay?orderId=${orderId}`;
      const amountValue = payAmount || getOrderPayAmount(order);

      if (!amountValue || amountValue <= 0) {
        Alert.alert(
          'Ошибка оплаты',
          'Не удалось определить сумму к оплате. Обновите заказ и попробуйте снова.',
        );
        return;
      }

      const payInfo = await createPay({
        orderId: `ORDER${orderId}`,
        orderName: `Заказ №${orderId}`,
        paymentPurpose: getOrderPaymentPurpose(order),
        expire: expireDate,
        amount: {
          value: amountValue,
          code: 'RUB',
        },
        returnUrl,
      });

      if (payInfo?.isAxiosError) {
        Alert.alert('Ошибка оплаты', getPayErrorMessage(payInfo));
        return;
      }

      const parsed = parseSbpPayResponse(payInfo);
      await storeSbpQrcId(orderId, parsed.qrcId);

      if (!parsed.payload) {
        Alert.alert('Ошибка оплаты', getPayErrorMessage(payInfo));
        return;
      }

      try {
        await Linking.openURL(parsed.payload);
      } catch (e: any) {
        Alert.alert(
          'Ошибка оплаты',
          e?.message || 'Не удалось открыть ссылку оплаты в браузере.',
        );
        return;
      }

      navigation.navigate('pendingPayment', {
        order_id: orderId,
        qrcId: parsed.qrcId || undefined,
        payUrl: parsed.payload,
        amount: amountValue,
        expireAt: expireDate.getTime(),
      });
    } catch (e: any) {
      Alert.alert('Ошибка оплаты', e?.message || 'Не удалось создать платёж.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <CheckoutSkeleton />;
  }

  if (!order) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <AppHeader />
        <View style={styles.errorContainer}>
          <TabletCentered style={styles.errorColumnTablet}>
          <AppText style={[styles.errorText, { color: theme.textTertiary }]}>
            {loadError || 'Заказ не найден.'}
          </AppText>
          <AppButton title="Обновить" onPress={loadOrder} size="large" />
          <AppButton
            title="Мои заказы"
            type="outline"
            size="large"
            onPress={() =>
              navigation.navigate('OrdersStackScreen', { screen: 'orders' })
            }
          />
          </TabletCentered>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader />
      <CheckoutItems order={order} />
      <CheckoutCard
        order={order}
        onPay={handlePay}
        loading={loading || paying}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  // iPad only: keeps the same gap inside the centered column
  errorColumnTablet: {
    gap: 12,
  },
});
