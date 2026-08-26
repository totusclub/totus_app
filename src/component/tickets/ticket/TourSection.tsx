import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../UI';
import {
  formatDateRange,
  formatNightsText,
  formatTouristsText,
} from '../../../utils/ticketsUtils/tourDetailsUtils';
import type { TourDetails } from '../../../types/tickets';
import { useTheme } from '../../../hooks/useTheme';

type TourSectionProps = {
  tourDetails: TourDetails;
};

const TourSection: React.FC<TourSectionProps> = ({ tourDetails }) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.tourSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <AppText style={[styles.tourSectionTitle, { color: theme.text }]}>Тур</AppText>

      <View style={[styles.tourContent, { backgroundColor: theme.backgroundSecondary }]}>
        {/* Resort */}
        <View style={[styles.tourItem, { borderBottomColor: theme.divider }]}>
          <AppText style={[styles.tourLabel, { color: theme.text }]}>Курорт</AppText>
          <AppText style={[styles.tourValue, { color: theme.textTertiary }]}>
            {tourDetails.resort.country && tourDetails.resort.city
              ? `${tourDetails.resort.country}, ${tourDetails.resort.city}`
              : tourDetails.resort.country || tourDetails.resort.city || ''}
          </AppText>
        </View>

        {/* Flight dates */}
        <View style={[styles.tourItem, { borderBottomColor: theme.divider }]}>
          <AppText style={[styles.tourLabel, { color: theme.text }]}>Даты перелёта</AppText>
          <View style={styles.tourValueRow}>
            <AppText style={[styles.tourValue, { color: theme.textTertiary }]}>
              {formatDateRange(
                tourDetails.flightDates.startDate,
                tourDetails.flightDates.nights,
              )}
            </AppText>
            <AppText style={[styles.tourNights, { color: theme.text }]}>
              {formatNightsText(tourDetails.flightDates.nights)}
            </AppText>
          </View>
        </View>

        {/* Tourists */}
        <View style={[styles.tourItem, { borderBottomColor: theme.divider }]}>
          <AppText style={[styles.tourLabel, { color: theme.text }]}>Туристы</AppText>
          <AppText style={[styles.tourValue, { color: theme.textTertiary }]}>
            {formatTouristsText(
              tourDetails.tourists.adults,
              tourDetails.tourists.kids,
              tourDetails.tourists.kidsAges,
            )}
          </AppText>
        </View>

        {/* Hotel */}
        <View style={[styles.tourItem, { borderBottomColor: theme.divider }]}>
          <AppText style={[styles.tourLabel, { color: theme.text }]}>Отель</AppText>
          <AppText style={[styles.tourValue, { color: theme.textTertiary }]}>{tourDetails.hotel.name}</AppText>
        </View>

        {/* Room */}
        {tourDetails.room.name && (
          <View style={[styles.tourItem, { borderBottomColor: theme.divider }]}>
            <AppText style={[styles.tourLabel, { color: theme.text }]}>Номер</AppText>
            <AppText style={[styles.tourValue, { color: theme.textTertiary }]}>{tourDetails.room.name}</AppText>
          </View>
        )}

        {/* Meals */}
        <View style={[styles.tourItem, { borderBottomColor: theme.divider }]}>
          <AppText style={[styles.tourLabel, { color: theme.text }]}>Питание</AppText>
          <AppText style={[styles.tourValue, { color: theme.textTertiary }]}>{tourDetails.meals}</AppText>
        </View>

        {/* Transfer */}
        {tourDetails.transfer.included !== undefined && (
          <View style={[styles.tourItem, { borderBottomColor: theme.divider }]}>
            <AppText style={[styles.tourLabel, { color: theme.text }]}>Трансфер</AppText>
            <AppText style={[styles.tourValue, { color: theme.textTertiary }]}>
              {tourDetails.transfer.included
                ? 'Включен в стоимость'
                : 'Не включен в стоимость'}
            </AppText>
          </View>
        )}

        {/* Insurance */}
        {tourDetails.insurance.included !== undefined && (
          <View style={[styles.tourItem, { borderBottomColor: theme.divider }]}>
            <AppText style={[styles.tourLabel, { color: theme.text }]}>Страховка</AppText>
            <AppText style={[styles.tourValue, { color: theme.textTertiary }]}>
              {tourDetails.insurance.included
                ? 'Включена в стоимость'
                : 'Не включена в стоимость'}
            </AppText>
          </View>
        )}

        {/* Operator */}
        <View style={[styles.tourItem, styles.tourItemLast]}>
          <AppText style={[styles.tourLabel, { color: theme.text }]}>Туроператор</AppText>
          <AppText style={[styles.tourValue, { color: theme.textTertiary }]}>{tourDetails.operator}</AppText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tourSection: {
    marginTop: 32,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  tourSectionTitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  tourContent: {
    flexDirection: 'column',
    alignSelf: 'stretch',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tourItem: {
    padding: 16,
    alignItems: 'flex-start',
    flexDirection: 'column',
    alignSelf: 'stretch',
    borderBottomWidth: 1,
  },
  tourItemLast: {
    borderBottomWidth: 0,
  },
  tourLabel: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 4,
  },
  tourValue: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  tourValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginBottom: 4,
  },
  tourNights: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
});

export default TourSection;

