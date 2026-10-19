/**
 * Размеры окна капчи Яндекса в форме входа / регистрации.
 *
 * Дизайн капчи — оригинальный яндексовский (чекбокс «Я не робот» и панель задания), мы меняем
 * только окно, в котором она живёт:
 *  - задание открылось → окно растёт до полной высоты панели (раньше 360 точек — Яндекс сжимал
 *    картинку до ~218×70 и обрезал низ панели);
 *  - лёгкое увеличение всей капчи на телефоне (до 1.2×, ширина страницы не меньше 343 CSS px —
 *    уже Яндекс уменьшает картинку задания: при 321 она 211×68 вместо 248×81); на планшете 1×;
 *  - можно увеличить пальцами до 3× (раньше zoom был запрещён).
 *
 * Высоты — в CSS px страницы капчи; в точки экрана × scale.
 */

/** Чекбокс «Я не робот» с подписью и ссылкой Yandex SmartCaptcha. */
export const CAPTCHA_CHECKBOX_CSS_HEIGHT = 108;

/**
 * Панель задания (картинка, поле ввода, «Отправить», подвал) — замер 19.10.2026: ~410 CSS px
 * при ширине 343 и 390, картинка 248×81. Ниже ~440 Яндекс начинает ужимать картинку.
 */
export const CAPTCHA_CHALLENGE_CSS_HEIGHT = 440;

/** Уже 343 CSS px Яндекс уменьшает картинку задания (замер 19.10.2026). */
export const CAPTCHA_MIN_CSS_WIDTH = 343;
export const CAPTCHA_MAX_SCALE = 1.2;
/** Окно шире — это планшет / широкий экран: без увеличения. */
export const CAPTCHA_TABLET_WIDTH = 500;
/** Увеличение пальцами. */
export const CAPTCHA_PINCH_MAX_SCALE = 3;

/** Во сколько раз увеличить капчу в окне шириной `boxWidth` точек. */
export function getCaptchaScale(boxWidth: number): number {
  const w = Number(boxWidth);
  if (!Number.isFinite(w) || w <= 0 || w >= CAPTCHA_TABLET_WIDTH) return 1;
  const s = Math.min(CAPTCHA_MAX_SCALE, w / CAPTCHA_MIN_CSS_WIDTH);
  // вниз до сотых — ширина страницы не опускается ниже CAPTCHA_MIN_CSS_WIDTH
  const rounded = Math.floor(s * 100) / 100;
  return rounded > 1 ? rounded : 1;
}

/** Ширина страницы капчи в CSS px. */
export function getCaptchaCssWidth(boxWidth: number, scale: number): number {
  return Math.max(1, Math.floor(boxWidth / scale));
}

/** Тег viewport: стартовое увеличение = scale, пальцами — до 3×, меньше стартового — нельзя. */
export function buildCaptchaViewport(cssWidth: number, scale: number): string {
  const max = Math.max(CAPTCHA_PINCH_MAX_SCALE, scale);
  return `width=${cssWidth}, initial-scale=${scale}, minimum-scale=${scale}, maximum-scale=${max}, user-scalable=yes`;
}

export function getCheckboxHeight(scale: number): number {
  return Math.ceil(CAPTCHA_CHECKBOX_CSS_HEIGHT * scale);
}

export function getChallengeHeight(scale: number): number {
  return Math.ceil(CAPTCHA_CHALLENGE_CSS_HEIGHT * scale);
}

/**
 * Высота окна по сообщению страницы (CSS px).
 * Задание открыто — не меньше полной панели (страница с открытым заданием сообщает высоту
 * окна, а не панели, — по ней окно не уменьшаем); закрыто — по содержимому, не меньше чекбокса.
 * Без верхнего предела: раньше было 520 точек.
 */
export function getCaptchaBoxHeight(reportedCss: number, scale: number, challengeOpen: boolean): number {
  const reported = Number.isFinite(reportedCss) && reportedCss > 0 ? Math.ceil(reportedCss * scale) : 0;
  if (challengeOpen) return Math.max(reported, getChallengeHeight(scale));
  return Math.max(reported, getCheckboxHeight(scale));
}
