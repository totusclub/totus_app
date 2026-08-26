// src/modules/api/tourAssistantApi.ts
//
// Tour Assistant API client
// Calls backend endpoint that combines DeepSeek + Google TTS
// Returns MP3 audio directly

import axios from 'axios';

// Backend server URL
const BACKEND_TTS_URL = __DEV__
  ? 'http://192.168.1.101:4444' // Development backend (local network)
  : 'https://server.totus.club'; // Production backend

export interface TourAssistantMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TourAssistantResponse {
  ok: boolean;
  audioContent: string; // base64-encoded audio
  audioSize: number;
  audioEncoding: string;
  textResponse: string; // DeepSeek text response
  tours: Array<{
    id: number;
    title: string;
    dest: string;
    price: number;
    days: number;
  }>;
}

/**
 * Call tour assistant (DeepSeek + Google TTS combined)
 * @param text - User's text input
 * @param conversationHistory - Previous conversation messages
 * @returns Promise with audio content and text response
 */
export async function callTourAssistant(
  text: string,
  conversationHistory: TourAssistantMessage[] = []
): Promise<TourAssistantResponse> {
  try {
    console.log('🎤 Calling Tour Assistant API:', {
      textLength: text.length,
      conversationHistoryLength: conversationHistory.length,
    });

    const response = await axios.post<TourAssistantResponse>(
      `${BACKEND_TTS_URL}/api/tour-assistant`,
      {
        text,
        conversationHistory,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 seconds timeout (DeepSeek + TTS can take time)
      }
    );

    if (response.data.ok && response.data.audioContent) {
      console.log('✅ Tour Assistant response received:', {
        audioSize: response.data.audioSize,
        audioEncoding: response.data.audioEncoding,
        toursCount: response.data.tours.length,
        textLength: response.data.textResponse.length,
      });
      return response.data;
    } else {
      throw new Error('Invalid response from Tour Assistant service');
    }
  } catch (error: any) {
    console.error('❌ Tour Assistant API error:', error);
    if (error.response) {
      console.error('Response error:', error.response.data);
      throw new Error(
        `Tour Assistant API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
      );
    } else if (error.request) {
      console.error('Request error:', error.request);
      throw new Error('Tour Assistant API: No response received from server.');
    } else {
      console.error('Setup error:', error.message);
      throw new Error(`Tour Assistant API error: ${error.message}`);
    }
  }
}

