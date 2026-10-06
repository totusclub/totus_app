/**
 * Загрузка юридического документа из CMS (та же, что у сайта):
 * GET {SERVER_BASE_URL}/api/pages/slug/:slug → {name, slug, content (HTML), updated_at, ...}; 404 — нет страницы.
 *
 * Публичный эндпоинт без авторизации, поэтому обычный fetch (без axios-интерсепторов).
 * Простой кэш в памяти на время сессии: повторное открытие документа — без сети.
 * Без React Native-импортов: scripts/check-legal-docs.mjs проверяет модуль на голом Node.
 */
import {SERVER_BASE_URL} from '../../config/server';
import type {LegalDocSlug} from '../../content/legalDocs';

export type LegalPage = {
  slug: string;
  /** Название из CMS (может быть пустым). */
  name: string;
  /** HTML документа. */
  content: string;
  updatedAt: string | null;
};

export type LegalPageErrorKind = 'not_found' | 'network' | 'server' | 'invalid';

export class LegalPageError extends Error {
  kind: LegalPageErrorKind;
  status: number | null;
  constructor(kind: LegalPageErrorKind, message: string, status: number | null = null) {
    super(message);
    this.name = 'LegalPageError';
    this.kind = kind;
    this.status = status;
  }
}

const REQUEST_TIMEOUT_MS = 15000;
const cache = new Map<string, LegalPage>();

export function legalPageUrl(slug: LegalDocSlug, baseUrl: string = SERVER_BASE_URL): string {
  return `${baseUrl.replace(/\/+$/, '')}/api/pages/slug/${encodeURIComponent(slug)}`;
}

/** Документ из кэша сессии (если уже загружался). */
export function getCachedLegalPage(slug: LegalDocSlug): LegalPage | undefined {
  return cache.get(slug);
}

export function clearLegalPageCache(): void {
  cache.clear();
}

function normalizePage(slug: LegalDocSlug, data: unknown): LegalPage {
  const raw = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  // Ответ может прийти как есть или в обёртке {page: {...}} / {data: {...}}.
  const page = (raw.page && typeof raw.page === 'object'
    ? raw.page
    : raw.data && typeof raw.data === 'object'
      ? raw.data
      : raw) as Record<string, unknown>;
  const content = typeof page.content === 'string' ? page.content : '';
  if (!content.trim()) {
    throw new LegalPageError('invalid', 'Пустой документ');
  }
  return {
    slug: typeof page.slug === 'string' && page.slug ? page.slug : slug,
    name: typeof page.name === 'string' ? page.name.trim() : '',
    content,
    updatedAt:
      typeof page.updated_at === 'string'
        ? page.updated_at
        : typeof page.updatedAt === 'string'
          ? page.updatedAt
          : null,
  };
}

/**
 * Загрузить документ. Успешный ответ кэшируется на сессию, ошибки — нет
 * (кнопка «Повторить» идёт в сеть заново). `force` — загрузить мимо кэша.
 */
export async function fetchLegalPage(
  slug: LegalDocSlug,
  options: {force?: boolean; fetchImpl?: typeof fetch} = {},
): Promise<LegalPage> {
  if (!options.force) {
    const cached = cache.get(slug);
    if (cached) {
      return cached;
    }
  }
  const doFetch = options.fetchImpl ?? fetch;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  let response: Response;
  try {
    response = await doFetch(legalPageUrl(slug), {
      method: 'GET',
      headers: {Accept: 'application/json'},
      ...(controller ? {signal: controller.signal} : {}),
    });
  } catch (e) {
    throw new LegalPageError('network', e instanceof Error ? e.message : 'Нет соединения');
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
  if (response.status === 404) {
    throw new LegalPageError('not_found', 'Документ не найден', 404);
  }
  if (!response.ok) {
    throw new LegalPageError('server', `Ошибка сервера ${response.status}`, response.status);
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new LegalPageError('invalid', 'Некорректный ответ сервера', response.status);
  }
  const page = normalizePage(slug, data);
  cache.set(slug, page);
  return page;
}
