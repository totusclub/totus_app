// JWT для voip.totus.club (SECURITY_JWT_PLAN_RU.md, волна 5).
//
// Токен пользователя (тот же, что уходит на api.totus.club) нужен телефонии:
// HTTP-запросы (register-device, calls, contacts, favorites, users) — заголовок
// Authorization: Bearer; Socket.io — handshake.auth.token.
//
// Источник токена — App.tsx (setVoipAccessToken из Redux). Для фоновых сценариев
// (входящий звонок через CallKeep, когда App ещё не смонтирован) токен читается
// напрямую из redux-persist в AsyncStorage (persist:root → auth.accessToken).
// Модуль не импортирует store и axios — чтобы не создавать цикл импортов с VoipService.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {VOIP_BASE_URL} from '../../config/server';
import {cancelMicPermissionRequest, ensureMicPermissionWhenActive} from '../voip/micPermission';

let currentAccessToken: string | null = null;

export function setVoipAccessToken(token: string | null | undefined): void {
  currentAccessToken = token || null;
  // Токен появился = пользователь вошёл (App.tsx вызывает при каждом изменении токена).
  // iOS: спросить доступ к микрофону заранее, пока приложение на экране, — иначе первый
  // ответ на звонок из CallKit / с экрана блокировки сбрасывается (запрос нельзя показать).
  // Вызов идемпотентный; при выходе (token = null) ожидающий запрос снимается.
  if (currentAccessToken) ensureMicPermissionWhenActive();
  else cancelMicPermissionRequest();
}

async function readPersistedToken(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem('persist:root');
    if (!raw) return null;
    const root = JSON.parse(raw) as {auth?: string};
    if (!root.auth) return null;
    const auth = JSON.parse(root.auth) as {accessToken?: string | null; token?: string | null};
    return auth.accessToken || auth.token || null;
  } catch {
    return null;
  }
}

export async function getVoipAccessToken(): Promise<string | null> {
  if (currentAccessToken) return currentAccessToken;
  const persisted = await readPersistedToken();
  if (persisted) currentAccessToken = persisted;
  return persisted;
}

function isVoipUrl(url: string): boolean {
  return url.startsWith(VOIP_BASE_URL);
}

/** fetch() с Bearer-токеном для voip.totus.club. Сигнатура совпадает с fetch. */
export async function voipFetch(url: string, init: RequestInit = {}): Promise<Response> {
  if (!isVoipUrl(url)) return fetch(url, init);
  const token = await getVoipAccessToken();
  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string> | undefined) || {}),
  };
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  return fetch(url, {...init, headers});
}

/**
 * Опция `auth` для io(): функциональная форма вызывается socket.io-client при каждом
 * (ре)коннекте, поэтому обновлённый после refresh токен подхватывается сам.
 * client: 'app' — сокет мобильного приложения: хаб уведомлений не считает его «пользователь на
 * экране» (сокет звонков живёт и в фоне); «на экране» сообщает только сокет чата (supportSocket.ts).
 */
export function voipSocketAuth(cb: (data: Record<string, unknown>) => void): void {
  getVoipAccessToken()
    .then(token => cb(token ? {token, client: 'app'} : {client: 'app'}))
    .catch(() => cb({client: 'app'}));
}
