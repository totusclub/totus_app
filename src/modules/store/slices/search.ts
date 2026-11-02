import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {
  startSearch,
  checkSearchStatus,
  getSearchStatus,
  getGroupedHotels,
} from '../../api/levelTravelApi';
import {
  SearchParams,
  FilterParams,
  SearchStatus,
  GroupedHotelsResponse,
  Hotel,
} from '../types/search';
import {buildApiSearchParams, withSearchTypeFilters} from '../../../utils/searchParamsUtils';
import {
  PROGRESSIVE_SEARCH_ENABLED,
  getVisibleHotelCount,
  mergeProgressiveHotels,
  runProgressiveSearch,
} from '../../../utils/progressiveSearch';

interface SearchState {
  hotels: GroupedHotelsResponse | null;
  progress: SearchStatus;
  loading: boolean;
  error: string | null;
  requestId: string | null | undefined;
  operators: string[];
  headerName: string;
  startSearchValid: boolean;
  loadMore: boolean;
  allMyHotels: Hotel[];
  searchParams: SearchParams | null;
  /** Постепенная выдача: id текущего поиска (requestId thunk-а); ответы других поисков выбрасываются. */
  activeSearchId?: string | null;
  /** Сколько операторов ещё ищут (null — поиск не идёт): «Ищем ещё у N операторов». */
  searchingOperators?: number | null;
  /** Идёт запрос фильтра / сортировки первой страницы — его ответ заменит список. */
  refreshing?: boolean;
  /** Последний запрос фильтра первой страницы — ответы более ранних выбрасываются. */
  filterRequestId?: string | null;
}

const initialState: SearchState = {
  hotels: null,
  progress: {},
  loading: false,
  error: null,
  requestId: null,
  operators: [],
  headerName: '',
  startSearchValid: true,
  loadMore: false,
  allMyHotels: [],
  searchParams: null,
  activeSearchId: null,
  searchingOperators: null,
  refreshing: false,
  filterRequestId: null,
};

// Постепенная выдача: id текущего поиска. Новый поиск заменяет его —
// цикл старого поиска сам останавливается, его ответы не попадают в список.
let activeProgressiveId: string | null = null;

/** Применённые фильтры и сортировка из ответа выдачи (их меняет человек, пока идёт поиск). */
function pickAppliedFromHotels(hotels: GroupedHotelsResponse | null): Record<string, unknown> {
  if (!hotels) return {};
  const out: Record<string, unknown> = {};
  Object.keys(hotels).forEach(key => {
    if (key.startsWith('filter_') || key === 'sort_by') {
      const value = (hotels as Record<string, unknown>)[key];
      if (value !== undefined && value !== null) out[key] = value;
    }
  });
  return out;
}

/** Параметры выдачи из формы: без ответа LT, без замороженных операторов и номера страницы. */
function listParamsFromFilterParams(filterParams?: FilterParams): Record<string, unknown> {
  if (!filterParams || typeof filterParams !== 'object') return {};
  const {
    request_id: _r,
    readyOperators: _ro,
    operator_ids: _oi,
    page_number: _pn,
    hotels: _h,
    filters: _f,
    statistics: _s,
    ...rest
  } = filterParams as Record<string, unknown>;
  return rest;
}

// Постепенная выдача (utils/progressiveSearch.ts): первая страница с первого опроса, без operator_ids,
// дозапрос по мере поиска. readyOperators в ответе — все операторы поиска: этот список не сужает
// выдачу (то же, что без него), а сортировка, фильтры и догрузка работают как раньше.
async function runProgressiveFlow(
  {searchParams, filterParams}: {searchParams: SearchParams; filterParams?: FilterParams},
  thunkApi: {dispatch: any; getState: () => unknown; requestId: string; rejectWithValue: (v: string) => any},
) {
  const {dispatch, getState, requestId, rejectWithValue} = thunkApi;
  activeProgressiveId = requestId;
  const isCurrent = () => activeProgressiveId === requestId;
  const apiSearchParams = buildApiSearchParams(searchParams);
  const searchType = apiSearchParams.search_type;
  const initialListParams = listParamsFromFilterParams(filterParams);
  const searchState = () => (getState() as {search: SearchState}).search;
  let operatorIds: string[] = [];

  try {
    const result = await runProgressiveSearch({
      searchParams: apiSearchParams as Record<string, unknown>,
      startSearch: params => startSearch(params as SearchParams),
      checkStatus: rid => getSearchStatus(rid),
      fetchPage: params => getGroupedHotels(params as FilterParams),
      isCurrent,
      isListBusy: () => Boolean(searchState().refreshing),
      getListParams: () =>
        withSearchTypeFilters(searchType, {
          ...initialListParams,
          ...pickAppliedFromHotels(searchState().hotels),
          page_limit: Math.max(1, Number(initialListParams.page_limit) || 20),
        }),
      onStatus: ({statusMap, operatorsLeft}) => {
        operatorIds = Object.keys(statusMap || {});
        dispatch(progressiveStatus({searchId: requestId, statusMap, operatorsLeft}));
      },
      onPage: (page, {first, final, listParams}) => {
        const {request_id: _rid, page_number: _pn, ...applied} = listParams;
        dispatch(
          progressivePage({
            searchId: requestId,
            first,
            final,
            frozenCount: first ? 0 : getVisibleHotelCount(),
            page: {
              ...page,
              ...applied,
              request_id: page?.request_id ?? listParams.request_id,
              readyOperators: operatorIds,
              search_type: searchType,
              page_number: 1,
              emptyType: 'RELOAD',
            },
          }),
        );
      },
    });
    if (isCurrent()) activeProgressiveId = null;
    return {progressive: true, ...result} as unknown as GroupedHotelsResponse;
  } catch (err: any) {
    if (!isCurrent()) return {progressive: true, outcome: 'cancelled'} as unknown as GroupedHotelsResponse;
    activeProgressiveId = null;
    return rejectWithValue(err?.message || 'Failed to complete search');
  }
}

// Thunk
export const runFullSearchFlow = createAsyncThunk(
  'search/runFullSearchFlow',
  async (
    {
      searchParams,
      filterParams,
    }: {searchParams: SearchParams; filterParams?: FilterParams},
    {rejectWithValue, dispatch, getState, requestId},
  ) => {
    if (PROGRESSIVE_SEARCH_ENABLED) {
      return runProgressiveFlow({searchParams, filterParams}, {dispatch, getState, requestId, rejectWithValue});
    }
    try {
      const apiSearchParams = buildApiSearchParams(searchParams);
      console.log('[Search] runFullSearchFlow', {
        searchParams: apiSearchParams,
        filterParams,
      });
      const {request_id} = await startSearch(apiSearchParams);
      console.log('[Search] request_id', request_id);

      return await new Promise<GroupedHotelsResponse>((resolve, reject) => {
        let interval: ReturnType<typeof setInterval> | undefined;

        const pollStatus = async () => {
          try {
            const statusMap = await checkSearchStatus(request_id);
            dispatch(updateProgress(statusMap));

            const readyOperators = Object.entries(statusMap)
              .filter(
                ([_, status]) => status === 'completed' || status === 'cached',
              )
              .map(([id]) => id);

            console.log('[Search] status poll', {readyOperators, statusMap});

            if (readyOperators.length === 0) {
              return;
            }

            if (interval) {
              clearInterval(interval);
            }

            let filters: FilterParams = {
              request_id,
              readyOperators,
            };

            if (filterParams && typeof filterParams === 'object') {
              filters = {...filters, ...filterParams};
            }

            filters = withSearchTypeFilters(apiSearchParams.search_type, filters);

            console.log('[Search] grouped-hotels request', filters);
            const hotels = await getGroupedHotels(filters);
            console.log('[Search] grouped-hotels result', {
              hotels_count: hotels?.hotels_count ?? hotels?.hotels?.length ?? 0,
              search_type: hotels?.search_type ?? apiSearchParams.search_type,
            });
            resolve({
              ...hotels,
              ...filters,
              search_type: apiSearchParams.search_type,
              emptyType: 'RELOAD',
            });
          } catch (err) {
            if (interval) {
              clearInterval(interval);
            }
            reject(err);
          }
        };

        void pollStatus();
        // 6s poll reduces parallel TLS bursts (TSPU on some RU mobile networks).
        interval = setInterval(pollStatus, 6000);
      });
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to complete search');
    }
  },
);

export const searchFilters = createAsyncThunk(
  'search/filters',
  async (params: FilterParams, {rejectWithValue}) => {
    try {
      const hotels = await getGroupedHotels(params);
      // Persist applied filter params; never drop API facet `filters`.
      const {
        request_id,
        readyOperators,
        page_number,
        page_limit,
        hotels: _hotelsIgnored,
        filters: _filtersIgnored,
        statistics: _statisticsIgnored,
        ...appliedFilters
      } = (params || {}) as Record<string, unknown>;

      return {
        ...hotels,
        ...appliedFilters,
        request_id: hotels?.request_id ?? request_id,
        readyOperators: (hotels as any)?.readyOperators ?? readyOperators,
        filters: hotels?.filters,
        statistics: (hotels as any)?.statistics,
        hotels: hotels?.hotels,
        hotels_count: (hotels as any)?.hotels_count,
        page_number: (page_number as number | undefined) ?? hotels?.page_number,
        page_limit:
          (page_limit as number | undefined) ?? (hotels as any)?.page_limit,
      } as GroupedHotelsResponse;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch grouped hotels');
    }
  },
);

// Slice
const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    updateProgress(state, action) {
      state.progress = action.payload;
    },
    clearSearch(state) {
      // Текущий поиск не останавливаем: форма зовёт clearSearch и после загрузки городов вылета,
      // уже после нажатия «Найти». Старый поиск перебьёт следующий (runFullSearchFlow.pending).
      state.refreshing = false;
      state.filterRequestId = null;
      state.hotels = null;
      state.progress = {};
      state.loading = false;
      state.error = null;
      state.headerName = '';
      state.startSearchValid = true;
      state.loadMore = false;
      state.allMyHotels = [];
      state.requestId = null;
      state.operators = [];
      state.searchParams = null;
    },
    setSearchParams(state, action) {
      state.searchParams = action.payload;
    },
    setHeaderName(state, action) {
      state.headerName = action.payload;
    },
    setStartSearch(state, action) {
      state.startSearchValid = action.payload;
    },
    setLoadMore(state, action) {
      state.loadMore = action.payload;
    },
    appendAllHotels(state, action) {
      state.allMyHotels = [...state.allMyHotels, ...action.payload.hotels];
    },
    progressiveStatus(state, action) {
      if (action.payload?.searchId !== state.activeSearchId) return;
      state.progress = action.payload.statusMap || {};
      state.searchingOperators = Number(action.payload.operatorsLeft) || 0;
    },
    progressivePage(state, action) {
      const {searchId, first, final, frozenCount, page} = action.payload || {};
      if (searchId !== state.activeSearchId) return;
      // Идёт запрос фильтра / сортировки — его ответ заменит список.
      if (state.refreshing) return;
      const incoming = page?.hotels || [];
      if (first || state.hotels == null) {
        state.hotels = page;
        state.allMyHotels = incoming;
      } else {
        // Номер страницы прежний — догрузка «Показать ещё» продолжается со следующей.
        state.hotels = {...page, page_number: state.hotels?.page_number ?? 1};
        state.allMyHotels = mergeProgressiveHotels(state.allMyHotels as any[], incoming, {
          sortBy: page?.sort_by,
          frozenCount,
        }) as any;
      }
      state.requestId = page?.request_id ?? state.requestId;
      state.loading = false;
      state.error = null;
      if (final) state.searchingOperators = null;
    },
    setAllMyHotels(state, action) {
      // Handle both { hotels: [] } and [] formats
      if (Array.isArray(action.payload)) {
        state.allMyHotels = action.payload;
      } else {
        state.allMyHotels = action.payload?.hotels || [];
      }
    },
  },
  extraReducers: builder => {
    builder
      .addCase(runFullSearchFlow.pending, (state, action) => {
        state.activeSearchId = action.meta.requestId;
        state.searchingOperators = null;
        state.refreshing = false;
        state.filterRequestId = null;
        state.requestId = null;
        state.loading = true;
        state.error = null;
        state.progress = {};
        // Clear old hotels immediately when starting new search
        state.allMyHotels = [];
        state.hotels = null;
        // Store search params from the thunk argument
        if (action.meta.arg?.searchParams) {
          state.searchParams = action.meta.arg.searchParams;
        }
      })
      .addCase(runFullSearchFlow.fulfilled, (state, action) => {
        // Ответ старого поиска (человек уже запустил новый) — не нужен.
        if (action.meta.requestId !== state.activeSearchId) return;
        if ((action.payload as any)?.progressive) {
          // Список уже собран progressivePage; здесь только конец поиска.
          state.loading = false;
          state.searchingOperators = null;
          return;
        }
        state.hotels = action.payload;
        state.loading = false;
        state.allMyHotels = action.payload.hotels || [];
        state.requestId = action.payload.request_id;
      })
      .addCase(runFullSearchFlow.rejected, (state, action) => {
        if (action.meta.requestId !== state.activeSearchId) return;
        state.loading = false;
        state.searchingOperators = null;
        state.error = action.payload as string;
        // Постепенная выдача: за 90 с ни одного отеля или ошибка — экран «не найдено» с кнопкой,
        // а не бесконечные заглушки.
        if (PROGRESSIVE_SEARCH_ENABLED && state.hotels == null) {
          state.hotels = {hotels: [], hotels_count: 0, emptyType: 'RELOAD'} as GroupedHotelsResponse;
          state.allMyHotels = [];
        }
      })
      .addCase(searchFilters.pending, (state, action) => {
        const pageNumber = Number(action.meta.arg?.page_number) || 1;
        if (pageNumber <= 1) {
          // Постепенная выдача не вливает страницы поверх ответа фильтра / сортировки.
          state.refreshing = true;
          state.filterRequestId = action.meta.requestId;
        }
        state.loading = true;
        state.error = null;
        state.progress = {};
      })
      .addCase(searchFilters.fulfilled, (state, action) => {
        const requestedPage = Number(action.meta.arg?.page_number) || 1;
        // Ответ более раннего клика по фильтру / сортировке — не нужен.
        if (requestedPage <= 1 && state.filterRequestId && action.meta.requestId !== state.filterRequestId) {
          return;
        }
        // Догрузка страницы старого поиска — не нужна.
        if (
          requestedPage > 1 &&
          state.hotels?.request_id &&
          action.payload?.request_id &&
          action.payload.request_id !== state.hotels.request_id
        ) {
          state.loading = false;
          return;
        }
        if (requestedPage <= 1) state.refreshing = false;
        state.hotels = action.payload;
        state.loading = false;

        // If page_number is 1, replace hotels. Otherwise append for pagination
        const pageNumber = action.payload.page_number || 1;
        const hotels = action.payload.hotels || [];

        if (pageNumber === 1) {
          // Replace the entire list for new searches/filters/sorts
          state.allMyHotels = hotels;
        } else {
          // Append for pagination, avoiding duplicates by hotel ID
          const existingIds = new Set((state.allMyHotels || []).map(h => {
            const hotelData = (h as any).hotel || h;
            return hotelData.id || (h as any).id || h.id;
          }));
          const newHotels = hotels.filter(h => {
            const hotelData = (h as any).hotel || h;
            const hotelId = hotelData.id || (h as any).id || h.id;
            return !existingIds.has(hotelId);
          });
          state.allMyHotels = [...(state.allMyHotels || []), ...newHotels];
        }
      })
      .addCase(searchFilters.rejected, (state, action) => {
        const requestedPage = Number(action.meta.arg?.page_number) || 1;
        if (requestedPage <= 1 && state.filterRequestId && action.meta.requestId !== state.filterRequestId) {
          return;
        }
        if (requestedPage <= 1) state.refreshing = false;
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  updateProgress,
  clearSearch,
  setHeaderName,
  setStartSearch,
  setLoadMore,
  setAllMyHotels,
  appendAllHotels,
  setSearchParams,
  progressiveStatus,
  progressivePage,
} = searchSlice.actions;

export default searchSlice.reducer;

