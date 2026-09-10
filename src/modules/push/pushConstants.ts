// Тексты, категории и каналы push-уведомлений (DESIGN.md «Notifications UI», API.md §2).
import type {NotificationCategory, NotificationType} from '../api/notifications';

/** Название роута экрана «Уведомления» в AccountStackScreen. */
export const NOTIFICATIONS_ROUTE = 'notifications';
/** Название роута экрана «Настройки уведомлений» в AccountStackScreen. */
export const NOTIFICATION_SETTINGS_ROUTE = 'notificationSettings';

/** AsyncStorage-ключи. */
export const PUSH_STORAGE_DEVICE_ID = 'push:deviceId';
export const PUSH_STORAGE_TOKEN = 'push:token';
export const PUSH_STORAGE_PENDING_PRESS = 'push:pendingPress';

/** Android-каналы notifee (создаёт приложение при старте). */
export type AndroidChannelId = 'orders' | 'reminders' | 'support_chat' | 'promo' | 'system';

export const ANDROID_CHANNELS: {id: AndroidChannelId; name: string; importance: 'high' | 'default'}[] = [
  {id: 'orders', name: 'Заказы и оплата', importance: 'high'},
  {id: 'reminders', name: 'Напоминания о поездке', importance: 'high'},
  {id: 'support_chat', name: 'Поддержка', importance: 'high'},
  {id: 'promo', name: 'Акции и предложения', importance: 'default'},
  {id: 'system', name: 'Важное', importance: 'high'},
];

/** Тип уведомления → категория настроек (API.md §2). */
export function categoryForType(type: NotificationType | null | undefined): NotificationCategory {
  switch (type) {
    case 'order_created':
    case 'payment_success':
    case 'payment_failed':
    case 'order_request_status':
      return 'orders';
    case 'order_confirmed':
    case 'order_status':
    case 'order_cancelled':
    case 'documents_ready':
      return 'documents';
    case 'trip_reminder':
      return 'reminders';
    case 'support_message':
    case 'missed_call':
      return 'support';
    case 'promo':
      return 'promo';
    case 'system':
    default:
      return 'system';
  }
}

/** Тип уведомления → Android-канал. */
export function channelForType(type: NotificationType | null | undefined): AndroidChannelId {
  switch (categoryForType(type)) {
    case 'orders':
    case 'documents':
      return 'orders';
    case 'reminders':
      return 'reminders';
    case 'support':
      return 'support_chat';
    case 'promo':
      return 'promo';
    default:
      return 'system';
  }
}

/** Иконка элемента (CategoryIcon). */
export type NotificationIconKind = 'order' | 'payment' | 'document' | 'chat' | 'plane' | 'tag' | 'info';

export type CategoryVisual = {
  /** Цвет иконки; подложка — 12 % (Dark — 18–20 %) того же цвета. */
  color: string;
  icon: NotificationIconKind;
};

/** Цвета иконок по категории (DESIGN.md «Общее»). */
export const CATEGORY_VISUALS: Record<NotificationCategory, CategoryVisual> = {
  orders: {color: '#FE732E', icon: 'order'},
  documents: {color: '#2BA9E2', icon: 'document'},
  reminders: {color: '#5856D6', icon: 'plane'},
  support: {color: '#2BA9E2', icon: 'chat'},
  promo: {color: '#FF9500', icon: 'tag'},
  system: {color: '#8E8E93', icon: 'info'},
};

/** Уточнение по типу: оплата — зелёный рубль, пропущенный звонок — «чат». */
export function visualForNotification(
  type: NotificationType | null | undefined,
  category?: NotificationCategory | null,
): CategoryVisual {
  if (type === 'payment_success' || type === 'payment_failed') {
    return {color: '#288556', icon: 'payment'};
  }
  const key = category && CATEGORY_VISUALS[category] ? category : categoryForType(type);
  return CATEGORY_VISUALS[key] || CATEGORY_VISUALS.system;
}

/** Строки-переключатели экрана «Настройки уведомлений» (порядок по DESIGN.md). */
export type CategorySetting = {
  key: NotificationCategory;
  title: string;
  subtitle: string;
  mandatory: boolean;
};

export const CATEGORY_SETTINGS: CategorySetting[] = [
  {key: 'orders', title: 'Заказы и оплата', subtitle: 'Создание, оплата, отмена', mandatory: true},
  {
    key: 'documents',
    title: 'Документы и статусы тура',
    subtitle: 'Подтверждение, ваучеры, билеты',
    mandatory: true,
  },
  {
    key: 'reminders',
    title: 'Напоминания о поездке',
    subtitle: 'За 3 дня и за сутки до вылета',
    mandatory: false,
  },
  {
    key: 'support',
    title: 'Сообщения поддержки',
    subtitle: 'Ответы в чате и пропущенные звонки',
    mandatory: false,
  },
  {
    key: 'promo',
    title: 'Акции и предложения',
    subtitle: 'Горящие туры и подборки, не чаще 2 раз в неделю',
    mandatory: false,
  },
];

/** Значения по умолчанию, пока настройки не загружены (API.md §2). */
export const DEFAULT_PREFS: Record<NotificationCategory, boolean> = {
  orders: true,
  documents: true,
  reminders: true,
  support: true,
  promo: false,
  system: true,
};

/** Чипы фильтров экрана «Уведомления». */
export type NotificationFilter = {
  key: 'all' | NotificationCategory;
  label: string;
};

export const NOTIFICATION_FILTERS: NotificationFilter[] = [
  {key: 'all', label: 'Все'},
  {key: 'orders', label: 'Заказы и оплата'},
  {key: 'documents', label: 'Документы'},
  {key: 'reminders', label: 'Напоминания'},
  {key: 'support', label: 'Поддержка'},
  {key: 'promo', label: 'Акции'},
];

/** Тексты экранов и шторки (DESIGN.md). */
export const PUSH_TEXTS = {
  screenTitle: 'Уведомления',
  settingsTitle: 'Настройки уведомлений',
  accountRowTitle: 'Уведомления',
  accountRowSubtitle: 'Заказы, оплата, напоминания и акции',
  readAll: 'Прочитать все',
  emptyTitle: 'Уведомлений пока нет',
  emptyText: 'Здесь появятся сообщения о заказах, оплате, документах и напоминания о поездке',
  pushOffTitle: 'Push-уведомления выключены',
  pushOnTitle: 'Push-уведомления включены',
  pushOnSubtitle: 'системные настройки',
  enable: 'Включить',
  notNow: 'Не сейчас',
  sectionWhat: 'ЧТО ПРИСЫЛАТЬ',
  sectionChannels: 'КАНАЛЫ',
  settingsHint:
    'Уведомления о заказах, оплате и документах отключить нельзя — они нужны, чтобы вы не пропустили важное по вашему туру. Акции приходят только с вашего согласия и не ночью (21:00–09:00 МСК).',
  channelPushTitle: 'Push на этом устройстве',
  channelEmailTitle: 'Электронная почта',
  channelEmailSubtitle: 'документы и чеки',
  sheetTitle: 'Включить уведомления?',
  sheetText:
    'Сообщим, когда пройдёт оплата и будут готовы документы, напомним о вылете и ответим в чате поддержки. Акции — только по вашему желанию.',
  sheetItems: [
    {icon: 'payment' as NotificationIconKind, color: '#288556', text: 'Оплата и статусы заказа'},
    {icon: 'document' as NotificationIconKind, color: '#2BA9E2', text: 'Готовность документов'},
    {icon: 'plane' as NotificationIconKind, color: '#5856D6', text: 'Напоминания о вылете'},
    {icon: 'chat' as NotificationIconKind, color: '#2BA9E2', text: 'Ответы поддержки'},
  ],
  unavailable: 'Уведомления временно недоступны',
  retry: 'Повторить',
};

/** «N непрочитанных» (подзаголовок шапки). */
export function formatUnreadSubtitle(unread: number): string {
  if (!unread || unread <= 0) return '';
  const mod10 = unread % 10;
  const mod100 = unread % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? 'непрочитанное'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
        ? 'непрочитанных'
        : 'непрочитанных';
  return `${unread} ${word}`;
}
