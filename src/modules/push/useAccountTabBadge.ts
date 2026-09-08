// Бейдж непрочитанных уведомлений на вкладке «Аккаунт» таб-бара (DESIGN.md «Общее»).
// Отдельный хук, чтобы не трогать существующие options Tab.Screen в authStack.tsx.
import {useSelector} from 'react-redux';
import type {RootState} from '../store';

const MAX_BADGE = 99;

/** Число для tabBarBadge или undefined (бейдж скрыт). Только для авторизованных. */
export function useAccountTabBadge(): number | undefined {
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const unread = useSelector((state: RootState) => state.notifications?.unread ?? 0);
  if (!accessToken || !unread || unread <= 0) return undefined;
  return Math.min(unread, MAX_BADGE);
}
