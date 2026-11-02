import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './slices/auth';
import searchReducer from './slices/search';
import destinationsReducer from './slices/destinations';
import departuresReducer from './slices/departures';
import supportChatReducer from './slices/supportChat';
import notificationsReducer from './slices/notifications';

// Центр уведомлений: сохраняем только «показывали ли предзапрос» и бейдж до первой загрузки.
const notificationsPersistConfig = {
  key: 'notifications',
  storage: AsyncStorage,
  whitelist: ['prompted', 'unread'],
};

// Поиск: сохраняем только параметры формы (куда, даты, ночи, туристы, тип) и название направления.
// Выдачу, статус и «идёт поиск» не сохраняем — после перезапуска не будет старого списка
// и вечной заглушки (план HOTEL_SEARCH_PROGRESSIVE, этап 4).
const searchPersistConfig = {
  key: 'search',
  storage: AsyncStorage,
  whitelist: ['searchParams', 'headerName'],
};

const rootReducer = combineReducers({
  auth: authReducer,
  search: persistReducer(searchPersistConfig, searchReducer),
  destinations: destinationsReducer,
  departures: departuresReducer,
  supportChat: supportChatReducer,
  notifications: persistReducer(notificationsPersistConfig, notificationsReducer),
});

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'supportChat'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
