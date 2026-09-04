import React, { useCallback, useEffect, useState } from 'react';
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !user?.id) {
      setOrders([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getOrdersUsers(Number(user.id));
      setOrders(Array.isArray(data) ? sortOrdersNewestFirst(data) : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

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
          keyExtractor={(item, index) => String((item as any)?.id ?? index)}
          renderItem={({ item }) => wrapTablet(<OrderListItem order={item} />)}
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
