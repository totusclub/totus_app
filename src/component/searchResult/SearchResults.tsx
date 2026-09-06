import React, { useCallback } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { AppHeader } from '../UI';
import ResultList from './ResultList';
import SelectedFiltersRow from './SelectedFiltersRow';
import FiltersModal from './modals/FiltersModal';
import FiltersSidebarTablet from './FiltersSidebarTablet';
import { FiltersOpenProvider, useFiltersOpen } from './FiltersOpenContext';
import { useLayout } from '../../hooks/useLayout';

const SearchResultsContent: React.FC = () => {
  const { setAvailableHeight } = useFiltersOpen();
  // iPad landscape (Figma «iPad Landscape / List / Tours»): persistent filters
  // panel on the left instead of the bottom sheet. Phone / iPad portrait: unchanged.
  const { isTablet, isLandscape } = useLayout();
  const showSidebar = isTablet && isLandscape;

  // This wrapper already sits below the status bar (Content -> SafeAreaView),
  // so its height is the exact space the filter sheet may occupy.
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setAvailableHeight(event.nativeEvent.layout.height);
    },
    [setAvailableHeight],
  );

  if (showSidebar) {
    return (
      <View style={styles.wrapper} onLayout={handleLayout}>
        <View style={styles.container}>
          <AppHeader />
          <View style={styles.rowTablet}>
            <FiltersSidebarTablet />
            <View style={styles.mainTablet}>
              <SelectedFiltersRow />
              <ResultList />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      <View style={styles.container}>
        <AppHeader />
        {/* Теги выбранных фильтров (Figma: List / Tours) — закреплены между шапкой и списком */}
        <SelectedFiltersRow />
        <ResultList />
      </View>
      <FiltersModal />
    </View>
  );
};

export const SearchResults: React.FC = () => {
  return (
    <FiltersOpenProvider>
      <SearchResultsContent />
    </FiltersOpenProvider>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  /** iPad landscape: sidebar (280 + 24 margin) + list; the list keeps its own 24 pt padding. */
  rowTablet: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  mainTablet: {
    flex: 1,
    minWidth: 0,
  },
});
