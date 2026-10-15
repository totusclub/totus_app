import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppIcon, AppText } from '../UI';
import { AppDispatch, RootState } from '../../modules/store';
import { searchFilters, setAllMyHotels } from '../../modules/store/slices/search';
import { useTheme } from '../../hooks/useTheme';
import { withSearchTypeFilters } from '../../utils/searchParamsUtils';
import { useLayout } from '../../hooks/useLayout';
import {
  FilterChip,
  buildFilterChips,
  pickAppliedListFilters,
  removeChipFromParams,
} from './filterChips';

const CHIP_TEXT_COLOR = '#FFFFFF';

/**
 * Horizontal row of the currently applied list filters (Figma "List / Tours").
 * Tapping a chip removes that single filter value and refetches the list.
 * Renders nothing while the first search is loading or when no filters are active.
 */
const SelectedFiltersRow: React.FC = () => {
  const { theme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  // iPad: chips aligned with the 24 pt card grid (phone keeps 12).
  const { isTablet } = useLayout();

  // Narrow selectors — whole `search` slice re-renders on every progress tick.
  const hotels = useSelector((state: RootState) => state.search.hotels);
  const requestId = useSelector((state: RootState) => state.search.requestId);
  const loading = useSelector((state: RootState) => state.search.loading);
  const searchType = useSelector(
    (state: RootState) => state.search.searchParams?.search_type,
  );

  const chips = useMemo(() => buildFilterChips(hotels), [hotels]);

  const handleRemove = (chip: FilterChip) => {
    // Same request shape as ResultList.handleSortSelect / handleResetFilters.
    const operators = hotels?.readyOperators || [];
    if (!requestId || !operators || operators.length === 0) {
      console.warn('Missing requestId or operators for removing filter');
      return;
    }

    const filterParams: Record<string, unknown> = {
      request_id: requestId,
      readyOperators: operators,
      page_number: 1,
      page_limit: 20,
      sort_by: hotels?.sort_by || 'relevance',
      ...removeChipFromParams(pickAppliedListFilters(hotels), chip, hotels),
    };

    dispatch(setAllMyHotels([]));
    dispatch(
      searchFilters(
        withSearchTypeFilters(
          searchType || hotels?.search_type,
          filterParams,
        ) as any,
      ),
    );
  };

  if (!hotels || chips.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.content, isTablet && styles.contentTablet]}
        keyboardShouldPersistTaps="handled">
        {chips.map(chip => (
          <TouchableOpacity
            key={`${chip.key}:${chip.value ?? ''}`}
            activeOpacity={0.7}
            disabled={loading}
            onPress={() => handleRemove(chip)}
            style={[styles.chip, { backgroundColor: theme.brand }]}>
            <AppIcon name="close" size={20} color={CHIP_TEXT_COLOR} />
            <AppText style={styles.chipText} numberOfLines={1}>
              {chip.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default SelectedFiltersRow;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  contentTablet: {
    paddingHorizontal: 24,
  },
  chip: {
    height: 28,
    borderRadius: 200,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    color: CHIP_TEXT_COLOR,
  },
});
