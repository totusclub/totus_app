import React, { useCallback } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { AppHeader } from '../UI';
import ResultList from './ResultList';
import SelectedFiltersRow from './SelectedFiltersRow';
import FiltersModal from './modals/FiltersModal';
import { FiltersOpenProvider, useFiltersOpen } from './FiltersOpenContext';

const SearchResultsContent: React.FC = () => {
  const { setAvailableHeight } = useFiltersOpen();

  // This wrapper already sits below the status bar (Content -> SafeAreaView),
  // so its height is the exact space the filter sheet may occupy.
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setAvailableHeight(event.nativeEvent.layout.height);
    },
    [setAvailableHeight],
  );

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
});
