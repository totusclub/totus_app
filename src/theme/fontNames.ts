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
