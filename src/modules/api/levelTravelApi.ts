import {get, post, instance} from '../axios';
import type {
  FetchDestinationsParams,
  DestinationsResponse,
} from '../../types/destinations';
import type {
  SearchParams,
  FilterParams,
  SearchStatus,
  GroupedHotelsResponse,
  StartSearchResponse,
} from '../../types/search';
import type {
  GetHotelOffersParams,
  GetHotelRoomsParams,
  GetHotelInfoParams,
  GetHotelReviewsParams,
  HotelOffer,
  HotelRoom,
  HotelRoomsResponse,
  HotelInfo,
  HotelReviewsResponse,
} from '../../types/hotel';
import type {
  CreatePackageParams,
  PackageDetails,
  ActualizePackageParams,
  PackagesFlightsParams,
  ActualizePackageFlightParams,
} from '../../types/packages';
import type {
  ValidateTouristParams,
  CreateOrderParams,
  CreatePayParams,
  CheckPayParams,
  Order,
} from '../../types/orders';
import type {DeparturesResponse} from '../../types/departures';
import {
  prepareGroupedHotelsParams,
  prepareStartSearchParams,
} from '../../utils/searchParamsUtils';

// Destinations API
export async function fetchDestinationsRequest(
  params: FetchDestinationsParams,
): Promise<DestinationsResponse> {
  try {
    // Build query string manually to match the Next.js format exactly
    const query = params.query ? `"${params.query}"` : '""';
    const fromCity = params?.from_city || '';
    const searchType = params?.search_type || 'package';
    // Build URL with proper encoding - match Next.js format exactly
    const url = `/references/autocomplete_v2?query=${encodeURIComponent(query)}&from_city=${encodeURIComponent(fromCity)}&search_type=${encodeURIComponent(searchType)}`;
    
    // Use instance directly to avoid axios params processing when URL already has query string
    const res = await instance.get<DestinationsResponse>(url);
    return res.data;
  } catch (error: any) {
    console.error('Error fetching destinations:', error);
    // Return more detailed error info
    if (error.response) {
      console.error('Response error:', error.response.data);
      throw new Error(error.response.data?.message || 'Failed to fetch destinations');
    }
    throw error;
  }
}

// Departures API
export async function fetchDeparturesRequest(): Promise<DeparturesResponse> {
  try {
    const res = await get<DeparturesResponse>(`/references/departures`, {
      prioritized_count: 10,
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching departures:', error);
    throw error;
  }
}

// Search API
export async function startSearch(
  params: SearchParams,
): Promise<StartSearchResponse> {
  try {
    const flat = prepareStartSearchParams(params as Record<string, unknown>);
    console.log('[Search] start-search flat params', flat);
    const res = await get<StartSearchResponse>(`/start-search`, flat);
    return res.data;
  } catch (error) {
    console.error('Error starting search:', error);
    throw error;
  }
}

export async function checkSearchStatus(
  requestId: string,
): Promise<SearchStatus> {
  try {
    const res = await get<{status: SearchStatus}>(`/search-status`, {
      request_id: requestId,
    });
    return res.data.status; // Object: {1: 'completed', 2: 'performing', ...}
  } catch (error) {
    console.error('Error checking search status:', error);
    throw error;
  }
}

export type SearchStatusResult = {
  status: SearchStatus;
  completeness: number;
};

/**
 * Soft status check for hotel-details rooms polling (matches kedam-WEB).
 * Returns null on network / parse errors instead of throwing.
 */
export async function getSearchStatus(
  requestId: string,
): Promise<SearchStatusResult | null> {
  if (!requestId) return null;

  try {
    const res = await get<{ status?: SearchStatus; completeness?: number }>(
      `/search-status`,
      { request_id: requestId },
    );
    const status = res.data?.status;
    if (!status || typeof status !== 'object') return null;
    return {
      status,
      completeness: Number(res.data?.completeness) || 0,
    };
  } catch (error) {
    console.warn('[getSearchStatus] Failed to check search status:', error);
    return null;
  }
}

/** Poll until at least one operator is ready (same as listing search flow). */
export async function waitForSearchReady(
  requestId: string,
  maxPolls = 15,
  intervalMs = 6000,
): Promise<boolean> {
  for (let i = 0; i < maxPolls; i++) {
    const statusMap = await checkSearchStatus(requestId);
    const ready = Object.values(statusMap).some(
      (s) => s === 'completed' || s === 'cached',
    );
    if (ready) return true;
    if (i < maxPolls - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  return false;
}

export async function getGroupedHotels(
  params: FilterParams,
): Promise<GroupedHotelsResponse> {
  try {
    const sanitizedParams = prepareGroupedHotelsParams(
      params as Record<string, unknown>,
    );
    console.log('[Search] grouped-hotels flat params', sanitizedParams);
    const res = await get<GroupedHotelsResponse>(
      `/grouped-hotels`,
      sanitizedParams,
    );
    // Never let request params overwrite API facet data (filters/statistics/hotels).
    // Same idea as kedam_WEB searchFilters stripping `filters` / `hotels` before merge.
    const {
      filters: _ignoreFilters,
      statistics: _ignoreStatistics,
      hotels: _ignoreHotels,
      hotels_count: _ignoreCount,
      ...appliedParams
    } = params as Record<string, unknown>;

    return {
      ...res.data,
      ...appliedParams,
      filters: res.data?.filters,
      statistics: (res.data as any)?.statistics,
      hotels: res.data?.hotels,
      hotels_count: (res.data as any)?.hotels_count ?? res.data?.hotels?.length,
      request_id: res.data?.request_id ?? (params as any).request_id,
    };
  } catch (error) {
    console.error('Error getting grouped hotels:', error);
    throw error;
  }
}

// Hotels API
export async function getHotelOffers(
  data: GetHotelOffersParams,
): Promise<HotelOffer[]> {
  if (!data.request_id || !data.hotel_id) {
    throw new Error('Missing request_id or hotel_id');
  }

  const params: any = {
    request_id: data.request_id,
    hotel_id: data.hotel_id,
  };

  if (data.compact !== undefined) params.compact = data.compact;

  const response = await get<HotelOffer[]>(`/get-hotel-offers`, params);

  return response.data;
}

export async function getHotelRooms(
  data: GetHotelRoomsParams,
): Promise<HotelRoomsResponse> {
  if (!data.request_id || !data?.hotel_id) {
    throw new Error('Missing request_id or hotel_id');
  }

  const params: Record<string, string | number | boolean> = {
    request_id: data.request_id,
    hotel_id: data.hotel_id,
  };

  if (data.meals) params.meals = data.meals;
  if (data.confirmability) params.confirmability = data.confirmability;
  if (data.operators) params.operators = data.operators;
  if (data.free_cancel !== undefined) params.free_cancel = data.free_cancel;

  const response = await get<HotelRoomsResponse>(`/hotels-rooms`, params);

  return response.data;
}

export async function getHotelInfo(
  data: GetHotelInfoParams,
): Promise<HotelInfo> {
  if (!data.hotel_id) {
    throw new Error('Missing hotel_id');
  }

  const params = {
    hotel_ids: data.hotel_id,
    search_type: data.search_type === 'hotel' ? 'hotel' : 'package',
  };

  const response = await get<{hotels: HotelInfo[]}>(
    `/references/hotels`,
    params,
  );

  return response.data.hotels[0];
}

export async function getHotelReviews(
  data: GetHotelReviewsParams,
): Promise<HotelReviewsResponse> {
  if (!data.hotel_id) {
    throw new Error('Missing hotel_id');
  }

  const response = await get<HotelReviewsResponse>(
    `/references/hotel_reviews/${data.hotel_id}`,
    {
      page: data.page ?? 1,
      per_page: data.per_page ?? 10,
    },
  );

  return response.data;
}

// Packages API

/**
 * Таймауты шагов бронирования (как на сайте, totus_WEB #88). Сервер (totus_API #39) ждёт
 * Level.Travel 30–45 с и отвечает понятной ошибкой (code: lt_timeout / lt_unreachable /
 * lt_error); здесь — с запасом сверху, чтобы экран не висел, если ответа нет вовсе
 * (пропала сеть, оборвалось соединение). У createOrder / createPay таймаута нет: заказ мог
 * создаться, а приложение решило бы, что нет, — и человек оформил бы второй.
 */
export const LT_CLIENT_TIMEOUT_MS = {
  packageDetails: 40000,
  actualize: 55000,
  flights: 75000,
  selectedFlight: 75000,
  prebuild: 55000,
  prebook: 75000,
  validateTourists: 40000,
} as const;

type RequestOptions = { signal?: AbortSignal };

export async function createPackage(
  data: CreatePackageParams,
): Promise<PackageDetails> {
  if (!data.request_id || !data.tour_id) {
    throw new Error('Missing request_id or tour_id');
  }

  const params = {
    request_id: data.request_id,
    tour_id: data.tour_id,
  };

  const response = await instance.get<PackageDetails>(`/packages/package_details`, {
    params,
    timeout: LT_CLIENT_TIMEOUT_MS.packageDetails,
  });

  return response.data;
}

export async function PackagesActualize(
  id: number,
  searchType: 'package' | 'hotel' = 'package',
  options?: RequestOptions,
): Promise<PackageDetails> {
  if (!id) {
    throw new Error('Missing package_id');
  }

  const params: ActualizePackageParams = {
    package_id: id,
    search_type: searchType,
  };

  const response = await instance.get<PackageDetails>(`/packages/actualize`, {
    params,
    timeout: LT_CLIENT_TIMEOUT_MS.actualize,
    ...(options?.signal ? { signal: options.signal } : {}),
  });

  return response.data;
}

/**
 * options.view = 'app' — лёгкий ответ totus_API для экрана «Перелёты» (без srcset, источников
 * багажа, min_fuel_charge_by_tours и т. п.; у популярного тура вместо ~12 МБ — в разы меньше).
 * Старый API параметр не знает и отдаёт полный ответ — экран работает и с ним.
 * Подробности рейса (пересадки) экран рейса берёт отдельно — getSelectedFlight.
 */
export async function Packagesflights(
  params: PackagesFlightsParams,
  options?: RequestOptions & { view?: 'app' },
): Promise<any> {
  if (!params) {
    throw new Error('Missing package_id');
  }

  const packageId = (params as any).package_id ?? (params as any).packageId;
  if (packageId == null || packageId === '') {
    throw new Error('Missing package_id');
  }

  // Sanitize like kedam-WEB — empty filter arrays / search_type cause LT
  // "Failed to start search" on POST /packages/flights
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (key === 'search_type' || key === 'packageId') continue;
    if (value == null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    body[key] = value;
  }
  body.package_id = Number(packageId) || packageId;

  const response = await instance.post<any>(`/packages/flights`, body, {
    ...(options?.view ? { params: { view: options.view } } : {}),
    timeout: LT_CLIENT_TIMEOUT_MS.flights,
    ...(options?.signal ? { signal: options.signal } : {}),
  });
  return response.data;
}

/**
 * Один выбранный перелёт пакета со всеми полями (пересадки, багаж) — экран рейса и бронирование.
 * totus_API ?view=pair отдаёт только его, а не весь список (у популярного тура ~2000 рейсов,
 * 12 МБ). Старый API вернёт полный список — рейс всё равно найдётся в нём.
 * null — перелёта в ответе нет (продан / сменился).
 */
export async function getSelectedFlight(
  packageId: unknown,
  flightPairId: unknown,
  options?: RequestOptions,
): Promise<Record<string, any> | null> {
  const id = Number(packageId);
  const pairId = String(flightPairId ?? '').trim();
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('Missing or invalid package_id');
  }
  if (!pairId) return null;

  const response = await instance.post<any>(
    `/packages/flights`,
    { package_id: Math.trunc(id) },
    {
      params: { view: 'pair', flight_pair_id: pairId },
      timeout: LT_CLIENT_TIMEOUT_MS.selectedFlight,
      ...(options?.signal ? { signal: options.signal } : {}),
    },
  );
  const flights: any[] = Array.isArray(response.data?.flights) ? response.data.flights : [];
  return flights.find(f => String(f?.flight_pair_id) === pairId) || null;
}

export async function PackagesActualizeFlight(
  id: number,
  f_id: number,
  options?: RequestOptions,
): Promise<PackageDetails> {
  if (!id) {
    throw new Error('Missing package_id');
  }

  const params = {
    package_id: id,
    flight_pair_id: f_id,
    search_type: 'package',
    offset: 0,
    limit: 10,
    page: 1,
  };

  const response = await instance.get<PackageDetails>(`/packages/actualize`, {
    params,
    timeout: LT_CLIENT_TIMEOUT_MS.actualize,
    ...(options?.signal ? { signal: options.signal } : {}),
  });

  return response.data;
}

// Orders API
export async function validateTourist(
  params: ValidateTouristParams,
): Promise<any> {
  try {
    if (!params) {
      throw new Error('Missing params');
    }
    const response = await instance.post<any>(`/validate-tourists`, params, {
      timeout: LT_CLIENT_TIMEOUT_MS.validateTourists,
    });
    return response.data;
  } catch (err) {
    return err;
  }
}

/** Final price / validity check before create-package (kedam_WEB parity). */
export async function prebuildOrder(
  params: Record<string, unknown>,
): Promise<any> {
  if (!params?.package_id) {
    throw new Error('Missing package_id');
  }
  const response = await instance.post<any>(`/orders/prebuild`, params, {
    timeout: LT_CLIENT_TIMEOUT_MS.prebuild,
  });
  return response.data;
}

/**
 * Operator prebook for flight packages.
 * On partner/API-version errors returns a skippable shape (do not throw).
 */
export async function prebookPackage(
  params: Record<string, unknown>,
): Promise<any> {
  if (!params?.package_id) {
    throw new Error('Missing package_id');
  }
  try {
    const response = await instance.post<any>(`/packages/prebook`, params, {
      timeout: LT_CLIENT_TIMEOUT_MS.prebook,
    });
    return response.data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.response?.data?.error ?? err?.response?.data ?? err?.message,
      errors: err?.response?.data?.errors ?? [],
      skippable: Boolean(err?.response?.data?.skippable),
      status: err?.response?.status,
      isAxiosError: true,
    };
  }
}

export async function createOrder(params: CreateOrderParams): Promise<any> {
  try {
    if (!params) {
      throw new Error('Missing params');
    }
    const response = await post<any>(`/create-package`, params);
    return response.data;
  } catch (err) {

    return err as any;
  }
}

const PAY_RETRY_ATTEMPTS = 3;
const PAY_RETRY_DELAY_MS = 900;

/**
 * The VTB gateway behind /vtb/create-order intermittently drops the upstream
 * connection (backend answers 500 "read ECONNRESET"), so transient failures are
 * retried before surfacing an error to the user.
 */
function isRetryablePayError(err: any): boolean {
  const status = err?.response?.status;
  if (status != null) {
    if (status < 500) return false;
    const details = String(
      err?.response?.data?.details || err?.response?.data?.error || '',
    );
    return status >= 500 && !/invalid payment amount/i.test(details);
  }
  // No response at all: network/timeout
  return true;
}

function normalizePayError(err: any) {
  return {
    status: 'error',
    error:
      err?.response?.data?.details ||
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      'Failed to create payment',
    details: err?.response?.data?.details,
    httpStatus: err?.response?.status,
    isAxiosError: true,
  };
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function createPay(params: CreatePayParams): Promise<any> {
  if (!params) {
    return normalizePayError(new Error('Missing params'));
  }

  let lastError: any = null;

  for (let attempt = 1; attempt <= PAY_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await post<any>(`/vtb/create-order`, params);
      return response.data;
    } catch (err: any) {
      lastError = err;
      if (attempt === PAY_RETRY_ATTEMPTS || !isRetryablePayError(err)) {
        break;
      }
      await delay(PAY_RETRY_DELAY_MS * attempt);
    }
  }

  return normalizePayError(lastError);
}

export async function getHomeData(): Promise<any> {
  try {
    const response = await get<any>(`/home/data`);
    return response.data ;
  } catch (err) {
    return err;
  }
}

export async function checkPay(params: CheckPayParams): Promise<any> {
  try {
    if (!params) {
      throw new Error('Missing params');
    }
    const response = await post<any>(`/check_pay`, params);
    return response.data;
  } catch (err) {
    return err;
  }
}

export async function getOrder(id: number): Promise<Order> {
  if (!id) {
    throw new Error('Missing order_id');
  }

  const response = await get<Order>(`/orders`, {order_id: id});
  return response.data;
}

export type OrderDocumentsResponse = {
  documents?: Array<{
    title?: string;
    public_url?: string;
    source_url?: string;
    url?: string;
  }>;
};

export async function getOrderDocuments(
  orderId: string | number,
): Promise<OrderDocumentsResponse> {
  if (!orderId) {
    throw new Error('Missing order_id');
  }

  const response = await get<OrderDocumentsResponse>(`/orders/documents`, {
    order_id: orderId,
  });
  return response.data;
}

export async function getOrdersUsers(id: number): Promise<Order[]> {
  if (!id) {
    throw new Error('Missing user_id');
  }

  const response = await get<Order[]>(`/user/orders`, {user_id: id});
  return response.data;
}

