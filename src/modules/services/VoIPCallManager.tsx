import React, { useEffect, useState } from 'react';
import { useVoIPCall } from '../hooks/useVoIPCall';
import { VoIPPushPayload } from './voipService';

/**
 * VoIP Call Manager Component
 * Handles VoIP push notifications in background and shows incoming call UI
 * Works even when app is killed or in background
 */
export const VoIPCallManager: React.FC = () => {
  const [voipToken, setVoipToken] = useState<string | null>(null);

  const { isCallKeepInitialized } = useVoIPCall({
    onIncomingCall: (payload: VoIPPushPayload) => {
      console.log('Incoming call received (background/foreground):', payload);
      // CallKeep UI is automatically displayed
      // You can add custom logic here (navigate, show notification, etc.)
    },
    onCallAnswered: (uuid: string) => {
      console.log('Call answered:', uuid);
      // Start your audio/video session here
    },
    onCallEnded: (uuid: string) => {
      console.log('Call ended:', uuid);
      // Cleanup here
    },
    onTokenReceived: (token: string) => {
      console.log('VoIP token received:', token);
      setVoipToken(token);
      // Send token to your backend server
      // Example: await api.sendVoIPToken(token);
    },
    autoDisplayCall: true, // Automatically show CallKeep UI when VoIP push received
  });

  useEffect(() => {
    console.log('voipToken state:', voipToken);
    if (voipToken) {
      console.log('✅ VoIP Token received (ready to send to backend):', voipToken);
      // Token is now available, you can send it to your backend here
      // Example: sendTokenToBackend(voipToken);
    } else {
      console.log('⏳ Waiting for VoIP token...');
      console.log('Note: Token is logged in Xcode console as "VoIP Push Token: <token>"');
      console.log('If token is null, check:');
      console.log('1. Running on physical device (not simulator)');
      console.log('2. VoIPPushModule files added to Xcode project');
      console.log('3. Check Xcode console for "VoIP Push Token:" message');
    }
  }, [voipToken]);

  return null;
};

