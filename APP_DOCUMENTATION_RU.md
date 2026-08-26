# APP Documentation (RU) — totusapp (totusClubApp)

Документация построена **только по коду** репозитория `totusapp` (`/Users/haykmaruqyan/Desktop/TOSMEDIA/TOTUS/totusapp`).  
Если сведения отсутствуют в коде: `Не найдено в текущей кодовой базе.`  
Если вывод неочевиден: `Предположение:`.

Секреты, API-ключи, captcha sitekey, пароли TURN и т.п. **не приводятся** — только факт, что значение захардкожено в исходниках.

---

# 1. Mobile Architecture

## Стек

| Компонент | Факт из кода |
|-----------|--------------|
| Framework | **Bare React Native** `0.79.7` (`package.json`) — **не Expo** |
| UI | React `19.0.0` |
| Язык | TypeScript `5.0.4` |
| Навигация | React Navigation 7: `@react-navigation/native` `^7.1.19`, `native-stack` `^7.6.2`, `bottom-tabs` `^7.8.4` |
| State | Redux Toolkit `^2.10.1` + `redux-persist` `^6.0.0` + `@react-native-async-storage/async-storage` |
| HTTP | `axios` (`src/modules/axios`) + `fetch` (voip favorites/contacts/users) |
| AI UI | `@tosmedia/ai-assistant-native` (`github:tosmedia/totus_ai_v2#pkg/ai-assistant-native`) |
| Package name | `totusClubApp` (`package.json` / `app.json`) |

## Entry points

| Файл | Роль |
|------|------|
| `index.js` | `AppRegistry.registerComponent`; Android headless-задачи VoIP/CallKeep (`RNCallKeepBackgroundMessage`, `TotusVoipActionTask`) |
| `App.tsx` | Root: Redux `Provider` → `PersistGate` → `ThemeProvider` → `SafeAreaProvider` → `AiAssistantNativeProvider` → навигация + `CallModal` / `MinimizedCallView` |
| `src/navigation/index.tsx` | `NavigationContainer` + `AuthStack` |
| `src/navigation/authStack.tsx` | Корневой стек и tab-навигация |

## Поток данных (типичный)

```text
Screen (src/screens/*)
  ↓
Component (src/component/*)
  ↓
Redux thunk / hook / локальный state
  ↓
API-модуль (src/modules/api/*) или axios instance
  ↓
backends: api.totus.club | voip.totus.club | apiv2.totus.club | server.totus.club (legacy AI/TTS)
```

## Замечания

- Expo / EAS / `app.config` — **не найдено в текущей кодовой базе** (bare RN).
- Корневых `.env` / `.env.local` в `totusapp/` — **нет**; URL и ключи в основном захардкожены.
- `zustand` есть в `package.json`, в `src/` напрямую не импортируется — используется через `@tosmedia/ai-assistant-native` (`useAssistantStore`).

---

# 2. Project Structure

Высокоуровневое дерево (без `node_modules`, без `*.bak*` — в репозитории много backup-файлов, их можно игнорировать):

```text
totusapp/
├── App.tsx
├── index.js
├── app.json                    # name/displayName: totusClubApp
├── package.json
├── metro.config.js
├── babel.config.js
├── jest.config.js
├── tsconfig.json
├── __tests__/
│   └── App.test.tsx
├── android/                    # Gradle-проект, applicationId com.totus.com
├── ios/                        # totusClubApp.xcworkspace, PushKit/CallKeep native
├── assets/                     # корневые ассеты (если есть)
└── src/
    ├── config/                 # server.ts, captcha.ts, llm.ts
    ├── navigation/             # authStack, guestStack (unused), navigationRef
    ├── screens/                # home, auth, orders, account, favorites, ai, calls, chat, onboarding
    ├── component/              # UI, home, hotel, booking, checkout, tickets, orders, auth, ai, …
    ├── modules/
    │   ├── api/                # levelTravel, auth, favorites, contacts, users, AI/voice/TTS
    │   ├── axios/              # instance + Bearer + refresh
    │   ├── store/              # Redux + persist
    │   ├── voip/               # VoipService, CallService, CallKeep helpers
    │   ├── hooks/
    │   └── services/
    ├── context/                # ThemeContext
    ├── contexts/               # CallContext (провайдер в App не подключён)
    ├── theme/                  # light/dark/colors
    ├── hooks/
    ├── utils/
    ├── types/
    ├── content/                # privacyPolicy
    └── assets/                 # images, icons, lottie, fonts usage via Info.plist
```

**Важно:** в `package.json` скрипты вызывают `scripts/generate-autolinking.js`, но каталог `scripts/` в корне `totusapp/` **отсутствует** (`Не найдено в текущей кодовой базе.`).

---

# 3. Backend URLs

Источники: `src/config/server.ts`, `App.tsx`, `src/modules/axios/index.ts`, API-модули, checkout.

| Назначение | URL / хост | Где в коде |
|------------|------------|------------|
| Туры / отели / заказы (kedam-API parity) | `https://api.totus.club` | `SERVER_BASE_URL`; axios `baseURL` |
| VoIP, favorites, contacts, users, tour-assistant v2 client | `https://voip.totus.club` | `VOIP_BASE_URL` |
| AI assistant (preferred) | `https://apiv2.totus.club/api` + `wss://apiv2.totus.club/ws/assistant` | `AiAssistantNativeProvider` в `App.tsx` |
| Site origin / pay return | `https://totus.club` | `siteOrigin` в AI provider; `returnUrl` = `https://totus.club/pay?orderId=…` в checkout |
| Legacy AI / TTS / voice | `https://server.totus.club` | `tourAssistantApi`, `googleTtsApi` (prod), `voiceAssistantApi`; в `__DEV__` TTS может указывать на локальный IP |
| DeepSeek (прямой клиент) | `https://api.deepseek.com/v1/chat/completions` | `deepSeekApi.ts` (ключ **захардкожен в исходниках**) |
| STUN | `stun:stun1.totus.club:3478`, `stun:stun2.totus.club:3478` | `VoipService` ICE |
| TURN / TURNS | `turn1/turn2.totus.club:3478`, `:5349` | `VoipService` (username/credential **захардкожены в исходниках**) |
| Картинки отелей (CDN) | `https://img.cdn.level.travel/…` | transformers отелей |

**Env-файлы:** корневых `.env*` в `totusapp/` нет. Есть `ios/.xcode.env` / `.xcode.env.local` (типичные RN Node path) — не содержат backend URL приложения.

---

# 4. Navigation / Screens

Источник: `src/navigation/authStack.tsx`, `src/navigation/index.tsx`, `src/screens/index.ts`.

## Корневой `AuthStack`

| Route | Screen | Примечание |
|-------|--------|------------|
| `onboarding` | `OnboardingScreen` | Initial, если onboarding не завершён |
| `tab` | `TabBar` | Initial, если onboarding завершён |
| `ticketDetails` | `TicketDetailsScreen` | Дубль на корне (вне табов) |
| `booking` | `BookingScreen` | |
| `checkout` | `CheckoutScreen` | |
| `pendingPayment` | `PendingPaymentScreen` | |
| `hotelFromAi` | `HotelScreen` | |

Initial route: `isOnboardingCompleted()` → `'tab'` или `'onboarding'`.

## Tabs (`TabBar`)

| Tab | Label | Условие показа |
|-----|-------|----------------|
| `HomeStackScreen` | Поиск | всегда |
| `OrdersStackScreen` | Заказы | всегда |
| `VoiceAssistantStackScreen` | Totus AI | `accessToken` **и** `user.access === 0` (через `getUserById`) |
| `FavoritesStackScreen` | Избранное | только если залогинен |
| `AccountStackScreen` | Аккаунт | всегда |
| `ChatStackScreen` / Calls | Звонки | **закомментирован** — вкладка отключена |

Tab bar скрывается на AI-стеке целиком и на nested: `ticketDetails`, `booking`, `checkout`, `pendingPayment`, `hotelFromAi`, `orderDetails`.

## Nested stacks

**HomeStackScreen:** `home` → `searchResult` → `hotel` → `tickets` → `ticketDetails` → `booking` → `checkout` → `pendingPayment`

**OrdersStackScreen:** `orders` → `orderDetails` → `checkout` → `pendingPayment`

**FavoritesStackScreen:** `favorites` → `hotel` → `tickets` → `ticketDetails` → `booking` → `checkout` → `pendingPayment`

**VoiceAssistantStackScreen:** `aiTextScreen` (`TotusAiChatScreen`) → `hotelFromAi` → `tickets` → `ticketDetails` → `booking` → `checkout` → `pendingPayment`

**AccountStackScreen:** `login` / `signup` / `verification` / `account` / `favorites` / `privacyPolicy`  
Initial: `accessToken` ? `account` : `login`

## Orphan / legacy (не в активном nav)

| Элемент | Статус |
|---------|--------|
| `guestStack.tsx` | Есть файл, **не импортируется** в `navigation/index.tsx` |
| `screens/ai/VoiceAIScreen.tsx`, `textai.tsx`, `TextAiV2Screen.tsx`, `screens/ai/index.tsx` | В репозитории; активный маршрут AI — `TotusAiChatScreen` |
| `screens/calls/CallsScreen.tsx` | Есть; tab закомментирован |
| `screens/chat/chat.tsx` (`ChatScreen`) | Экспорт в `screens/index.ts`; calling stack закомментирован |
| `CallProvider` (`contexts/CallContext.tsx`) | Определён; **не обёрнут** в `App.tsx` (minimize call — локальный state в `App.tsx`) |

---

# 5. User Flows

## Поиск → отель → билеты → бронь → оплата

1. **Home** (`Search` / популярные направления) → Redux `search` + `levelTravelApi.startSearch` / `getGroupedHotels`.
2. **searchResult** → карточка отеля → **hotel** (номера, фильтры, AI-pick стили при наличии).
3. Выбор предложения → **tickets** (рейсы пакета) → **ticketDetails**.
4. **booking** (туристы, валидация) → создание заказа (`createOrder` / prebook / prebuild).
5. **checkout** → СБП (`createPay` → `/vtb/create-order`, `returnUrl` на `totus.club/pay`) → **pendingPayment** (polling `checkPay`, AsyncStorage `sbp_qrc_*`).

## Auth

1. Account tab без токена → **login** → код → **verification** (`/api/auth/signin|verify`).
2. **signup** → **verification** (`/api/auth/signup|verify`).
3. Токены в Redux persist; captcha через `YandexSmartCaptcha` (sitekey **захардкожен** в `config/captcha.ts`).

## Favorites

- API: `VOIP_BASE_URL` `/api/favorites…` (`modules/api/favorites.ts`).
- Tab «Избранное» только для залогиненных; также route `favorites` в Account stack.

## AI chat → отель

1. Tab Totus AI → `TotusAiChatScreen` (`ChatScreen` из `@tosmedia/ai-assistant-native`).
2. `onOpenHotel` / `openUrl` → `utils/aiAssistantOpenHotel` → navigate `hotelFromAi` (или root `hotelFromAi`).
3. Дальше тот же booking/checkout flow в AI-стеке.

## VoIP / звонки

- Инфраструктура: `VoipService`, CallKeep, WebRTC, voip-push, FCM, `CallModal` в `App.tsx`.
- UI-вкладка «Звонки» **отключена** в навигации; headless handlers в `index.js` остаются.

---

# 6. State Management

## Redux (`src/modules/store`)

| Slice | Persist |
|-------|---------|
| `auth` | да (whitelist) |
| `search` | да (whitelist) |
| `destinations` | нет |
| `departures` | нет |

`persistConfig`: `key: 'root'`, storage = AsyncStorage, `whitelist: ['auth', 'search']`.

Actions auth: `loginUser`, `verifyCode`, `signupUser`, `verificationSignup`, `refreshToken` (`store/actions/auth.ts`).

## Contexts

| Context | Путь | Назначение |
|---------|------|------------|
| Theme | `context/ThemeContext.tsx` | light/dark, AsyncStorage `@app_theme_mode` |
| Call | `contexts/CallContext.tsx` | minimize flag — **не подключён** в дерево App |
| TicketsFilters | `component/tickets/TicketsFiltersContext.tsx` | фильтры билетов |
| FiltersOpen | `component/searchResult/FiltersOpenContext.tsx` | модалка фильтров поиска |

## Zustand

- Прямых `import from 'zustand'` в `src/` — **нет**.
- Через пакет: `useAssistantStore` из `@tosmedia/ai-assistant-native` (`TotusAiChatScreen`, `aiAssistantOpenHotel`).

---

# 7. API Layer

## `modules/axios`

- `baseURL`: `https://api.totus.club`
- Request: `Authorization: Bearer <accessToken>` после проверки exp через `jwt-decode`
- Refresh: `POST /customer-auth/refresh-token` с `{ accessToken, refreshToken }`
- При ошибке refresh: `cleanupVoipOnLogout()` + `logoutReducer()`

## `modules/api/*` (активные `.ts`, без `.bak*`)

| Модуль | Backend | Назначение |
|--------|---------|------------|
| `levelTravelApi.ts` | api.totus.club | поиск, отели, пакеты, заказы, оплата, home |
| `auth.ts` | api.totus.club | `/api/auth/signin\|signup\|verify`, refresh |
| `favorites.ts` | voip | `/api/favorites` |
| `contacts.ts` | voip | `/api/contacts`, search users |
| `users.ts` | voip | `/api/users…`, `by-id` (поле `access` для AI tab) |
| `tourAssistantV2Client.ts` | voip `/api/v2/tour-assistant` | legacy v2 client |
| `tourAssistantApi.ts` | server.totus.club | legacy tour-assistant |
| `voiceAssistantApi.ts` | server.totus.club | `/api/voice-assistant/chat` |
| `googleTtsApi.ts` | server.totus.club (prod) / local IP (dev) | `/api/tts/synthesize` |
| `deepSeekApi.ts` | api.deepseek.com | прямой LLM (ключ захардкожен) |

### Основные пути `levelTravelApi` (относительно `api.totus.club`)

`/references/autocomplete_v2`, `/references/departures`, `/start-search`, `/search-status`, `/grouped-hotels`, `/get-hotel-offers`, `/hotels-rooms`, `/references/hotels`, `/references/hotel_reviews/:id`, `/packages/package_details`, `/packages/actualize`, `/packages/flights`, `/validate-tourists`, `/orders/prebuild`, `/packages/prebook`, `/create-package`, `/vtb/create-order`, `/home/data`, `/check_pay`, `/orders`, `/orders/documents`, `/user/orders`.

### Auth endpoints

- `POST /api/auth/signin`
- `POST /api/auth/signup`
- `POST /api/auth/verify`
- `POST /customer-auth/refresh-token`

---

# 8. Authentication

| Тема | Факт |
|------|------|
| Токены | `accessToken`, `refreshToken` в Redux `auth` |
| Хранение | redux-persist → **AsyncStorage** (ключ persist `root`) |
| SecureStore / Keychain | **не используется** в `src/` |
| JWT | `jwt-decode` в axios interceptor и auth slice |
| Onboarding | AsyncStorage `@onboarding_completed` (`utils/onboarding.ts`) — отдельно от auth |
| Logout | `logoutReducer`; при fail refresh ещё VoIP cleanup |

`fullAuth` — флаг в auth slice (используется в стеке; детальная семантика UI — по коду экранов account/auth).

---

# 9. VoIP / Calls

| Компонент | Роль |
|-----------|------|
| `modules/voip/VoipService.ts` | Socket/регистрация, WebRTC peer, ICE (STUN/TURN totus.club), call state |
| `modules/voip/CallService.js` | Incoming push, answer/end, Android background |
| `react-native-callkeep` | Системный UI звонка |
| `react-native-webrtc` | Медиа |
| `react-native-voip-push-notification` + PushKit | iOS VoIP push (`AppDelegate` / native helpers) |
| `@react-native-firebase/messaging` | FCM |
| `CallModal` / `MinimizedCallView` | UI в `App.tsx` |
| `index.js` | Headless: `RNCallKeepBackgroundMessage`, `TotusVoipActionTask` (actions `com.totus.com.voip.*`) |

**Навигация:** вкладка Calls закомментирована в `authStack.tsx`.  
**Предположение:** звонки всё ещё возможны через push/CallKeep без tab UI.

---

# 10. AI Assistant

## Активный путь

- Провайдер: `AiAssistantNativeProvider` в `App.tsx`  
  - `apiBase`: `https://apiv2.totus.club/api`  
  - `wsUrl`: `wss://apiv2.totus.club/ws/assistant`  
  - `siteOrigin`: `https://totus.club`  
  - `tourBasePath`: `/hotel-details`  
  - `getAccessToken` из Redux; `historyMode="auto"`
- Экран: `TotusAiChatScreen` → `ChatScreen` + `useAssistantStore` (refresh/flush history)
- Открытие отеля: `utils/aiAssistantOpenHotel.ts` (+ `setAiHotelNavigator` из чата)
- Возврат с AI-таба: `utils/aiTabReturn.ts` (`rememberNonAiTab`)

## Legacy (в репо, не в active tab route)

- `screens/ai/textai.tsx`, `TextAiV2Screen.tsx`, `VoiceAIScreen.tsx`, `screens/ai/index.tsx`
- API: `tourAssistantApi`, `tourAssistantV2Client`, `voiceAssistantApi`, `deepSeekApi`, `googleTtsApi`
- Storage legacy chat id: `tour_assistant_v2_active_conversation_${userId|guest}` в `textai.tsx`

Видимость вкладки Totus AI: залогинен **и** voip user `access === 0` (иначе tab скрыт; при ошибке API tab показывают с `access=0`).

---

# 11. Key Components

| Область | Путь | Примеры |
|---------|------|---------|
| UI kit | `component/UI/` | button, text, input, header, hotelCard, callModal, SbpPayButton, YandexSmartCaptcha, verificationCode, skeletons, icons |
| Home | `component/home/` | Search, PopularDestinations, readyTours, planingTrip, logo |
| Hotel | `component/hotel/` | Hotel, rooms, filters, modals (reviews, options) |
| Search results | `component/searchResult/` | ResultList, FiltersModal, SortModal |
| Tickets | `component/tickets/` | Tickets, FlightCardView, TicketDetails |
| Booking / Checkout | `component/booking/`, `checkout/` | Booking, Checkout, PendingPayment |
| Orders | `component/orders/` | Orders, OrderDetails, DocumentsModal |
| Auth | `component/auth/` | Login, Signup, Verification |
| Account | `component/account/` | Account |
| AI (legacy UI) | `component/ai/`, `tourVoiceAssistant/` | вспомогательные AI/voice UI |
| Onboarding | `component/onboarding/` | |

---

# 12. Config / Theme / Utils

| Файл | Содержание |
|------|------------|
| `config/server.ts` | `SERVER_BASE_URL`, `VOIP_BASE_URL` |
| `config/captcha.ts` | Yandex SmartCaptcha sitekey — **захардкожено в исходниках** (значение не документируем) |
| `config/llm.ts` | `DEEPSEEK_MODEL = 'deepseek-v4-flash'` |
| `theme/` | `light.ts`, `dark.ts`, `colors.ts`, `index.ts` |
| `utils/onboarding.ts` | флаг онбординга |
| `utils/sbpPayment.ts` | parse SBP, `sbp_qrc_${orderId}`, expire minutes |
| `utils/aiAssistantOpenHotel.ts` | deep link / open hotel from AI |
| `utils/aiTabReturn.ts` | tab return from AI |
| `hooks/useTheme.ts` | обёртка ThemeContext |
| `modules/hooks/useTrackingTransparency.ts` | ATT через `react-native-tracking-transparency` + AsyncStorage keys |

Шрифты (iOS `Info.plist` UIAppFonts): семейство **Golos Text** (Black/Bold/ExtraBold/Medium/Regular/SemiBold/Text).

---

# 13. Native iOS / Android

## Identifiers

| Платформа | ID |
|-----------|-----|
| iOS bundle | `app.totus.club` (`PRODUCT_BUNDLE_IDENTIFIER` в `project.pbxproj`) |
| iOS display name | `Totus Club` (`Info.plist`) |
| Android `applicationId` / namespace | `com.totus.com` (`android/app/build.gradle`) |
| npm / JS name | `totusClubApp` |

**Mismatch:** скрипт `android:clean` делает `adb uninstall com.totusclubapp`, тогда как реальный `applicationId` — `com.totus.com`. Headless VoIP actions используют префикс `com.totus.com.voip.*`.

## Permissions / capabilities

**Android (`AndroidManifest.xml`):** INTERNET, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, WAKE_LOCK, telecom/CallKeep (`BIND_TELECOM_CONNECTION_SERVICE`, foreground phone call), READ_PHONE_STATE, POST_NOTIFICATIONS, USE_FULL_SCREEN_INTENT. Activity: `screenOrientation="portrait"`.

**iOS (`Info.plist`):** Camera, Photo Library, Bluetooth, Microphone, Speech Recognition; `UIBackgroundModes`: `voip`, `audio`. Ориентации в plist: Portrait + Landscape Left/Right (не только portrait).  
`NSUserTrackingUsageDescription` в `Info.plist` — **не найдено в текущей кодовой базе** (при этом JS-хук ATT есть).

**Firebase:** `@react-native-firebase/app`, `messaging`, `crashlytics`; `ios/totusClubApp/GoogleService-Info.plist` присутствует.

**PushKit / CallKeep:** native `VoIPPushModule`, `VoipPushHelper`, `CallKeepHelper`, entitlements `aps-environment` = `development`.

---

# 14. Scripts & Dependencies

## npm scripts (`package.json`)

| Script | Команда |
|--------|---------|
| `start` | `react-native start` |
| `start:clean` | `react-native start --reset-cache` |
| `ios` | `react-native run-ios` |
| `android` | `generate-autolinking` + `run-android` |
| `android:no-packager` | то же без packager |
| `android:clean` | uninstall `com.totusclubapp` + run-android |
| `generate-autolinking` | `node scripts/generate-autolinking.js` — **файл/папка scripts отсутствует** |
| `lint` | `eslint .` |
| `test` | `jest` |

## Ключевые зависимости (зачем)

| Пакет | Зачем |
|-------|--------|
| `@react-navigation/*` | стеки и табы |
| `@reduxjs/toolkit`, `react-redux`, `redux-persist` | state |
| `axios` | HTTP к api.totus.club |
| `@tosmedia/ai-assistant-native` | Totus AI UI + store |
| `react-native-callkeep`, `webrtc`, `voip-push`, `incall-manager` | звонки |
| `@react-native-firebase/*` | push / crashlytics |
| `react-native-webview` | captcha / PDF viewer и др. |
| `lottie-react-native` | анимации |
| `socket.io-client` | VoIP realtime |
| `jwt-decode` | refresh gate |
| `zustand` | peer/transitive для AI package |
| `@react-native-voice/voice`, `react-native-tts` | voice AI legacy |

Engines: `node >= 18`.

---

# 15. Storage keys (AsyncStorage)

| Ключ / паттерн | Назначение | Источник |
|----------------|------------|----------|
| redux-persist `root` (persist auth+search) | токены и search state | `modules/store/index.ts` |
| `@onboarding_completed` | онбординг пройден | `utils/onboarding.ts` |
| `@app_theme_mode` | тема | `ThemeContext` |
| `sbp_qrc_${orderId}` | SBP qrcId | `utils/sbpPayment.ts` |
| `tour_assistant_v2_active_conversation_${userId\|guest}` | legacy AI conversation id | `screens/ai/textai.tsx` |
| `@tracking_transparency_status` | статус ATT | `useTrackingTransparency` |
| `@tracking_transparency_requested` | ATT уже спрашивали | то же |
| `pinCode` | локальный флаг `'YES'` на Home | `component/home/Home.tsx` |

Доп. storage внутри `@tosmedia/ai-assistant-native` (`historyMode="auto"`) — детали ключей пакета: смотреть в зависимости; в `src/` app-кода явных имён кроме выше — **не найдено**.

---

# 16. Testing

Единственный тест: `__tests__/App.test.tsx` — smoke «renders correctly» через `react-test-renderer`.  
E2E / Detox / другие suites — **не найдено в текущей кодовой базе.**

---

# 17. Important Files

| Файл | Зачем |
|------|-------|
| `index.js` | Entry + Android VoIP headless |
| `App.tsx` | Providers, AI bridge, CallModal |
| `src/navigation/authStack.tsx` | Полная карта маршрутов |
| `src/navigation/index.tsx` | NavigationContainer |
| `src/navigation/navigationRef.ts` | Imperative nav (AI open hotel) |
| `src/config/server.ts` | Base URLs |
| `src/modules/axios/index.ts` | Bearer + refresh + logout |
| `src/modules/store/index.ts` | Redux + persist |
| `src/modules/api/levelTravelApi.ts` | Туры/отели/заказы |
| `src/modules/api/auth.ts` | Auth endpoints |
| `src/modules/api/favorites.ts` | Избранное (voip) |
| `src/modules/voip/VoipService.ts` | WebRTC / calls core |
| `src/modules/voip/CallService.js` | Push/CallKeep handlers |
| `src/screens/ai/TotusAiChatScreen.tsx` | Активный AI UI |
| `src/utils/aiAssistantOpenHotel.ts` | AI → hotel |
| `src/component/checkout/Checkout.tsx` | SBP + returnUrl |
| `android/app/build.gradle` | applicationId |
| `ios/totusClubApp/Info.plist` | Permissions / fonts / background |
| `package.json` | scripts & deps |

---

# 18. Instructions for Claude Code

## Как запустить

```bash
cd totusapp
npm install
npm start                 # Metro
npm run ios               # iOS
# Android (скрипт ожидает scripts/generate-autolinking.js — папки сейчас нет):
npm run android
```

iOS: открывать `ios/totusClubApp.xcworkspace`, pods уже в репо (`ios/Pods`).  
Учитывать Firebase / signing / Push capabilities в Xcode.

## Где что лежит

| Задача | Где править |
|--------|-------------|
| Навигация / табы | `src/navigation/authStack.tsx` |
| API туры | `src/modules/api/levelTravelApi.ts` + `modules/axios` |
| Auth | `modules/api/auth.ts`, `store/slices/auth`, screens/component `auth` |
| Favorites / voip users | `modules/api/favorites|users|contacts` + `VOIP_BASE_URL` |
| State | `src/modules/store` |
| VoIP | `src/modules/voip/*`, `App.tsx` CallModal, `index.js` headless |
| AI | `App.tsx` provider, `TotusAiChatScreen`, `utils/aiAssistantOpenHotel` |
| Тема | `src/theme`, `context/ThemeContext` |
| Нативные ID | `android/app/build.gradle`, `ios/.../project.pbxproj` |

## Правила изменений

1. **Не удалять** `@tosmedia/ai-assistant-native` и не ломать `AiAssistantNativeProvider` без явной задачи.
2. **Не вычищать «заодно»** VoIP / Firebase / CallKeep / headless tasks — вкладка звонков скрыта, инфраструктура живая.
3. Соблюдать существующую навигацию (nested stacks, hide tab bar sets) и theme tokens.
4. **Не коммитить секреты**; новые ключи — не вшивать в исходники (сейчас captcha/DeepSeek/TURN уже захардкожены — не размножать паттерн).
5. Для туров/поиска/оплаты предпочитать **`https://api.totus.club`**, чтобы паритет с kedam-WEB / kedam-API сохранялся.
6. Backup-файлы `*.bak*` не трогать как source of truth.
7. При правке Android package учитывать mismatch `com.totus.com` vs `com.totusclubapp` в скриптах.

---

*Конец документации. Источник истины — текущий код `totusapp`.*
