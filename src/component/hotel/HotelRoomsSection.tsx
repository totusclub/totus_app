import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText, HotelCard } from '../UI';
import type { HotelRoom } from '../../types/hotel';
import type { HotelRoomFilters } from '../../utils/hotelUtils/roomFilters';
import type { AiRoomPick } from '../../utils/hotelUtils/aiRoomPick';
import {
  sortRoomsWithAiPickFirst,
  getOffersForAiPickRoom,
  resolveAiSelectedRoom,
  resolveAiSelectedOffer,
  resolveAiPriceChange,
  isSameHotelRoom,
  enrichAiRoomPickFromRooms,
} from '../../utils/hotelUtils/aiRoomPick';
import { transformRoomToHotelInfo, getRoomFeatures } from '../../modules/hooks/useRoomTransformers';
import { useRoomsByDate } from '../../modules/hooks/useRoomsByDate';
import { useHotelRoomFilters } from '../../modules/hooks/useHotelRoomFilters';
import { getOffersForDate } from '../../utils/hotelUtils/roomOffers';
import RoomsSectionSkeleton from './RoomsSectionSkeleton';
import DateSelectorBar from './components/DateSelectorBar';
import RoomFilters from './components/RoomFilters';
import { EmptyState } from './components/EmptyState';
import { useTheme } from '../../hooks/useTheme';
import { useLayout } from '../../hooks/useLayout';
import { TabletGrid } from '../UI/tablet';

type HotelRoomsSectionProps = {
  rooms: HotelRoom[];
  roomFilters?: HotelRoomFilters | null;
  requestId?: string | null;
  hotelId?: string | null;
  loading: boolean;
  /** True after room search has finished (with or without results). */
  searchAttempted?: boolean;
  onViewAllOptions: (room: HotelRoom, selectedDate: string | null) => void;
  onMoreDetails: (room: HotelRoom) => void;
  initialSelectedDate?: string | null;
  /** Exact nights from hotel search — match kedam-WEB fixed-date rooming. */
  searchNights?: number | null;
  aiRoomPick?: AiRoomPick | null;
};

const HotelRoomsSection: React.FC<HotelRoomsSectionProps> = ({
  rooms,
  roomFilters = null,
  requestId = null,
  hotelId = null,
  loading,
  searchAttempted = false,
  onViewAllOptions,
  onMoreDetails,
  initialSelectedDate,
  searchNights = null,
  aiRoomPick = null,
}) => {
  const { theme } = useTheme();
  // iPad: room cards in 2 (portrait) / 3 (landscape) columns; phone keeps the plain list.
  const { isTablet, columns } = useLayout();

  const initialEnrichedAiPick = useMemo(
    () => enrichAiRoomPickFromRooms(aiRoomPick, rooms, initialSelectedDate ?? null),
    [aiRoomPick, rooms, initialSelectedDate],
  );

  const {
    filteredRooms: roomsAfterFilters,
    displayRoomFilters,
    hasActiveFilters,
    filtersLoading,
    handleFilterChange,
    handleClearFilters,
  } = useHotelRoomFilters({
    rooms,
    roomFiltersFromApi: roomFilters,
    requestId,
    hotelId,
    initialAiPick: initialEnrichedAiPick,
  });

  const { selectedDate, setSelectedDate, dateOptions, filteredRooms } = useRoomsByDate(
    roomsAfterFilters,
    initialSelectedDate,
    searchNights,
  );

  const enrichedAiRoomPick = useMemo(
    () =>
      enrichAiRoomPickFromRooms(
        aiRoomPick,
        rooms,
        selectedDate ?? initialSelectedDate ?? null,
      ),
    [aiRoomPick, rooms, selectedDate, initialSelectedDate],
  );

  const selectedAiRoom = useMemo(
    () =>
      resolveAiSelectedRoom(
        rooms,
        enrichedAiRoomPick,
        selectedDate ?? initialSelectedDate ?? null,
      ),
    [rooms, enrichedAiRoomPick, selectedDate, initialSelectedDate],
  );

  const displayRooms = useMemo(() => {
    let nextRooms = sortRoomsWithAiPickFirst(filteredRooms, enrichedAiRoomPick, selectedDate);

    if (
      selectedAiRoom &&
      !nextRooms.some((room) => String(room.ID) === String(selectedAiRoom.ID))
    ) {
      nextRooms = [selectedAiRoom, ...nextRooms];
    }

    return nextRooms;
  }, [filteredRooms, enrichedAiRoomPick, selectedDate, selectedAiRoom]);

  if (loading) {
    return <RoomsSectionSkeleton />;
  }

  if (!rooms.length) {
    if (!searchAttempted) {
      return null;
    }
    return <EmptyState title="К сожалению, для данного отеля нет доступных номеров" />;
  }

  const showFilteredEmpty =
    hasActiveFilters && !filtersLoading && roomsAfterFilters.length === 0;
  const showNoRoomsForDate =
    !filtersLoading && roomsAfterFilters.length > 0 && filteredRooms.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <AppText style={[styles.title, { color: theme.text }]}>Выберите номер</AppText>

        <RoomFilters
          filters={displayRoomFilters}
          hasActiveFilters={hasActiveFilters}
          loading={filtersLoading}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
          compact
        />
      </View>

      <DateSelectorBar
        dateOptions={dateOptions}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />

      {showFilteredEmpty ? (
        <View style={styles.emptyWrap}>
          <EmptyState title="По выбранным фильтрам номера не найдены" />
          <TouchableOpacity onPress={handleClearFilters} activeOpacity={0.7}>
            <AppText style={[styles.clearLink, { color: theme.brand }]}>
              Сбросить фильтры
            </AppText>
          </TouchableOpacity>
        </View>
      ) : showNoRoomsForDate ? (
        <EmptyState title="На выбранную дату нет номеров по этим фильтрам" />
      ) : (
        <View style={styles.roomsContainer}>
          {isTablet ? (
            <TabletGrid
              items={displayRooms}
              columns={columns}
              keyExtractor={(room) => String(room.ID)}
              renderItem={(room) => {
                const isAiFoundRoom = isSameHotelRoom(room, selectedAiRoom);
                const offers = isAiFoundRoom
                  ? getOffersForAiPickRoom(room, selectedDate, enrichedAiRoomPick, searchNights)
                  : getOffersForDate(room, selectedDate, searchNights);
                const aiPriceChange = isAiFoundRoom
                  ? resolveAiPriceChange(
                      enrichedAiRoomPick,
                      offers[0] ?? resolveAiSelectedOffer(room, enrichedAiRoomPick, selectedDate)?.offer,
                    )
                  : null;
                const hotelInfo = transformRoomToHotelInfo(room, selectedDate, offers);
                const roomFeatures = getRoomFeatures(room, offers);
                return (
                  <HotelCard
                    hotel={hotelInfo}
                    type="room"
                    imageHeight={200}
                    showSlider={true}
                    roomFeatures={roomFeatures}
                    showAiBadge={isAiFoundRoom}
                    aiPriceChange={aiPriceChange}
                    onViewAllOptions={() => onViewAllOptions(room, selectedDate)}
                    onMoreDetails={() => onMoreDetails(room)}
                  />
                );
              }}
            />
          ) : displayRooms.map((room) => {
            const isAiFoundRoom = isSameHotelRoom(room, selectedAiRoom);
            const offers = isAiFoundRoom
              ? getOffersForAiPickRoom(room, selectedDate, enrichedAiRoomPick, searchNights)
              : getOffersForDate(room, selectedDate, searchNights);
            const aiPriceChange = isAiFoundRoom
              ? resolveAiPriceChange(
                  enrichedAiRoomPick,
                  offers[0] ?? resolveAiSelectedOffer(room, enrichedAiRoomPick, selectedDate)?.offer,
                )
              : null;
            const hotelInfo = transformRoomToHotelInfo(room, selectedDate, offers);
            const roomFeatures = getRoomFeatures(room, offers);
            return (
              <HotelCard
                key={room.ID}
                hotel={hotelInfo}
                type="room"
                imageHeight={200}
                showSlider={true}
                roomFeatures={roomFeatures}
                showAiBadge={isAiFoundRoom}
                aiPriceChange={aiPriceChange}
                onViewAllOptions={() => onViewAllOptions(room, selectedDate)}
                onMoreDetails={() => onMoreDetails(room)}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 16,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  roomsContainer: {
    gap: 16,
  },
  emptyWrap: {
    gap: 12,
  },
  clearLink: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default HotelRoomsSection;
