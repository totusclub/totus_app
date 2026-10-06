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
import { getOrdersUsers } from '../../modules/api/levelTravelApi';
import type { Order } from '../../types';
import { sortOrdersNewestFirst } from '../../utils/ordersUtils';

/** The request is not cancelled, but the screen stops waiting (no endless spinner on a bad network). */
const ORDERS_LOAD_TIMEOUT_MS = 30000;

/**
 * Last loaded list of this app session (memory only, never AsyncStorage: full Level.Travel
 * packages are large). Reopening the tab / screen shows it at once and refreshes in background.
 */
let lastOrders: { userId: string; orders: Order[] } | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('orders_timeout')), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
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
  const [loading, setLoading] = useState(false);
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
    if (!isLoggedIn || !userId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    // Spinner only when there is nothing to show yet; otherwise the list stays and updates.
    const hasShownList =
      ordersRef.current.length > 0 || (lastOrders != null && lastOrders.userId === userId);
    if (!hasShownList) setLoading(true);
    try {
      const data = await withTimeout(getOrdersUsers(Number(userId)), ORDERS_LOAD_TIMEOUT_MS);
      if (!mounted.current || seq !== requestSeq.current) return; // a newer request owns the list
      const next = Array.isArray(data) ? sortOrdersNewestFirst(data) : [];
      lastOrders = { userId, orders: next };
      setOrders(next);
    } catch {
      if (!mounted.current || seq !== requestSeq.current) return;
      // Keep the list that is already on screen; empty only when nothing was loaded before (as before).
      if (!hasShownList) setOrders([]);
    } finally {
      if (mounted.current && seq === requestSeq.current) setLoading(false);
    }
  }, [isLoggedIn, userId]);

  useEffect(() => {
    if (!isLoggedIn) lastOrders = null; // logout: never show the previous user's orders
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
        <ActivityIndicator color={theme.brand} style={{ marginTop: 40 }} />
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
            <AppText style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 40 }}>
              Заказов пока нет
            </AppText>
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
  title: { fontSize: 24, fontWeight: '700', paddingHorizontal: 16, marginBottom: 12 },
  // iPad grid: 24 screen padding = 16 (list) + 8 (cell); 16 gap between columns = 8 + 8.
  titleTablet: { paddingHorizontal: 24 },
  rowTablet: { alignItems: 'flex-start' },
  cellTablet: { flex: 1, paddingHorizontal: 8 },
});

export default OrdersScreen;
