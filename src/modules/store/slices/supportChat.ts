// Состояние чата с поддержкой, нужное вне экрана чата: id диалога и счётчик
// непрочитанных (точка в «Аккаунте»). Сами сообщения живут в useSupportChat.
// Сбрасывается при логауте (logoutReducer из auth).
import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {logoutReducer} from './auth';

export type SupportChatState = {
  chatId: number | null;
  unreadCount: number;
  /** Статус диалога с сервера (open / pending / closed). */
  status: string | null;
  /** Время последнего сообщения (ISO) — для сортировки/отладки. */
  lastMessageAt: string | null;
};

const initialState: SupportChatState = {
  chatId: null,
  unreadCount: 0,
  status: null,
  lastMessageAt: null,
};

const supportChatSlice = createSlice({
  name: 'supportChat',
  initialState,
  reducers: {
    /** Синхронизация с объектом chat из API (GET /chat, support:message, support:chat-updated). */
    setSupportChatInfo(
      state,
      action: PayloadAction<{
        id?: number | null;
        userUnread?: number | null;
        status?: string | null;
        lastMessageAt?: string | null;
      }>,
    ) {
      const {id, userUnread, status, lastMessageAt} = action.payload;
      if (typeof id === 'number') state.chatId = id;
      if (typeof userUnread === 'number') state.unreadCount = Math.max(0, userUnread);
      if (typeof status === 'string') state.status = status;
      if (typeof lastMessageAt === 'string') state.lastMessageAt = lastMessageAt;
    },
    setSupportUnread(state, action: PayloadAction<number>) {
      state.unreadCount = Math.max(0, action.payload || 0);
    },
    incrementSupportUnread(state) {
      state.unreadCount += 1;
    },
    resetSupportChat() {
      return initialState;
    },
  },
  extraReducers: builder => {
    builder.addCase(logoutReducer, () => initialState);
  },
});

export const {
  setSupportChatInfo,
  setSupportUnread,
  incrementSupportUnread,
  resetSupportChat,
} = supportChatSlice.actions;

export default supportChatSlice.reducer;
