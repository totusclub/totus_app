import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { HotelSkeleton } from '../UI';
import { HotelInfo, HotelCard } from '../UI';
import ExpandableSectionModal from './modals/ExpandableSectionModal';
import HotelReviewsModal from './modals/HotelReviewsModal';
import RoomDetailsModal from './modals/RoomDetailsModal';
import AllOptionsModal from './modals/AllOptionsModal';
import HotelDescriptionCard from './HotelDescriptionCard';
import { useHotelDetails } from '../../modules/hooks/useHotelDetails';
import { useHotelRooms } from '../../modules/hooks/useHotelRooms';
import { useHotelReviews } from '../../modules/hooks/useHotelReviews';
import { RootState } from '../../modules/store';
import HotelRoomsSection from './HotelRoomsSection';
import HotelSearchSection from './HotelSearchSection';
import HotelDetailsPriceCard from './HotelDetailsPriceCard';
import ScreenLayout from './components/ScreenLayout';
import HotelAddressCardTablet from './components/HotelAddressCardTablet';
import { useHasBottomTabBar } from '../../hooks/useHasBottomTabBar';
import { useLayout } from '../../hooks/useLayout';
import { TabletColumns } from '../UI/tablet';
import type { HotelRoom, HotelSearchSnapshot } from '../../types/hotel';
import type { SearchParams } from '../../types/search';
import { normalizeSearchType } from '../../utils/bookingFlowUtils';
import { buildSnapshotFromParams } from '../../utils/hotelUtils/searchSnapshot';
import type { AiRoomPick } from '../../utils/hotelUtils/aiRoomPick';

type SectionInfo = { id: string; title: string };

type SectionModalState = {
  visible: boolean;
  section: SectionInfo | null;
};

type RoomModalState = {
  visible: boolean;
  room: HotelRoom | null;
  selectedDate?: string | null;
};

type HotelRouteParams = {
  hotel?: HotelInfo;
  hotelId?: string | number;
  requestId?: string;
  searchParams?: SearchParams;
  searchSnapshot?: HotelSearchSnapshot;
  aiRoomPick?: AiRoomPick;
};

type HotelScreenRouteProp = RouteProp<
  { hotel: HotelRouteParams; hotelFromAi: HotelRouteParams },
  'hotel' | 'hotelFromAi'
>;

export const Hotel: React.FC = () => {
  const route = useRoute<HotelScreenRouteProp>();
  const routeParams = route.params;

  // 🏨 Modal state
  const [sectionModal, setSectionModal] = useState<SectionModalState>({
    visible: false,
    section: null,
  });
  const [roomModal, setRoomModal] = useState<RoomModalState>({
    visible: false,
    room: null,
  });
  const [optionsModal, setOptionsModal] = useState<RoomModalState>({
    visible: false,
    room: null,
  });
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [isHotelSearching, setIsHotelSearching] = useState(false);
  const [hotelSearchSettled, setHotelSearchSettled] = useState(false);

  const passedHotelId = routeParams?.hotelId ?? routeParams?.hotel?.id ?? null;
  const hotelId = passedHotelId ? String(passedHotelId) : null;

  const hotelSearchType = normalizeSearchType(routeParams?.searchParams?.search_type);

  const { hotel, apiHotelData, loading } = useHotelDetails(hotelId, hotelSearchType);

  const {
    reviews,
    loading: reviewsLoading,
    loadingMore: reviewsLoadingMore,
    hasMore: reviewsHasMore,
    error: reviewsError,
    hotelRating,
    loadMore: loadMoreReviews,
  } = useHotelReviews(hotelId);

  const { requestId: storeRequestId, searchParams: globalSearchParams } = useSelector(
    (state: RootState) => state.search,
  );
  const initialRequestId = storeRequestId || null;

  /** Listing/package request_id is invalid for /hotels-rooms when opening a specific hotel. */
  const routeRequestId = useMemo(() => {
    const rid = routeParams?.requestId ?? null;
    if (!rid || !hotelId) return rid;
    const targetsThisHotel = routeParams?.searchParams?.hotel_ids?.some(
      id => String(id) === String(hotelId),
    );
    // Hotel-scoped search already targets this hotel → still need a fresh
    // hotel-details request_id (listing / hotel_ids handoff is not reusable).
    if (targetsThisHotel) return null;
    return rid;
  }, [routeParams?.requestId, routeParams?.searchParams?.hotel_ids, hotelId]);

  /**
   * Never reuse Redux listing request_id for /hotels-rooms (matches kedam-WEB
   * useRequestIdSync). Always start a hotel-scoped search on this screen.
   */
  const ignoreStoreRequestId = Boolean(hotelId);

  const [localRequestId, setLocalRequestId] = useState<string | null>(() => {
    if (routeRequestId) return routeRequestId;
    return null;
  });
  const [roomsRefreshKey, setRoomsRefreshKey] = useState(0);
  const [staleRefreshCount, setStaleRefreshCount] = useState(0);
  const attemptedStaleIdsRef = useRef<Set<string>>(new Set());

  const routeSearchKey = useMemo(
    () => JSON.stringify(routeParams?.searchParams ?? null),
    [routeParams?.searchParams],
  );
  const prevRouteSearchKeyRef = useRef<string | null>(null);

  // При смене параметров перехода с hotel_ids этого отеля сбрасываем request_id (не смешиваем со старым из Redux).
  useEffect(() => {
    if (prevRouteSearchKeyRef.current === routeSearchKey) {
      return;
    }
    prevRouteSearchKeyRef.current = routeSearchKey;
    setHotelSearchSettled(false);
    attemptedStaleIdsRef.current.clear();
    setStaleRefreshCount(0);
    if (ignoreStoreRequestId && !routeRequestId) {
      setLocalRequestId(null);
    }
  }, [routeSearchKey, ignoreStoreRequestId, routeRequestId]);

  useEffect(() => {
    if (ignoreStoreRequestId) {
      return;
    }
    if (initialRequestId && !localRequestId) {
      setLocalRequestId(initialRequestId);
    }
  }, [ignoreStoreRequestId, initialRequestId, localRequestId]);

  /** Один ключ на «визит» (+ stale retry): после монтирования HotelSearchSection делается тот же startSearch, что по кнопке «Найти». */
  const hotelMountSearchSignature = useMemo(
    () => `${hotelId}|${routeSearchKey}|${staleRefreshCount}`,
    [hotelId, routeSearchKey, staleRefreshCount],
  );

  /** Уже есть hotel-scoped request_id — номера уже грузятся, не слать второй старт автоматически. */
  const skipAutoMountSearch = useMemo(
    () => Boolean(routeRequestId || localRequestId),
    [localRequestId, routeRequestId],
  );

  const requestId = useMemo(() => {
    if (localRequestId) {
      return localRequestId;
    }
    return ignoreStoreRequestId ? null : initialRequestId;
  }, [localRequestId, ignoreStoreRequestId, initialRequestId]);

  const handleStaleRequestId = useCallback((failedRequestId: string) => {
    if (attemptedStaleIdsRef.current.has(failedRequestId)) {
      return;
    }
    if (attemptedStaleIdsRef.current.size >= 2) {
      console.warn('[Hotel] Max stale request_id refresh attempts reached');
      return;
    }
    attemptedStaleIdsRef.current.add(failedRequestId);
    setHotelSearchSettled(false);
    setLocalRequestId(null);
    setStaleRefreshCount(count => count + 1);
    setRoomsRefreshKey(key => key + 1);
  }, []);

  const { rooms, roomFilters, loading: roomsLoading } = useHotelRooms(
    requestId,
    hotelId,
    {
      isReady: Boolean(hotelId),
      refreshKey: roomsRefreshKey,
      onRequestIdStale: handleStaleRequestId,
    },
  );

  const awaitingInitialSearch = !skipAutoMountSearch && !hotelSearchSettled && !requestId;
  const roomsSectionLoading = roomsLoading || isHotelSearching || awaitingInitialSearch;
  const roomsSearchAttempted = Boolean(requestId) || hotelSearchSettled;

  const fallbackSnapshot = useMemo(
    () =>
      buildSnapshotFromParams(routeParams?.searchParams) ||
      buildSnapshotFromParams(globalSearchParams),
    [
      routeParams?.searchParams,
      globalSearchParams?.start_date,
      globalSearchParams?.nights,
      globalSearchParams?.adults,
      globalSearchParams?.kids,
      globalSearchParams?.kids_ages,
    ],
  );

  const initialSnapshot = routeParams?.searchSnapshot || fallbackSnapshot;
  const [overrideSnapshot, setOverrideSnapshot] = useState<HotelSearchSnapshot | null>(null);
  const searchSnapshot = overrideSnapshot || initialSnapshot;
  const aiRoomPick = routeParams?.aiRoomPick;
  const isFromAiAssistant = route.name === 'hotelFromAi' || Boolean(aiRoomPick);
  const hasBottomTabBar = useHasBottomTabBar();
  const { isTablet, isLandscape } = useLayout();
  const safeApiHotelData = apiHotelData ?? undefined;
  const scrollRef = useRef<ScrollView>(null);
  const roomsSectionOffsetRef = useRef(0);
  const hasAutoScrolledToRoomsRef = useRef(false);

  const scrollToRoomsSection = useCallback((animated = false) => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, roomsSectionOffsetRef.current - 8),
      animated,
    });
  }, []);

  useEffect(() => {
    hasAutoScrolledToRoomsRef.current = false;
  }, [hotelId, routeSearchKey]);

  useEffect(() => {
    if (!isFromAiAssistant || hasAutoScrolledToRoomsRef.current) {
      return;
    }
    if (roomsSectionLoading || !roomsSearchAttempted) {
      return;
    }

    requestAnimationFrame(() => {
      scrollToRoomsSection(false);
      hasAutoScrolledToRoomsRef.current = true;
    });
  }, [
    isFromAiAssistant,
    roomsSectionLoading,
    roomsSearchAttempted,
    rooms.length,
    scrollToRoomsSection,
  ]);

  if (!hotelId) {
    return null;
  }

  const handleSectionPress = useCallback((section: SectionInfo) => {
    setSectionModal({ visible: true, section });
  }, []);

  const handleSectionClose = useCallback(() => {
    setSectionModal({ visible: false, section: null });
  }, []);

  const handleRoomDetailsOpen = useCallback((room: HotelRoom) => {
    setRoomModal({ visible: true, room });
  }, []);

  const handleRoomDetailsClose = useCallback(() => {
    setRoomModal({ visible: false, room: null });
  }, []);

  const handleOptionsOpen = useCallback((room: HotelRoom, selectedDate: string | null) => {
    setOptionsModal({ visible: true, room, selectedDate });
  }, []);

  const handleOptionsClose = useCallback(() => {
    setOptionsModal({ visible: false, room: null });
  }, []);

  const handleSearchComplete = useCallback((newRequestId: string) => {
    setLocalRequestId(newRequestId);
  }, []);

  const handleParamsChange = useCallback((snapshot: HotelSearchSnapshot) => {
    setOverrideSnapshot(snapshot);
  }, []);

  const displayHotel = useMemo(() => {
    if (!hotel) return null;
    const routeReviews = routeParams?.hotel?.reviews ?? 0;
    const routeRating = routeParams?.hotel?.rating ?? 0;
    const reviewsCount =
      hotel.reviews ||
      routeReviews ||
      (reviews.length > 0 ? reviews.length : 0);
    const rating = hotel.rating || routeRating || hotelRating || 0;
    return { ...hotel, reviews: reviewsCount, rating };
  }, [hotel, routeParams?.hotel, reviews.length, hotelRating]);

  if (loading || !hotel || !displayHotel) {
    return <HotelSkeleton />;
  }



  // Rendered exactly once (it runs the auto mount search): on iPad inside the
  // right column, on iPhone right after the hotel card — same props either way.
  const searchSection = (
    <HotelSearchSection
      hotelId={hotelId}
      apiHotelData={safeApiHotelData}
      onSearchComplete={handleSearchComplete}
      onSearchingChange={setIsHotelSearching}
      onSearchSettled={() => setHotelSearchSettled(true)}
      onParamsChange={handleParamsChange}
      initialSearchParams={routeParams?.searchParams}
      mountSearchSignature={hotelMountSearchSignature}
      skipAutoMountSearch={skipAutoMountSearch}
    />
  );

  return (
    <>
      <ScreenLayout ref={scrollRef} hasBottomTabBar={hasBottomTabBar}>
        {isTablet ? (
          // Figma «iPad / Hotel page»: photo card left; right column = price → search → address/map.
          <TabletColumns
            sideWidth={isLandscape ? 380 : 340}
            side={
              <View style={styles.sideColumnTablet}>
                <HotelDetailsPriceCard
                  rooms={rooms}
                  loading={roomsSectionLoading}
                  searchAttempted={roomsSearchAttempted}
                  searchType={hotelSearchType}
                  searchSnapshot={searchSnapshot}
                  aiRoomPick={aiRoomPick}
                  onChooseRoom={() => scrollToRoomsSection(true)}
                  style={styles.priceCardTablet}
                />
                {searchSection}
                <HotelAddressCardTablet hotel={displayHotel} apiHotelData={safeApiHotelData} />
              </View>
            }>
            <HotelCard
              hotel={displayHotel}
              imageHeight={isLandscape ? 400 : 320}
              showAddress
              showTags={false}
              showSlider
              onReviewsPress={() => setReviewsModalOpen(true)}
            />
          </TabletColumns>
        ) : (
          <HotelCard
            hotel={displayHotel}
            imageHeight={200}
            showAddress
            showTags={false}
            showSlider
            onReviewsPress={() => setReviewsModalOpen(true)}
            footer={
              <HotelDetailsPriceCard
                rooms={rooms}
                loading={roomsSectionLoading}
                searchAttempted={roomsSearchAttempted}
                searchType={hotelSearchType}
                searchSnapshot={searchSnapshot}
                aiRoomPick={aiRoomPick}
                onChooseRoom={() => scrollToRoomsSection(true)}
                embedded
              />
            }
          />
        )}

        {!isTablet && searchSection}

        <View
          onLayout={(event) => {
            roomsSectionOffsetRef.current = event.nativeEvent.layout.y;

            if (
              isFromAiAssistant &&
              !hasAutoScrolledToRoomsRef.current &&
              !roomsSectionLoading &&
              roomsSearchAttempted
            ) {
              requestAnimationFrame(() => {
                scrollToRoomsSection(false);
                hasAutoScrolledToRoomsRef.current = true;
              });
            }
          }}>
          <HotelRoomsSection
            rooms={rooms}
            roomFilters={roomFilters}
            requestId={requestId}
            hotelId={hotelId}
            loading={roomsSectionLoading}
            searchAttempted={roomsSearchAttempted}
            onViewAllOptions={handleOptionsOpen}
            onMoreDetails={handleRoomDetailsOpen}
            initialSelectedDate={searchSnapshot?.startDateISO || null}
            searchNights={searchSnapshot?.nights ?? null}
            aiRoomPick={aiRoomPick}
            searchType={hotelSearchType}
          />
        </View>
          <HotelDescriptionCard
              hotel={hotel}
              apiHotelData={safeApiHotelData}
              onSectionPress={handleSectionPress}
          />
      </ScreenLayout>

      {sectionModal.visible && sectionModal.section && (
        <ExpandableSectionModal
          visible={sectionModal.visible}
          onClose={handleSectionClose}
          sectionId={sectionModal.section.id}
          sectionTitle={sectionModal.section.title}
          apiHotelData={safeApiHotelData}
        />
      )}

      <HotelReviewsModal
        visible={reviewsModalOpen}
        onClose={() => setReviewsModalOpen(false)}
        reviews={reviews}
        loading={reviewsLoading}
        loadingMore={reviewsLoadingMore}
        hasMore={reviewsHasMore}
        error={reviewsError}
        reviewsCount={displayHotel.reviews}
        rating={displayHotel.rating}
        onLoadMore={loadMoreReviews}
      />

      <RoomDetailsModal
        visible={roomModal.visible}
        onClose={handleRoomDetailsClose}
        room={roomModal.room}
      />

      <AllOptionsModal
        visible={optionsModal.visible}
        onClose={handleOptionsClose}
        room={optionsModal.room}
        selectedDate={optionsModal.selectedDate}
        requestId={requestId}
        aiRoomPick={aiRoomPick}
        hotelMeta={{
          name: hotel?.name,
          country: safeApiHotelData?.country?.name || (hotel as any)?.country_name,
          city: safeApiHotelData?.city?.name_ru || (hotel as any)?.city_name,
        }}
        searchContext={searchSnapshot}
        searchType={hotelSearchType}
      />
    </>
  );
};

const styles = StyleSheet.create({
  /** iPad: price card sits flush with the hotel card in the right column. */
  priceCardTablet: {
    marginHorizontal: 0,
    marginTop: 0,
  },
  /** iPad: right column of the hotel page (price → search → address). */
  sideColumnTablet: {
    gap: 16,
  },
});
