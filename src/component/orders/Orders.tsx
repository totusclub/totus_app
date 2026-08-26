import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { AppHeader, AppText } from '../UI';
import type { RootState } from '../../modules/store';
import { useOrders } from '../../modules/hooks/useOrders';
import type { Order } from '../../types/orders';
import OrderListItem from './OrderListItem';
import OrderListItemSkeleton from './OrderListItemSkeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

const Orders: React.FC = () => {
  const { theme } = useTheme();
  const userId = useSelector((state: RootState) => state.auth.userId);
  const { orders, loading, refreshing, error, fetchOrders, handleRefresh } = useOrders(userId);

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [fetchOrders]),
  );

  const showSkeleton = loading && !refreshing;
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 36, backgroundColor: theme.background }]}>
      {/* <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBarBackground} /> */}
      <AppHeader />
      <FlatList
        data={showSkeleton ? Array.from({ length: 5 }) : orders}
        keyExtractor={(_, index) => showSkeleton ? `skeleton-${index}` : String((orders[index] as Order)?.id || index)}
        contentContainerStyle={styles.listContent}
        renderItem={({ index }) =>
          showSkeleton ? (
            <OrderListItemSkeleton />
          ) : (
            <OrderListItem order={orders[index] as Order} />
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.brand} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <AppText style={[styles.emptyTitle, { color: theme.text }]}>Пока нет заказов</AppText>
              <AppText style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
                Как только вы оформите тур, он появится здесь
              </AppText>
            </View>
          ) : null
        }
      />
      {!!error && (
        <View style={[styles.errorBanner, { backgroundColor: theme.error + '20', borderColor: theme.error }]}>
          <AppText style={[styles.errorText, { color: theme.error }]}>{error}</AppText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    paddingTop: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    textAlign: 'center',
  },
});

export default Orders;

