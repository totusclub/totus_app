import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../modules/store';
import { useTheme } from '../../hooks/useTheme';
import { SkeletonBox, SkeletonGroup } from '../UI';
import FiltersModalContent from './modals/FiltersModalContent';

/** Figma «iPad Landscape / List / Tours»: filters panel 280 pt wide, 24 pt from the screen edge. */
export const FILTERS_SIDEBAR_WIDTH = 280;

const noop = () => undefined;

/**
 * iPad landscape only: persistent filters panel on the left of the hotel list.
 * Reuses the full filter state/apply logic of the phone sheet
 * (`FiltersModalContent`, variant «sidebar»). Never rendered on iPhone.
 */
const FiltersSidebarTablet: React.FC = () => {
  const { theme } = useTheme();
  const hasFacets = useSelector((state: RootState) => Boolean(state.search.hotels?.filters));
  const loading = useSelector((state: RootState) => state.search.loading);
  const hotelsCount = useSelector((state: RootState) => state.search.hotels?.hotels_count);

  return (
    <View style={styles.column}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View
          style={[
            styles.card,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}>
          {hasFacets && !loading ? (
            <FiltersModalContent onClose={noop} variant="sidebar" resultCount={hotelsCount} />
          ) : (
            <SkeletonGroup>
              <View style={styles.skeleton}>
                <SkeletonBox width={90} height={22} />
                <SkeletonBox width={120} height={16} />
                <SkeletonBox width={232} height={24} radius={12} />
                <SkeletonBox width={70} height={16} />
                <SkeletonBox width={200} height={18} />
                <SkeletonBox width={200} height={18} />
                <SkeletonBox width={200} height={18} />
                <SkeletonBox width={80} height={16} />
                <SkeletonBox width={200} height={18} />
                <SkeletonBox width={200} height={18} />
                <SkeletonBox width={232} height={48} radius={24} />
              </View>
            </SkeletonGroup>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    width: FILTERS_SIDEBAR_WIDTH,
    marginLeft: 24,
    alignSelf: 'stretch',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  skeleton: {
    gap: 14,
  },
});

export default FiltersSidebarTablet;
