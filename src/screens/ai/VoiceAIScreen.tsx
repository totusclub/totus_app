/**
 * VoiceAIScreen – same design as old voice screen (index.tsx).
 * State machine: idle | listening | thinking | speaking | error.
 */

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import axios from 'axios';
import InCallManager from 'react-native-incall-manager';
import { AppText, Content, AppIcon } from '../../component/UI';
import { useTheme } from '../../hooks/useTheme';
import { useVoiceAI } from '../../modules/hooks/useVoiceAI';
import { synthesizeGoogleTts } from '../../modules/api/googleTtsApi';
import type { VoiceAssistantResponse } from './voice/types';
import {SERVER_BASE_URL} from '../../config/server';

const { width } = Dimensions.get('window');

const BACKEND_URL = SERVER_BASE_URL;

export default function VoiceAIScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();

  const autoStart = !!(route.params as any)?.autoStart;

  // Keep screen awake while on this screen
  useEffect(() => {
    console.log('🔆 Keeping screen awake');
    InCallManager.setKeepScreenOn(true);
    
    return () => {
      console.log('🔅 Allowing screen to sleep');
      InCallManager.setKeepScreenOn(false);
    };
  }, []);

  const onSendPayload = useCallback(
    async (text: string): Promise<VoiceAssistantResponse> => {
      const { data } = await axios.post<{
        chatMode?: boolean;
        nextQuestion?: string;
        searchParams?: Record<string, unknown>;
      }>(`${BACKEND_URL}/api/tour-assistant/stream`, {
        text,
        conversationHistory: [],
        currentSearchParams: {},
      });

      const reply = data?.nextQuestion?.trim() || 'Чем ещё могу помочь?';

      const tts = await synthesizeGoogleTts(reply, {
        languageCode: 'ru-RU',
        ssmlGender: 'FEMALE',
        audioEncoding: 'MP3',
        voiceName: 'ru-RU-Chirp3-HD-Aoede',
      });

      return {
        text: reply,
        audioBase64: tts.audioContent,
        audioEncoding: tts.audioEncoding || 'MP3',
      };
    },
    []
  );

  const {
    phase,
    errorMessage,
    handleMainButton,
    isMainButtonDisabled,
    preparingMic,
    userVoiceDetected,
    speechInputLevel,
  } = useVoiceAI({
    autoStart,
    onSendPayload,
    autoStartDelayMs: 400,
    continuousConversation: true,
  });

  const isAnimation =
    preparingMic || phase === 'listening' || phase === 'thinking' || phase === 'speaking';

  const micPulseScale =
    phase === 'listening' ? 1 + speechInputLevel * 0.22 + (userVoiceDetected ? 0.08 : 0) : 1;
  const statusMessage = preparingMic
    ? 'Секунду…'
    : phase === 'idle'
      ? 'Чтобы начать голосовой разговор, нажмите кнопку ниже 👇'
      : phase === 'listening'
        ? 'Слушаю…'
        : phase === 'thinking'
          ? 'Думаю…'
          : phase === 'speaking'
            ? 'Говорю…'
            : phase === 'error'
              ? errorMessage || 'Ошибка'
              : 'Слушаю дорогой';

  return (
    <Content>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Header – same as old voice screen */}
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              style={styles.backButton}
            >
              <Text allowFontScaling={false} style={[styles.backButtonText, { color: theme.text }]}>←</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerTitleContainer}>
            <Text allowFontScaling={false} style={[styles.headerTitle, { color: theme.brand }]}>Totus</Text>
            <View style={[styles.aiBadge, { backgroundColor: theme.brand, borderColor: theme.brand }]}>
              <AppIcon color="black" size={36} name="logoAi" />
            </View>
          </View>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 15 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.welcomeWrap}>
            <View style={styles.robo}>
              {isAnimation ? (
                <LottieView
                  style={styles.lessenLottie}
                  source={require('../../assets/lottie/lesen.json')}
                  autoPlay
                  loop
                />
              ) : (
                  <LottieView
                      style={styles.lessenLottie}
                      source={require('../../assets/lottie/lesen.json')}
                      autoPlay
                      loop
                  />
              )}
            </View>
            <View>
              <AppText style={[styles.welcomeText, { color: theme.textTertiary }]}>
                {statusMessage}
              </AppText>
            </View>
          </View>
        </ScrollView>

        {/* Bottom – same as old: one main button + hint when listening */}
        <View style={[styles.promptWrapp, { paddingBottom: insets.bottom + 70 }]}>
          <View
            style={[
              styles.micRing,
              {
                borderColor: userVoiceDetected ? theme.success : theme.border,
                borderWidth: phase === 'listening' ? 3 : 0,
                opacity: phase === 'listening' ? 1 : 0.85,
                transform: [{ scale: micPulseScale }],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.recordingButton, isMainButtonDisabled && styles.recordingButtonDisabled]}
              onPress={handleMainButton}
              disabled={isMainButtonDisabled}
              activeOpacity={0.7}
            >
              <LottieView
                style={styles.micLottie}
                source={require('../../assets/lottie/mic.json')}
                autoPlay={phase === 'listening'}
                loop={phase === 'listening'}
              />
            </TouchableOpacity>
          </View>
          {phase === 'listening' && (
            <Text allowFontScaling={false} style={[styles.recordingHint, { color: theme.textTertiary }]}>
              {userVoiceDetected ? 'Слышу вас…' : 'Говорите или нажмите, чтобы отправить'}
            </Text>
          )}
          {phase === 'speaking' && (
            <Text allowFontScaling={false} style={[styles.recordingHint, { color: theme.textTertiary }]}>
              После ответа микрофон включится снова
            </Text>
          )}
        </View>
      </View>
    </Content>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: '400',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  aiBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  headerRight: {
    width: 40,
  },
  welcomeWrap: {
    gap: 30,
    marginVertical: 10,
    justifyContent: 'center',
    flex: 1,
  },
  welcomeText: {
    textAlign: 'center',
  },
  robo: {
    width: width / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: width / 5,
    height: width / 2,
  },
  lessenLottie: {
    width: '150%',
    height: '150%',
  },
  promptWrapp: {
    width,
    alignItems: 'center',
    paddingTop: 15,
  },
  micRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  recordingButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingHint: {
    marginTop: 10,
    fontSize: 13,
    textAlign: 'center',
  },
  recordingButtonDisabled: {
    opacity: 0.5,
  },
  micLottie: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
