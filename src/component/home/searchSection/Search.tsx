import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { AppText } from '../../UI';
import AppButton from '../../UI/button';
import OriginField from './OriginField';
import DestinationField from './DestinationField';
import DateField from './DateField';
import NightsField from './NightsField';
import TouristsField from './TouristsField';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import {
  runFullSearchFlow,
  setHeaderName,
  clearSearch,
} from '../../../modules/store/slices/search';
import { fetchDepartures } from '../../../modules/store/slices/departures';
import { fetchDestinations } from '../../../modules/store/slices/destinations';
import { RootState, AppDispatch } from '../../../modules/store';
import type { DestinationResult } from '../../../types/destinations';
import type { Departure } from '../../../types/departures';
import type { SearchParams } from '../../../types/search';
import {
  getCurrentDate,
  getDefaultOrigin,
  getDefaultDestination,
  convertDateToISO,
  convertISOToDisplay,
  formatTouristsText,
} from './utils/searchHelpers';
import {buildApiSearchParams, withSearchTypeFilters} from '../../../utils/searchParamsUtils';
import { useTheme } from '../../../hooks/useTheme';
import { useLayout } from '../../../hooks/useLayout';
import { BlurView } from '@react-native-community/blur';
import { FONT_HEADING } from '../../../theme/fonts';

interface SearchProps {
  title: string;
}

const parseDisplayDateToDate = (value: string): Date => {
  const parts = value.split('.');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = 2000 + parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date();
};

const formatDateToDisplay = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}.${month}.${year}`;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const Search: React.FC<SearchProps> = ({ title }) => {
  const { theme, isDark } = useTheme();
  const { isTablet, layoutClass } = useLayout();
  const navigation = useNavigation<any>();

  const dispatch = useDispatch<AppDispatch>();
  const { headerName, searchParams: currentSearchParams } = useSelector((state: RootState) => state.search);
  const { data: departuresData } = useSelector(
    (state: RootState) => state.departures,
  );
  const { data: destinationsData } = useSelector(
    (state: RootState) => state.destinations,
  );


  const [origin, setOrigin] = useState<Departure | null>(null);
  const [destination, setDestination] = useState<DestinationResult | null>(
    null,
  );
  const [destinationType, setDestinationType] = useState<string>('');
  const [departureDate, setDepartureDate] = useState(() => {
    return currentSearchParams?.start_date
      ? convertISOToDisplay(currentSearchParams.start_date)
      : getCurrentDate();
  });
  const [nights, setNights] = useState(() => {
    if (currentSearchParams?.nights) {
      const match = currentSearchParams.nights.match(/\d+/);
      return match ? parseInt(match[0], 10) : 7;
    }
    return 7;
  });
  const [returnDate, setReturnDate] = useState(() => {
    const start = parseDisplayDateToDate(
      currentSearchParams?.start_date
        ? convertISOToDisplay(currentSearchParams.start_date)
        : getCurrentDate(),
    );
    const end = addDays(start, 7);
    return formatDateToDisplay(end);
  });
  const [adults, setAdults] = useState(() => {
    return parseInt(currentSearchParams?.adults || '2', 10);
  });
  const [kids, setKids] = useState(() => {
    return parseInt(currentSearchParams?.kids || '0', 10);
  });
  const [kidsAges, setKidsAges] = useState<number[]>(() => {
    return currentSearchParams?.kids_ages || [];
  });
  const [searchMode, setSearchMode] = useState<'package' | 'hotel'>(() =>
    currentSearchParams?.search_type === 'hotel' ? 'hotel' : 'package',
  );

  // Sync departureDate with currentSearchParams when returning to search page
  useEffect(() => {
    if (currentSearchParams?.start_date) {
      const displayDate = convertISOToDisplay(currentSearchParams.start_date);
      if (displayDate !== departureDate) {
        setDepartureDate(displayDate);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSearchParams?.start_date]);

  // Keep nights in sync with selected date range
  useEffect(() => {
    const start = parseDisplayDateToDate(departureDate);
    const end = parseDisplayDateToDate(returnDate);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    if (diffDays !== nights) {
      setNights(diffDays);
    }
  }, [departureDate, returnDate, nights]);

  // Derived values - computed on render, no state needed
  const nightsDisplay = useMemo(() => `${nights} ночей`, [nights]);
  const touristsText = useMemo(
    () => formatTouristsText(adults.toString(), kids.toString()),
    [adults, kids],
  );
  // Load departures and destinations on mount
  useEffect(() => {
    dispatch(clearSearch());
    if (!departuresData) {
      dispatch(fetchDepartures());
    }
  }, [dispatch, departuresData]);

  useEffect(() => {
    if (!destinationsData || destinationsData.length === 0) {
      dispatch(
        fetchDestinations({
          query: '',
          from_city: 'Moscow',
          search_type: searchMode,
        }),
      );
    }
  }, [dispatch, destinationsData, searchMode]);

  // Set default origin when departures are loaded
  // departures.state.data is Departure[] (not { departures: [] })
  useEffect(() => {
    if (departuresData && !origin) {
      const defaultOrigin = getDefaultOrigin(departuresData);
      if (defaultOrigin) {
        setOrigin(defaultOrigin);
      }
    }
  }, [departuresData, origin]);

  // Set default destination when destinations are loaded
  useEffect(() => {
    if (destinationsData && destinationsData.length > 0 && !destination) {
      const defaultDest = getDefaultDestination(destinationsData as any);
      if (defaultDest) {
        setDestination(defaultDest);
        setDestinationType(
          (defaultDest as any).type ||
            (defaultDest as any).group_name ||
            'countries',
        );
        if (defaultDest.name) {
          dispatch(setHeaderName(defaultDest.name));
        }
      }
    }
  }, [destinationsData, destination, dispatch]);

  const handleDestinationChange = useCallback(
    (item: DestinationResult, type: string) => {
      setDestination(item);
      setDestinationType(type);
      if (item.name) {
        dispatch(setHeaderName(item.name));
      }
    },
    [dispatch],
  );

  const handleTouristsDetailsChange = useCallback(
    (adultsCount: number, childrenCount: number, kidsAgesArray: number[]) => {
      setAdults(adultsCount);
      setKids(childrenCount);
      setKidsAges(kidsAgesArray);
    },
    [],
  );

  const handleNightsChange = useCallback((nightsString: string) => {
    const match = nightsString.match(/\d+/);
    const nightsValue = match ? parseInt(match[0], 10) : 7;
    setNights(nightsValue);

    // When nights change, update returnDate based on current departureDate
    const start = parseDisplayDateToDate(departureDate);
    const end = addDays(start, nightsValue);
    setReturnDate(formatDateToDisplay(end));
  }, [departureDate]);

  const handleDepartureDateChange = useCallback((dateStr: string) => {
    setDepartureDate(dateStr);
    // When start date changes, update return date = start date + nights
    const start = parseDisplayDateToDate(dateStr);
    const end = addDays(start, nights);
    setReturnDate(formatDateToDisplay(end));
  }, [nights]);

  const handleSearch = useCallback(() => {
    // Fallbacks match the placeholder labels shown in the fields
    const effectiveOrigin =
      origin ||
      ({
        name: 'Москва',
        name_ru: 'Москва',
        name_en: 'Moscow',
        iso2: 'RU',
      } as Departure);

    const effectiveDestination =
      destination ||
      ({
        name: 'Египет',
        name_en: 'Egypt',
        iso2: 'EG',
      } as DestinationResult);

    const effectiveDestinationType =
      destinationType || (destination ? destinationType : 'countries') || 'countries';

    if (searchMode === 'package' && !effectiveOrigin) {
      return;
    }

    const startDateISO = convertDateToISO(departureDate);
    const endDateISO = convertDateToISO(returnDate);
    const nightsValue = nights.toString();

    const isHotelDestination =
      effectiveDestinationType === 'hotels' && !!(effectiveDestination as any).id;
    const isHotelOnly = searchMode === 'hotel';

    const rawSearchParams: SearchParams = {
      from_city:
        (effectiveOrigin as any)?.name_en ||
        (effectiveOrigin as any)?.name_ru ||
        effectiveOrigin?.name ||
        'Moscow',
      from_country: (effectiveOrigin as any)?.iso2 || 'RU',
      to_country: (effectiveDestination as any).iso2 || '',
      to_city:
        effectiveDestinationType === 'countries'
          ? undefined
          : (effectiveDestination as any).name_en || effectiveDestination.name,
      adults: adults.toString(),
      kids: kids > 0 ? kids.toString() : '0',
      kids_ages: kidsAges.length > 0 ? kidsAges : undefined,
      start_date: startDateISO,
      start_date_from: startDateISO,
      end_date_till: endDateISO,
      nights: nightsValue,
      search_type: searchMode,
      // Exact departure date (no ±2) — same as kedam_WEB search form.
      flex_dates: 0,
      hotel_ids: isHotelDestination
        ? [Number((effectiveDestination as any).id)]
        : undefined,
      page_number: 1,
      page_limit: 20,
      sort_by: 'relevance',
    };

    const searchParams = buildApiSearchParams(rawSearchParams);

    // Match kedam-WEB: package defaults are stars only — never invent AI meal filter.
    const filterParams = withSearchTypeFilters(searchParams.search_type, {
      filter_instant_confirm: false,
      page_number: 1,
      page_limit: 20,
      sort_by: 'relevance',
      ...(isHotelDestination || isHotelOnly
        ? {}
        : {
            filter_stars: '3,4,5',
          }),
    });

    if (!headerName && effectiveDestination.name) {
      dispatch(setHeaderName(effectiveDestination.name));
    }

    if (isHotelDestination) {
      navigation.navigate('hotel', {
        hotelId: String((effectiveDestination as any).id),
        searchParams,
        searchSnapshot: {
          startDateISO,
          nights,
          adults,
          kids,
          kidsAges,
        },
      });
      return;
    }

    console.log('[Search] handleSearch', {searchMode, searchParams, filterParams});

    dispatch(
      runFullSearchFlow({
        searchParams,
        filterParams,
      }),
    );

    // Navigate immediately so the button never feels stuck behind loading
    navigation.navigate('searchResult');
  }, [
    origin,
    destination,
    destinationType,
    departureDate,
    returnDate,
    nights,
    adults,
    kids,
    kidsAges,
    dispatch,
    navigation,
    destination?.id,
    searchMode,
    headerName,
  ]);

  // iPad only: fields laid out in rows (landscape/expanded — one row; portrait — two rows).
  const tabletExpanded = isTablet && layoutClass === 'expanded';
  const tabletTripFields = isTablet ? (
    <>
      <DateField
        value={departureDate}
        onChange={handleDepartureDateChange}
        style={[
          styles.fieldTablet,
          !tabletExpanded && styles.fieldTabletFirst,
          { borderRightColor: theme.border },
        ]}
        label={searchMode === 'hotel' ? 'Дата заезда' : 'Дата вылета'}
      />
      <DateField
        value={returnDate}
        onChange={setReturnDate}
        style={[styles.fieldTablet, { borderRightColor: theme.border }]}
        label="Дата возвращения"
      />
      <NightsField
        value={nightsDisplay}
        onChange={handleNightsChange}
        style={[styles.fieldTablet, { borderRightColor: theme.border }]}
      />
      <TouristsField
        value={touristsText}
        onChange={() => { }} // No-op: touristsText is derived from adults/kids
        onTouristsChange={handleTouristsDetailsChange}
        initialAdults={adults}
        initialChildren={kids}
        initialKidsAges={kidsAges}
        style={[styles.fieldTablet, styles.fieldTabletLast]}
      />
      <View style={styles.searchButtonTablet}>
        <AppButton
          title="Найти"
          onPress={handleSearch}
          size="large"
          icon="search"
        />
      </View>
    </>
  ) : null;

  return (
    <ImageBackground
      source={require('../../../assets/images/searchBg.jpg')}
      style={styles.background}
      resizeMode="cover">
      <BlurView
        style={styles.blurOverlay}
        blurType={isDark ? 'dark' : 'light'}
        blurAmount={4}
      />
      <View style={[styles.container, isTablet && styles.containerTablet]}>
        <AppText style={[styles.title, isTablet && styles.titleTablet]}>{title}</AppText>

        <View
          style={[
            styles.searchCard,
            isTablet && styles.searchCardTablet,
            { backgroundColor: theme.backgroundSecondary },
          ]}>
          <View style={styles.searchModeTabs}>
            <TouchableOpacity
              style={[
                styles.searchModeTab,
                searchMode === 'package' && styles.searchModeTabActive,
                searchMode === 'package' && { backgroundColor: theme.background },
              ]}
              onPress={() => setSearchMode('package')}
              activeOpacity={0.85}>
              <AppText
                style={[
                  styles.searchModeTabText,
                  { color: searchMode === 'package' ? theme.text : theme.textTertiary },
                ]}>
                Тур
              </AppText>
              <AppText style={[styles.searchModeHint, { color: theme.textTertiary }]}>
                С перелётом
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.searchModeTab,
                searchMode === 'hotel' && styles.searchModeTabActive,
                searchMode === 'hotel' && { backgroundColor: theme.background },
              ]}
              onPress={() => setSearchMode('hotel')}
              activeOpacity={0.85}>
              <AppText
                style={[
                  styles.searchModeTabText,
                  { color: searchMode === 'hotel' ? theme.text : theme.textTertiary },
                ]}>
                Отель
              </AppText>
              <AppText style={[styles.searchModeHint, { color: theme.textTertiary }]}>
                Без перелёта
              </AppText>
            </TouchableOpacity>
          </View>

          {isTablet ? (
          <>
          <View
            style={[
              styles.rowContainer,
              styles.rowTablet,
              !tabletExpanded && [styles.rowTabletTop, { borderBottomColor: theme.border }],
            ]}>
            {searchMode === 'package' && (
              <OriginField
                value={origin}
                onChange={setOrigin}
                style={[
                  styles.fieldTablet,
                  styles.fieldTabletFirst,
                  { borderRightColor: theme.border },
                ]}
              />
            )}
            <DestinationField
              value={destination}
              onChange={handleDestinationChange}
              style={[
                styles.fieldTablet,
                searchMode !== 'package' && styles.fieldTabletFirst,
                !tabletExpanded && styles.fieldTabletLast,
                { borderRightColor: theme.border },
              ]}
              fromCity={origin?.name_en || origin?.name_ru || 'Moscow'}
              searchType={searchMode}
            />
            {tabletExpanded ? tabletTripFields : null}
          </View>
          {!tabletExpanded ? (
            <View style={[styles.rowContainer, styles.rowTablet]}>{tabletTripFields}</View>
          ) : null}
          </>
          ) : (
          <>
          <DestinationField
            value={destination}
            onChange={handleDestinationChange}
            style={[styles.fieldButtonBottom, { borderBottomColor: theme.border }]}
            fromCity={origin?.name_en || origin?.name_ru || 'Moscow'}
            searchType={searchMode}
          />

          {searchMode === 'package' && (
            <OriginField
              value={origin}
              onChange={setOrigin}
              style={[styles.fieldButtonBottom, { borderBottomColor: theme.border }]}
            />
          )}
          <View style={styles.rowContainer}>
            <DateField
              value={departureDate}
              onChange={handleDepartureDateChange}
              style={[
                styles.halfWidth,
                styles.dateFieldButton,
                { borderBottomColor: theme.border, borderRightColor: theme.border },
              ]}
              label={searchMode === 'hotel' ? 'Дата заезда' : 'Дата вылета'}
            />
            <DateField
              value={returnDate}
              onChange={setReturnDate}
              style={[
                styles.halfWidth,
                styles.dateFieldButtonTo,
                { borderBottomColor: theme.border, borderLeftColor: theme.border,paddingLeft:12 },
              ]}
              label="Дата возвращения"
            />
          </View>

          {/* Nights and Tourists Row */}
          <View style={styles.rowContainer}>
            <NightsField
              value={nightsDisplay}
              onChange={handleNightsChange}
              style={[
                styles.halfWidth,
                styles.nightsFieldButton,
                // { borderRightColor: theme.border },
              ]}
            />
            <TouristsField
              value={touristsText}
              onChange={() => { }} // No-op: touristsText is derived from adults/kids
              onTouristsChange={handleTouristsDetailsChange}
              initialAdults={adults}
              initialChildren={kids}
              initialKidsAges={kidsAges}
              style={[
                styles.halfWidth,
                styles.touristsFieldButton,
                { borderLeftWidth: 1, borderLeftColor: theme.border,marginRight:12,paddingLeft:12  },
              ]}
            />
          </View>
          </>
          )}
        </View>

        {/* Search Button - Outside the white card (on iPad the button lives inside the card row) */}
        {isTablet ? null : (
        <AppButton
          title="Найти"
          onPress={handleSearch}
          size="large"
          icon="search"
        />
        )}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,

  },
  searchCard: {
    borderRadius: 24,
    paddingLeft: 20,
    paddingRight: 20,
      paddingTop: 4,
    paddingBottom: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  searchModeTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  searchModeTab: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  searchModeTabActive: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchModeTabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  searchModeHint: {
    fontSize: 11,
    marginTop: 2,
  },
  fieldButtonBottom: {
    borderBottomWidth: 1,
    marginBottom: 0,
  },
  dateFieldButton: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
    paddingRight: 12,
    marginBottom: 0,
  },
    dateFieldButtonTo:{
        borderBottomWidth: 1,
        // borderRightWidth: 1,
        paddingRight: 12,
        marginBottom: 0,
    },
  nightsFieldButton: {
    // borderBottomWidth: 1,
    // borderLeftWidth: 1,
    // paddingLeft: 12,
      paddingRight: 12,
    marginBottom: 0,
  },
  touristsFieldButton: {
    borderTopWidth: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  rowContainer: {
    flexDirection: 'row',
    marginBottom: 0,
    alignItems: 'flex-start',
  },
  halfWidth: {
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: '#00000020',
    marginHorizontal: 12,
    marginTop: 28,
    height: 52,
  },
  // --- iPad only (never applied on phone) ---
  containerTablet: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  titleTablet: {
    fontFamily: FONT_HEADING,
    fontSize: 24,
    lineHeight: 28,
    marginBottom: 20,
  },
  searchCardTablet: {
    paddingLeft: 24,
    paddingRight: 24,
    paddingBottom: 12,
    marginBottom: 0,
  },
  rowTablet: {
    alignItems: 'center',
  },
  rowTabletTop: {
    borderBottomWidth: 1,
  },
  fieldTablet: {
    flex: 1,
    minWidth: 0,
    borderRightWidth: 1,
    paddingLeft: 12,
    paddingRight: 12,
    marginBottom: 0,
  },
  fieldTabletFirst: {
    paddingLeft: 0,
  },
  fieldTabletLast: {
    borderRightWidth: 0,
  },
  searchButtonTablet: {
    justifyContent: 'center',
    paddingLeft: 12,
  },
});
