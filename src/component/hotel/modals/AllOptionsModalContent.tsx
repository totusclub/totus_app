import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, AppButton, AiPickBadge } from '../../UI';
import type { HotelRoom, HotelSearchSnapshot, Offer } from '../../../types/hotel';
import type { AiRoomPick } from '../../../utils/hotelUtils/aiRoomPick';
import {
  isOfferHighlightedByAiPick,
  isSameHotelRoom,
  resolveAiSelectedOffer,
  resolveAiSelectedRoom,
  resolveAiPriceChange,
  enrichAiRoomPickFromRooms,
  getAiPriceChangeLabel,
} from '../../../utils/hotelUtils/aiRoomPick';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../hooks/useTheme';
import {
  extractOperators,
  groupOffersByMealType,
  formatOfferDate,
  formatOfferPrice,
} from '../../../utils/hotelUtils/roomHelpers';
import {
  OFFER_GROUP_LABELS,
  OFFER_GROUP_ORDER,
  getOfferSource,
  type OfferSource,
} from '../../../utils/roomOffers';
import { createPackage } from '../../../modules/api/levelTravelApi';
import { extractPackageId } from '../../../utils/hotelUtils/packageHelpers';
import {
  getOfferPriceSubtitle,
  navigateAfterPackageCreate,
  normalizeSearchType,
} from '../../../utils/bookingFlowUtils';
import { FONT_HEADING } from '../../../theme/fonts';


const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type AllOptionsModalContentProps = {
  onClose: () => void;
  room: HotelRoom;
  selectedDate?: string | null;
  requestId: string | null;
  hotelMeta: {
    name?: string;
    country?: string;
    city?: string;
  };
  searchContext: HotelSearchSnapshot | null;
  searchType?: string;
  aiRoomPick?: AiRoomPick | null;
};

// Meal type mapping
const roomTypeName: { [key: string]: string } = {
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

const AllOptionsModalContent: React.FC<AllOptionsModalContentProps> = ({
  onClose,
  room,
  selectedDate,
  requestId,
  hotelMeta,
  searchContext,
  searchType,
  aiRoomPick = null,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const resolvedSearchType = normalizeSearchType(searchType);
  const priceSubtitle = getOfferPriceSubtitle(resolvedSearchType);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  /** Per meal-type expand state — match kedam-WEB priceList (1 offer + show more). */
  const [expandedMealTypes, setExpandedMealTypes] = useState<Record<string, boolean>>({});
  const modalHeight = SCREEN_HEIGHT * 0.9;
  const enrichedAiRoomPick = useMemo(
    () => enrichAiRoomPickFromRooms(aiRoomPick, [room], selectedDate ?? null),
    [aiRoomPick, room, selectedDate],
  );

  const isAiSelectedRoom = isSameHotelRoom(
    room,
    resolveAiSelectedRoom([room], enrichedAiRoomPick, selectedDate ?? null),
  );

  useEffect(() => {
    if (!isAiSelectedRoom || !enrichedAiRoomPick) return;

    const resolved = resolveAiSelectedOffer(room, enrichedAiRoomPick, selectedDate ?? null);
    if (resolved?.offer.operator_name) {
      setSelectedOperator(resolved.offer.operator_name);
      setSelectedOffer(resolved.offer);
      return;
    }

    if (enrichedAiRoomPick.operatorName) {
      setSelectedOperator(enrichedAiRoomPick.operatorName);
    }
  }, [room, enrichedAiRoomPick, selectedDate, isAiSelectedRoom]);

  // Filter room offers by selected date + exact search nights (kedam-WEB parity)
  const filteredRoom = useMemo(() => {
    const searchNights = searchContext?.nights ?? null;
    if (!selectedDate && searchNights == null) return room;

    const filteredOffers: { [key: string]: Offer[] } = {};
    Object.entries(room.offers).forEach(([mealTypeId, offers]) => {
      const dateFilteredOffers = offers.filter((offer) => {
        if (selectedDate && offer.start_date !== selectedDate) return false;
        if (searchNights != null && Number(offer.nights_count) !== searchNights) {
          return false;
        }
        return true;
      });
      if (dateFilteredOffers.length > 0) {
        filteredOffers[mealTypeId] = dateFilteredOffers;
      }
    });

    return {
      ...room,
      offers: filteredOffers,
    };
  }, [room, selectedDate, searchContext?.nights]);

  // Extract all unique operators from filtered room
  const operators = useMemo(() => extractOperators(filteredRoom), [filteredRoom]);

  // Group offers by meal type, cheapest first (kedam-WEB priceList)
  const offersByMealType = useMemo(() => {
    const grouped = groupOffersByMealType(filteredRoom, selectedOperator);
    const sorted: typeof grouped = {};
    Object.entries(grouped).forEach(([mealTypeId, value]) => {
      sorted[mealTypeId] = {
        ...value,
        offers: [...value.offers].sort((a, b) => {
          const priceA = Number(a?.analytics_price ?? a?.price) || Number.POSITIVE_INFINITY;
          const priceB = Number(b?.analytics_price ?? b?.price) || Number.POSITIVE_INFINITY;
          return priceA - priceB;
        }),
      };
    });
    return sorted;
  }, [filteredRoom, selectedOperator]);

  // Room Type v3: одна карточка номера, внутри две группы предложений —
  // «Arlekino» (наши, `lt_extras.totus.custom`) и «Level.Travel» (оригинальные).
  // Фильтры по оператору/дате/ночам уже применены выше к обеим группам;
  // внутри группы — секции по питанию, предложения отсортированы по цене.
  // Пустые группы не показываем; ничего не дедуплицируем.
  const offerGroups = useMemo(
    () =>
      OFFER_GROUP_ORDER.map((source: OfferSource) => ({
        source,
        label: OFFER_GROUP_LABELS[source],
        sections: Object.entries(offersByMealType)
          .map(([mealTypeId, { mealType, offers }]) => ({
            mealTypeId,
            mealType,
            offers: offers.filter((offer) => getOfferSource(offer) === source),
          }))
          .filter((section) => section.offers.length > 0),
      })).filter((group) => group.sections.length > 0),
    [offersByMealType],
  );

  const formatHiddenOffersLabel = (count: number) => {
    if (count === 1) return 'вариант';
    if (count < 5) return 'варианта';
    return 'вариантов';
  };

  const toggleMealTypeExpanded = (mealTypeId: string) => {
    setExpandedMealTypes((prev) => ({
      ...prev,
      [mealTypeId]: !prev[mealTypeId],
    }));
  };

  // Get selected offer price for button
  const selectedPrice = selectedOffer ? formatOfferPrice(selectedOffer.price) : '';

  const handleOfferPress = (offer: Offer) => {
    console.log('[AllOptionsModal] Room offer clicked:', {
      room: {
        id: room.ID,
        name: room.room?.name_ru,
        nameEn: room.room?.name_en,
      },
      selectedDate,
      offer,
    });
    setSelectedOffer(offer);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, maxHeight: modalHeight }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerContent, { borderBottomColor: theme.borderLight }]}>
          <AppText style={[styles.headerTitle, { color: theme.text }]}>Все варианты проживания</AppText>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <AppText style={[styles.closeText, { color: theme.text }]}>✕</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Operator Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: theme.backgroundTertiary },
              !selectedOperator && { backgroundColor: theme.brand },
            ]}
            onPress={() => setSelectedOperator(null)}>
            <AppText
              style={[
                styles.filterChipText,
                { color: !selectedOperator ? theme.textInverse : theme.textTertiary },
              ]}>
              Все
            </AppText>
          </TouchableOpacity>
          {operators.map((operator) => (
            <TouchableOpacity
              key={operator}
              style={[
                styles.filterChip,
                { backgroundColor: theme.backgroundTertiary },
                selectedOperator === operator && { backgroundColor: theme.brand },
              ]}
              onPress={() => setSelectedOperator(operator)}>
              <AppText
                style={[
                  styles.filterChipText,
                  { color: selectedOperator === operator ? theme.textInverse : theme.textTertiary },
                ]}>
                {operator}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}>
        {offerGroups.map((group) => (
        <View key={group.source} style={styles.sourceGroup}>
          <View style={[styles.sourceGroupHeader, { borderBottomColor: theme.borderLight }]}>
            <AppText style={[styles.sourceGroupTitle, { color: theme.text }]}>
              {group.label}
            </AppText>
          </View>
        {group.sections.map(({ mealTypeId, mealType, offers }) => {
          const expandKey = `${group.source}:${mealTypeId}`;
          const showAll = Boolean(expandedMealTypes[expandKey]);
          const hiddenCount = Math.max(0, offers.length - 1);
          const visibleOffers = showAll ? offers : offers.slice(0, 1);

          return (
          <View key={expandKey} style={styles.mealTypeSection}>
            <View style={styles.mealTypeHeader}>
              <AppText style={[styles.mealTypeTitle, { color: theme.text }]}>
                {roomTypeName[mealTypeId] || mealType.description || mealTypeId}
              </AppText>
            </View>

            <View style={[styles.offersList, { backgroundColor: theme.backgroundTertiary }]}>
              {visibleOffers.map((offer, index) => {
                const isSelected =
                  selectedOffer?.id === offer.id &&
                  selectedOffer?.operator_id === offer.operator_id;
                const isAiOffer =
                  isAiSelectedRoom &&
                  isOfferHighlightedByAiPick(
                    offer,
                    mealTypeId,
                    enrichedAiRoomPick,
                    selectedDate,
                    room,
                  );
                const aiPriceChange = isAiOffer
                  ? resolveAiPriceChange(enrichedAiRoomPick, offer)
                  : null;
                const isLastItem =
                  index === visibleOffers.length - 1 && hiddenCount === 0;

                return (
                  <TouchableOpacity
                    key={`${offer.id}-${offer.operator_id}-${index}`}
                    style={[
                      styles.offerItem,
                      { borderBottomColor: theme.borderLight },
                      isLastItem && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => handleOfferPress(offer)}>
                    <View style={styles.offerLeft}>
                      {isAiOffer ? <AiPickBadge variant="inline" /> : null}
                      <AppText style={[styles.offerNights, { color: theme.text }]}>
                        {offer.nights_count} ночей {formatOfferDate(offer.start_date)}
                      </AppText>
                      <AppText style={[styles.offerOperator, { color: theme.textTertiary }]}>
                        {offer.operator_name}
                      </AppText>
                    </View>
                    <View style={styles.offerRight}>
                      <AppText style={[styles.offerPrice, { color: theme.text }]}>
                        {formatOfferPrice(offer.price)}₽
                      </AppText>
                      {aiPriceChange ? (
                        <AppText
                          style={[
                            styles.offerPriceIncrease,
                            {
                              color: aiPriceChange.delta > 0 ? theme.brand : theme.success,
                            },
                          ]}>
                          {getAiPriceChangeLabel(aiPriceChange)}
                        </AppText>
                      ) : null}
                    </View>
                    <View style={styles.radioButton}>
                      <View
                        style={[
                          styles.radioButtonOuter,
                          { borderColor: theme.borderDark },
                          isSelected && { borderColor: theme.brand },
                        ]}>
                        {isSelected && <View style={[styles.radioButtonInner, { backgroundColor: theme.brand }]} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {hiddenCount > 0 ? (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => toggleMealTypeExpanded(expandKey)}
                  activeOpacity={0.7}
                >
                  <AppText style={[styles.showMoreText, { color: theme.brand }]}>
                    {showAll
                      ? 'Скрыть варианты'
                      : `Показать ещё ${hiddenCount} ${formatHiddenOffersLabel(hiddenCount)}`}
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          );
        })}
        </View>
        ))}
      </ScrollView>

      {/* Footer Button */}
      {selectedOffer && (
        <View style={[styles.footer, { borderTopColor: theme.borderLight, paddingBottom: insets.bottom }]}>
          <View style={styles.footerContent}>
            <AppText style={[styles.footerPrice, { color: theme.text }]}>
              Выбрать {selectedPrice} ₽
            </AppText>
            <AppText style={[styles.footerSubtext, { color: theme.textTertiary }]}>{priceSubtitle}</AppText>
          </View>
          <AppButton
            title={`Выбрать ${selectedPrice} ₽`}
            onPress={async () => {
              if (!requestId) {
                Alert.alert('Ошибка', 'Не найден идентификатор поиска');
                return;
              }
              if (!selectedOffer) {
                Alert.alert('Ошибка', 'Выберите предложение');
                return;
              }
              try {
                setIsProcessing(true);
                // tour_id — id именно выбранной строки: для наших предложений (`t…`)
                // totus_API перехватывает package_details и ведёт внутренний booking flow,
                // для Level.Travel — обычный путь. package_id берём из этого же ответа.
                const packageDetails = await createPackage({
                  request_id: requestId,
                  tour_id: selectedOffer.id,
                });
                // Prefer LT package.id (same as kedam_WEB) — avoid nested hotel/tour ids
                const packageId =
                  (packageDetails as any)?.package?.id ??
                  extractPackageId(packageDetails);
                if (!packageId) {
                  throw new Error('Не удалось получить идентификатор пакета');
                }
                onClose();
                navigateAfterPackageCreate(navigation, {
                  packageId,
                  searchType: resolvedSearchType,
                  hotelMeta,
                  searchContext,
                  packageDetails,
                });
              } catch (error: any) {
                Alert.alert('Ошибка', error?.message || 'Не удалось открыть билеты');
              } finally {
                setIsProcessing(false);
              }
            }}
            isProcessing={isProcessing}
            size="large"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    flex: 1,
    justifyContent: 'flex-start',
  },
  header: {
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: FONT_HEADING,
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    fontWeight: '300',
  },
  filtersContainer: {
    marginBottom: 24,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filtersScroll: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  sourceGroup: {
    marginBottom: 8,
  },
  sourceGroupHeader: {
    paddingBottom: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  sourceGroupTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  mealTypeSection: {
    marginBottom: 16,
  },
  mealTypeHeader: {
    marginBottom: 16,
  },
  mealTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mealTypeDescription: {
    fontSize: 14,
    fontWeight: '400',
  },
  offersList: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  offerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  showMoreButton: {
    paddingTop: 12,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  offerLeft: {
    flex: 1,
  },
  offerNights: {
    fontSize: 14,
    marginBottom: 4,
  },
  offerOperator: {
    fontSize: 14,
  },
  offerRight: {
    alignItems: 'flex-end',
    marginRight: 16,
  },
  offerPrice: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  offerPriceIncrease: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  offerSubtext: {
    fontSize: 12,
    fontWeight: '400',
  },
  radioButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
  },
  footerContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  footerPrice: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    fontWeight: '400',
  },
});

export default AllOptionsModalContent;

