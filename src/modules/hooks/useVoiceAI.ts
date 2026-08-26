/**
 * useVoiceAI – production-ready voice conversation hook.
 * State machine: idle → listening → thinking → speaking → error.
 * Handles recording (Voice), silence detection, max duration, upload/send, playback, cleanup.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import {
  playGoogleTtsAudio,
  playAudioFromUrl,
  stopGoogleTtsAudio,
} from '../api/googleTtsApi';
import type { VoicePhase, UseVoiceAIOptions, VoiceAssistantResponse } from '../../screens/ai/voice/types';
import {
  AUTO_START_DELAY_MS,
  SILENCE_THRESHOLD_MS,
  MIN_RECORDING_BEFORE_SILENCE_MS,
  MAX_RECORDING_MS,
  NO_SPEECH_MESSAGE,
} from '../../screens/ai/voice/constants';

let Voice: any = null;
let voiceAvailable = false;
try {
  Voice = require('@react-native-voice/voice').default;
  voiceAvailable = true;
} catch {
  // Voice not installed
}

export interface UseVoiceAIResult {
  phase: VoicePhase;
  errorMessage: string | null;
  recognizedText: string | null;
  /** Start recording (idle → listening). */
  startRecording: () => Promise<void>;
  /** Stop recording and send payload (listening → thinking → speaking/idle/error). */
  stopRecording: () => Promise<void>;
  /** Stop playback and go to idle (speaking → idle). */
  stopPlayback: () => void;
  /** Single main button action: phase-dependent. */
  handleMainButton: () => Promise<void>;
  /** Clear error and optionally start recording. */
  clearError: () => void;
  /** Whether the main button should be disabled (e.g. thinking). */
  isMainButtonDisabled: boolean;
  /** Short label for the main button. */
  mainButtonLabel: string;
}

/** Haptic feedback helpers (no-op if not available). */
function triggerHaptic(type: 'light' | 'medium' | 'heavy') {
  try {
    const { Platform } = require('react-native');
    if (Platform.OS === 'ios') {
      const ReactNative = require('react-native');
      ReactNative.NativeModules?.ExponentHaptic?.impact?.(type) ||
        ReactNative.NativeModules?.HapticFeedback?.trigger?.(type);
    }
  } catch {
    // ignore
  }
}

export function useVoiceAI(options: UseVoiceAIOptions): UseVoiceAIResult {
  const {
    autoStart = false,
    onSendPayload,
    onPhaseChange,
    silenceThresholdMs = SILENCE_THRESHOLD_MS,
    minRecordingBeforeSilenceMs = MIN_RECORDING_BEFORE_SILENCE_MS,
    maxRecordingMs = MAX_RECORDING_MS,
    autoStartDelayMs = AUTO_START_DELAY_MS,
  } = options;

  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string | null>(null);

  const lastResultRef = useRef<string>('');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingStartRef = useRef<number>(0);
  const speechDetectedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const isPlayingRef = useRef<boolean>(false);
  const hasAutoStartedRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);

  const setPhaseSafe = useCallback(
    (next: VoicePhase) => {
      if (!isMountedRef.current) return;
      setPhase(next);
      onPhaseChange?.(next);
    },
    [onPhaseChange]
  );

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, []);

  const stopPlayback = useCallback(() => {
    try {
      stopGoogleTtsAudio();
    } catch {
      // ignore
    }
    isPlayingRef.current = false;
    setPhaseSafe('idle');
  }, [setPhaseSafe]);

  const playResponse = useCallback(
    async (response: VoiceAssistantResponse) => {
      if (!response.text && !response.audioUrl && !response.audioBase64) return;

      isPlayingRef.current = true;
      setPhaseSafe('speaking');

      try {
        if (response.audioUrl) {
          const result = await playAudioFromUrl(response.audioUrl);
          if (!result.finished && result.error) {
            setErrorMessage(result.error);
            setPhaseSafe('error');
          }
        } else if (response.audioBase64) {
          const result = await playGoogleTtsAudio(
            response.audioBase64,
            response.audioEncoding || 'MP3'
          );
          if (!result.finished && result.error) {
            setErrorMessage(result.error);
            setPhaseSafe('error');
          }
        }
        if (isMountedRef.current && isPlayingRef.current) {
          setPhaseSafe('idle');
        }
      } catch (e: any) {
        setErrorMessage(e?.message || 'Ошибка воспроизведения');
        setPhaseSafe('error');
      } finally {
        isPlayingRef.current = false;
      }
    },
    [setPhaseSafe]
  );

  const startRecording = useCallback(async () => {
    if (!voiceAvailable || !Voice) {
      setErrorMessage('Распознавание речи недоступно');
      setPhaseSafe('error');
      return;
    }

    if (phase === 'listening') return; // already recording
    if (phase === 'thinking') return;

    // Stop any playback before starting a new recording
    stopPlayback();
    clearError();

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setErrorMessage('Нет доступа к микрофону');
        setPhaseSafe('error');
        return;
      }
    }

    try {
      const available = await Voice.isAvailable();
      if (!available) {
        setErrorMessage('Распознавание речи недоступно на устройстве');
        setPhaseSafe('error');
        return;
      }

      lastResultRef.current = '';
      setRecognizedText(null);
      speechDetectedRef.current = false;
      recordingStartRef.current = Date.now();
      isListeningRef.current = true;
      setPhaseSafe('listening');
      triggerHaptic('medium');

      await Voice.start('ru-RU');

      // Silence detection: after threshold, if no speech yet, auto-stop
      silenceTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current || !isListeningRef.current) return;
        const elapsed = Date.now() - recordingStartRef.current;
        if (elapsed >= minRecordingBeforeSilenceMs && !speechDetectedRef.current) {
          stopRecording();
        }
      }, Math.min(silenceThresholdMs, maxRecordingMs - 1000));

      // Max duration
      maxDurationTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current || !isListeningRef.current) return;
        stopRecording();
      }, maxRecordingMs);
    } catch (e: any) {
      setErrorMessage(e?.message || 'Не удалось начать запись');
      setPhaseSafe('error');
      clearTimers();
    }
  }, [phase, setPhaseSafe, stopPlayback, minRecordingBeforeSilenceMs, silenceThresholdMs, maxRecordingMs, clearTimers]);

  const stopRecording = useCallback(async () => {
    if (!isListeningRef.current) return;
    isListeningRef.current = false;
    clearTimers();
    setPhaseSafe('thinking');
    triggerHaptic('light');

    try {
      await Voice.stop();
    } catch {
      try {
        await Voice.cancel();
      } catch {
        // ignore
      }
    }

    const text = lastResultRef.current?.trim() || '';

    if (!text) {
      setPhaseSafe('error');
      setErrorMessage(NO_SPEECH_MESSAGE);
      return;
    }

    setRecognizedText(text);

    try {
      const response = await onSendPayload(text);
      await playResponse(response);
    } catch (e: any) {
      setErrorMessage(e?.userMessage || e?.message || 'Ошибка при отправке');
      setPhaseSafe('error');
    }
  }, [setPhaseSafe, onSendPayload, playResponse, clearTimers]);

  const handleMainButton = useCallback(async () => {
    if (phase === 'listening') {
      await stopRecording();
      return;
    }
    if (phase === 'thinking') return;
    if (phase === 'speaking') {
      stopPlayback();
      await startRecording();
      return;
    }
    if (phase === 'idle' || phase === 'error') {
      clearError();
      await startRecording();
    }
  }, [stopRecording, stopPlayback, startRecording]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    if (phase === 'error') setPhaseSafe('idle');
  }, [phase, setPhaseSafe]);

  // Wire Voice events
  useEffect(() => {
    if (!voiceAvailable || !Voice) return;

    const onResults = (e: any) => {
      if (e?.value?.[0]) {
        lastResultRef.current = e.value[0];
        speechDetectedRef.current = true;
      }
    };
    const onError = (e: any) => {
      if (!isMountedRef.current) return;
      clearTimers();
      setPhaseSafe('idle');
      if (e?.error?.message) setErrorMessage(e.error.message);
    };
    const onEnd = () => {
      // Voice stopped by engine; we don't auto-submit here, user taps button to submit
    };

    Voice.onSpeechResults = onResults;
    Voice.onSpeechError = onError;
    Voice.onSpeechEnd = onEnd;

    return () => {
      Voice.removeAllListeners?.();
    };
  }, [clearTimers, setPhaseSafe]);

  // Auto-start when screen opens with autoStart
  useEffect(() => {
    if (!autoStart || hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;
    const t = setTimeout(() => {
      startRecording();
    }, autoStartDelayMs);
    return () => clearTimeout(t);
  }, [autoStart, autoStartDelayMs, startRecording]);

  // Reset auto-start when navigating away and back (e.g. by resetting when autoStart becomes false)
  useEffect(() => {
    if (!autoStart) hasAutoStartedRef.current = false;
  }, [autoStart]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimers();
      try {
        if (Voice?.destroy) Voice.destroy().catch(() => {});
        if (Voice?.removeAllListeners) Voice.removeAllListeners();
      } catch {
        // ignore
      }
      stopGoogleTtsAudio();
      isPlayingRef.current = false;
    };
  }, [clearTimers]);

  const isMainButtonDisabled = phase === 'thinking';
  const mainButtonLabel =
    phase === 'listening'
      ? 'Стоп'
      : phase === 'thinking'
        ? 'Думаю…'
        : phase === 'speaking'
          ? 'Ответ'
          : phase === 'error'
            ? 'Повторить'
            : 'Начать';

  return {
    phase,
    errorMessage,
    recognizedText,
    startRecording,
    stopRecording,
    stopPlayback,
    handleMainButton,
    clearError,
    isMainButtonDisabled,
    mainButtonLabel,
  };
}
