import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { AppButton, AppText } from '../UI';
import { useTheme } from '../../hooks/useTheme';
import type { HotelRoom, Offer } from '../../types/hotel';
import type { HotelSearchSnapshot } from '../../types/hotel/search';
import type { AiRoomPick } from '../../utils/hotelUtils/aiRoomPick';
import {
  enrichAiRoomPickFromRooms,
  resolveAiSelectedOffer,
  resolveAiSelectedRoom,
} from '../../utils/hotelUtils/aiRoomPick';
import {
  findCheapestOfferForStartDate,
  formatOfferPrice,
  getOfferPriceValue,
} from '../../utils/hotelUtils/roomHelpers';
import { getOfferPriceTitle } from '../../utils/bookingFlowUtils';
import TotusIconByKey from '../UI/icons/totus/TotusIconByKey';
import { mealIcon } from '../UI/icons/totus/ltIcons';

type HotelDetailsPriceCardProps = {
  rooms: HotelRoom[];
  loading: boolean;
  searchAttempted: boolean;
  searchType?: 'package' | 'hotel';
  searchSnapshot?: HotelSearchSnapshot | null;
  aiRoomPick?: AiRoomPick | null;
  onChooseRoom: () => void;
  embedded?: boolean;
  /** Extra card style (iPad side column); not passed on phone. */
  style?: StyleProp<ViewStyle>;
};

const MEAL_LABELS: Record<string, string> = {
  BB: 'Завтрак',
  RO: 'Без питания',
  AI: 'Всё включено',
  UAI: 'Ультра всё включено',
  HB: 'Завтрак и ужин',
  FB: 'Завтрак, обед, ужин',
  HBD: 'Завтрак и ужин',
  AI24: 'Всё включено 24 часа',
  DNR: 'Ужин',
  AIL: 'Всё включено с ограничениями',
  'FB+': 'Завтрак, обед, ужин +',
  'HB+': 'Завтрак и ужин +',
  HBL: 'Завтрак и обед',
};

function formatStartDateRu(startDate?: string | null): string {
  if (!startDate) return '';
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return '';
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
  return `с ${formatter.format(date)}`;
}

function formatNightsLabel(nights?: number | null): string {
  if (nights == null || !Number.isFinite(nights)) return '';
  const n = Math.round(Number(nights));
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = 'ночей';
  if (mod10 === 1 && mod100 !== 11) word = 'ночь';
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    word = 'ночи';
  }
  return `${n} ${word}`;
}

function formatRoomOfferLabel(
  pick: AiRoomPick | null | undefined,
  roomName?: string | null,
): string {
  if (!pick) return '';
  const mealId = pick.mealId ? String(pick.mealId).split(',')[0]?.trim() : '';
  const meal =
    pick.mealType ||
    (mealId ? MEAL_LABELS[mealId.toUpperCase()] || mealId : '') ||
    '';
  const parts = [roomName || pick.roomType, meal].filter(Boolean);
  return parts.join(' · ');
}

/**
 * Top price card on hotel details — «от …₽» + «Выбрать номер»
 * (kedam-WEB HotelDetailsInfoPrice parity).
 */
const HotelDetailsPriceCard: React.FC<HotelDetailsPriceCardProps> = ({
  rooms,
  loading,
  searchAttempted,
  searchType,
  searchSnapshot,
  aiRoomPick,
  onChooseRoom,
  embedded = false,
  style,
}) => {
  const { theme } = useTheme();

  const startDate = searchSnapshot?.startDateISO || aiRoomPick?.startDate || '';
  const searchNights = searchSnapshot?.nights ?? null;

  const enrichedPick = useMemo(
    () => enrichAiRoomPickFromRooms(aiRoomPick, rooms, startDate || null),
    [aiRoomPick, rooms, startDate],
  );

  const listMatched = useMemo(() => {
    if (!enrichedPick || !rooms.length) return null;
    const room = resolveAiSelectedRoom(rooms, enrichedPick, startDate || null);
    if (!room) return null;
    const selected = resolveAiSelectedOffer(room, enrichedPick, startDate || null);
    if (!selected) return null;
    return { room, ...selected };
  }, [rooms, enrichedPick, startDate]);

  const searchMealIds = useMemo(() => {
    if (!enrichedPick?.mealId) return null;
    const ids = String(enrichedPick.mealId)
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);
    return ids.length ? ids : null;
  }, [enrichedPick?.mealId]);

  const cheapestOffer = useMemo(() => {
    if (!startDate) return null;
    return findCheapestOfferForStartDate(
      rooms,
      startDate,
      searchNights,
      searchMealIds,
    );
  }, [rooms, startDate, searchNights, searchMealIds]);

  const highlightOffer: Offer | null =
    listMatched?.offer ?? cheapestOffer ?? null;

  const listPrice =
    enrichedPick?.roomPrice != null && Number.isFinite(Number(enrichedPick.roomPrice))
      ? Number(enrichedPick.roomPrice)
      : null;

  const matchedOfferPrice = useMemo(() => {
    if (!highlightOffer) return null;
    return getOfferPriceValue(highlightOffer);
  }, [highlightOffer]);

  const hasRooms = rooms.length > 0;

  // Stick to list/AI card price until rooms produce a matching offer.
  const offerPrice = useMemo(() => {
    if (listPrice != null) {
      if (
        matchedOfferPrice != null &&
        Math.round(matchedOfferPrice) === Math.round(listPrice)
      ) {
        return matchedOfferPrice;
      }
      if (loading || !hasRooms || !searchAttempted) return listPrice;
      if (searchMealIds?.length && !listMatched) return listPrice;
    }
    return matchedOfferPrice ?? listPrice ?? undefined;
  }, [
    listPrice,
    matchedOfferPrice,
    listMatched,
    searchAttempted,
    loading,
    hasRooms,
    searchMealIds,
  ]);

  const showNoRoomsPrice =
    searchAttempted &&
    !loading &&
    !hasRooms &&
    listPrice == null &&
    !highlightOffer;

  const priceFormatted =
    offerPrice != null ? formatOfferPrice(Math.round(Number(offerPrice))) : '—';

  const roomOfferLabel = formatRoomOfferLabel(
    enrichedPick,
    listMatched?.room?.room?.name_ru,
  );
  // Иконка питания у строки «номер · питание»: один код — своя, несколько — общая.
  const mealCodes = String(enrichedPick?.mealId || '')
    .split(',')
    .map(code => code.trim())
    .filter(Boolean);
  const roomOfferMealIcon =
    mealCodes.length === 1 ? mealIcon(mealCodes[0]) : mealCodes.length > 1 ? 'meal-other' : null;

  // Дата и ночи — отдельными частями, у каждой своя иконка (календарь, луна), как на сайте.
  const dateParts = useMemo(() => {
    const dateStr = formatStartDateRu(
      highlightOffer?.start_date ||
        enrichedPick?.startDate ||
        startDate ||
        null,
    );
    const nightsStr = formatNightsLabel(
      highlightOffer?.nights_count ?? searchNights,
    );
    return { dateStr, nightsStr };
  }, [
    highlightOffer?.start_date,
    highlightOffer?.nights_count,
    enrichedPick?.startDate,
    startDate,
    searchNights,
  ]);

  if (loading && !listPrice && !hasRooms) {
    return (
      <View
        style={[
          styles.card,
          embedded && styles.embeddedCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          },
          style,
        ]}>
        <ActivityIndicator color={theme.brand} style={styles.loader} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        embedded && styles.embeddedCard,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
        style,
      ]}>
      <View style={embedded ? styles.compactRow : styles.regularLayout}>
        <View style={[styles.priceBlock, embedded && styles.compactPriceBlock]}>
          {showNoRoomsPrice ? (
            <>
              <AppText
                style={[
                  styles.emptyTitle,
                  embedded && styles.compactEmptyTitle,
                  { color: theme.text },
                ]}>
                Номера не найдены
              </AppText>
              {!embedded ? (
                <AppText style={[styles.meta, { color: theme.textTertiary }]}>
                  По выбранным параметрам поиска нет доступных номеров
                </AppText>
              ) : null}
            </>
          ) : (
            <>
              <AppText
                style={[
                  styles.price,
                  embedded && styles.compactPrice,
                  { color: theme.brand },
                ]}
                numberOfLines={1}>
                от {priceFormatted}₽
              </AppText>
              <AppText
                style={[
                  styles.title,
                  embedded && styles.compactTitle,
                  { color: theme.text },
                ]}
                numberOfLines={1}>
                {getOfferPriceTitle(searchType)}
              </AppText>
              {roomOfferLabel ? (
                <View style={styles.metaRow}>
                  {roomOfferMealIcon ? (
                    <TotusIconByKey name={roomOfferMealIcon} size={embedded ? 12 : 14} color={theme.textTertiary} />
                  ) : null}
                  <AppText
                    style={[
                      styles.meta,
                      embedded && styles.compactMeta,
                      styles.metaText,
                      { color: theme.textTertiary },
                    ]}
                    numberOfLines={1}>
                    {roomOfferLabel}
                  </AppText>
                </View>
              ) : null}
              {dateParts.dateStr || dateParts.nightsStr ? (
                <View style={styles.metaRow}>
                  {dateParts.dateStr ? (
                    <>
                      <TotusIconByKey name="calendar" size={embedded ? 12 : 14} color={theme.textTertiary} />
                      <AppText
                        style={[styles.meta, embedded && styles.compactMeta, { color: theme.textTertiary }]}
                        numberOfLines={1}>
                        {dateParts.dateStr}
                      </AppText>
                    </>
                  ) : null}
                  {dateParts.nightsStr ? (
                    <>
                      <TotusIconByKey
                        name="nights"
                        size={embedded ? 12 : 14}
                        color={theme.textTertiary}
                        style={dateParts.dateStr ? styles.metaGap : undefined}
                      />
                      <AppText
                        style={[styles.meta, embedded && styles.compactMeta, { color: theme.textTertiary }]}
                        numberOfLines={1}>
                        {dateParts.nightsStr}
                      </AppText>
                    </>
                  ) : null}
                </View>
              ) : null}
            </>
          )}
        </View>

        <AppButton
          title="Выбрать номер"
          onPress={onChooseRoom}
          size={embedded ? 'sm' : 'large'}
          style={embedded ? styles.compactCta : styles.cta}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    flexShrink: 1,
  },
  metaGap: {
    marginLeft: 4,
  },
  card: {
    marginHorizontal: 8,
    marginTop: 12,
    marginBottom: 4,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  embeddedCard: {
    marginHorizontal: 0,
    marginTop: 8,
    marginBottom: 0,
    borderWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    padding: 12,
    gap: 0,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  regularLayout: {
    gap: 16,
  },
  compactPriceBlock: {
    flex: 1,
    minWidth: 0,
  },
  priceBlock: {
    gap: 4,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  compactPrice: {
    fontSize: 18,
    lineHeight: 22,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  compactTitle: {
    fontSize: 11,
    lineHeight: 14,
  },
  meta: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  compactMeta: {
    fontSize: 10,
    lineHeight: 13,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  compactEmptyTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  cta: {
    width: '100%',
  },
  compactCta: {
    flexShrink: 0,
  },
  loader: {
    paddingVertical: 24,
  },
});

export default HotelDetailsPriceCard;
