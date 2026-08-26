/**
 * Voice AI screen – type definitions.
 * State machine phases and payloads for a production-ready voice interface.
 */

/** Strict state machine phases for the voice flow */
export type VoicePhase =
  | 'idle'       // Ready to start recording
  | 'listening'  // Recording in progress
  | 'thinking'   // Upload/send in progress, waiting for AI
  | 'speaking'   // Playing AI audio response
  | 'error';    // Permission, network, or audio failure

/** Response shape from backend after sending audio or text */
export interface VoiceAssistantResponse {
  /** Transcript or AI reply text */
  text: string;
  /** Optional: audio URL to play (preferred) */
  audioUrl?: string;
  /** Optional: base64 audio (e.g. from TTS); used if audioUrl is absent */
  audioBase64?: string;
  /** Encoding for base64 audio, e.g. 'MP3' */
  audioEncoding?: string;
}

/** Options for the voice hook (send payload, auto-start, timeouts) */
export interface UseVoiceAIOptions {
  /** When true, start recording automatically after a short delay (e.g. when navigating from Text AI) */
  autoStart?: boolean;
  /** Called with recognized text (or uploaded audio result). Return response with text + optional audio. */
  onSendPayload: (text: string) => Promise<VoiceAssistantResponse>;
  /** Called when phase changes (e.g. for analytics or UI) */
  onPhaseChange?: (phase: VoicePhase) => void;
  /** Silence duration in ms before auto-stop (default 2500) */
  silenceThresholdMs?: number;
  /** Min recording time before silence is considered (default 1000) */
  minRecordingBeforeSilenceMs?: number;
  /** Max recording duration in ms (default 30000) */
  maxRecordingMs?: number;
  /** Delay before auto-start recording in ms (default 400) */
  autoStartDelayMs?: number;
}

/** Props for the main control button */
export interface VoiceMainButtonProps {
  phase: VoicePhase;
  disabled: boolean;
  onPress: () => void;
  /** Short label for accessibility / debug */
  label: string;
}
