// Контакты поддержки Totus — общие для «Аккаунта» и экрана «Чат с поддержкой».

/** Loyalty ID аккаунта поддержки для звонка через приложение (VoIP). */
export const SUPPORT_LOYALTY_ID = '0978 6356 3712 8057';
export const SUPPORT_DISPLAY_NAME = 'Поддержка Totus';
/** Резервный номер телефона (tel:). */
export const SUPPORT_PHONE_NUMBER = '+74951234567';
/** Статус в шапке чата (макет «Support chat»). */
export const SUPPORT_STATUS_TEXT = 'Онлайн · отвечаем в течение 5 минут';

/** Название роута экрана чата в AccountStackScreen. */
export const SUPPORT_CHAT_ROUTE = 'supportChat';

/** DeviceEventEmitter: foreground-пуш FCM data.type === 'support_message' (CallService.js). */
export const SUPPORT_PUSH_EVENT = 'support:push';

export type SupportQuickTopic = {
  key: string;
  label: string;
};

/** Чипы быстрых тем (RULES.md). */
export const SUPPORT_QUICK_TOPICS: SupportQuickTopic[] = [
  {key: 'order', label: 'Вопрос по заказу'},
  {key: 'booking_change', label: 'Изменить бронирование'},
  {key: 'payment', label: 'Проблема с оплатой'},
  {key: 'documents', label: 'Документы по туру'},
];
