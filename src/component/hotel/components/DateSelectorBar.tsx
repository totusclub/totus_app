import React from 'react';
import { View, StyleSheet } from 'react-native';
import DateSelector from '../DateSelector';

type DateSelectorBarProps = {
  dateOptions: Array<{ date: string; formattedDate: string; dayOfWeek: string; minPrice: number }>;
  selectedDate: string | null;
  onSelect: (date: string) => void;
};

export default function DateSelectorBar({
  dateOptions,
  selectedDate,
  onSelect,
}: DateSelectorBarProps) {
  // Match kedam-WEB: date tabs removed when only one fixed departure date.
  if (dateOptions.length <= 1) return null;

  return (
    <View style={styles.container}>
      <DateSelector
        dates={dateOptions}
        selectedDate={selectedDate}
        onDateSelect={onSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
});

