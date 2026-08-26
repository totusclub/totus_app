import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBox, SkeletonGroup } from '../UI/skeleton';
import { useTheme } from '../../hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type HotelCardSkeletonProps = {
  /** 'search' shows tags + price row, 'detail' shows address + embedded price footer. */
  variant?: 'search' | 'detail';
  imageHeight?: number;
};

/** Mirrors UI/hotelCard so the loading state keeps the card's real proportions. */
const HotelCardSkeleton: React.FC<HotelCardSkeletonProps> = ({
  variant = 'search',
  imageHeight = 200,
}) => {
  const { theme } = useTheme();
  const isDetail = variant === 'detail';
  const imageWidth = SCREEN_WIDTH - 48;

  return (
    <SkeletonGroup>
      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <SkeletonBox width={imageWidth} height={imageHeight} radius={8} />

        {isDetail ? (
          <View style={styles.paginationRow}>
            {[1, 2, 3, 4, 5].map(dot => (
              <SkeletonBox key={dot} width={8} height={8} radius={4} />
            ))}
          </View>
        ) : null}

        <View style={styles.content}>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <SkeletonBox key={star} width={16} height={16} radius={4} />
            ))}
          </View>

          <SkeletonBox width="80%" height={20} />

          <View style={styles.reviewRow}>
            <SkeletonBox width={40} height={24} radius={8} />
            {!isDetail ? <SkeletonBox width={18} height={18} radius={4} /> : null}
            <SkeletonBox width={16} height={16} radius={4} />
            <SkeletonBox width={92} height={18} />
          </View>

          {isDetail ? (
            <SkeletonBox width="65%" height={20} />
          ) : (
            <>
              <View style={styles.tagsContainer}>
                <SkeletonBox width={96} height={28} radius={16} />
                <SkeletonBox width={72} height={28} radius={16} />
                <SkeletonBox width={110} height={28} radius={16} />
              </View>

              <View style={styles.priceSection}>
                <SkeletonBox width={124} height={24} />
                <SkeletonBox width={132} height={18} />
              </View>
            </>
          )}
        </View>

        {isDetail ? (
          <View style={[styles.priceFooter, { borderTopColor: theme.border }]}>
            <View style={styles.priceFooterText}>
              <SkeletonBox width={110} height={22} />
              <SkeletonBox width={140} height={14} />
              <SkeletonBox width={120} height={13} />
            </View>
            <SkeletonBox width={132} height={40} radius={999} />
          </View>
        ) : null}
      </View>
    </SkeletonGroup>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  content: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 4,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  priceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceFooterText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
});

export default HotelCardSkeleton;
