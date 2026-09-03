import React, { useMemo } from 'react'
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native'
import AppIcon from '../icons'
import AppText from '../text'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { RootState } from '../../../modules/store'
import { useTheme } from '../../../hooks/useTheme'
import { useFiltersOpen } from '../../searchResult/FiltersOpenContext'
import { formatTouristsText } from '../../home/searchSection/utils/searchHelpers'
import { countActiveFilters } from '../../searchResult/filterChips'

const FILTERS_BADGE_COLOR = '#CF3030';
const FILTERS_BADGE_TEXT_COLOR = '#FFFFFF';

// Format date from YYYY-MM-DD to "17 мая" format
const formatDateToRussian = (dateStr: string | undefined): string => {
  if (!dateStr) return '';

  const russianMonths = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];

  try {
    const [year, month, day] = dateStr.split('-');
    const monthName = russianMonths[parseInt(month, 10) - 1];
    return `${parseInt(day, 10)} ${monthName}`;
  } catch (error) {
    return dateStr;
  }
};

// Parse nights (handle "7..9" format or single number)
const parseNights = (nights: string | number | undefined): string => {
  if (!nights && nights !== 0) return '';
  const str = String(nights);

  if (str.includes('..')) {
    // Return first number for display
    return str.split('..')[0];
  }

  // Remove non-numeric characters
  return str.replace(/[^0-9]/g, '');
};

export default function SearchResultHeader() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { open: openFilters, bodyReady } = useFiltersOpen();

  const { headerName, searchParams, hotels } = useSelector(
    (state: RootState) => state.search,
  );

  // Number of applied list filters — shown as a badge on the filters icon
  const activeFiltersCount = useMemo(() => countActiveFilters(hotels), [hotels]);

  // Format the date text
  const dateText = useMemo(() => {
    if (!searchParams) return '';

    const parts: string[] = [];

    // Add date
    if (searchParams.start_date) {
      const formattedDate = formatDateToRussian(searchParams.start_date);
      if (formattedDate) {
        parts.push(formattedDate);
      }
    }

    // Add nights
    if (searchParams.nights) {
      const nightsValue = parseNights(searchParams.nights);
      if (nightsValue) {
        parts.push(`${nightsValue} ночей`);
      }
    }

    // Add tourists count — adults only → «взрослых»; with kids → «человек»
    const adults = parseInt(searchParams.adults || '0', 10);
    const kids = parseInt(searchParams.kids || '0', 10);
    const touristsLabel = formatTouristsText(String(adults), String(kids));
    if (adults + kids > 0) {
      parts.push(touristsLabel);
    }

    return parts.join(', ');
  }, [searchParams]);

  // Get destination name (prefer headerName, fallback to to_city or to_country)
  const destinationName = useMemo(() => {
    if (headerName) return headerName;
    if (searchParams?.to_city) return searchParams.to_city;
    if (searchParams?.to_country) return searchParams.to_country;
    return '';
  }, [headerName, searchParams]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, borderBottomColor: theme.borderLight }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
        <AppIcon name="simpleArrow" size={24} color={theme.text} />
      </TouchableOpacity>
      <View style={styles.textContainer}>
        <AppText style={[styles.destinationText, { color: theme.text }]}>
          {destinationName || 'Выберите направление'}
        </AppText>
        {dateText ? (
          <AppText style={[styles.dateText, { color: theme.textTertiary }]}>{dateText}</AppText>
        ) : null}
      </View>
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={openFilters}
        disabled={!bodyReady}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        style={[styles.filterButton, !bodyReady && styles.filterButtonDisabled]}>
        {bodyReady ? (
          <AppIcon name="filters" size={24} color={theme.text} />
        ) : (
          <ActivityIndicator size="small" color={theme.brand} />
        )}
        {bodyReady && activeFiltersCount > 0 ? (
          <View style={styles.filtersBadge} pointerEvents="none">
            <AppText style={styles.filtersBadgeText}>
              {activeFiltersCount > 99 ? '99+' : String(activeFiltersCount)}
            </AppText>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  )
}


const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    padding: 8,
    borderBottomWidth: 2,
  },
  textContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  filterButton: {
    padding: 4,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonDisabled: {
    opacity: 0.55,
  },
  filtersBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: FILTERS_BADGE_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500',
    color: FILTERS_BADGE_TEXT_COLOR,
    letterSpacing: 0,
  },
});
