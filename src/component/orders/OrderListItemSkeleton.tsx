import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox, SkeletonGroup } from '../UI';
import { useTheme } from '../../hooks/useTheme';

/** Mirrors OrderListItem: header + status, price block, divider, tour details. */
const OrderListItemSkeleton: React.FC = () => {
  const { theme } = useTheme();

  return (
    <SkeletonGroup>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}>
        <View style={styles.cardHeader}>
          <SkeletonBox width="55%" height={20} style={styles.cardTitle} />
          <SkeletonBox width={104} height={24} radius={15} />
        </View>

        <SkeletonBox width={128} height={18} style={styles.cardDate} />
        <SkeletonBox width={112} height={18} style={styles.price} />
        <SkeletonBox width={136} height={18} style={styles.payment} />

        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        <SkeletonBox width="85%" height={18} />
        <SkeletonBox width="70%" height={18} style={styles.period} />
        <SkeletonBox width="60%" height={18} style={styles.departure} />
        <SkeletonBox width="75%" height={17} />
      </View>
    </SkeletonGroup>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'space-between',
  },
  cardTitle: {
    flex: 1,
  },
  cardDate: {
    marginTop: 4,
  },
  price: {
    marginTop: 4,
  },
  payment: {
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginTop: 4,
    marginBottom: 24,
  },
  period: {
    marginTop: 8,
    marginBottom: 8,
  },
  departure: {
    marginBottom: 8,
  },
});

export default OrderListItemSkeleton;
