import { StyleProp, StyleSheet, TextStyle } from 'react-native';

/**
 * Шрифты приложения — те же, что на сайте (totus_WEB #69):
 *   Museo Sans Cyrl — весь текст интерфейса;
 *   Forum — заголовки разделов и названия отелей.
 *
 * Файлы лежат в assets/fonts (react-native.config.js → `npx react-native-asset`),
 * копии — в ios/fonts (Info.plist → UIAppFonts) и android/app/src/main/assets/fonts.
 *
 * Имя шрифта = имя файла без .ttf = PostScript-имя внутри файла, поэтому одно и то же
 * значение fontFamily работает и на iOS, и на Android. Начертание задаётся файлом,
 * а не fontWeight: у Museo каждое начертание — отдельный файл, у Forum одно начертание.
 * Если оставить fontWeight, Android дорисует «ложный» жирный поверх уже жирного файла.
 *
 * Соответствие начертаний как на сайте и на утверждённой доске Figma:
 *   fontWeight 100–399 → 300, 400–599 (основной текст) → 500, 600–799 и 'bold' → 700, 800+ → 900.
 * Знаков ₽ и стрелок в этих шрифтах нет — iOS и Android берут их из системного шрифта сами.
 */
import { FONT_HEADING, FONT_TEXT } from './fontNames';

export { FONT_HEADING, FONT_TEXT };

/** Старые и «пустые» имена, которые означают основной текстовый шрифт приложения. */
const TEXT_FAMILY_ALIASES = new Set<string>([
  'Golos Text',
  'GolosText-Regular',
  'GolosText-Medium',
  'GolosText-SemiBold',
  'GolosText-Bold',
  'System',
  ...Object.values(FONT_TEXT),
]);

const weightNumber = (weight: TextStyle['fontWeight']): number => {
  if (weight === undefined || weight === null || weight === 'normal') return 400;
  if (weight === 'bold') return 700;
  const n = typeof weight === 'number' ? weight : parseInt(String(weight), 10);
  return Number.isFinite(n) ? n : 400;
};

/** Файл Museo для начертания из стиля. */
export function textFontFamily(weight?: TextStyle['fontWeight']): string {
  const w = weightNumber(weight);
  if (w < 400) return FONT_TEXT.light;
  if (w < 600) return FONT_TEXT.regular;
  if (w < 800) return FONT_TEXT.bold;
  return FONT_TEXT.black;
}

/** Шрифт родительского текста — для вложенных текстов без своего fontWeight / fontFamily. */
export type InheritedFont = { weight?: TextStyle['fontWeight']; heading?: boolean };

/**
 * Шрифт приложения для стиля текста: Museo нужного начертания или Forum
 * (если в стиле fontFamily: FONT_HEADING). Чужие шрифты (например, monospace) не трогает.
 * inherited — шрифт родительского текста: вложенный текст без своего fontWeight остаётся
 * жирным внутри жирного (как раньше с Golos Text), а без своего fontFamily внутри заголовка — Forum.
 * Возвращает стиль и шрифт для вложенных текстов.
 */
export function resolveAppFont<T extends TextStyle>(
  style: StyleProp<T>,
  inherited?: InheritedFont,
): { style: StyleProp<T>; inherited: InheritedFont } {
  const flat = (StyleSheet.flatten(style) || {}) as TextStyle;
  const weight = flat.fontWeight ?? inherited?.weight;
  const family = flat.fontFamily ?? (inherited?.heading ? FONT_HEADING : undefined);
  if (family === FONT_HEADING) {
    const ls = typeof flat.letterSpacing === 'number' && flat.letterSpacing > 0 ? flat.letterSpacing : 0;
    return {
      style: [style, { fontFamily: FONT_HEADING, fontWeight: 'normal', letterSpacing: ls } as T],
      inherited: { weight, heading: true },
    };
  }
  if (family === undefined || TEXT_FAMILY_ALIASES.has(family)) {
    return {
      style: [style, { fontFamily: textFontFamily(weight), fontWeight: 'normal' } as T],
      inherited: { weight, heading: false },
    };
  }
  return { style, inherited: { weight, heading: false } };
}

export function withAppFont<T extends TextStyle>(style: StyleProp<T>, inherited?: InheritedFont): StyleProp<T> {
  return resolveAppFont(style, inherited).style;
}
