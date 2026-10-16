/**
 * Возврат из браузера после входа через Яндекс ID: что делать с очередной ссылкой
 * totus://auth/yandex?ticket=… / ?error=… (чистая логика, без React и сети — её
 * проверяет scripts/check-yandex-return.mjs).
 *
 * Почему это отдельно. За одну попытку входа в приложение может прийти больше одного
 * сигнала: ссылка с ticket (вход удался) и ссылка с ошибкой — например, когда браузер
 * открыл адрес возврата API ещё раз и тот же код Яндекса второй раз уже не обменивается
 * (сервер отвечает ссылкой ?error=yandex_failed). Раньше окно «Не получилось войти»
 * показывалось на любую ошибку, даже когда человек уже вошёл: вход прошёл, а на экране —
 * ошибка, и казалось, что сработала только вторая попытка.
 *
 * Правило: ошибку показываем, только если человек так и не вошёл и обмен ticket
 * в эту секунду не идёт.
 */

export type YandexDeepLink = {ticket?: string; error?: string} | null;

export type YandexLinkContext = {
  /** В приложении уже есть наши токены (вход удался — этим ticket или предыдущим). */
  isAuthorized: boolean;
  /** Сейчас идёт обмен ticket на токены. */
  exchangeInFlight: boolean;
  /** Ticket'ы, которые уже отправлялись на обмен (ticket одноразовый). */
  handledTickets: ReadonlySet<string>;
};

export type YandexLinkDecision =
  | {action: 'skip'}
  | {action: 'exchange'; ticket: string}
  | {action: 'showError'; code: string}
  | {action: 'ignoreError'; code: string; reason: 'authorized' | 'inFlight'};

export function decideYandexLink(link: YandexDeepLink, ctx: YandexLinkContext): YandexLinkDecision {
  if (!link) return {action: 'skip'};

  if (link.ticket) {
    if (ctx.handledTickets.has(link.ticket)) return {action: 'skip'};
    return {action: 'exchange', ticket: link.ticket};
  }

  if (link.error) {
    // Ticket уже меняется — итог решит его ответ, а не запоздалая ссылка с ошибкой.
    if (ctx.exchangeInFlight) return {action: 'ignoreError', code: link.error, reason: 'inFlight'};
    // Человек уже вошёл — ошибка от лишнего повтора ему не нужна.
    if (ctx.isAuthorized) return {action: 'ignoreError', code: link.error, reason: 'authorized'};
    return {action: 'showError', code: link.error};
  }

  return {action: 'skip'};
}

/**
 * Обмен ticket не удался. Если человек при этом уже вошёл (другой ticket этой же попытки
 * сработал раньше), окно ошибки не показываем.
 */
export function shouldShowExchangeError(isAuthorized: boolean): boolean {
  return !isAuthorized;
}
