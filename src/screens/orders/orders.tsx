import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../component/UI';
import OrderListItem from '../../component/orders/OrderListItem';
import { useTheme } from '../../hooks/useTheme';
import { useLayout } from '../../hooks/useLayout';
import { RootState } from '../../modules/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get } from '../../modules/axios';
import type { Order } from '../../types';
import { sortOrdersNewestFirst } from '../../utils/ordersUtils';
import { FONT_HEADING } from '../../theme/fonts';

/** After this long the spinner explains itself; the request keeps going and its answer is still shown. */
const ORDERS_SLOW_MS = 15000;

/**
 * Last loaded list. In memory for this app session and in AsyncStorage between launches, so the
 * screen opens with the list at once and refreshes it in background. The list comes from
 * GET /user/orders?view=list (only the fields of a card, a few KB per order); a full answer
 * (old server) is kept in memory only if it is too large to store.
 */
const ORDERS_STORAGE_KEY = 'orders:list';
const ORDERS_STORAGE_MAX_CHARS = 400000;
let lastOrders: { userId: string; orders: Order[] } | null = null;

async function readStoredOrders(userId: string): Promise<Order[] | null> {
  try {
    const raw = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { userId?: string; orders?: unknown };
    if (!saved || saved.userId !== userId || !Array.isArray(saved.orders)) return null;
    return saved.orders as Order[];
  } catch {
    return null;
  }
}

function storeOrders(userId: string, orders: Order[]): void {
  try {
    const raw = JSON.stringify({ userId, orders });
    if (raw.length > ORDERS_STORAGE_MAX_CHARS) return;
    AsyncStorage.setItem(ORDERS_STORAGE_KEY, raw).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

function clearStoredOrders(): void {
  lastOrders = null;
  AsyncStorage.removeItem(ORDERS_STORAGE_KEY).catch(() => undefined);
}

/** Light list for the cards; the details screen still loads the full order (GET /orders). */
async function fetchOrdersList(userId: string): Promise<Order[]> {
  const response = await get<Order[]>('/user/orders', { user_id: Number(userId), view: 'list' });
  return Array.isArray(response.data) ? response.data : [];
}

const OrdersScreen = () => {
  const { theme } = useTheme();
  // iPad only: order cards in a 2/3-column grid; on phone everything below is a passthrough.
  const { isTablet, columns } = useLayout();
  const tabletCellStyle = [styles.cellTablet, { maxWidth: `${100 / columns}%` as `${number}%` }];
  const wrapTablet = (node: React.ReactElement) =>
    isTablet ? <View style={tabletCellStyle}>{node}</View> : node;
  const tabletListProps = isTablet
    ? { numColumns: columns, columnWrapperStyle: styles.rowTablet }
    : {};
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const auth = useSelector((state: RootState) => state.auth);
  const accessToken = auth.accessToken;
  const user = auth.user as { id?: string | number } | null;
  // The list depends on WHO is logged in, not on the token string: a token refresh used to
  // start a second, parallel /user/orders request.
  const isLoggedIn = Boolean(accessToken);
  const userId = user?.id != null && user.id !== '' ? String(user.id) : null;
  const cached = lastOrders && userId && lastOrders.userId === userId ? lastOrders.orders : null;
  const [orders, setOrders] = useState<Order[]>(cached ?? []);
  const [loaded, setLoaded] = useState(Boolean(cached));
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestSeq = useRef(0);
  const mounted = useRef(true);
  const ordersRef = useRef<Order[]>(orders);
  ordersRef.current = orders;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    const isCurrent = () => mounted.current && seq === requestSeq.current;
    if (!isLoggedIn || !userId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setFailed(false);
    setSlow(false);

    // 1. Show what we already have: memory, otherwise the list saved on the previous launch.
    if (ordersRef.current.length === 0) {
      const stored =
        lastOrders && lastOrders.userId === userId ? lastOrders.orders : await readStoredOrders(userId);
      if (!isCurrent()) return;
      if (stored && stored.length) {
        setOrders(stored);
        setLoaded(true);
      }
    }
    const hasShownList = ordersRef.current.length > 0 || (lastOrders != null && lastOrders.userId === userId);
    // Spinner only when there is nothing to show yet; otherwise the list stays and updates.
    if (!hasShownList) setLoading(true);
    const slowTimer = setTimeout(() => {
      if (isCurrent()) setSlow(true);
    }, ORDERS_SLOW_MS);

    // 2. Refresh. No timeout that throws the answer away: a slow answer is still shown when it comes.
    try {
      const data = await fetchOrdersList(userId);
      if (!isCurrent()) return; // a newer request owns the list
      const next = sortOrdersNewestFirst(data);
      lastOrders = { userId, orders: next };
      storeOrders(userId, next);
      setOrders(next);
      setLoaded(true);
    } catch {
      if (!isCurrent()) return;
      // Keep the list that is on screen; with nothing on screen show the error, not «Заказов пока нет».
      setFailed(true);
    } finally {
      clearTimeout(slowTimer);
      if (isCurrent()) {
        setLoading(false);
        setSlow(false);
      }
    }
  }, [isLoggedIn, userId]);

  useEffect(() => {
    if (!isLoggedIn) clearStoredOrders(); // logout: never show the previous user's orders
    void load();
  }, [load, isLoggedIn]);

  const keyExtractor = useCallback(
    (item: Order, index: number) => String((item as any)?.id ?? (item as any)?.order_id ?? index),
    [],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!accessToken) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <AppText style={{ color: theme.text }}>Войдите, чтобы видеть заказы</AppText>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('tab', {
              screen: 'AccountStackScreen',
              params: { screen: 'login' },
            })
          }
          style={{ marginTop: 16 }}>
          <AppText style={{ color: theme.brand }}>Войти</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <AppText style={[styles.title, isTablet && styles.titleTablet, { color: theme.text }]}>Заказы</AppText>
      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.brand} />
          {slow && (
            <>
              <AppText style={[styles.stateText, { color: theme.textSecondary }]}>
                Загружаем заказы — это дольше обычного
              </AppText>
              <TouchableOpacity onPress={() => void load()} style={styles.stateAction}>
                <AppText style={{ color: theme.brand }}>Повторить</AppText>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <FlatList
          key={isTablet ? `cols-${columns}` : undefined}
          {...tabletListProps}
          data={orders}
          keyExtractor={keyExtractor}
          renderItem={({ item }) => wrapTablet(<OrderListItem order={item} />)}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />
          }
          ListEmptyComponent={
            failed || !loaded ? (
              // Not loaded yet / the request failed: never claim there are no orders.
              <View style={styles.loadingBox}>
                <AppText style={[styles.stateText, { color: theme.textSecondary }]}>
                  Не удалось загрузить заказы
                </AppText>
                <TouchableOpacity onPress={() => void load()} style={styles.stateAction}>
                  <AppText style={{ color: theme.brand }}>Повторить</AppText>
                </TouchableOpacity>
              </View>
            ) : (
              <AppText style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 40 }}>
                Заказов пока нет
              </AppText>
            )
          }
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FONT_HEADING, fontSize: 24, fontWeight: '700', paddingHorizontal: 16, marginBottom: 12 },
  // iPad grid: 24 screen padding = 16 (list) + 8 (cell); 16 gap between columns = 8 + 8.
  titleTablet: { paddingHorizontal: 24 },
  rowTablet: { alignItems: 'flex-start' },
  cellTablet: { flex: 1, paddingHorizontal: 8 },
  loadingBox: { alignItems: 'center', marginTop: 40, paddingHorizontal: 24 },
  stateText: { textAlign: 'center', marginTop: 12 },
  stateAction: { marginTop: 12, padding: 8 },
});

export default OrdersScreen;
