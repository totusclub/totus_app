import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../modules/store';
import { useTheme } from '../../hooks/useTheme';
import { SkeletonBox, SkeletonGroup } from '../UI';
import FiltersModalContent from './modals/FiltersModalContent';
import { countActiveFilters } from './filterChips';

/** Figma «iPad Landscape / List / Tours»: filters panel 280 pt wide, 24 pt from the screen edge. */
export const FILTERS_SIDEBAR_WIDTH = 280;

/** Нижнее меню лежит поверх экрана (на iPad перекрывает 72 pt, см. check-filters-above-tabbar) — карточка кончается над ним. */
const TAB_BAR_SPACE = 84;

const noop = () => undefined;

/**
 * iPad landscape only: persistent filters panel on the left of the hotel list.
 * Reuses the full filter state/apply logic of the phone sheet
 * (`FiltersModalContent`, variant «sidebar»). Never rendered on iPhone.
 * Макет «Выдача — вариант A» (02.11.2026): карточка на всю высоту колонки, заголовок
 * «Фильтры» и кнопка «Показать N отелей» закреплены, прокручиваются только разделы.
 */
const FiltersSidebarTablet: React.FC = () => {
  const { theme } = useTheme();
  const hotels = useSelector((state: RootState) => state.search.hotels);
  const hasFacets = Boolean(hotels?.filters);
  const loading = useSelector((state: RootState) => state.search.loading);
  const hotelsCount = hotels?.hotels_count;
  const activeCount = React.useMemo(() => countActiveFilters(hotels), [hotels]);

  return (
    <View style={styles.column}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
        ]}>
        {hasFacets && !loading ? (
          <FiltersModalContent
            onClose={noop}
            variant="sidebar"
            resultCount={hotelsCount}
            activeCount={activeCount}
          />
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
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    width: FILTERS_SIDEBAR_WIDTH,
    marginLeft: 24,
    alignSelf: 'stretch',
    paddingTop: 16,
    paddingBottom: TAB_BAR_SPACE,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  skeleton: {
    gap: 14,
    padding: 20,
  },
});

export default FiltersSidebarTablet;
