import { PART as A } from './countryImageDataA';
import { PART as B } from './countryImageDataB';
import { PART as C } from './countryImageDataC';
import { PART as D } from './countryImageDataD';
import { PART as E } from './countryImageDataE';
import { PART as F } from './countryImageDataF';
import { PART as G } from './countryImageDataG';

/**
 * Картинки стран для списка «Куда» — те же 57 картинок, что на сайте (totus_WEB, public/countries/<ISO2>.svg, PR #49).
 * Сайт хранит каждую как SVG-обёртку над WebP 80×80; RN Image SVG не рисует, поэтому здесь лежит тот же WebP
 * (байт в байт из обёртки) как data:-адрес — без сети, сразу при открытии списка.
 * WebP: Android — штатно, iOS — через ImageIO (iOS 14+, у приложения минимум 15.1).
 * Данные разбиты на части countryImageData{A…G}.ts (сгенерированы из файлов сайта, руками не править).
 * Ключ — ISO2 страны в верхнем регистре.
 */
export const COUNTRY_IMAGE_DATA: Readonly<Record<string, string>> = {
  ...A,
  ...B,
  ...C,
  ...D,
  ...E,
  ...F,
  ...G,
};
