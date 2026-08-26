import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { ActivityIndicator, FlatList, StatusBar, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SortModal from '../searchResult/modals/SortModal';
import { useTicketsData } from '../../modules/hooks/useTicketsData';
import {
  transformFlightPair,
  extractPackagePrice,
  buildFlightPriceMap,
} from '../../utils/ticketsUtils/flightTransformers';
import { applySorting } from '../../utils/ticketsUtils/flightSorters';
import { getFlightPriceBreakdown } from '../../utils/ticketsUtils/flightPriceUtils';
import FlightCardView from './FlightCardView';
import { FlightCard } from '../../types/tickets';
import FlightCardSkeleton from './FlightCardSkeleton';
import TicketsListHeader from './TicketsListHeader';
import TicketsListHeaderSkeleton from './TicketsListHeaderSkeleton';
import TicketsEmptyState from './TicketsEmptyState';
import SelectedTourCard from './SelectedTourCard';
import { useTicketsFilters } from './TicketsFiltersContext';
import { AppHeader } from '../UI';
import { useTheme } from '../../hooks/useTheme';
import { useHasBottomTabBar } from '../../hooks/useHasBottomTabBar';
import { getFlightOfferTotal, toMoney } from '../../utils/packagePrice';
import FlightsFiltersModal from './FlightsFiltersModal';

type TicketsRoute = RouteProp<
  {
    tickets: {
      packageId?: number;
      searchType?: 'package' | 'hotel';
      hotelMeta?: {
        name?: string;
        country?: string;
        city?: string;
      };
      searchContext?: {
        startDate: string;
        nights: number;
        adults: number;
        kids: number;
        kidsAges?: number[];
      };
    };
  },
  'tickets'
>;

const sortOptions = [
  { id: 'cheapFirst', label: 'Сначала дешёвые', icon: 'lineArrowDown' },
  { id: 'duration', label: 'Самый быстрый', icon: 'lineArrowUp' },
];

const Tickets: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const hasBottomTabBar = useHasBottomTabBar();
  const route = useRoute<TicketsRoute>();
  const navigation = useNavigation();
  const packageId = route.params?.packageId;
  const searchType = route.params?.searchType === 'hotel' ? 'hotel' : 'package';
  const hotelMeta = route.params?.hotelMeta;
  const searchContext = route.params?.searchContext;

  const {
    selectedFilters,
    setSelectedFilters,
    setFilters,
    setPackageInfo,
    filters,
    filtersModalVisible,
    setFiltersModalVisible,
  } = useTicketsFilters();
  const [sortOption, setSortOption] = useState<'cheapFirst' | 'duration'>('cheapFirst');
  const [sortModalVisible, setSortModalVisible] = useState(false);

  // Clear stale ticket filters when opening a different package
  useEffect(() => {
    setSelectedFilters({});
    setFilters(null);
    setPackageInfo(null);
  }, [packageId, setSelectedFilters, setFilters, setPackageInfo]);

  const {
    rawFlights,
    allFlights,
    filters: filtersData,
    packageInfo,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refetch,
  } = useTicketsData(packageId, selectedFilters, searchType);

  const hasActiveFilters = useMemo(
    () =>
      Object.values(selectedFilters || {}).some(
        values => Array.isArray(values) && values.length > 0,
      ),
    [selectedFilters],
  );

  const handleResetFilters = useCallback(() => {
    setSelectedFilters({});
  }, [setSelectedFilters]);
  // Update filters and packageInfo in context
  useEffect(() => {
    if (filtersData) {
      setFilters(filtersData);
    }
  }, [filtersData, setFilters]);

  useEffect(() => {
    if (packageInfo) {
      setPackageInfo(packageInfo);
    }
  }, [packageInfo, setPackageInfo]);

  // Heavy computations - keep memoized
  // Filtering is done server-side by POST /packages/flights (like kedam-WEB),
  // so the response is already the filtered set — only sorting stays local.
  const allNormalizedFlights = useMemo<FlightCard[]>(() => {
    return allFlights.map(transformFlightPair);
  }, [allFlights]);

  // Normalize displayed flights
  const normalizedFlights = useMemo<FlightCard[]>(() => {
    return rawFlights.map(transformFlightPair);
  }, [rawFlights]);

  const allSortedFlights = useMemo(() => {
    return applySorting(allNormalizedFlights, sortOption);
  }, [allNormalizedFlights, sortOption]);

  const sortedFlights = useMemo(() => {
    return applySorting(normalizedFlights, sortOption);
  }, [normalizedFlights, sortOption]);

  const flightPriceMap = useMemo(
    () => buildFlightPriceMap(packageInfo),
    [packageInfo],
  );

  // Simple computations - no need for memoization
  const packagePrice = extractPackagePrice(packageInfo);
  const selectedSortLabel =
    sortOptions.find(option => option.id === sortOption)?.label || 'Сначала дешёвые';
  // Show total count of all filtered/sorted flights, not just displayed ones
  const resultCount = allSortedFlights.length;

  // Event handlers - defined before useMemo to avoid hoisting issues
  const handleSortPress = useCallback(() => {
    setSortModalVisible(true);
  }, []);


  const handleFlightPress = useCallback(
    (flight: FlightCard) => {
      // Find the raw flight data from allFlights array
      const rawFlight = allFlights.find(
        f => String(f?.flight_pair_id ?? f?.id) === flight.id,
      );

      // Total = package base + flight fuel_charge (Доплаты и сборы)
      const fuelCharge =
        toMoney(rawFlight?.fuel_charge) ||
        toMoney(flight.id != null ? flightPriceMap[String(flight.id)] : 0) ||
        toMoney(flight.fuelCharge) ||
        toMoney(flight.priceValue);
      const pkgPrice = packagePrice ?? 0;
      const totalPrice = getFlightOfferTotal(pkgPrice, { fuel_charge: fuelCharge });

      // Calculate transfer duration between to and back flights (time at destination)
      let transferDuration: string | undefined;
      if (rawFlight?.to?.arrival && rawFlight?.back?.departure) {
        const arrival = new Date(rawFlight.to.arrival);
        const departure = new Date(rawFlight.back.departure);
        const diffSeconds = Math.floor((departure.getTime() - arrival.getTime()) / 1000);
        const hours = Math.floor(diffSeconds / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        transferDuration = `${hours}ч ${minutes}м`;
      }

      const normalizedSearchContext = searchContext
        ? {
            startDate: searchContext.startDate,
            startDateISO: searchContext.startDate,
            nights: searchContext.nights,
            adults: searchContext.adults,
            kids: searchContext.kids,
            kidsAges: searchContext.kidsAges,
          }
        : undefined;

      // Navigate to ticket details screen
      (navigation as any).navigate('ticketDetails', {
        flightData: rawFlight,
        packageInfo,
        hotelMeta,
        searchContext: normalizedSearchContext,
        totalPrice,
        transferDuration,
        searchType,
      });
    },
    [
      allFlights,
      flightPriceMap,
      packagePrice,
      packageInfo,
      hotelMeta,
      searchContext,
      searchType,
      navigation,
    ],
  );



  const handleSortClose = useCallback(() => {
    setSortModalVisible(false);
  }, []);

  const handleSortSelect = useCallback((option: { id: string }) => {
    setSortOption(option.id as 'cheapFirst' | 'duration');
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !loadingMore) {
      loadMore();
    }
  }, [hasMore, loadingMore, loadMore]);

  const showEmptyOrError =
    !loading && (Boolean(error) || sortedFlights.length === 0);

  // Memoized ListHeaderComponent to prevent unnecessary re-renders
  const ListHeaderContent = useMemo(
    () => (
      <View>
        <SelectedTourCard packageInfo={packageInfo} flights={allFlights} />
        <TicketsListHeader
          loading={loading}
          sortedFlightsLength={sortedFlights.length}
          selectedSortLabel={selectedSortLabel}
          resultCount={resultCount}
          onSortPress={handleSortPress}
        />
      </View>
    ),
    [
      packageInfo,
      allFlights,
      loading,
      sortedFlights.length,
      selectedSortLabel,
      resultCount,
      handleSortPress,
    ],
  );

  const ListEmpty = useMemo(() => {
    if (!showEmptyOrError) return null;
    return (
      <TicketsEmptyState
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleResetFilters}
        onRetry={refetch}
      />
    );
  }, [showEmptyOrError, hasActiveFilters, handleResetFilters, refetch]);

  const ListHeaderSkeleton = useMemo(() => <TicketsListHeaderSkeleton />, []);

  const showSkeleton = loading && sortedFlights.length === 0;

  // Absolute tab bar overlays content — keep last ticket fully scrollable above it.
  const listBottomPadding = useMemo(() => {
    const tabBarSpace = hasBottomTabBar ? TAB_BAR_LIST_PADDING : 0;
    const safeBottom = Math.max(insets.bottom, 8);
    return tabBarSpace + safeBottom;
  }, [hasBottomTabBar, insets.bottom]);

  const listContentStyle = useMemo(
    () => [styles.content, { paddingBottom: listBottomPadding }],
    [listBottomPadding],
  );

  const ListFooter = useMemo(
    () =>
      loadingMore ? (
        <View style={styles.loaderMore}>
          <ActivityIndicator size="small" color={theme.brand} />
        </View>
      ) : (
        <View style={{ height: 8 }} />
      ),
    [loadingMore, theme.brand],
  );

  const handleFiltersApply = useCallback(
    (filtersPayload: Record<string, string[]>) => {
      setSelectedFilters(filtersPayload);
      setFiltersModalVisible(false);
    },
    [setSelectedFilters, setFiltersModalVisible],
  );

  const handleFiltersClose = useCallback(() => {
    setFiltersModalVisible(false);
  }, [setFiltersModalVisible]);

  return (
    <View style={styles.wrapper}>
      {/* <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBarBackground} /> */}
      <AppHeader />

      {showSkeleton ? (
        <FlatList
          data={Array.from({ length: 5 })}
          keyExtractor={(_, index) => `skeleton-${index}`}
          contentContainerStyle={listContentStyle}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeaderSkeleton}
          renderItem={() => <FlightCardSkeleton />}
          ListFooterComponent={ListFooter}
        />
      ) : (
        <FlatList
          data={sortedFlights}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={[
            listContentStyle,
            showEmptyOrError ? styles.contentGrow : null,
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeaderContent}
          ListEmptyComponent={ListEmpty}
          renderItem={({ item: flight }) => {
            const breakdown = getFlightPriceBreakdown(flight, flightPriceMap, packagePrice);
            return (
              <FlightCardView
                flight={flight}
                priceLabel={breakdown.totalLabel}
                feesLabel={breakdown.feesLabel}
                onPress={() => handleFlightPress(flight)}
              />
            );
          }}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={showEmptyOrError ? null : ListFooter}
        />
      )}

      <SortModal
        visible={sortModalVisible}
        onClose={handleSortClose}
        onSelect={handleSortSelect}
        selectedOption={sortOption}
        options={sortOptions}
      />

      <FlightsFiltersModal
        visible={filtersModalVisible}
        filters={filters}
        selectedFilters={selectedFilters}
        netPrice={toMoney(packageInfo?.price ?? packageInfo?.net_price) || undefined}
        onApply={handleFiltersApply}
        onClose={handleFiltersClose}
      />
    </View>
  );
};

/** Tab bar (~72) + blur padding; safe-area added separately. */
const TAB_BAR_LIST_PADDING = 112;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 8,
    gap: 16,
  },
  contentGrow: {
    flexGrow: 1,
  },
  loaderMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default Tickets;

