// Избранное (calling_api_v2 /api/favorites, поле hotelData — JSON как прислал клиент).
// Сайт сохраняет картинку как {webp_x620, x500, …} (абсолютные https), приложение — как {uri}.
// RN <Image source={…}> рисует только {uri} (или require-число этой сборки): объект с webp_x620
// давал пустую картинку для отелей, добавленных на сайте. Здесь — одно чтение для любых записей
// и одна форма записи, понятная и сайту, и приложению.

const LT_CDN = 'https://img.cdn.level.travel/';

/** Ключи картинки по убыванию предпочтения (приложение, Level.Travel, сайт); JPEG раньше WebP. */
const IMAGE_KEYS = ['uri', 'x800x600x', 'x620', 'x500', 'x900', 'webp_x620', 'webp_x900', 'url', 'src', 'image'];

/** Строка картинки → абсолютный https-адрес ('//…' → https:, относительный путь → CDN Level.Travel). */
export function resolveFavoriteImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return null; // data:, file:, … — не из CDN
  return LT_CDN + s.replace(/^\/+/, '');
}

/** Один элемент images (строка / {uri} / {webp_x620,…} / прочее) → адрес или null. */
export function favoriteImageUrl(image: unknown): string | null {
  if (typeof image === 'string') return resolveFavoriteImageUrl(image);
  if (!image || typeof image !== 'object') return null; // require()-число другой сборки — не переносимо
  const obj = image as Record<string, unknown>;
  for (const key of IMAGE_KEYS) {
    const url = resolveFavoriteImageUrl(obj[key]);
    if (url) return url;
  }
  for (const v of Object.values(obj)) {
    if (typeof v === 'string' && /^(https?:)?\/\//i.test(v)) return resolveFavoriteImageUrl(v);
  }
  return null;
}

/** Картинки записи избранного → [{uri}] для RN <Image>. Пусто — карточка покажет свою заглушку. */
export function favoriteImageSources(hotelData: Record<string, unknown> | null | undefined): Array<{ uri: string }> {
  if (!hotelData) return [];
  const raw = Array.isArray(hotelData.images) ? hotelData.images : [];
  const out: Array<{ uri: string }> = [];
  for (const img of raw) {
    const url = favoriteImageUrl(img);
    if (url && !out.some(x => x.uri === url)) out.push({ uri: url });
  }
  if (!out.length) {
    for (const key of ['image', 'photo', 'cover', 'thumbnail']) {
      const url = favoriteImageUrl(hotelData[key]);
      if (url) {
        out.push({ uri: url });
        break;
      }
    }
  }
  return out;
}

/** Картинки для сохранения: только переносимые адреса (без require-чисел этой сборки), не больше 10. */
export function favoriteImagesForSave(images: unknown): Array<{ uri: string }> {
  return favoriteImageSources({ images }).slice(0, 10);
}
