import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBox, SkeletonGroup } from '../UI/skeleton';
import { useTheme } from '../../hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ROOM_IMAGE_HEIGHT = 200;

/** Mirrors HotelRoomsSection: title + filters, date tabs, room cards. */
const RoomsSectionSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const imageWidth = SCREEN_WIDTH - 16;

  return (
    <View style={styles.container}>
      <SkeletonGroup>
        <View style={styles.headerRow}>
          <SkeletonBox width={140} height={20} />
          <SkeletonBox width={96} height={32} radius={16} />
        </View>

        <View style={styles.dateRow}>
          {[1, 2, 3].map(index => (
            <View
              key={`date-${index}`}
              style={[styles.dateCard, { borderColor: theme.border }]}>
              <SkeletonBox width={88} height={18} />
              <SkeletonBox width={64} height={18} />
            </View>
          ))}
        </View>
      </SkeletonGroup>

      <View style={styles.roomsContainer}>
        {[1, 2, 3].map(index => (
          <SkeletonGroup key={`room-${index}`}>
            <View style={[styles.roomCard, { backgroundColor: theme.cardBackground }]}>
              <SkeletonBox width={imageWidth} height={ROOM_IMAGE_HEIGHT} radius={0} />

              <View style={styles.paginationRow}>
                {[1, 2, 3, 4, 5].map(dot => (
                  <SkeletonBox key={dot} width={8} height={8} radius={4} />
                ))}
              </View>

              <View style={styles.roomCardHeader}>
                <SkeletonBox width="75%" height={20} />
              </View>

              <View style={styles.moreDetailsLink}>
                <SkeletonBox width={158} height={18} />
              </View>

              <View style={styles.featuresContainer}>
                {[1, 2, 3].map(feature => (
                  <View key={`feature-${feature}`} style={styles.featureItem}>
                    <SkeletonBox width={16} height={16} radius={4} />
                    <SkeletonBox width="70%" height={16} />
                  </View>
                ))}
              </View>

              <View style={styles.content}>
                <View style={styles.priceWrap}>
                  <SkeletonBox width={124} height={24} />
                  <SkeletonBox width={168} height={20} />
                </View>
                <SkeletonBox height={56} radius={999} />
              </View>
            </View>
          </SkeletonGroup>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 16,
    gap: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  dateCard: {
    minWidth: 120,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  roomsContainer: {
    gap: 16,
  },
  roomCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 8,
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
  roomCardHeader: {
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  moreDetailsLink: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  featuresContainer: {
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  content: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  priceWrap: {
    gap: 4,
    marginTop: 4,
  },
});

export default RoomsSectionSkeleton;
