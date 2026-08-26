import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox, SkeletonGroup } from '../UI';
import { useTheme } from '../../hooks/useTheme';

/** Mirrors FlightCardView: two segment rows, badges, price + arrow footer. */
const FlightCardSkeleton: React.FC = () => {
  const { theme } = useTheme();

  const renderSegment = (isLast: boolean) => (
    <View
      style={[
        styles.segmentBlock,
        { borderBottomColor: theme.borderLight },
        isLast && styles.segmentBlockLast,
      ]}>
      <SkeletonBox width={64} height={14} />

      <View style={styles.segmentRow}>
        <SkeletonBox width={44} height={44} radius={8} />

        <View style={styles.segmentContent}>
          <View style={styles.topRow}>
            <View style={styles.timesBlock}>
              <SkeletonBox width={120} height={20} />
              <SkeletonBox width={90} height={16} />
            </View>
            <View style={styles.durationBlock}>
              <SkeletonBox width={56} height={18} />
              <SkeletonBox width={78} height={16} />
            </View>
          </View>

          <View style={styles.bottomRow}>
            <SkeletonBox width={104} height={16} />
            <View style={styles.routeBlock}>
              <SkeletonBox width={116} height={17} />
              <SkeletonBox width={88} height={16} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );

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
        <SkeletonBox width={128} height={14} />

        {renderSegment(false)}
        {renderSegment(true)}

        <View style={styles.badgesRow}>
          <SkeletonBox width={96} height={26} radius={12} />
          <SkeletonBox width={72} height={26} radius={12} />
          <SkeletonBox width={110} height={26} radius={12} />
        </View>

        <View style={styles.footer}>
          <View style={styles.priceBlock}>
            <SkeletonBox width={128} height={24} />
            <SkeletonBox width={104} height={18} />
            <SkeletonBox width={136} height={17} />
          </View>
          <SkeletonBox width={44} height={44} radius={22} style={styles.arrowButton} />
        </View>
      </View>
    </SkeletonGroup>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  segmentBlock: {
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentBlockLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  segmentContent: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  timesBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  durationBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  priceBlock: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  arrowButton: {
    marginLeft: 12,
  },
});

export default FlightCardSkeleton;
