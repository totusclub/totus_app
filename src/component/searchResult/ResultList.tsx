import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { AppText } from '../UI';
import SortModal from './modals/SortModal';
import HotelCard, { HotelInfo } from './HotelCard';
import ListHeader from './ListHeader';
import HotelCardSkeleton from './HotelCardSkeleton';
import EmptyState from './EmptyState';
import { searchFilters, setAllMyHotels } from '../../modules/store/slices/search';
import { AppDispatch, RootState } from '../../modules/store';
import { useTheme } from '../../hooks/useTheme';
import { useLayout } from '../../hooks/useLayout';
import { parseNightsValue } from '../home/searchSection/utils/searchHelpers';
import { withSearchTypeFilters } from '../../utils/searchParamsUtils';
import {
  buildAiRoomPickFromSearchHotel,
  normalizeSearchMealsToRoomCodes,
} from '../../utils/hotelUtils/aiRoomPick';
import { LIST_FILTER_PARAM_KEYS } from './modals/FiltersModalContent';
import {
  PROGRESSIVE_SEARCH_ENABLED,
  formatOperatorsLeft,
  setVisibleHotelCountProvider,
} from '../../utils/progressiveSearch';

type SortOption = {
  id: string;
  label: string;
  icon: string;
};

const sortOptions: SortOption[] = [
  { id: 'recommended', label: 'По рекомендации', icon: 'recommended' },
  { id: 'highRating', label: 'Высокий рейтинг', icon: 'sortRating' },
  { id: 'cheapFirst', label: 'Сначала дешёвые', icon: 'lineArrowDown' },
  { id: 'expensiveFirst', label: 'Сначала дорогие', icon: 'lineArrowUp' },
];

// Map sort option IDs to API sort_by values
const sortByMap: Record<string, string> = {
  recommended: 'relevance',
  highRating: 'rating,desc',
  cheapFirst: 'price,asc',
  expensiveFirst: 'price,desc',
};

/** Preserve applied list filters (including empty string = cleared). */
const pickAppliedListFilters = (hotels: any): Record<string, unknown> => {
  if (!hotels) return {};
  const out: Record<string, unknown> = {};
  for (const key of LIST_FILTER_PARAM_KEYS) {
    if (hotels[key] !== undefined && hotels[key] !== null) {
      out[key] = hotels[key];
    }
  }
  return out;
};

// Transform API hotel to HotelInfo format
const transformHotel = (hotel: any): HotelInfo => {
  // Handle nested hotel structure from API response
  const hotelData = (hotel as any).hotel || hotel;
  const features = hotelData.features || {};

  // Format price
  const minPrice = (hotel as any).min_price || hotel.min_price || 0;
  const price = minPrice
    ? `${minPrice.toLocaleString('ru-RU')} ₽`
    : '0 ₽';

  // Format date range (if available)
  const minPriceNights = (hotel as any).min_price_nights || hotel.min_price_nights;
  const dateRange = minPriceNights
    ? `от ${minPriceNights} ночей`
    : '';

  // Build tags array
  const tags: string[] = [];

  if (features.line) {
    tags.push(`${features.line}-я линия`);
  }

  if (features.beach_surface) {
    const raw = String(features.beach_surface).trim().toUpperCase().replace(/\s+/g, '');
    const beachTypes: Record<string, string> = {
      SAND: 'Песок',
      PEBBLE: 'Галька',
      'SAND+PEBBLE': 'Песок с галькой',
      'SAND+BPEBBLE': 'Песок с галькой',
      SAND_PEBBLE: 'Песок с галькой',
      PLATFORM: 'Платформа',
    };
    tags.push(beachTypes[raw] || features.beach_surface);
  }

  if (features.beach_distance) {
    tags.push(`${features.beach_distance} м до пляжа`);
  }

  if (features.airport_distance) {
    const km = Math.round(features.airport_distance / 1000);
    tags.push(`${km} км до аэропорта`);
  }

  if (features.wi_fi === 'FREE') {
    tags.push('Бесплатный Wi-Fi');
  } else if (features.wi_fi === 'PAID') {
    tags.push('Платный Wi-Fi');
  }

  // Handle images - convert URLs to require format or use URI
  const images = hotelData.images?.map((img: any) => {
    if (img.webp_x620) {
      return { uri: img.webp_x620 };
    }
    if (img.x500) {
      return { uri: img.x500 };
    }
    // Fallback to default image
    return require('../../assets/images/cardImage.png');
  }) || [require('../../assets/images/cardImage.png')];

  return {
    id: String(hotelData.id || (hotel as any).id || hotel.id || ''),
    name: hotelData.name || '',
    reviews: hotelData.reviews_count || 0,
    rating: hotelData.rating || 0,
    stars: hotelData.stars || 0,
    images,
    tags,
    price,
    dateRange,
    // Keep API item for hotel-details meal/room pick (AI / All Inclusive handoff).
    _source: hotel,
  };
};

const ResultList: React.FC = () => {
  const { theme } = useTheme();
  // iPad only: hotel cards in a 2/3-column grid. On phone `isTablet` is false and
  // every helper below is a transparent passthrough (no extra views, no extra props).
  // Figma «iPad / List / Tours»: hotel cards in 2 columns in both orientations
  // (landscape has the filters sidebar on the left).
  const { isTablet } = useLayout();
  const columns = isTablet ? 2 : 1;
  const tabletCellStyle = [styles.cellTablet, { maxWidth: `${100 / columns}%` as `${number}%` }];
  const wrapTablet = (node: React.ReactElement, style: any = tabletCellStyle) =>
    isTablet ? <View style={style}>{node}</View> : node;
  const tabletListProps = isTablet
    ? { numColumns: columns, columnWrapperStyle: styles.rowTablet }
    : {};
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState<string>('recommended');
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Track previous search params to detect changes
  const prevSearchParamsRef = useRef<string | null>(null);
  // Track previous filter params to detect filter changes
  const prevFilterParamsRef = useRef<string | null>(null);

  const { allMyHotels, hotels, loading, requestId, searchParams, searchingOperators } = useSelector(
    (state: RootState) => state.search,
  );
  // Постепенная выдача: поиск ещё идёт — «Ищем ещё у M операторов» (Р4). Телефон — полосой под
  // строкой сортировки, iPad — плашкой рядом с «Найдено N отелей» (макет «Выдача: индикатор загрузки»).
  const searchingMore = PROGRESSIVE_SEARCH_ENABLED && Number(searchingOperators ?? 0) > 0;

  // Сколько карточек человек уже видел (до нижнего края экрана) — их новые отели не сдвигают (Р1).
  const maxSeenIndexRef = useRef(-1);
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      viewableItems.forEach(v => {
        if (v.index != null && v.index > maxSeenIndexRef.current) {
          maxSeenIndexRef.current = v.index;
        }
      });
    },
  ).current;
  useEffect(() => {
    maxSeenIndexRef.current = -1;
  }, [requestId]);
  useEffect(() => {
    if (!PROGRESSIVE_SEARCH_ENABLED) return;
    setVisibleHotelCountProvider(() => maxSeenIndexRef.current + 1);
    return () => setVisibleHotelCountProvider(null);
  }, []);
  // Get operators from hotels response
  const operators = hotels?.readyOperators || [];
  const activeSearchType = searchParams?.search_type || hotels?.search_type;

  const buildFilterRequest = (base: Record<string, unknown>) =>
    withSearchTypeFilters(activeSearchType, base);

  // Format date and nights for display (e.g., "от 17 мая на 7 ночей")
  const formattedDateRange = useMemo(() => {
    if (!searchParams?.start_date || !searchParams?.nights) {
      return '';
    }

    const startDate = new Date(searchParams.start_date);
    if (isNaN(startDate.getTime())) {
      return '';
    }

    const day = startDate.getDate();
    const monthIndex = startDate.getMonth();
    const nights = parseNightsValue(searchParams.nights);

    // Russian month names in genitive case (for "от X месяца")
    const monthsGenitive = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
    ];

    const month = monthsGenitive[monthIndex];

    // Format nights (1 ночь, 2-4 ночи, 5+ ночей)
    let nightsText = '';
    if (nights === 1) {
      nightsText = '1 ночь';
    } else if (nights >= 2 && nights <= 4) {
      nightsText = `${nights} ночи`;
    } else {
      nightsText = `${nights} ночей`;
    }

    return `от ${day} ${month} на ${nightsText}`;
  }, [searchParams?.start_date, searchParams?.nights]);

  // Detect when search params change and clear old data
  useFocusEffect(
    React.useCallback(() => {
      // Create a string representation of search params for comparison
      const currentSearchParamsStr = searchParams
        ? JSON.stringify({
          to_city: searchParams.to_city,
          to_country: searchParams.to_country,
          start_date: searchParams.start_date,
          nights: searchParams.nights,
          adults: searchParams.adults,
          kids: searchParams.kids,
        })
        : null;

      // If search params changed, clear old hotels and reset page
      if (
        prevSearchParamsRef.current !== null &&
        prevSearchParamsRef.current !== currentSearchParamsStr
      ) {
        dispatch(setAllMyHotels([]));
        setCurrentPage(1);
      }

      // Update ref with current search params
      prevSearchParamsRef.current = currentSearchParamsStr;
    }, [searchParams, dispatch]),
  );

  // Sync currentPage with API response and detect filter changes
  useEffect(() => {
    if (!hotels) return;

    // Sync current page with API response
    const apiPageNumber = hotels.page_number || 1;
    setCurrentPage(apiPageNumber);

    // Create a string representation of filter params for comparison
    const currentFilterParamsStr = JSON.stringify(pickAppliedListFilters(hotels));

    // If filter params changed, reset page to 1
    // Note: We don't clear hotels here because handleSortSelect already clears
    // before making the API call. Clearing here would remove the newly fetched results.
    if (
      prevFilterParamsRef.current !== null &&
      prevFilterParamsRef.current !== currentFilterParamsStr
    ) {
      setCurrentPage(1);
    }

    // Update ref with current filter params
    prevFilterParamsRef.current = currentFilterParamsStr;
  }, [hotels, dispatch]);

  // Get current sort_by from hotels data or default to 'relevance'
  useEffect(() => {
    if (hotels?.sort_by) {
      // Map API sort_by back to our sort option ID
      const sortId = Object.entries(sortByMap).find(
        ([_, value]) => value === hotels.sort_by,
      )?.[0] || 'recommended';
      setSelectedSort(sortId);
    }
  }, [hotels?.sort_by]);

  const selectedOption = useMemo(
    () => sortOptions.find(opt => opt.id === selectedSort) || sortOptions[0],
    [selectedSort],
  );

  // Transform hotels data
  const transformedHotels = useMemo(() => {
    if (!allMyHotels || allMyHotels.length === 0) {
      return [];
    }
    return allMyHotels.map(transformHotel);
  }, [allMyHotels]);
  const handleSortSelect = (option: SortOption) => {
    setSelectedSort(option.id);

    // Get API sort_by value
    const apiSortBy = sortByMap[option.id] || 'relevance';

    // Build filter params
    if (!requestId || !operators || operators.length === 0) {
      console.warn('Missing requestId or operators for sorting');
      return;
    }

    // Build filter params with current filters preserved
    const filterParams: any = {
      request_id: requestId,
      readyOperators: operators,
      sort_by: apiSortBy,
      page_number: 1,
      page_limit: 20,
      ...pickAppliedListFilters(hotels),
    };

    // Clear hotels list and reset page before applying new sort
    dispatch(setAllMyHotels([]));
    setCurrentPage(1);

    // Dispatch searchFilters with new sort and preserved filters
    dispatch(searchFilters(buildFilterRequest(filterParams) as any));
  };

  // Load more hotels when scrolling to bottom
  const loadMoreHotels = React.useCallback(() => {
    if (loadingMore || loading || !requestId || !operators || operators.length === 0) {
      return;
    }

    // Check if there are more hotels to load
    const totalHotels = hotels?.hotels_count || 0;
    const currentHotelsCount = allMyHotels?.length || 0;

    if (currentHotelsCount >= totalHotels) {
      // console.log('=== NO MORE HOTELS TO LOAD ===');
      return;
    }

    const nextPage = (hotels?.page_number || currentPage) + 1;
    setLoadingMore(true);

    // Build filter params with current filters and next page
    const filterParams: any = {
      request_id: requestId,
      readyOperators: operators,
      page_number: nextPage,
      page_limit: 20,
      sort_by: hotels?.sort_by || 'relevance',
      ...pickAppliedListFilters(hotels),
    };

    dispatch(searchFilters(buildFilterRequest(filterParams) as any)).finally(() => {
      setLoadingMore(false);
    });
  }, [loadingMore, loading, requestId, operators, hotels, currentPage, allMyHotels?.length, dispatch, activeSearchType]);

  // Handle scroll end to load more
  const handleEndReached = React.useCallback(() => {
    if (!loadingMore && !loading) {
      loadMoreHotels();
    }
  }, [loadingMore, loading, loadMoreHotels]);

  // Handle reset filters — same defaults as kedam_WEB resultList handleResetFilters
  const handleResetFilters = React.useCallback(() => {
    if (!requestId || !operators || operators.length === 0) {
      console.warn('Missing requestId or operators for resetting filters');
      return;
    }

    const availableStars = (hotels?.filters?.stars || [])
      .map((star: any) => star?.id)
      .filter(
        (id: any) => id !== null && id !== undefined && String(id) !== '0',
      );

    const filterParams: Record<string, unknown> = {
      request_id: requestId,
      readyOperators: operators,
      page_limit: 20,
      page_number: 1,
      sort_by: 'relevance',
      filter_instant_confirm: false,
      filter_price_min: hotels?.filters?.prices?.min,
      filter_price_max: hotels?.filters?.prices?.max,
    };

    if (availableStars.length > 0) {
      filterParams.filter_stars = availableStars.join(',');
    }

    dispatch(setAllMyHotels([]));
    setCurrentPage(1);
    setSelectedSort('recommended');
    dispatch(searchFilters(buildFilterRequest(filterParams) as any));
  }, [requestId, operators, hotels?.filters, dispatch, activeSearchType]);

  const showSkeleton =
    transformedHotels.length === 0 && (loading || !hotels);
  const showEmptyState =
    !loading && !!hotels && transformedHotels.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      {showSkeleton ? (
        <FlatList
          key={isTablet ? `skeleton-cols-${columns}` : undefined}
          {...tabletListProps}
          data={Array.from({ length: isTablet ? columns * 3 : 5 })} // Show 5 skeleton cards
          contentContainerStyle={[styles.listContent, isTablet && styles.listContentTablet]}
          ListHeaderComponent={() => (
            // Отелей ещё нет: «Ищем подходящие отели» над заглушками (текст как на сайте, totus_WEB #94).
            <View style={isTablet ? styles.headerTablet : undefined}>
              <View
                accessibilityRole="text"
                accessibilityLiveRegion="polite"
                style={[styles.loadingStatus, { backgroundColor: theme.cardBackground }]}>
                <ActivityIndicator size="small" color={theme.brand} />
                <AppText style={[styles.loadingStatusText, isTablet && styles.loadingStatusTextTablet, { color: theme.text }]}>
                  Ищем подходящие отели
                </AppText>
              </View>
            </View>
          )}
          renderItem={() => wrapTablet(<HotelCardSkeleton />)}
          keyExtractor={(_, index) => `skeleton-${index}`}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<View style={styles.footerSpacing} />}
        />
      ) : showEmptyState ? (
        <EmptyState onResetFilters={handleResetFilters} emptyType={hotels?.emptyType} />
      ) : (
        <FlatList
          key={isTablet ? `cols-${columns}` : undefined}
          {...tabletListProps}
          data={transformedHotels}
          ListHeaderComponent={() => wrapTablet(
            <ListHeader
              selectedSortLabel={selectedOption.label}
              resultCount={hotels?.hotels_count || transformedHotels.length}
              {...(searchingMore
                ? { searchingText: formatOperatorsLeft(Number(searchingOperators)) }
                : {})}
              onSortPress={() => setSortModalVisible(true)}
              {...(isTablet ? { tablet: true } : {})}
            />
          , styles.headerTablet)}
          renderItem={({ item, index }) => wrapTablet(
            <HotelCard
              hotel={item}
              imageHeight={200}
              showTags={true}
              dateRange={formattedDateRange}
              equalHeight={isTablet}
              onPress={() => {
                const hotelData = (item as any).hotel || item;
                const hotelIdValue = hotelData.id || item.id;
                const sourceItem =
                  ((item as any)._source as Record<string, unknown> | undefined) ||
                  (item as unknown as Record<string, unknown>);
                const listingMealOptions = hotels?.filters?.meals ?? null;
                const mealCodes = normalizeSearchMealsToRoomCodes(
                  hotels?.filter_meals,
                  listingMealOptions,
                );
                const filterMealsForHotel =
                  mealCodes.length > 0
                    ? mealCodes.join(',')
                    : hotels?.filter_meals || undefined;
                const aiRoomPick = buildAiRoomPickFromSearchHotel(sourceItem, {
                  filterMeals: filterMealsForHotel,
                  filterOperators: hotels?.filter_operators,
                  startDate: searchParams?.start_date,
                  listPrice:
                    sourceItem?.analytics_min_price != null
                      ? Number(sourceItem.analytics_min_price)
                      : sourceItem?.min_price != null
                        ? Number(sourceItem.min_price)
                        : undefined,
                  listingMealOptions,
                });
                navigation.navigate('hotel', {
                  hotel: item,
                  hotelId: String(hotelIdValue),
                  searchParams: {
                    ...searchParams,
                    hotel_ids: [Number(hotelIdValue)],
                    search_type: searchParams?.search_type || 'package',
                    // Hotel rooms: fixed date only (no ±2 days).
                    flex_dates: 0,
                    ...(filterMealsForHotel
                      ? { filter_meals: filterMealsForHotel }
                      : {}),
                    ...(hotels?.filter_operators
                      ? { filter_operators: hotels.filter_operators }
                      : {}),
                  },
                  searchSnapshot: {
                    startDateISO: searchParams?.start_date,
                    nights: parseNightsValue(searchParams?.nights || '7'),
                    adults: parseInt(searchParams?.adults || '2', 10),
                    kids: parseInt(searchParams?.kids || '0', 10),
                    kidsAges: searchParams?.kids_ages || [],
                  },
                  aiRoomPick,
                });
              }}
            />
          )}
          // Ключ — id отеля: при постепенной выдаче карточки не перемонтируются и не мигают.
          keyExtractor={(item, index) => (item.id ? `hotel-${item.id}` : `hotel-i-${index}`)}
          onViewableItemsChanged={onViewableItemsChanged}
          contentContainerStyle={[styles.listContent, isTablet && styles.listContentTablet]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={[styles.footerLoading, isTablet && styles.footerLoadingTablet]}>
                {isTablet ? (
                  Array.from({ length: columns }).map((_, i) => (
                    <View key={`footer-skeleton-${i}`} style={tabletCellStyle}>
                      <HotelCardSkeleton />
                    </View>
                  ))
                ) : (
                  <HotelCardSkeleton />
                )}
              </View>
            ) : (
              <View style={styles.footerSpacing} />
            )
          }
        />
      )}

      <SortModal
        visible={sortModalVisible}
        onClose={() => setSortModalVisible(false)}
        onSelect={handleSortSelect}
        selectedOption={selectedSort}
      />
    </View>
  );
};

export default ResultList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 70,
  },
  separator: {
    height: 16,
  },
  footerSpacing: {
    height: 32,
  },
  footerLoading: {
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  loadingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  loadingStatusText: {
    fontSize: 15,
    fontWeight: '700',
  },
  loadingStatusTextTablet: {
    fontSize: 16,
  },
  // iPad grid: 24 screen padding = 16 (list) + 8 (cell); 16 gap between columns = 8 + 8.
  listContentTablet: {
    paddingHorizontal: 16,
  },
  headerTablet: {
    paddingHorizontal: 8,
  },
  // stretch: both cards in a row get the height of the taller one
  // (HotelCard `equalHeight` fills the cell and pins the price to the bottom).
  rowTablet: {
    alignItems: 'stretch',
  },
  cellTablet: {
    flex: 1,
    paddingHorizontal: 8,
  },
  footerLoadingTablet: {
    flexDirection: 'row',
    paddingHorizontal: 0,
  },
});
