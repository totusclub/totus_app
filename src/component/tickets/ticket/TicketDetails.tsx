import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, AppText, AppHeader, AppButton } from '../../UI';
import { transformFlightDetails } from '../../../utils/ticketsUtils/flightDetailsUtils';
import { extractTourDetails } from '../../../utils/ticketsUtils/tourDetailsUtils';
import type { FlightDetails, TourDetails } from '../../../types/tickets';
import FlightSegmentView from './FlightSegmentView';
import TourSection from './TourSection';
import { RootState } from '../../../modules/store';
import { useTheme } from '../../../hooks/useTheme';
import {
  formatMoneyRub,
  getFlightOfferTotal,
  getPackageBasePrice,
  toMoney,
} from '../../../utils/packagePrice';
import { TabletCentered } from '../../UI/tablet';
import { getSelectedFlight } from '../../../modules/api/levelTravelApi';
import { extractPackageId } from '../../../utils/hotelUtils/packageHelpers';
import { isRequestCancelled } from '../../../utils/bookingOffer';

type TicketDetailsRoute = RouteProp<
  {
    ticketDetails: {
      flightData: any;
      packageInfo: any;
      hotelMeta?: {
        name?: string;
        country?: string;
        city?: string;
      };
      searchContext?: {
        startDate?: string;
        startDateISO?: string;
        nights?: number;
        adults?: number;
        kids?: number;
        kidsAges?: number[];
      };
      totalPrice: number;
      transferDuration?: string;
      searchType?: 'package' | 'hotel';
      /** Рейс из лёгкого списка (?view=app): полные данные (пересадки) догружаются здесь. */
      flightIsSlim?: boolean;
    };
  },
  'ticketDetails'
>;

const TicketDetails: React.FC = () => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<TicketDetailsRoute>();
  const navigation = useNavigation<any>();
  const { fullAuth, accessToken } = useSelector((state: RootState) => state.auth);
  const [footerHeight, setFooterHeight] = useState(120);
  const {
    flightData: listFlight,
    packageInfo,
    hotelMeta,
    searchContext,
    transferDuration,
    totalPrice,
    searchType,
    flightIsSlim,
  } = route.params || {};

  // Полный выбранный рейс — один, через ?view=pair (вместо всего списка перелётов пакета).
  const [fullFlight, setFullFlight] = useState<any>(null);
  /** Рейса больше нет в ответе туроператора — продан или сменился. */
  const [flightGone, setFlightGone] = useState(false);
  const pairId = listFlight?.flight_pair_id ?? listFlight?.id;
  const packageIdForFlight = useMemo(() => extractPackageId(packageInfo), [packageInfo]);

  useEffect(() => {
    setFullFlight(null);
    setFlightGone(false);
    if (!flightIsSlim || !pairId || !packageIdForFlight) return;
    const controller = new AbortController();
    getSelectedFlight(packageIdForFlight, pairId, { signal: controller.signal })
      .then(found => {
        if (controller.signal.aborted) return;
        if (found) setFullFlight(found);
        else setFlightGone(true);
      })
      .catch(err => {
        // Сеть / туроператор: остаёмся на данных из списка — их хватает для бронирования.
        if (!controller.signal.aborted && !isRequestCancelled(err)) {
          console.warn('[TicketDetails] selected flight failed:', err?.message || err);
        }
      });
    return () => controller.abort();
  }, [flightIsSlim, pairId, packageIdForFlight]);

  const flightData = fullFlight || listFlight;

  // Transform flight data
  const flightDetails = useMemo<FlightDetails>(() => {
    if (!flightData) return {};
    return transformFlightDetails(flightData);
  }, [flightData]);

  // Extract tour details
  const tourDetails = useMemo<TourDetails | null>(() => {
    if (!packageInfo) return null;
    return extractTourDetails(packageInfo, hotelMeta, {
      startDate: searchContext?.startDate || searchContext?.startDateISO,
      nights: searchContext?.nights,
      adults: searchContext?.adults,
      kids: searchContext?.kids,
      kidsAges: searchContext?.kidsAges,
    });
  }, [packageInfo, hotelMeta, searchContext]);

  const priceBreakdown = useMemo(() => {
    const base = getPackageBasePrice(packageInfo);
    const fees = toMoney(flightData?.fuel_charge);
    const total =
      toMoney(totalPrice) ||
      getFlightOfferTotal(base, { fuel_charge: fees });
    return {
      total,
      fees,
      totalLabel: formatMoneyRub(total).replace(' ₽', '₽'),
      feesLabel:
        fees > 0
          ? `Топливный сбор: +${formatMoneyRub(fees).replace(' ₽', '₽')}`
          : null,
    };
  }, [packageInfo, flightData, totalPrice]);

  const handleFooterLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    setFooterHeight(prev => (prev === nextHeight ? prev : nextHeight));
  }, []);

  const handleReserve = () => {
    if (flightGone) return;
    if (!fullAuth || !accessToken) {
      navigation.navigate('tab', {
        screen: 'AccountStackScreen',
        params: {
          screen: 'login',
          params: {
            returnTo: 'ticketDetails',
            returnParams: route.params,
          },
        },
      });
      return;
    }
    navigation.navigate('booking', {
      flightData,
      packageInfo,
      hotelMeta,
      searchContext: searchContext
        ? {
            startDate: searchContext.startDate || searchContext.startDateISO,
            startDateISO: searchContext.startDateISO || searchContext.startDate,
            nights: searchContext.nights,
            adults: searchContext.adults,
            kids: searchContext.kids,
            kidsAges: searchContext.kidsAges,
          }
        : undefined,
      totalPrice,
      transferDuration,
      searchType: searchType === 'hotel' ? 'hotel' : 'package',
    });
  };

  return (
    <View style={styles.wrapper}>
      <AppHeader />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: footerHeight + 16 },
        ]}
        showsVerticalScrollIndicator={false}>
        <TabletCentered>
        <View style={[styles.flightSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          {/* Outbound flight */}
          {flightDetails.to && <FlightSegmentView segment={flightDetails.to} title="Перелёт туда" />}

          {/* Transfer between flights */}
          {flightDetails.to &&
            flightDetails.back &&
            flightDetails.to.arrivalAirport.code !== flightDetails.back.departureAirport.code && (
              <View style={[styles.transferSection, { backgroundColor: theme.backgroundSecondary }]}>
                <View style={styles.transferHeader}>
                  <View style={[styles.transferDot, { borderColor: theme.text }]} />
                  <AppText style={[styles.transferTitle, { color: theme.text }]}>
                    Пересадка, {flightDetails.to.arrivalAirport.city}
                  </AppText>
                </View>
                {transferDuration && (
                  <AppText style={[styles.transferDuration, { color: theme.textTertiary }]}>
                    {transferDuration} обычная пересадка
                  </AppText>
                )}
              </View>
            )}

          {/* Return flight */}
          {flightDetails.back && <FlightSegmentView segment={flightDetails.back} title="Перелёт обратно" />}

          {/* Info alert */}
          <View style={[
            styles.infoAlert,
            {
              backgroundColor: isDark ? theme.backgroundSecondary : theme.cardBackground,
              borderBottomColor: theme.brand,
              shadowColor: theme.shadow,
              shadowOpacity: isDark ? 0.3 : 0.12,
              borderTopWidth: isDark ? 1 : 0,
              borderLeftWidth: isDark ? 1 : 0,
              borderRightWidth: isDark ? 1 : 0,
              borderTopColor: isDark ? theme.border : 'transparent',
              borderLeftColor: isDark ? theme.border : 'transparent',
              borderRightColor: isDark ? theme.border : 'transparent',
            }
          ]}>
            <AppIcon name="info" size={24} color={theme.textSecondary} />
            <AppText style={[styles.infoAlertText, { color: theme.textTertiary }]}>
              Указано местное время, багаж на пассажира
            </AppText>
          </View>
        </View>

        {/* Tour section */}
        {tourDetails && <TourSection tourDetails={tourDetails} />}
        </TabletCentered>
      </ScrollView>

      <View
        onLayout={handleFooterLayout}
        style={[
          styles.totalPriceSection,
          {
            backgroundColor: theme.cardBackground,
            borderTopColor: theme.borderLight,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TabletCentered style={styles.footerColumnTablet}>
        <View style={styles.priceRow}>
          <View style={styles.priceTextBlock}>
            <AppText style={[styles.totalPriceTitle, { color: theme.textTertiary }]}>
              Всего за тур
            </AppText>
            {priceBreakdown.feesLabel ? (
              <AppText
                style={[styles.feesLabel, { color: theme.textTertiary }]}
                numberOfLines={2}>
                {priceBreakdown.feesLabel}
              </AppText>
            ) : null}
          </View>
          <AppText
            style={[styles.totalPriceValue, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}>
            {priceBreakdown.totalLabel}
          </AppText>
        </View>
        {flightGone ? (
          <View accessibilityRole="alert" style={styles.goneBox}>
            <AppText style={[styles.goneTitle, { color: theme.text }]}>
              Этот перелёт уже недоступен
            </AppText>
            <AppText style={[styles.goneText, { color: theme.textTertiary }]}>
              Туроператор продал места или изменил рейс. Выберите другой перелёт к этому отелю.
            </AppText>
          </View>
        ) : null}
        <AppButton
          title={flightGone ? 'Выбрать другой перелёт' : 'Перейти к бронированию'}
          onPress={flightGone ? () => navigation.goBack() : handleReserve}
          size="large"
          style={styles.ctaButton}
        />
        </TabletCentered>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  totalPriceSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceTextBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  totalPriceTitle: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 15,
  },
  totalPriceValue: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
    flexShrink: 0,
  },
  feesLabel: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  ctaButton: {
    width: '100%',
  },
  goneBox: {
    gap: 4,
  },
  goneTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  goneText: {
    fontSize: 13,
    lineHeight: 18,
  },
  // iPad only: keeps the footer's vertical gap inside the centered column
  footerColumnTablet: {
    gap: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 8,
  },
  flightSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  transferSection: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: 'column',
    gap: 8,
  },
  transferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transferDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  transferTitle: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  transferDuration: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  infoAlert: {
    height: 64,
    paddingHorizontal: 16,
    paddingVertical: 4,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  infoAlertText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
});

export default TicketDetails;
