import React, { useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import CallKeep from 'react-native-callkeep';
import { voipService, VoIPPushPayload } from '../services/voipService';
import { callKeepService } from '../services/callKeepService';

interface UseVoIPCallOptions {
  onIncomingCall?: (payload: VoIPPushPayload) => void;
  onCallAnswered?: (uuid: string) => void;
  onCallEnded?: (uuid: string) => void;
  onTokenReceived?: (token: string) => void;
  autoDisplayCall?: boolean;
}

export const useVoIPCall = (options: UseVoIPCallOptions = {}) => {
  const {
    onIncomingCall,
    onCallAnswered,
    onCallEnded,
    onTokenReceived,
    autoDisplayCall = true,
  } = options;

  const [isCallKeepInitialized, setIsCallKeepInitialized] = React.useState(false);

  // Initialize CallKeep (only once globally)
  useEffect(() => {
    // Check if already initialized to avoid duplicate initialization
    if (callKeepService.isInitialized()) {
      setIsCallKeepInitialized(true);
      return;
    }

    const initializeCallKeep = async () => {
      try {
        await callKeepService.initialize({
          ios: {
            appName: 'Totus Club',
            supportsVideo: true,
            maximumCallGroups: 1,
            maximumCallsPerCallGroup: 1,
          },
          android: {
            alertTitle: 'Permissions required',
            alertDescription: 'This application needs to access your phone accounts',
            cancelButton: 'Cancel',
            okButton: 'ok',
            imageName: 'phone_account_icon',
            additionalPermissions: [],
            selfManaged: false,
          },
        });
        setIsCallKeepInitialized(true);
        console.log('CallKeep initialized - ready for background calls');
      } catch (error) {
        console.error('Failed to initialize CallKeep:', error);
        setIsCallKeepInitialized(false);
      }
    };

    initializeCallKeep();
  }, []);

  // Handle VoIP push token
  useEffect(() => {
    const unsubscribe = voipService.onTokenReceived((token) => {
      console.log('VoIP token received:', token);
      onTokenReceived?.(token);
    });

    return unsubscribe;
  }, [onTokenReceived]);

  // Handle incoming VoIP push notifications (works in background/killed state)
  useEffect(() => {
    const unsubscribe = voipService.onPushReceived((payload) => {
      console.log('VoIP push received - showing incoming call UI:', payload);

      onIncomingCall?.(payload);

      // Automatically display CallKeep UI when VoIP push received
      // This works even when app is in background or killed
      if (autoDisplayCall) {
        // Try to display call immediately
        callKeepService
          .displayIncomingCall(
            payload.uuid,
            payload.callerName,
            payload.callerNumber,
            payload.hasVideo
          )
          .catch((error) => {
            console.error('Failed to display incoming call:', error);
            // Retry after a short delay if CallKeep not ready
            setTimeout(() => {
              callKeepService
                .displayIncomingCall(
                  payload.uuid,
                  payload.callerName,
                  payload.callerNumber,
                  payload.hasVideo
                )
                .catch((err) => {
                  console.error('Retry failed to display call:', err);
                });
            }, 500);
          });
      }
    });

    return unsubscribe;
  }, [onIncomingCall, autoDisplayCall]);

  // Handle CallKeep events
  useEffect(() => {
    if (!isCallKeepInitialized) {
      return;
    }

    let answerListener: any = null;
    let endListener: any = null;

    const timeoutId = setTimeout(() => {
      try {
        answerListener = CallKeep.addEventListener('answerCall', ({ callUUID }: { callUUID: string }) => {
          console.log('Call answered via CallKeep:', callUUID);
          onCallAnswered?.(callUUID);
        });

        endListener = CallKeep.addEventListener('endCall', ({ callUUID }: { callUUID: string }) => {
          console.log('Call ended via CallKeep:', callUUID);
          onCallEnded?.(callUUID);
        });
      } catch (error) {
        console.error('Failed to set up CallKeep event listeners:', error);
      }
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      if (answerListener) {
        try {
          answerListener.remove();
        } catch (error) {
          console.error('Error removing answer listener:', error);
        }
      }
      if (endListener) {
        try {
          endListener.remove();
        } catch (error) {
          console.error('Error removing end listener:', error);
        }
      }
    };
  }, [isCallKeepInitialized, onCallAnswered, onCallEnded]);

  const answerCall = useCallback(async (uuid: string) => {
    try {
      await callKeepService.answerCall(uuid);
      onCallAnswered?.(uuid);
    } catch (error) {
      console.error('Failed to answer call:', error);
    }
  }, [onCallAnswered]);

  const endCall = useCallback(async (uuid: string) => {
    try {
      await callKeepService.endCall(uuid);
      onCallEnded?.(uuid);
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  }, [onCallEnded]);

  const getVoIPToken = useCallback(async () => {
    return await voipService.getToken();
  }, []);

  return {
    answerCall,
    endCall,
    getVoIPToken,
    currentCallUUID: callKeepService.getCurrentCallUUID(),
    isCallKeepInitialized,
  };
};

