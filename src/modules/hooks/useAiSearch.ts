import { useState, useRef, useCallback } from 'react';
import {
  startSearch,
  checkSearchStatus,
  getGroupedHotels,
} from '../api/levelTravelApi';

interface Hotel {
  id: number | string;
  name?: string;
  name_en?: string;
  city_name?: string;
  stars?: number;
  rating?: number;
  reviews?: number;
  reviews_count?: number;
  images?: any[];
  min_price?: number;
  hotel?: any;
  [key: string]: any;
}

/**
 * Custom hook for AI-powered hotel search.
 *
 * Each hook instance maintains its own independent state, so the voice
 * and text AI screens never share search results, pagination, or
 * request IDs.
 *
 * Usage:
 *   const aiSearch = useAiSearch();
 *   // New search:   await aiSearch.runSearch(searchParams, filterParams);
 *   // Next page:    await aiSearch.loadNextPage(pageNumber);
 *   // Reset:        aiSearch.resetSearch();
 */
export function useAiSearch() {
  const [displayedHotels, setDisplayedHotels] = useState<Hotel[]>([]);
  const [hotelLoading, setHotelLoading] = useState(false);

  // Mutable refs – don't need to trigger re-renders
  const currentPageRef = useRef<number>(0);
  const requestIdRef = useRef<string | null>(null);
  const readyOperatorsRef = useRef<string[]>([]);
  const baseFilterParamsRef = useRef<any>(null);
  // Ref to read current displayedHotels synchronously (e.g. in loadNextPage before setState runs)
  const displayedHotelsRef = useRef<Hotel[]>([]);

  /**
   * Start a brand-new hotel search.
   * Calls startSearch → polls checkSearchStatus → getGroupedHotels(page 1).
   * Returns the first batch of hotels (up to page_limit, default 3).
   */
  const runSearch = useCallback(
    async (searchParams: any, filterParams: any): Promise<Hotel[]> => {
      setHotelLoading(true);
      displayedHotelsRef.current = [];
      setDisplayedHotels([]);

      // Reset refs for new search
      requestIdRef.current = null;
      readyOperatorsRef.current = [];
      baseFilterParamsRef.current = filterParams;
      currentPageRef.current = 0;

      try {
        // Step 1: Start search — only pass valid search fields (not filter params)
        const cleanSearchParams: any = {};
        const searchFields = [
          'from_city', 'from_country', 'to_country', 'to_city',
          'adults', 'kids', 'kids_ages', 'start_date', 'nights',
          'search_type', 'flex_dates', 'hotel_ids',
        ];
        for (const key of searchFields) {
          if (searchParams[key] !== undefined && searchParams[key] !== '') {
            cleanSearchParams[key] = searchParams[key];
          }
        }
        console.log('[useAiSearch] Clean search params:', JSON.stringify(cleanSearchParams));

        const { request_id } = await startSearch(cleanSearchParams);
        requestIdRef.current = request_id;
        console.log('[PAGINATION_DEBUG] runSearch: NEW search started, request_id:', request_id?.substring(0, 12) + '...');

        // Step 2: Poll for search completion (up to 45 seconds)
        const MAX_POLLS = 15; // 15 polls × 3s = 45 seconds max
        const result: any = await new Promise((resolve, reject) => {
          let pollCount = 0;
          const interval = setInterval(async () => {
            pollCount++;
            try {
              const statusMap = await checkSearchStatus(request_id);
              const readyOps = Object.entries(statusMap)
                .filter(
                  ([_, s]) => s === 'completed' || s === 'cached',
                )
                .map(([id]) => id);

              if (readyOps.length > 0) {
                clearInterval(interval);
                readyOperatorsRef.current = readyOps;

                // Step 3: Get first page of hotels
                // ALWAYS use page_limit = 3 for consistency
                const filters = {
                  request_id,
                  readyOperators: readyOps,
                  ...filterParams,
                  page_number: 1,
                  page_limit: 3, // ALWAYS 3 hotels per page
                };
                const hotels = await getGroupedHotels(filters);
                resolve(hotels);
              } else if (pollCount >= MAX_POLLS) {
                // Timeout — no operators completed after max attempts
                console.warn('[useAiSearch] Polling timeout after', pollCount, 'attempts');
                clearInterval(interval);
                resolve({ hotels: [] });
              }
              // else: keep polling — operators still in progress
            } catch (err) {
              clearInterval(interval);
              reject(err);
            }
          }, 3000);
        });

        const hotels = result.hotels || [];
        // ALWAYS show maximum 3 hotels per page
        const pageLimit = 3;
        const hotelsToShow = hotels.slice(0, pageLimit);

        console.log('[useAiSearch] Search result — total hotels:', hotels.length, 'showing:', hotelsToShow.length);
        if (hotelsToShow.length > 0) {
          console.log('[useAiSearch] First hotel sample:', JSON.stringify({
            id: hotelsToShow[0]?.id || hotelsToShow[0]?.hotel?.id,
            name: hotelsToShow[0]?.name || hotelsToShow[0]?.hotel?.name,
            hasHotelProp: !!hotelsToShow[0]?.hotel,
          }));
        }

        currentPageRef.current = 1;
        displayedHotelsRef.current = hotelsToShow;
        setDisplayedHotels(hotelsToShow);
        setHotelLoading(false);
        return hotelsToShow;
      } catch (err: any) {
        const isNetworkError = err?.message === 'Network Error' || err?.code === 'ERR_NETWORK';
        console.error('[useAiSearch] Search error:', isNetworkError ? 'Network Error (check connection or api.totus.club)' : err);
        setHotelLoading(false);
        if (err && typeof err === 'object') {
          (err as any).userMessage = isNetworkError
            ? 'Проверьте подключение к интернету и попробуйте снова.'
            : (err?.response?.data?.message || err?.message);
        }
        throw err;
      }
    },
    [],
  );

  /**
   * Load the next page of hotels from an existing search.
   * Reuses the stored request_id and calls getGroupedHotels
   * with the incremented page number.
   * Returns { fullList, newHotels }: fullList = all accumulated; newHotels = only this page (e.g. 3) for conversation.
   */
  const loadNextPage = useCallback(
    async (pageNumber?: number): Promise<{ fullList: Hotel[]; newHotels: Hotel[] }> => {
      console.log('[PAGINATION_DEBUG] ========== useAiSearch.loadNextPage ENTRY ==========');
      console.log('[PAGINATION_DEBUG] requestIdRef.current:', requestIdRef.current ? 'SET' : 'NULL');
      console.log('[PAGINATION_DEBUG] readyOperatorsRef.current.length:', readyOperatorsRef.current.length);
      console.log('[PAGINATION_DEBUG] pageNumber argument:', pageNumber);

      if (
        !requestIdRef.current ||
        readyOperatorsRef.current.length === 0
      ) {
        console.error('[PAGINATION_DEBUG] ❌ BLOCKED: Cannot load next page – no active search (requestId or readyOperators missing)');
        return { fullList: [], newHotels: [] };
      }

      setHotelLoading(true);
      
      // Calculate next page: use provided pageNumber or increment from current
      // But ensure we're actually loading a NEW page
      const currentPage = currentPageRef.current || 0;
      let nextPage: number;
      
      if (pageNumber !== undefined && pageNumber > currentPage) {
        // Use provided page number if it's greater than current
        nextPage = pageNumber;
      } else {
        // Otherwise increment from current page
        nextPage = currentPage + 1;
      }
      
      // Prevent loading the same page twice
      if (nextPage <= currentPage) {
        console.error('[PAGINATION_DEBUG] ❌ BLOCKED: nextPage', nextPage, '<= currentPage', currentPage, '- skipping');
        setHotelLoading(false);
        return { fullList: [], newHotels: [] };
      }

      console.log('[PAGINATION_DEBUG] loadNextPage: currentPage=', currentPage, 'nextPage=', nextPage);

      try {
        // ALWAYS use page_limit = 3 for consistency
        const pageLimit = 3;
        // Many APIs use offset for pagination; send both page_number and offset so API returns correct slice
        const offset = (nextPage - 1) * pageLimit;

        const baseParams = baseFilterParamsRef.current || {};
        const filters = {
          request_id: requestIdRef.current,
          readyOperators: readyOperatorsRef.current,
          ...baseParams,
          page_number: nextPage,
          page_limit: pageLimit,
          offset, // skip (nextPage-1)*pageLimit items so page 2 = offset 3, page 3 = offset 6
        };

        console.log('[PAGINATION_DEBUG] API request: page_number=', filters.page_number, 'offset=', offset, 'request_id=', (filters.request_id || '').substring(0, 8) + '...');

        const result = await getGroupedHotels(filters);
        const allHotelsFromApi = result.hotels || [];
        const newHotels = allHotelsFromApi.slice(0, pageLimit);

        const apiHotelIds = newHotels.slice(0, 3).map(h => h.id || h.hotel?.id);
        console.log('[PAGINATION_DEBUG] API returned', allHotelsFromApi.length, 'hotels for page', nextPage);
        console.log('[PAGINATION_DEBUG] First 3 hotel IDs from API:', apiHotelIds);

        // Compute unique new hotels SYNCHRONOUSLY using ref (setState callback may run async)
        const prev = displayedHotelsRef.current;
        const existingIds = new Set(
          prev.map(h => h.id || h.hotel?.id).filter(Boolean)
        );
        const uniqueNewHotels = newHotels.filter(
          h => {
            const hotelId = h.id || h.hotel?.id;
            return hotelId && !existingIds.has(hotelId);
          }
        );
        const combined = [...prev, ...uniqueNewHotels];

        if (uniqueNewHotels.length < newHotels.length) {
          console.log('[useAiSearch] ⚠️ Filtered out', newHotels.length - uniqueNewHotels.length, 'duplicate hotels');
        }
        if (uniqueNewHotels.length === 0 && newHotels.length > 0) {
          console.error('[useAiSearch] ❌ All', newHotels.length, 'hotels from API were duplicates for page', nextPage);
          console.error('[useAiSearch] Existing IDs:', Array.from(existingIds).slice(0, 10));
          console.error('[useAiSearch] New IDs:', newHotels.slice(0, 3).map(h => h.id || h.hotel?.id));
        }

        console.log('[PAGINATION_DEBUG] displayedHotels: prev=', prev.length, '+ uniqueNew=', uniqueNewHotels.length, '= total', combined.length);

        displayedHotelsRef.current = combined;
        setDisplayedHotels(combined);

        // Only advance to next page if we got new hotels; otherwise stay on current page (don't change to page 2)
        if (uniqueNewHotels.length > 0) {
          currentPageRef.current = nextPage;
        }

        setHotelLoading(false);

        console.log('[PAGINATION_DEBUG] loadNextPage DONE: currentPageRef now=', currentPageRef.current, 'newHotels=', uniqueNewHotels.length, 'fullList=', combined.length);
        return { fullList: combined as Hotel[], newHotels: uniqueNewHotels as Hotel[] };
      } catch (err: any) {
        const isNetworkError = err?.message === 'Network Error' || err?.code === 'ERR_NETWORK';
        console.error('[useAiSearch] Load next page error:', isNetworkError ? 'Network Error' : err);
        setHotelLoading(false);
        if (err && typeof err === 'object') {
          (err as any).userMessage = isNetworkError
            ? 'Проверьте подключение к интернету и попробуйте снова.'
            : (err?.response?.data?.message || err?.message);
        }
        throw err;
      }
    },
    [],
  );

  /**
   * Reset all search state.  Call when clearing the conversation.
   */
  const resetSearch = useCallback(() => {
    requestIdRef.current = null;
    readyOperatorsRef.current = [];
    baseFilterParamsRef.current = null;
    currentPageRef.current = 0;
    displayedHotelsRef.current = [];
    setDisplayedHotels([]);
    setHotelLoading(false);
  }, []);

  return {
    /** Hotels currently shown on this screen */
    displayedHotels,
    /** Whether a search / page-load is in progress */
    hotelLoading,
    /** Current page number (0 = no search yet) */
    getCurrentPage: () => currentPageRef.current,
    /** Whether there's an active search whose pages can be iterated */
    hasActiveSearch: () => !!requestIdRef.current,
    /** The current request_id (or null) */
    getRequestId: () => requestIdRef.current,
    /** Start a new search */
    runSearch,
    /** Load next page of results from the current search */
    loadNextPage,
    /** Reset everything */
    resetSearch,
  };
}
