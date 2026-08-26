/**
 * Voice Assistant API – upload audio and get AI response with audio.
 * Example backend contract: POST multipart audio → { audioUrl, text }.
 * Includes a text-based fallback for backends that accept text and return TTS.
 */

import axios, { AxiosError } from 'axios';
import type { VoiceAssistantResponse } from '../../screens/ai/voice/types';

const BACKEND_URL = __DEV__ ? 'https://server.totus.club' : 'https://server.totus.club';

/** Timeout for upload + AI response (ms) */
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Example: upload audio file to backend and get response with audio URL and text.
 * Replace with your real endpoint and form field name.
 *
 * Backend is expected to:
 * - Accept multipart/form-data with an audio file (e.g. "audio" or "file")
 * - Return JSON: { text: string, audioUrl?: string } or { text, audioBase64, audioEncoding }
 */
export async function uploadAudioAndGetResponse(
  audioUri: string,
  options?: { conversationHistory?: Array<{ role: string; content: string }> }
): Promise<VoiceAssistantResponse> {
  const formData = new FormData();
  formData.append('audio', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'voice.m4a',
  } as any);

  if (options?.conversationHistory?.length) {
    formData.append('conversationHistory', JSON.stringify(options.conversationHistory));
  }

  const { data } = await axios.post<VoiceAssistantResponse>(
    `${BACKEND_URL}/api/voice-assistant/chat`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: REQUEST_TIMEOUT_MS,
    }
  );

  if (!data?.text) {
    throw new Error(data ? 'Invalid response: missing text' : 'Empty response');
  }

  return {
    text: data.text,
    audioUrl: data.audioUrl,
    audioBase64: data.audioBase64,
    audioEncoding: data.audioEncoding || 'MP3',
  };
}

/**
 * Check if an error is a network error (for user-friendly messages).
 */
export function isNetworkError(err: unknown): boolean {
  const e = err as AxiosError;
  return e?.message === 'Network Error' || (e?.code as string) === 'ERR_NETWORK';
}

/**
 * Get a user-friendly error message (e.g. for TTS or alert).
 */
export function getVoiceErrorMessage(err: unknown): string {
  if (isNetworkError(err)) {
    return 'Проверьте подключение к интернету и попробуйте снова.';
  }
  const e = err as AxiosError;
  const msg = e?.response?.data?.message ?? e?.response?.data?.error ?? (e as Error)?.message;
  return msg ? String(msg) : 'Произошла ошибка. Попробуйте ещё раз.';
}
