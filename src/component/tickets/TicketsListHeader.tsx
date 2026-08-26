import React from 'react';
import { View } from 'react-native';
import ListHeader from '../searchResult/ListHeader';

type TicketsListHeaderProps = {
  loading: boolean;
  sortedFlightsLength: number;
  selectedSortLabel: string;
  resultCount: number;
  onSortPress: () => void;
};

const TicketsListHeader: React.FC<TicketsListHeaderProps> = ({
  loading,
  sortedFlightsLength,
  selectedSortLabel,
  resultCount,
  onSortPress,
}) => {
  // Hide sort/count row while loading with no results, or when empty/error
  // state takes over the list body.
  if (loading && sortedFlightsLength === 0) {
    return null;
  }

  if (!loading && sortedFlightsLength === 0) {
    return null;
  }

  return (
    <View>
      <ListHeader
        selectedSortLabel={selectedSortLabel}
        resultCount={resultCount}
        resultText={`Найдено вариантов: ${resultCount}`}
        onSortPress={onSortPress}
      />
    </View>
  );
};

export default React.memo(TicketsListHeader);
