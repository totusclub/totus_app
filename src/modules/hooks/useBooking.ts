import { useState, useEffect, useMemo, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { extractPackageId } from '../../utils/hotelUtils/packageHelpers';
import type { Tourist, BookingRouteParams } from '../../types/booking';
import { PackagesActualize, PackagesActualizeFlight } from '../api/levelTravelApi';
import { isHotelOnlySearch } from '../../utils/bookingFlowUtils';
import {
  BOOKING_SLOW_HINT_MS,
  classifyBookingLoadFailure,
  isOfferUnavailablePayload,
  isRequestCancelled,
  type BookingFailureKind,
} from '../../utils/bookingOffer';

/**
 * loading — идёт актуализация (скелетон); ready — тур загружен;
 * unavailable — тур снят / продан (экран с «Выбрать другой перелёт»);
 * offline / error — нет сети / сбой туроператора (экран с «Повторить»).
 * Раньше любой неуспех оставлял скелетон навсегда, а протухший тур (success:false, rotten)
 * открывал форму, которую нельзя было отправить.
 */
export type BookingLoadState = 'loading' | 'ready' | BookingFailureKind;

interface UseBookingReturn {
  packageData: any;
  packageId: number | null;
  flightPairId: number | null | undefined;
  dataLoading: boolean;
  loadState: BookingLoadState;
  /** Пакет из отказа LT (rotten) — для строки «Белек, Турция · 22–29 октября». */
  unavailablePackage: any;
  /** Актуализация идёт дольше BOOKING_SLOW_HINT_MS. */
  slowLoading: boolean;
  /** «Повторить» — новый запрос актуализации. */
  retry: () => void;
  tourists: Tourist[];
  setTourists: (tourists: Tourist[]) => void;
}

async function isDeviceOffline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === false || state.isInternetReachable === false;
  } catch {
    return false;
  }
}

export const useBooking = (routeParams: BookingRouteParams): UseBookingReturn => {
  const { flightData, packageInfo, searchContext, searchType } = routeParams || {};

  const [packageData, setPackageData] = useState<any>(null);
  const [loadState, setLoadState] = useState<BookingLoadState>('loading');
  const [unavailablePackage, setUnavailablePackage] = useState<any>(null);
  const [attempt, setAttempt] = useState(0);
  const [slowLoading, setSlowLoading] = useState(false);
  const [tourists, setTourists] = useState<Tourist[]>([]);

  // Extract package_id and flight_pair_id
  const packageId = useMemo(() => {
    return extractPackageId(packageInfo);
  }, [packageInfo]);

  const flightPairId = useMemo(() => {
    return flightData?.flight_pair_id || flightData?.id;
  }, [flightData]);

  const hotelOnly = isHotelOnlySearch(searchType);

  const retry = useCallback(() => setAttempt(n => n + 1), []);

  // Fetch package data. Один запрос на экран: при смене перелёта / уходе с экрана прежний
  // отменяется, а его ответ не перетирает новый.
  useEffect(() => {
    if (!packageId) {
      setPackageData(null);
      setLoadState('unavailable');
      return;
    }

    if (!flightPairId && !hotelOnly) {
      // Тур без выбранного перелёта: пакет из предыдущего экрана, как и раньше.
      const pkg = (packageInfo as any)?.package ?? packageInfo ?? null;
      setPackageData(pkg);
      setLoadState(pkg ? 'ready' : 'unavailable');
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    setLoadState('loading');

    const request = flightPairId
      ? PackagesActualizeFlight(packageId, flightPairId as number, { signal })
      : PackagesActualize(packageId, 'hotel', { signal });

    request
      .then(response => {
        if (signal.aborted) return;
        const pkg =
          (response as any)?.package ?? ((response as any)?.id != null ? response : null);
        if (isOfferUnavailablePayload(response) || !pkg) {
          setPackageData(null);
          setUnavailablePackage(pkg);
          setLoadState('unavailable');
          return;
        }
        setUnavailablePackage(null);
        setPackageData(pkg);
        setLoadState('ready');
      })
      .catch(async err => {
        if (signal.aborted || isRequestCancelled(err)) return;
        const offline = err?.response ? false : await isDeviceOffline();
        if (signal.aborted) return;
        const kind = classifyBookingLoadFailure(err, offline);
        setPackageData(null);
        setUnavailablePackage(kind === 'unavailable' ? err?.response?.data?.package ?? null : null);
        setLoadState(kind);
      });

    return () => controller.abort();
  }, [packageId, flightPairId, hotelOnly, packageInfo, attempt]);

  // «Проверяем цену и места у туроператора» — если актуализация идёт дольше обычного.
  useEffect(() => {
    if (loadState !== 'loading') {
      setSlowLoading(false);
      return;
    }
    const timer = setTimeout(() => setSlowLoading(true), BOOKING_SLOW_HINT_MS);
    return () => clearTimeout(timer);
  }, [loadState, attempt]);

  // Initialize tourists based on package data
  useEffect(() => {
    if (packageData) {
      const allTourists: Tourist[] = [];
      const adultsCount = packageData.adults_count || searchContext?.adults || 0;
      const kidsCount = packageData.kids_count || searchContext?.kids || 0;
      const kidsAges = packageData.kids_ages || searchContext?.kidsAges || [];

      // Add adults
      for (let i = 0; i < adultsCount; i++) {
        allTourists.push({
          gender: 'F',
          name: '',
          surname: '',
          patronymic: '',
          birthday: '',
          passport_number: '',
          passport_expires_on: '',
          nationality_id: 225,
          child: false,
          doc_type: 'international_passport',
          noPatronymic: false,
        });
      }

      // Add kids
      for (let i = 0; i < kidsCount; i++) {
        allTourists.push({
          gender: 'F',
          name: '',
          surname: '',
          patronymic: '',
          birthday: '',
          passport_number: '',
          passport_expires_on: '',
          nationality_id: 225,
          child: true,
          child_age: kidsAges[i],
          doc_type: 'international_passport',
          noPatronymic: false,
        });
      }

      setTourists(allTourists);
    }
  }, [packageData, searchContext]);

  return {
    packageData,
    packageId,
    flightPairId,
    dataLoading: loadState === 'loading',
    loadState,
    unavailablePackage,
    slowLoading,
    retry,
    tourists,
    setTourists,
  };
};
