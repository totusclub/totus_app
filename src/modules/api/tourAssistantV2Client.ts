import axios from 'axios';
import { VOIP_BASE_URL } from '../../config/server';
import type {
  CreateConversationV2Response,
  ListConversationsV2Response,
  SendMessageV2Response,
  TourAssistantV2Message,
} from '../../types/tourAssistantV2';

const BASE = `${VOIP_BASE_URL}/api/v2/tour-assistant`;

export async function createConversationV2(userId?: string): Promise<CreateConversationV2Response> {
  const { data } = await axios.post<CreateConversationV2Response>(`${BASE}/conversations`, {
    userId: userId || undefined,
  });
  return data;
}

export async function listConversationsV2(userId?: string): Promise<ListConversationsV2Response> {
  const { data } = await axios.get<ListConversationsV2Response>(`${BASE}/conversations`, {
    params: userId ? { userId } : undefined,
  });
  return data;
}

export async function getConversationV2(
  conversationId: string,
  userId?: string,
): Promise<SendMessageV2Response & { conversation?: { id: string; title: string; updatedAt: string } }> {
  const { data } = await axios.get(`${BASE}/conversations/${conversationId}`, {
    params: userId ? { userId } : undefined,
  });
  return data;
}

export async function sendMessageV2(
  conversationId: string,
  text: string,
  userId?: string,
): Promise<SendMessageV2Response> {
  const { data } = await axios.post<SendMessageV2Response>(
    `${BASE}/conversations/${conversationId}/messages`,
    { text, userId: userId || undefined },
    { timeout: 120000 },
  );
  return data;
}

export async function deleteConversationV2(conversationId: string, userId?: string): Promise<void> {
  await axios.delete(`${BASE}/conversations/${conversationId}`, {
    params: userId ? { userId } : undefined,
  });
}

export type { TourAssistantV2Message };
