import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { AppText } from '../UI';
import { DateOption } from '../../utils/hotelUtils/roomHelpers';
import { useTheme } from '../../hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type DateSelectorProps = {
  dates: DateOption[];
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
};

const DateSelector: React.FC<DateSelectorProps> = ({
  dates,
  selectedDate,
  onDateSelect,
}) => {
  const { theme } = useTheme();
  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollView}>
      {dates.map((dateOption) => {
        const isSelected = selectedDate === dateOption.date;
        return (
          <TouchableOpacity
            key={dateOption.date}
            style={[
              styles.dateCard,
              { backgroundColor: theme.cardBackground, borderColor: theme.border },
              isSelected && { backgroundColor: theme.brand, borderColor: theme.brand },
            ]}
            onPress={() => onDateSelect(dateOption.date)}>
            <AppText
              style={[
                styles.dateText,
                { color: theme.text },
                isSelected && { color: theme.textInverse },
              ]}>
              {dateOption.formattedDate}, {dateOption.dayOfWeek}
            </AppText>
            <AppText
              style={[
                styles.priceText,
                { color: theme.textTertiary },
                isSelected && { color: theme.textInverse },
              ]}>
              от {formatPrice(dateOption.minPrice)} ₽
            </AppText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    marginHorizontal: -8,
  },
  container: {
    paddingHorizontal: 16,
    gap: 12,
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
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default DateSelector;

