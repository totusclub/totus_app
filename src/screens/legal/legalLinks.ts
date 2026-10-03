/**
 * Куда вести ссылку, нажатую внутри документа (WebView на экране документа).
 *
 * Чистая логика без React Native: scripts/check-legal-docs.mjs запускает этот файл
 * на голом Node. Глобальный URL не используется — в React Native он неполный
 * (часть свойств не реализована), поэтому адрес разбирается вручную.
 *
 * Правила:
 * - `/terms`, `consent`, `https://totus.club/privacy-policy` (один из 7 slug) —
 *   открыть этот документ внутри приложения;
 * - `#раздел`, сам документ (baseUrl), about:blank — остаться (якорь / первая загрузка);
 * - прочие http(s), mailto:, tel: — во внешнем браузере / приложении (Linking);
 * - javascript:, data:, file:, blob: — ничего не делать.
 */
import {isLegalDocSlug, type LegalDocSlug} from '../../content/legalDocs';

/**
 * Адрес, от которого WebView разрешает относительные ссылки документа.
 * `/terms` → https://totus.club/terms, `consent` → https://totus.club/app-legal/consent.
 * По сети этот адрес не загружается: HTML передаётся в WebView строкой.
 */
export const LEGAL_HTML_BASE_URL = 'https://totus.club/app-legal/';

/** Хосты сайта, ссылки на которые могут вести на документ внутри приложения. */
const OWN_HOSTS = new Set(['totus.club', 'www.totus.club']);

/** Схемы, которые нельзя ни открывать в WebView, ни передавать в Linking. */
const BLOCKED_SCHEMES = new Set(['javascript', 'vbscript', 'data', 'file', 'blob', 'content']);

export type LegalLinkAction =
  | {kind: 'stay'}
  | {kind: 'internal'; slug: LegalDocSlug}
  | {kind: 'external'; url: string}
  | {kind: 'block'};

type ParsedUrl = {
  scheme: string;
  host: string;
  path: string;
};

const ABSOLUTE_RE = /^([a-zA-Z][a-zA-Z0-9+.-]*):(\/\/([^/?#]*))?([^?#]*)/;

function parseAbsolute(url: string): ParsedUrl | null {
  const m = ABSOLUTE_RE.exec(url);
  if (!m) {
    return null;
  }
  // user:pass@host:port → host
  const authority = (m[3] || '').replace(/^.*@/, '');
  const host = authority.replace(/:\d*$/, '').toLowerCase();
  return {scheme: m[1].toLowerCase(), host, path: m[4] || ''};
}

function stripQueryAndHash(url: string): string {
  return url.replace(/[?#].*$/, '');
}

function slugFromPath(path: string, basePath: string): LegalDocSlug | null {
  let rest = path;
  if (basePath && basePath !== '/' && rest.startsWith(basePath)) {
    rest = rest.slice(basePath.length);
  }
  let segment = rest.replace(/^\/+/, '').replace(/\/+$/, '');
  try {
    segment = decodeURIComponent(segment);
  } catch {
    // битая %-последовательность — оставить как есть
  }
  segment = segment.toLowerCase();
  return isLegalDocSlug(segment) ? segment : null;
}

/**
 * Что делать со ссылкой `rawUrl`, нажатой в документе, отрисованном с `baseUrl`.
 */
export function resolveLegalLink(
  rawUrl: string | null | undefined,
  baseUrl: string = LEGAL_HTML_BASE_URL,
): LegalLinkAction {
  const url = String(rawUrl ?? '').trim();
  if (!url || url.startsWith('#')) {
    return {kind: 'stay'};
  }
  const lower = url.toLowerCase();
  if (lower === 'about:blank' || lower.startsWith('about:blank#') || lower === 'about:srcdoc') {
    return {kind: 'stay'};
  }

  const base = parseAbsolute(baseUrl);
  const basePath = base ? base.path : '/';

  // Относительные ссылки (на случай, если WebView передал их как есть).
  if (!ABSOLUTE_RE.test(url)) {
    if (url.startsWith('//')) {
      return resolveLegalLink('https:' + url, baseUrl);
    }
    const path = stripQueryAndHash(url);
    if (!path) {
      return {kind: 'stay'};
    }
    const slug = path.startsWith('/')
      ? slugFromPath(path, '')
      : slugFromPath(path.replace(/^\.\//, ''), '');
    if (slug) {
      return {kind: 'internal', slug};
    }
    // Прочие пути сайта — открыть сайт в браузере.
    const absolute = path.startsWith('/')
      ? `https://totus.club${url}`
      : `https://totus.club${basePath}${url.replace(/^\.\//, '')}`;
    return {kind: 'external', url: absolute};
  }

  const parsed = parseAbsolute(url);
  if (!parsed) {
    return {kind: 'block'};
  }
  if (BLOCKED_SCHEMES.has(parsed.scheme)) {
    return {kind: 'block'};
  }
  if (parsed.scheme === 'about') {
    return {kind: 'stay'};
  }
  if (parsed.scheme !== 'http' && parsed.scheme !== 'https') {
    // mailto:, tel:, sms: и т. п. — системному приложению.
    return {kind: 'external', url};
  }

  if (OWN_HOSTS.has(parsed.host)) {
    // Сам документ (первая загрузка HTML с baseUrl) или якорь внутри него.
    if (base && OWN_HOSTS.has(base.host) && stripQueryAndHash(url).replace(/^https?:/i, '') ===
        stripQueryAndHash(baseUrl).replace(/^https?:/i, '')) {
      return {kind: 'stay'};
    }
    const slug = slugFromPath(parsed.path, basePath);
    if (slug) {
      return {kind: 'internal', slug};
    }
  }
  return {kind: 'external', url};
}
