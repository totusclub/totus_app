/**
 * Voice AI – shared constants for recording, silence detection, and UX.
 */

/** Delay before auto-starting recording when screen opens with autoStart (ms) */
export const AUTO_START_DELAY_MS = 400;

/** If no speech detected for this long after min recording, auto-stop (ms) */
export const SILENCE_THRESHOLD_MS = 2500;

/** Minimum recording time before we consider silence (ms) */
export const MIN_RECORDING_BEFORE_SILENCE_MS = 1000;

/** Maximum recording duration; stop after this (ms) */
export const MAX_RECORDING_MS = 30_000;

/** User-facing message when no speech detected */
export const NO_SPEECH_MESSAGE = "Я ничего не услышала. Попробуйте ещё раз.";

/** Button labels per phase (for accessibility and UI) */
export const PHASE_LABELS: Record<string, string> = {
  idle: 'Начать',
  listening: 'Стоп',
  thinking: 'Думаю…',
  speaking: 'Ответ',
  error: 'Повторить',
};
