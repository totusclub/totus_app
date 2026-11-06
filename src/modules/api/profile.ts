import {get} from '../axios';

/** Профиль пользователя из базы (GET /api/auth/me) — те же поля, что читает сайт (totus_WEB, api/AuthApi.tsx). */
export interface MeProfile {
  id: number;
  name?: string | null;
  f_name?: string | null;
  l_name?: string | null;
  email?: string | null;
  phone?: string | null;
  loyalty_id?: string | null;
  date?: string | null;
  role?: 'user' | 'agent';
}

/**
 * Актуальный профиль по токену. Данные в payload токена фиксируются при входе и не меняются,
 * когда пользователь или поддержка правят профиль; карта лояльности должна показывать то же, что сайт.
 * null — не авторизован или API недоступен (вызывающий код остаётся на данных из токена).
 */
export async function getMe(): Promise<MeProfile | null> {
  try {
    const response = await get<{user?: MeProfile}>('/api/auth/me');
    return response.data?.user ?? null;
  } catch {
    return null;
  }
}
