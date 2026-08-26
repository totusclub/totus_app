import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { AppButton } from '../UI';
import DateField from '../home/searchSection/DateField';
import NightsField from '../home/searchSection/NightsField';
import TouristsField from '../home/searchSection/TouristsField';
import { RootState } from '../../modules/store';
import { startSearch } from '../../modules/api/levelTravelApi';
import { useSearchParamsSync, type SearchParamsState } from '../../modules/hooks/useSearchParamsSync';
import { useTheme } from '../../hooks/useTheme';
import {
  getCurrentDate,
  convertDateToISO,
  convertISOToDisplay,
  formatDateForAPI,
  formatTouristsText,
} from '../home/searchSection/utils/searchHelpers';
import type { SearchParams } from '../../types/search';
import type { ApiHotelData } from '../../types/hotel';
import type { HotelSearchSnapshot } from '../../types/hotel';
import { buildApiSearchParams } from '../../utils/searchParamsUtils';

type HotelSearchSectionProps = {
  hotelId: string | null;
  apiHotelData?: ApiHotelData | null;
  onSearchComplete?: (requestId: string) => void;
  onSearchingChange?: (searching: boolean) => void;
  onSearchSettled?: () => void;
  onParamsChange?: (snapshot: HotelSearchSnapshot) => void;
  initialSearchParams?: SearchParams | null;
  /** Уникален для hotelId + параметров навигации; один запуск того же запроса, что по «Найти», после появления блока формы. */
  mountSearchSignature: string;
  /** Уже есть request_id листинга (Redux/local) для этого перехода — не дублировать автозапуск. */
  skipAutoMountSearch?: boolean;
};

const HotelSearchSection: React.FC<HotelSearchSectionProps> = ({
  hotelId,
  apiHotelData,
  onSearchComplete,
  onSearchingChange,
  onSearchSettled,
  onParamsChange,
  initialSearchParams,
  mountSearchSignature,
  skipAutoMountSearch = false,
}) => {
  const { theme } = useTheme();
  const { searchParams: currentSearchParams } = useSelector(
    (state: RootState) => state.search,
  );

  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    onSearchingChange?.(isSearching);
  }, [isSearching, onSearchingChange]);

  // Prefer initialSearchParams (from route/AI chat) over Redux
  const sourceParams = initialSearchParams || currentSearchParams;

  // Initialize state from initialSearchParams (route), Redux searchParams, or defaults
  const [params, setParams] = useState<SearchParamsState>(() => {
    const nightsValue = sourceParams?.nights
      ? parseInt(String(sourceParams.nights).replace(/[^0-9]/g, ''), 10) || 7
      : 7;

    return {
      departureDate: sourceParams?.start_date
        ? convertISOToDisplay(sourceParams.start_date)
        : getCurrentDate(),
      nights: nightsValue,
      adults: parseInt(sourceParams?.adults || '2', 10),
      kids: parseInt(sourceParams?.kids || '0', 10),
      kidsAges: sourceParams?.kids_ages || [],
    };
  });

  // Sync params with sourceParams when they change externally
  useSearchParamsSync({
    sourceParams,
    params,
    setParams,
  });

  // Derived values - computed on render, no state needed
  const nightsDisplay = useMemo(() => `${params.nights} ночей`, [params.nights]);
  const touristsText = useMemo(
    () => formatTouristsText(params.adults.toString(), params.kids.toString()),
    [params.adults, params.kids],
  );

  // Update helper function
  const updateParams = (updates: Partial<SearchParamsState>) => {
    setParams(prev => ({ ...prev, ...updates }));
  };

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  /** Дата / ночи / туристы задаются осознанно — после изменения ставим новый поиск с debounce. */
  const scheduleNewSearchRef = useRef<() => void>(() => {});
  const handleSearchLatestRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const handleNightsChange = (nightsString: string) => {
    // Handle ranges like "7..10" or "7-8", extract first number
    const cleaned = nightsString.includes('..')
      ? nightsString.split('..')[0].replace(/\D/g, '')
      : nightsString.replace(/\D/g, '');
    const nightsValue = cleaned ? parseInt(cleaned, 10) : 7;
    updateParams({ nights: nightsValue });
    scheduleNewSearchRef.current();
  };

  const handleTouristsDetailsChange = (
    adultsCount: number,
    childrenCount: number,
    kidsAgesArray: number[],
  ) => {
    updateParams({
      adults: adultsCount,
      kids: childrenCount,
      kidsAges: kidsAgesArray,
    });
    scheduleNewSearchRef.current();
  };

  const buildSearchParams = (): SearchParams | null => {
    // Validate required parameters before building
    if (!params.departureDate || params.nights <= 0 || params.adults < 1) {
      return null;
    }

    const parsedHotelId = hotelId ? parseInt(hotelId, 10) : null;
    if (!parsedHotelId || isNaN(parsedHotelId)) {
      return null;
    }

    // Convert departureDate (display format) to ISO format
    const startDateISO = convertDateToISO(params.departureDate);
    const startDateObj = new Date(startDateISO);

    // Calculate end date
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + params.nights);

    // Safely access hotel country and city from API data
    const hotelCountry = apiHotelData?.country;
    const hotelCity = apiHotelData?.city;
    // Prefer hotel API destination when opening a specific hotel (home recommendations).
    // Hardcoded listing to_city/to_country must not override the real hotel location.
    const targetingThisHotel = Boolean(parsedHotelId);
    const resolvedToCountry = targetingThisHotel
      ? hotelCountry?.iso2 ||
        (hotelCountry as { country_iso2?: string } | undefined)?.country_iso2 ||
        sourceParams?.to_country ||
        ''
      : sourceParams?.to_country ||
        hotelCountry?.iso2 ||
        (hotelCountry as { country_iso2?: string } | undefined)?.country_iso2 ||
        '';

    const rawSearchParams: SearchParams = {
      from_city: sourceParams?.from_city || 'Moscow',
      from_country: sourceParams?.from_country || 'RU',
      to_country: resolvedToCountry,
      to_city: targetingThisHotel
        ? hotelCity?.name_en ||
          hotelCity?.name_ru ||
          sourceParams?.to_city ||
          undefined
        : sourceParams?.to_city ||
          hotelCity?.name_en ||
          hotelCity?.name_ru ||
          undefined,
      search_type: sourceParams?.search_type || 'package',
      // Match kedam-WEB hotel details: fixed departure date (no ±2 flex).
      flex_dates: 0,
      start_date: startDateISO,
      start_date_from: startDateISO,
      end_date_till: formatDateForAPI(endDateObj),
      nights: params.nights.toString(),
      adults: params.adults.toString(),
      kids: params.kids > 0 ? params.kids.toString() : '0',
      kids_ages: params.kidsAges.length > 0 ? params.kidsAges : undefined,
      hotel_ids: [parsedHotelId],
      page_number: 1,
      page_limit: 20,
      sort_by: 'relevance',
    };

    if (sourceParams?.filter_meals) {
      rawSearchParams.filter_meals = sourceParams.filter_meals;
    }
    if (sourceParams?.filter_price_max) {
      rawSearchParams.filter_price_max = sourceParams.filter_price_max;
    }

    const searchParams = buildApiSearchParams(rawSearchParams);

    const targetingHotel =
      Array.isArray(searchParams.hotel_ids) && searchParams.hotel_ids.length > 0;

    const isHotelOnly = searchParams.search_type === 'hotel';

    if (
      (!isHotelOnly && !rawSearchParams.from_city) ||
      (!isHotelOnly && !rawSearchParams.from_country) ||
      (!searchParams.to_country && !targetingHotel) ||
      !searchParams.start_date ||
      !searchParams.nights ||
      !searchParams.adults ||
      !searchParams.search_type
    ) {
      return null;
    }

    return searchParams;
  };

  useEffect(() => {
    const startDateISO = convertDateToISO(params.departureDate);
    onParamsChange?.({
      startDateISO,
      nights: params.nights,
      adults: params.adults,
      kids: params.kids,
      kidsAges: params.kidsAges,
    });
  }, [params, onParamsChange]);

  const handleSearch = async () => {
    const searchParams = buildSearchParams();
    if (!searchParams) {
      // Invalid params — still mark settled so rooms section does not spin forever.
      onSearchSettled?.();
      return;
    }

    try {
      setIsSearching(true);
      const response = await startSearch(searchParams);

      // Match kedam-WEB: hand off request_id immediately. Rooms hook polls
      // /search-status and loads rooms progressively as operators finish.
      if (response.request_id && onSearchComplete) {
        onSearchComplete(response.request_id);
      }
    } catch (error) {
      console.error('Error starting local search:', error);
    } finally {
      setIsSearching(false);
      onSearchSettled?.();
    }
  };

  handleSearchLatestRef.current = handleSearch;

  scheduleNewSearchRef.current = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      void handleSearchLatestRef.current();
    }, 400);
  };

  const autoMountRanForSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (skipAutoMountSearch || !hotelId || !mountSearchSignature) {
      return;
    }
    if (autoMountRanForSignatureRef.current === mountSearchSignature) {
      return;
    }
    autoMountRanForSignatureRef.current = mountSearchSignature;
    scheduleNewSearchRef.current();
  }, [
    skipAutoMountSearch,
    hotelId,
    mountSearchSignature,
  ]);

  return (
    <View style={styles.container}>
      <View style={[styles.searchCard, { backgroundColor: theme.cardBackground }]}>
        {/* Date and Nights Row */}
        <View style={styles.rowContainer}>
          <DateField
            value={params.departureDate}
            onChange={date => {
              updateParams({ departureDate: date });
              scheduleNewSearchRef.current();
            }}
            style={[styles.halfWidth, styles.dateFieldButton, { borderBottomColor: theme.borderSecondary, borderRightColor: theme.borderSecondary }]}
          />
          <NightsField
            value={nightsDisplay}
            onChange={handleNightsChange}
            style={[styles.halfWidth, styles.nightsFieldButton, { borderBottomColor: theme.borderSecondary, borderLeftColor: theme.borderSecondary }]}
          />
        </View>

        {/* Tourists Field */}
        <TouristsField
          value={touristsText}
          onChange={() => { }} // No-op: touristsText is derived from params, onChange handled by onTouristsChange
          onTouristsChange={handleTouristsDetailsChange}
          initialAdults={params.adults}
          initialChildren={params.kids}
          initialKidsAges={params.kidsAges}
          style={styles.touristsFieldButton}
        />
      </View>

      {/* Search Button */}
      <AppButton
        title="Найти"
        onPress={handleSearch}
        size="large"
        icon="search"
        isProcessing={isSearching}
      />
    </View>
  );
};

export default HotelSearchSection;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  searchCard: {
    borderRadius: 24,
    padding: 20,
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
  rowContainer: {
    flexDirection: 'row',
    marginBottom: 0,
    alignItems: 'flex-start',
  },
  halfWidth: {
    flex: 1,
  },
  dateFieldButton: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
    paddingRight: 12,
    marginBottom: 0,
  },
  nightsFieldButton: {
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    paddingLeft: 12,
    marginBottom: 0,
  },
  touristsFieldButton: {
    borderTopWidth: 0,
    marginTop: 0,
    marginBottom: 0,
  },
});
