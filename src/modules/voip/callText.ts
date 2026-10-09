/**
 * Русские подписи экранов звонка: окно звонка, свёрнутый звонок, уведомления Android,
 * ошибки на экранах, которые начинают звонок («Аккаунт», чат с поддержкой, «Звонки»).
 *
 * VoipService.ts внутри по-прежнему пользуется английскими заглушками ('Incoming call',
 * 'Totus call') — это служебные значения, от них зависит логика (например, rememberCallerName).
 * Пользователь их не видит: всё, что уходит на экран или в уведомление, проходит через
 * callerNameForDisplay().
 *
 * Без импортов React Native: файл подключается и в проверках на голом Node
 * (scripts/check-*.mjs). Только стираемый синтаксис TypeScript.
 */

/** Имя звонящего, когда в push / сокете его нет (окно звонка, уведомление, CallKit). */
export const INCOMING_CALL_FALLBACK_NAME = 'Входящий звонок';

/** Заголовок уведомления о текущем звонке (Android), если имени собеседника нет. */
export const CALL_NOTIFICATION_FALLBACK_TITLE = 'Totus Club';

/** Служебное имя уведомления о текущем звонке в VoipService (startVoiceCall). */
const ONGOING_PLACEHOLDER_NAMES = ['totus call'];

/** Служебные имена входящего без имени: английское из VoipService, русское из iOS (AppDelegate). */
const PLACEHOLDER_CALLER_NAMES = ['incoming call', 'входящий звонок'];

/**
 * Имя собеседника для экрана и уведомлений: служебные английские заглушки — по-русски,
 * настоящее имя — без изменений. Пустое значение остаётся пустым (у экрана своя подпись).
 */
export function callerNameForDisplay(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return '';
  }
  const key = value.trim().toLowerCase();
  if (PLACEHOLDER_CALLER_NAMES.includes(key)) {
    return INCOMING_CALL_FALLBACK_NAME;
  }
  if (ONGOING_PLACEHOLDER_NAMES.includes(key)) {
    return CALL_NOTIFICATION_FALLBACK_TITLE;
  }
  return value;
}

const CYRILLIC = /[А-Яа-яЁё]/;

/**
 * Причина ошибки звонка для пользователя — всегда по-русски, со строчной буквы
 * (подставляется после «Не удалось позвонить…: »). Текст исключения в логах не меняется.
 */
export function callErrorText(error: unknown): string {
  const raw =
    error && typeof error === 'object' && 'message' in error
      ? String((error as {message?: unknown}).message ?? '')
      : typeof error === 'string'
        ? error
        : '';
  const message = raw.trim();
  const lower = message.toLowerCase();

  if (message && CYRILLIC.test(message) && !/[A-Za-z]{3,}/.test(message)) {
    return message.charAt(0).toLowerCase() + message.slice(1);
  }
  if (/микрофон|microphone|permission|notallowederror/.test(lower)) {
    return 'нет доступа к микрофону';
  }
  if (/already in progress|another call/.test(lower)) {
    return 'у вас уже есть активный звонок';
  }
  if (/device id|voip token|not registered/.test(lower)) {
    return 'устройство ещё не зарегистрировано для звонков. Подождите несколько секунд и попробуйте снова';
  }
  if (/offline|not online|unavailable|not available|no devices|not connected/.test(lower)) {
    return 'собеседник сейчас не в сети. Попробуйте позже';
  }
  if (/backend returned|backend rejected/.test(lower)) {
    return 'сервер звонков временно недоступен. Попробуйте позже';
  }
  if (/network|failed to connect|failed to fetch|timeout|timed out|socket/.test(lower)) {
    return 'нет связи с сервером. Проверьте интернет и попробуйте снова';
  }
  if (/loyaltyid is required|target/.test(lower)) {
    return 'не указан получатель звонка';
  }
  return 'попробуйте ещё раз чуть позже';
}
