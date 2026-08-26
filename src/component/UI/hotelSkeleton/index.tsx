import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import AppHeader from '../header';
import { SkeletonBox, SkeletonGroup } from '../skeleton';
import HotelCardSkeleton from '../../searchResult/HotelCardSkeleton';
import RoomsSectionSkeleton from '../../hotel/RoomsSectionSkeleton';
import { useTheme } from '../../../hooks/useTheme';

/** Mirrors the hotel screen: gallery card with price footer, search card, rooms, description. */
const HotelSkeleton: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.backgroundSecondary }]}>
      <AppHeader />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <HotelCardSkeleton variant="detail" />

          <SkeletonGroup>
            <View style={[styles.searchCard, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.searchRow}>
                <View style={styles.searchField}>
                  <SkeletonBox width={80} height={14} />
                  <SkeletonBox width={110} height={20} />
                </View>
                <View style={styles.searchField}>
                  <SkeletonBox width={64} height={14} />
                  <SkeletonBox width={92} height={20} />
                </View>
              </View>
              <View style={styles.searchField}>
                <SkeletonBox width={96} height={14} />
                <SkeletonBox width={150} height={20} />
              </View>
              <SkeletonBox height={52} radius={999} />
            </View>
          </SkeletonGroup>

          <RoomsSectionSkeleton />

          <SkeletonGroup>
            <View style={[styles.descriptionCard, { backgroundColor: theme.cardBackground }]}>
              <View style={[styles.descriptionHeader, { borderBottomColor: theme.borderLight }]}>
                <SkeletonBox width={110} height={20} />
              </View>

              <SkeletonBox height={20} />
              <SkeletonBox height={20} />
              <SkeletonBox width="70%" height={20} />

              <View style={[styles.sectionsContainer, { borderTopColor: theme.borderLight }]}>
                {[1, 2, 3, 4].map(section => (
                  <View key={`section-${section}`} style={styles.sectionRow}>
                    <SkeletonBox width="55%" height={20} />
                    <SkeletonBox width={16} height={16} radius={4} />
                  </View>
                ))}
              </View>
            </View>
          </SkeletonGroup>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 8,
    paddingTop: 20,
    paddingBottom: 100,
    gap: 24,
  },
  searchCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  searchField: {
    flex: 1,
    gap: 6,
  },
  descriptionCard: {
    borderRadius: 24,
    padding: 16,
    gap: 16,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  descriptionHeader: {
    borderBottomWidth: 1,
    paddingBottom: 16,
  },
  sectionsContainer: {
    borderTopWidth: 1,
    paddingTop: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
});

export default HotelSkeleton;
