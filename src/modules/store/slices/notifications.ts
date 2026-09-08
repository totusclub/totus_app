// Центр уведомлений: список, счётчик непрочитанных, настройки, статус push-разрешения.
// Persist — только `prompted` (показывали ли предзапрос) и `unread` (бейдж до первой загрузки),
// см. store/index.ts. Сбрасывается при логауте (logoutReducer из auth), кроме `prompted`.
import {createAsyncThunk, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {logoutReducer} from './auth';
import {
  getNotifications,
  getNotificationSettings,
  getUnread,
  markNotificationsRead,
  notificationsErrorMessage,
  updateNotificationSettings,
  type NotificationCategory,
  type NotificationItem,
  type NotificationPrefs,
  type NotificationSettings,
  type PushDevice,
} from '../../api/notifications';

export type PushPermission = 'granted' | 'denied' | 'undetermined';

export type NotificationsState = {
  items: NotificationItem[];
  hasMore: boolean;
  unread: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  /** Активный фильтр списка (null — «Все»). */
  category: NotificationCategory | null;
  settings: NotificationSettings | null;
  devices: PushDevice[];
  settingsLoading: boolean;
  settingsError: string | null;
  permission: PushPermission;
  /** Устройство зарегистрировано в хабе (POST /api/push/devices прошёл). */
  registered: boolean;
  /** Показывали ли предзапрос разрешения (persist). */
  prompted: boolean;
  lastFetchedAt: number | null;
};

const initialState: NotificationsState = {
  items: [],
  hasMore: false,
  unread: 0,
  loading: false,
  loadingMore: false,
  error: null,
  category: null,
  settings: null,
  devices: [],
  settingsLoading: false,
  settingsError: null,
  permission: 'undetermined',
  registered: false,
  prompted: false,
  lastFetchedAt: null,
};

function sortNewestFirst(list: NotificationItem[]): NotificationItem[] {
  return list.slice().sort((a, b) => {
    const ta = Date.parse(a.createdAt) || 0;
    const tb = Date.parse(b.createdAt) || 0;
    if (tb !== ta) return tb - ta;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
}

function mergeItems(list: NotificationItem[], incoming: NotificationItem[]): NotificationItem[] {
  const map = new Map<number, NotificationItem>();
  list.forEach(item => map.set(item.id, item));
  incoming.forEach(item => map.set(item.id, {...map.get(item.id), ...item}));
  return sortNewestFirst(Array.from(map.values()));
}

export const fetchNotifications = createAsyncThunk<
  {items: NotificationItem[]; hasMore: boolean; unread: number; append: boolean; category: NotificationCategory | null},
  {before?: number | null; category?: NotificationCategory | null; limit?: number} | undefined,
  {rejectValue: string}
>('notifications/fetch', async (params, {rejectWithValue}) => {
  try {
    const category = params?.category ?? null;
    const before = params?.before ?? null;
    const response = await getNotifications({before, category, limit: params?.limit ?? 30});
    return {
      items: Array.isArray(response?.items) ? response.items : [],
      hasMore: Boolean(response?.hasMore),
      unread: typeof response?.unread === 'number' ? response.unread : -1,
      append: Boolean(before),
      category,
    };
  } catch (e) {
    return rejectWithValue(notificationsErrorMessage(e));
  }
});

export const refreshUnread = createAsyncThunk<number, void, {rejectValue: string}>(
  'notifications/refreshUnread',
  async (_, {rejectWithValue}) => {
    try {
      const response = await getUnread();
      return typeof response?.unread === 'number' ? response.unread : 0;
    } catch (e) {
      return rejectWithValue(notificationsErrorMessage(e));
    }
  },
);

export const markRead = createAsyncThunk<
  {ids: number[] | 'all'; unread: number},
  number[] | 'all',
  {rejectValue: string}
>('notifications/markRead', async (ids, {rejectWithValue}) => {
  try {
    if (ids !== 'all' && ids.length === 0) return {ids, unread: -1};
    const response = await markNotificationsRead(ids);
    return {ids, unread: typeof response?.unread === 'number' ? response.unread : -1};
  } catch (e) {
    return rejectWithValue(notificationsErrorMessage(e));
  }
});

export const fetchSettings = createAsyncThunk<
  {settings: NotificationSettings; devices: PushDevice[]},
  void,
  {rejectValue: string}
>('notifications/fetchSettings', async (_, {rejectWithValue}) => {
  try {
    const response = await getNotificationSettings();
    return {settings: response.settings, devices: response.devices || []};
  } catch (e) {
    return rejectWithValue(notificationsErrorMessage(e));
  }
});

export const updateSettings = createAsyncThunk<
  {settings: NotificationSettings; devices: PushDevice[]},
  {prefs?: Partial<NotificationPrefs>; email?: boolean; sound?: boolean},
  {rejectValue: string}
>('notifications/updateSettings', async (partial, {rejectWithValue}) => {
  try {
    const response = await updateNotificationSettings(partial);
    return {settings: response.settings, devices: response.devices || []};
  } catch (e) {
    return rejectWithValue(notificationsErrorMessage(e));
  }
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    /** Socket notify:new / foreground-пуш — добавить в список, unread + 1. */
    notificationReceived(state, action: PayloadAction<NotificationItem>) {
      const item = action.payload;
      if (!item || typeof item.id !== 'number') return;
      const exists = state.items.some(i => i.id === item.id);
      if (!exists) {
        if (!state.category || state.category === item.category) {
          state.items = sortNewestFirst([{...item, readAt: item.readAt ?? null}, ...state.items]);
        }
        state.unread += 1;
      }
    },
    /** Socket notify:badge / ответ API. */
    setUnread(state, action: PayloadAction<number>) {
      state.unread = Math.max(0, Number(action.payload) || 0);
    },
    /** Локально пометить прочитанным (тап по элементу, POST /opened идёт отдельно). */
    markReadLocal(state, action: PayloadAction<number>) {
      const item = state.items.find(i => i.id === action.payload);
      if (item && !item.readAt) {
        item.readAt = new Date().toISOString();
        state.unread = Math.max(0, state.unread - 1);
      }
    },
    removeNotification(state, action: PayloadAction<number>) {
      const item = state.items.find(i => i.id === action.payload);
      if (item && !item.readAt) state.unread = Math.max(0, state.unread - 1);
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    setCategoryFilter(state, action: PayloadAction<NotificationCategory | null>) {
      state.category = action.payload;
    },
    setPushPermission(state, action: PayloadAction<PushPermission>) {
      state.permission = action.payload;
    },
    setPushRegistered(state, action: PayloadAction<boolean>) {
      state.registered = action.payload;
    },
    setPushPrompted(state, action: PayloadAction<boolean>) {
      state.prompted = action.payload;
    },
    /** Оптимистичное переключение категории/канала. */
    setSettingsLocal(
      state,
      action: PayloadAction<{prefs?: Partial<NotificationPrefs>; email?: boolean; sound?: boolean}>,
    ) {
      if (!state.settings) return;
      const {prefs, email, sound} = action.payload;
      if (prefs) state.settings.prefs = {...state.settings.prefs, ...prefs};
      if (typeof email === 'boolean') state.settings.email = email;
      if (typeof sound === 'boolean') state.settings.sound = sound;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchNotifications.pending, (state, action) => {
        const append = Boolean(action.meta.arg?.before);
        if (append) state.loadingMore = true;
        else state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        const {items, hasMore, unread, append, category} = action.payload;
        state.loading = false;
        state.loadingMore = false;
        state.category = category;
        state.items = append ? mergeItems(state.items, items) : sortNewestFirst(items);
        state.hasMore = hasMore;
        if (unread >= 0) state.unread = unread;
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = action.payload || notificationsErrorMessage(null);
      })
      .addCase(refreshUnread.fulfilled, (state, action) => {
        state.unread = Math.max(0, action.payload);
      })
      .addCase(markRead.pending, (state, action) => {
        const ids = action.meta.arg;
        const now = new Date().toISOString();
        if (ids === 'all') {
          state.items.forEach(item => {
            if (!item.readAt) item.readAt = now;
          });
          state.unread = 0;
        } else {
          ids.forEach(id => {
            const item = state.items.find(i => i.id === id);
            if (item && !item.readAt) {
              item.readAt = now;
              state.unread = Math.max(0, state.unread - 1);
            }
          });
        }
      })
      .addCase(markRead.fulfilled, (state, action) => {
        if (action.payload.unread >= 0) state.unread = action.payload.unread;
      })
      .addCase(fetchSettings.pending, state => {
        state.settingsLoading = true;
        state.settingsError = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.settingsLoading = false;
        state.settings = action.payload.settings;
        state.devices = action.payload.devices;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.settingsLoading = false;
        state.settingsError = action.payload || notificationsErrorMessage(null);
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.settings = action.payload.settings;
        if (action.payload.devices.length) state.devices = action.payload.devices;
        state.settingsError = null;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.settingsError = action.payload || notificationsErrorMessage(null);
      })
      .addCase(logoutReducer, state => ({...initialState, prompted: state.prompted}));
  },
});

export const {
  notificationReceived,
  setUnread,
  markReadLocal,
  removeNotification,
  setCategoryFilter,
  setPushPermission,
  setPushRegistered,
  setPushPrompted,
  setSettingsLocal,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
