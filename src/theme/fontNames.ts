/**
 * Имена шрифтов приложения (= имя файла = PostScript-имя). Отдельный файл без react-native,
 * чтобы тема (light/dark) импортировалась и в node-проверках. Подробности — в theme/fonts.ts.
 */
export const FONT_TEXT = {
  light: 'MuseoSansCyrl-300',
  regular: 'MuseoSansCyrl-500',
  bold: 'MuseoSansCyrl-700',
  black: 'MuseoSansCyrl-900',
} as const;

export const FONT_HEADING = 'Forum';

/**
 * Знаки сайта, которых нет в Museo и Forum: ₽ (рисунок сайта под Museo), стрелки, дефисы U+2010/U+2011,
 * у Forum ещё ¹ ² ³. На сайте это «Totus Symbols» с unicode-range; здесь — отдельный файл на начертание
 * (scripts/build-symbols-font.py), знаки выделяет AppText / FontText.
 */
export const FONT_SYMBOLS = {
  light: 'TotusSymbols-300',
  regular: 'TotusSymbols-500',
  bold: 'TotusSymbols-700',
} as const;
