import { instance } from '../../../../modules/axios';
import { toBrowseCountries, type BrowseCountry } from './countryImages';

/**
 * Страны для списка «Куда» по нажатию (до ввода текста) — тот же запрос, что на сайте:
 * GET /references/destinations?from_city=… (totus_API → Level.Travel).
 * Один запрос на город вылета за запуск приложения; при ошибке запись сбрасывается,
 * и при следующем открытии запрос повторяется. До ответа показывается DEFAULT_BROWSE_COUNTRIES.
 * (Подсказки autocomplete_v2 с пустым текстом Level.Travel теперь возвращает пустыми.)
 */
const cache = new Map<string, Promise<BrowseCountry[] | null>>();

export function loadBrowseCountries(fromCity?: string): Promise<BrowseCountry[] | null> {
  const key = fromCity || 'Moscow';
  let request = cache.get(key);
  if (!request) {
    request = instance
      .get(`/references/destinations?from_city=${encodeURIComponent(key)}`)
      .then((res) => toBrowseCountries(res?.data))
      .catch(() => null)
      .then((list) => {
        if (!list) cache.delete(key);
        return list;
      });
    cache.set(key, request);
  }
  return request;
}
