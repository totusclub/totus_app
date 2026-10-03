/**
 * HTML-обёртка документа из CMS для WebView: системный шрифт, цвета из темы
 * приложения (светлая / тёмная), отступы 16, таблицы с горизонтальной прокруткой.
 *
 * Чистая логика без React Native: scripts/check-legal-docs.mjs запускает этот файл
 * на голом Node. Только «стираемый» TypeScript.
 *
 * Безопасность: WebView открывается с javaScriptEnabled={false}; дополнительно
 * <script>, <iframe>, обработчики on*= и javascript:-ссылки вырезаются из HTML,
 * а Content-Security-Policy запрещает скрипты и встраивание чужих страниц.
 */
import type {PrivacyPolicySection, PrivacyPolicyBlock} from '../../content/privacyPolicy';

export type LegalHtmlColors = {
  /** Фон страницы — как фон экрана (theme.backgroundSecondary). */
  background: string;
  /** Заголовки (theme.text). */
  text: string;
  /** Основной текст (theme.textSecondary). */
  textSecondary: string;
  /** Подписи, даты (theme.textTertiary). */
  textTertiary: string;
  /** Ссылки (theme.brand). */
  link: string;
  /** Линии таблиц (theme.border). */
  border: string;
  /** Фон шапки таблицы (theme.backgroundTertiary). */
  tableHeader: string;
};

/** Минимальный набор полей темы, из которого берутся цвета. */
export type LegalThemeLike = {
  backgroundSecondary: string;
  backgroundTertiary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  brand: string;
  border: string;
};

export function legalHtmlColors(theme: LegalThemeLike): LegalHtmlColors {
  return {
    background: theme.backgroundSecondary,
    text: theme.text,
    textSecondary: theme.textSecondary,
    textTertiary: theme.textTertiary,
    link: theme.brand,
    border: theme.border,
    tableHeader: theme.backgroundTertiary,
  };
}

export type BuildLegalHtmlOptions = {
  /** Содержимое документа (HTML из CMS). */
  bodyHtml: string;
  colors: LegalHtmlColors;
  isDark: boolean;
  /** Нижний отступ (safe area + таб-бар), px. */
  bottomInset?: number;
  /** Максимальная ширина колонки текста (iPad), px. */
  maxWidth?: number;
  /** Примечание над текстом (например, «показана сохранённая версия»). */
  notice?: string;
};

/** Экранирование текста для вставки в HTML (текст и значения атрибутов). */
export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Цвет для CSS: только #hex / rgb() / rgba() / имя, иначе запасной. */
function cssColor(value: string, fallback: string): string {
  const v = String(value || '').trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(v) || /^rgba?\([\d\s.,%]+\)$/.test(v) || /^[a-zA-Z]+$/.test(v)) {
    return v;
  }
  return fallback;
}

/**
 * Убрать из HTML из CMS то, что не должно исполняться в приложении,
 * и обернуть таблицы в прокручиваемый контейнер. Текст документа не меняется.
 */
export function sanitizeLegalHtml(html: string): string {
  return String(html ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*\/?>/gi, '')
    .replace(/<(iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(iframe|object|embed)\b[^>]*\/?>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    // Только внутри тегов: текст документа не трогаем.
    .replace(/<[a-zA-Z][^>]*>/g, tag =>
      tag
        .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'>]*\2/gi, '$1="#"'),
    )
    .replace(/<table\b/gi, '<div class="table-wrap"><table')
    .replace(/<\/table\s*>/gi, '</table></div>');
}

/** Полная HTML-страница для WebView. */
export function buildLegalHtml(options: BuildLegalHtmlOptions): string {
  const {bodyHtml, isDark, bottomInset = 0, maxWidth, notice} = options;
  const c = options.colors;
  const bg = cssColor(c.background, isDark ? '#1A1A1A' : '#F5F5F5');
  const text = cssColor(c.text, isDark ? '#FFFFFF' : '#1F1F1F');
  const text2 = cssColor(c.textSecondary, isDark ? '#E0E0E0' : '#3D3D3D');
  const text3 = cssColor(c.textTertiary, isDark ? '#B0B0B0' : '#7A7A7A');
  const link = cssColor(c.link, '#FE732E');
  const border = cssColor(c.border, isDark ? '#3A3A3A' : '#E0E0E0');
  const th = cssColor(c.tableHeader, isDark ? '#2A2A2A' : '#E4E4E4');
  const bottom = Math.max(0, Math.round(Number(bottomInset) || 0)) + 24;
  const columnWidth = maxWidth && maxWidth > 0 ? `max-width:${Math.round(maxWidth)}px;` : '';
  const noticeHtml = notice ? `<p class="app-notice">${escapeHtml(notice)}</p>` : '';

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="${isDark ? 'dark' : 'light'}">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src https: data:">
<style>
:root { color-scheme: ${isDark ? 'dark' : 'light'}; }
html, body { margin: 0; padding: 0; background: ${bg}; }
body {
  font-family: -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  font-size: 15px; line-height: 22px; color: ${text2};
  -webkit-text-size-adjust: 100%; text-size-adjust: 100%;
  word-wrap: break-word; overflow-wrap: break-word;
}
.doc { padding: 16px 16px ${bottom}px; margin: 0 auto; ${columnWidth} }
h1, h2, h3, h4, h5, h6 { color: ${text}; font-weight: 600; margin: 20px 0 10px; }
h1 { font-size: 20px; line-height: 26px; }
h2 { font-size: 17px; line-height: 24px; }
h3, h4, h5, h6 { font-size: 15px; line-height: 22px; }
.doc > :first-child { margin-top: 0; }
p { margin: 0 0 10px; }
ul, ol { margin: 0 0 10px; padding-left: 22px; }
li { margin: 0 0 6px; }
strong, b { color: ${text}; font-weight: 600; }
a { color: ${link}; text-decoration: none; word-break: break-word; }
hr { border: 0; border-top: 1px solid ${border}; margin: 16px 0; }
img { max-width: 100%; height: auto; }
blockquote { margin: 0 0 10px; padding-left: 12px; border-left: 3px solid ${border}; }
.table-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 0 0 12px; }
table { border-collapse: collapse; min-width: 100%; font-size: 14px; line-height: 20px; }
th, td { border: 1px solid ${border}; padding: 6px 8px; text-align: left; vertical-align: top; word-break: break-word; }
th { background: ${th}; color: ${text}; font-weight: 600; }
.app-notice { color: ${text3}; font-size: 13px; line-height: 18px; margin: 0 0 16px; }
</style>
</head>
<body>
<div class="doc">
${noticeHtml}${sanitizeLegalHtml(bodyHtml)}
</div>
</body>
</html>`;
}

function blocksToHtml(blocks: PrivacyPolicyBlock[]): string {
  return blocks
    .map(block => {
      if (block.type === 'paragraph') {
        return `<p>${escapeHtml(block.text)}</p>`;
      }
      return `<ul>${block.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
    })
    .join('\n');
}

/**
 * Зашитая в приложение политика (src/content/privacyPolicy.ts) → HTML.
 * Используется, когда CMS недоступна (офлайн): как раньше, без регресса.
 */
export function privacySectionsToHtml(sections: PrivacyPolicySection[], intro?: string): string {
  const parts: string[] = [];
  if (intro) {
    parts.push(`<p><strong>${escapeHtml(intro)}</strong></p>`);
  }
  for (const section of sections) {
    parts.push(`<h2>${escapeHtml(section.title)}</h2>`);
    parts.push(blocksToHtml(section.blocks));
    for (const sub of section.subsections ?? []) {
      parts.push(`<h3>${escapeHtml(sub.title)}</h3>`);
      parts.push(blocksToHtml(sub.blocks));
    }
  }
  return parts.join('\n');
}
