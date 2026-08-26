import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBox, SkeletonGroup } from '../UI';
import { useTheme } from '../../hooks/useTheme';

/** Mirrors the real list header: SelectedTourCard + sort/count row. */
const TicketsListHeaderSkeleton: React.FC = () => {
  const { theme } = useTheme();

  return (
    <SkeletonGroup>
      <View
        style={[
          styles.tourCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}>
        <View style={styles.badgeRow}>
          <SkeletonBox width={140} height={26} radius={999} />
        </View>

        <View style={styles.body}>
          <SkeletonBox width={92} height={92} radius={18} />

          <View style={styles.info}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(star => (
                <SkeletonBox key={star} width={12} height={12} radius={6} />
              ))}
            </View>
            <SkeletonBox width="80%" height={20} />
            <SkeletonBox width="55%" height={17} />
            <SkeletonBox width="70%" height={17} />
            <SkeletonBox width="45%" height={16} />
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

        <View style={styles.priceRow}>
          <SkeletonBox width={132} height={17} />
          <View style={styles.priceValues}>
            <SkeletonBox width={104} height={22} />
            <SkeletonBox width={86} height={14} />
          </View>
        </View>
      </View>

      <View style={styles.sortRow}>
        <SkeletonBox width={150} height={38} radius={18} />
        <SkeletonBox width={126} height={16} />
      </View>
    </SkeletonGroup>
  );
};

const styles = StyleSheet.create({
  tourCard: {
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  body: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingTop: 2,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceValues: {
    alignItems: 'flex-end',
    gap: 2,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default TicketsListHeaderSkeleton;
