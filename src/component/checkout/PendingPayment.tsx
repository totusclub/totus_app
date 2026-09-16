import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, AppHeader, AppText } from '../UI';
import { checkPay, createPay, getOrder } from '../../modules/api/levelTravelApi';
import { useTheme } from '../../hooks/useTheme';
import {
  getPayErrorMessage,
  getStoredSbpQrcId,
  isSbpPaymentPaid,
  parseSbpPayResponse,
  SBP_PENDING_EXPIRE_MINUTES,
  storeSbpQrcId,
} from '../../utils/sbpPayment';
import { TabletCentered } from '../UI/tablet';
import TotusBookingSuccess from './TotusBookingSuccess';
import {
  getTotusBooking,
  isTotusInternalOrderId,
  type TotusBooking,
} from '../../utils/totusBooking';

type PendingPaymentParams = {
  order_id: number | string;
  qrcId?: string;
  payUrl?: string;
  amount?: number;
  expireAt?: number;
};

type PendingRoute = RouteProp<{ pendingPayment: PendingPaymentParams }, 'pendingPayment'>;

type PaymentUiStatus = 'pending' | 'paid' | 'expired' | 'error';

export const PendingPayment: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<PendingRoute>();
  const insets = useSafeAreaInsets();

  const orderId = route.params?.order_id;
  const [status, setStatus] = useState<PaymentUiStatus>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const qrcIdRef = useRef<string | null>(route.params?.qrcId || null);
  const paidRef = useRef(false);
  // Внутренний заказ (наш номер, оператор Arlekino): после оплаты — экран «Бронирование отправлено
  // на подтверждение» вместо авто-перехода к списку заказов. Признак — `totus_booking` в ответе
  // /check_pay либо номер заказа ≥ 900000000 (детали тогда подгружаем из /orders).
  const [totusBooking, setTotusBooking] = useState<TotusBooking | null>(null);
  const [isInternalOrder, setIsInternalOrder] = useState<boolean>(
    isTotusInternalOrderId(route.params?.order_id),
  );

  const expireAtRef = useRef(
    route.params?.expireAt ||
      Date.now() + SBP_PENDING_EXPIRE_MINUTES * 60 * 1000,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (qrcIdRef.current || !orderId) return;
      const stored = await getStoredSbpQrcId(orderId);
      if (!cancelled && stored) qrcIdRef.current = stored;
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const confirmPayment = useCallback(async () => {
    if (!orderId || paidRef.current) return false;
    try {
      const result = await checkPay({
        orderId: `ORDER${orderId}`,
        qrcId: qrcIdRef.current || undefined,
      });
      if (isSbpPaymentPaid(result)) {
        paidRef.current = true;
        const booking = getTotusBooking(result);
        if (booking) {
          setTotusBooking(booking);
          setIsInternalOrder(true);
        }
        setStatus('paid');
        return true;
      }
    } catch (e) {
      console.warn('checkPay failed', e);
    }
    return false;
  }, [orderId]);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(
        0,
        Math.floor((expireAtRef.current - Date.now()) / 1000),
      );
      setSecondsLeft(left);
      if (left <= 0 && status === 'pending') {
        setStatus('expired');
      }
    };
    tick();
    const clock = setInterval(tick, 1000);
    return () => clearInterval(clock);
  }, [status]);

  useEffect(() => {
    if (status !== 'pending' || !orderId) return;

    confirmPayment();
    const poll = setInterval(() => {
      confirmPayment();
    }, 3000);

    return () => clearInterval(poll);
  }, [status, orderId, confirmPayment]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && status === 'pending') {
        confirmPayment();
      }
    });
    return () => sub.remove();
  }, [status, confirmPayment]);

  useEffect(() => {
    if (status !== 'paid' || isInternalOrder) return;
    const t = setTimeout(() => {
      navigation.navigate('OrdersStackScreen' as any, { screen: 'orders' });
    }, 1200);
    return () => clearTimeout(t);
  }, [status, navigation, isInternalOrder]);

  // Внутренний заказ без `totus_booking` в /check_pay → подтягиваем детали из /orders (для подзаголовка).
  useEffect(() => {
    if (status !== 'paid' || !isInternalOrder || totusBooking || !orderId) return;
    let cancelled = false;
    getOrder(Number(orderId))
      .then((order) => {
        if (cancelled) return;
        const booking = getTotusBooking(order);
        if (booking) setTotusBooking(booking);
      })
      .catch((e) => console.warn('[PendingPayment] getOrder after pay failed', e));
    return () => {
      cancelled = true;
    };
  }, [status, isInternalOrder, totusBooking, orderId]);

  const openPayUrl = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (e: any) {
      setErrorMessage('Не удалось открыть ссылку оплаты в браузере.');
      setStatus('error');
      console.warn('Failed to open SBP URL', e);
    }
  }, []);

  const handleRetry = useCallback(async () => {
    if (!orderId || retrying) return;
    setRetrying(true);
    setErrorMessage(null);
    try {
      const amount = route.params?.amount;
      if (!amount || amount <= 0) {
        setErrorMessage(
          'Не удалось определить сумму к оплате. Вернитесь к заказу и попробуйте снова.',
        );
        setStatus('error');
        return;
      }

      const expireDate = new Date(
        Date.now() + SBP_PENDING_EXPIRE_MINUTES * 60 * 1000,
      );
      const payInfo = await createPay({
        orderId: `ORDER${orderId}`,
        orderName: `Заказ №${orderId}`,
        expire: expireDate,
        amount: {
          value: amount,
          code: 'RUB',
        },
        returnUrl: `https://totus.club/pay?orderId=${orderId}`,
      });

      const parsed = payInfo?.isAxiosError
        ? { payload: null, qrcId: null }
        : parseSbpPayResponse(payInfo);

      if (parsed.qrcId) {
        qrcIdRef.current = parsed.qrcId;
        await storeSbpQrcId(orderId, parsed.qrcId);
      }

      if (!parsed.payload) {
        setErrorMessage(getPayErrorMessage(payInfo));
        setStatus('error');
        return;
      }

      expireAtRef.current = Date.now() + SBP_PENDING_EXPIRE_MINUTES * 60 * 1000;
      paidRef.current = false;
      setStatus('pending');
      await openPayUrl(parsed.payload);
    } catch (e: any) {
      console.warn('retry createPay failed', e);
      setErrorMessage(getPayErrorMessage(e));
      setStatus('error');
    } finally {
      setRetrying(false);
    }
  }, [orderId, retrying, route.params?.amount, openPayUrl]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timerLabel = `${minutes}:${String(seconds).padStart(2, '0')}`;

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('OrdersStackScreen', { screen: 'orders' });
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader />
      <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <TabletCentered style={styles.contentColumnTablet}>
        {status === 'pending' && (
          <>
            <ActivityIndicator size="large" color={theme.brand} />
            <AppText style={[styles.title, { color: theme.text }]}>
              Ожидание оплаты
            </AppText>
            <AppText style={[styles.subtitle, { color: theme.textTertiary }]}>
              Оплатите заказ в банковском приложении. Мы автоматически
              проверим статус оплаты.
            </AppText>
            <AppText style={[styles.timer, { color: theme.text }]}>
              Осталось {timerLabel}
            </AppText>
            <AppButton
              title="Открыть оплату снова"
              size="large"
              type="outline"
              onPress={() =>
                route.params?.payUrl
                  ? openPayUrl(String(route.params.payUrl))
                  : handleRetry()
              }
            />
            <AppButton
              title="Закрыть"
              size="large"
              type="transparent"
              onPress={closeScreen}
            />
          </>
        )}

        {status === 'paid' && isInternalOrder && (
          <TotusBookingSuccess
            orderId={orderId}
            booking={totusBooking}
            amount={route.params?.amount ?? null}
          />
        )}

        {status === 'paid' && !isInternalOrder && (
          <>
            <AppText style={[styles.title, { color: theme.text }]}>
              Оплата прошла
            </AppText>
            <AppText style={[styles.subtitle, { color: theme.textTertiary }]}>
              Заказ успешно оплачен. Переходим к заказам…
            </AppText>
          </>
        )}

        {status === 'expired' && (
          <>
            <AppText style={[styles.title, { color: theme.text }]}>
              Время оплаты истекло
            </AppText>
            <AppText style={[styles.subtitle, { color: theme.textTertiary }]}>
              Создайте новый платёж или вернитесь к заказу.
            </AppText>
            <AppButton
              title={retrying ? 'Создаём…' : 'Создать новый платёж'}
              size="large"
              onPress={handleRetry}
              disabled={retrying}
              isProcessing={retrying}
            />
            <AppButton
              title="К заказу"
              size="large"
              type="outline"
              onPress={() =>
                navigation.navigate('checkout', { order_id: orderId })
              }
            />
          </>
        )}

        {status === 'error' && (
          <>
            <AppText style={[styles.title, { color: theme.text }]}>
              Оплата не создана
            </AppText>
            <AppText style={[styles.subtitle, { color: theme.textTertiary }]}>
              {errorMessage || 'Попробуйте ещё раз или вернитесь к заказу.'}
            </AppText>
            <AppButton
              title={retrying ? 'Создаём…' : 'Повторить'}
              size="large"
              onPress={handleRetry}
              disabled={retrying}
              isProcessing={retrying}
            />
            <AppButton
              title="К заказу"
              size="large"
              type="outline"
              onPress={() =>
                navigation.navigate('checkout', { order_id: orderId })
              }
            />
          </>
        )}
        </TabletCentered>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  timer: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  // iPad only: mirrors `content` alignment inside the centered column
  contentColumnTablet: {
    alignItems: 'center',
    gap: 16,
  },
});
