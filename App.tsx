import React, {useCallback, useEffect, useState} from 'react';
import {Provider, useSelector} from 'react-redux';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import Navigation from './src/navigation';
import {persistor, store, RootState} from './src/modules/store';
import {PersistGate} from 'redux-persist/integration/react';
import {StatusBar, View, Platform} from 'react-native';
import {initVoipAndCallKeep, getCallState, setUserLoyaltyId, getCurrentDeviceId} from './src/modules/voip/VoipService';
import {CallModal} from "./src/component/UI/callModal";
import {MinimizedCallView} from "./src/component/UI/callModal/MinimizedCallView";
import { ThemeProvider, useThemeContext } from './src/context/ThemeContext';
import {
  AiAssistantNativeProvider,
  type OpenHotelInfo,
} from '@tosmedia/ai-assistant-native';
import { openHotelFromAiAssistantInfo, openHotelFromAiAssistantUrl } from './src/utils/aiAssistantOpenHotel';
import { setVoipAccessToken } from './src/modules/api/voipAuth';
import SupportSocketBridge from './src/modules/support/SupportSocketBridge';

function AiAssistantBridge({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isDark } = useThemeContext();
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);

  // Тот же JWT — телефонии (voip.totus.club): Bearer в HTTP и токен в Socket.io
  useEffect(() => {
    setVoipAccessToken(accessToken || null);
  }, [accessToken]);

  const onOpenHotel = useCallback((info: OpenHotelInfo) => {
    return openHotelFromAiAssistantInfo(info);
  }, []);

  const openUrl = useCallback((url: string) => {
    openHotelFromAiAssistantUrl(url);
  }, []);

  const getAccessToken = useCallback(() => accessToken || null, [accessToken]);

  return (
    <AiAssistantNativeProvider
      apiBase="https://apiv2.totus.club/api"
      wsUrl="wss://apiv2.totus.club/ws/assistant"
      siteOrigin="https://totus.club"
      tourBasePath="/hotel-details"
      colorScheme={isDark ? 'dark' : 'light'}
      onOpenHotel={onOpenHotel}
      openUrl={openUrl}
      getAccessToken={getAccessToken}
      historyMode="auto"
    >
      {children}
    </AiAssistantNativeProvider>
  );
}

function AppContentInner(): React.JSX.Element {
    const { theme, isDark } = useThemeContext();
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const {user: loggedInUser} = useSelector((state: RootState) => state.auth);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    initVoipAndCallKeep();
  }, []);

  // When user is logged in, set loyaltyId in VoipService to register with socket
  useEffect(() => {
    if (loggedInUser) {
      // Try to get loyalty_id from user object
      let loyaltyId: string | null = null;
      if ((loggedInUser as any).loyalty_id) {
        loyaltyId = (loggedInUser as any).loyalty_id;
      } else if ((loggedInUser as any).loyaltyId) {
        loyaltyId = (loggedInUser as any).loyaltyId;
      }

      if (loyaltyId) {
        setUserLoyaltyId(loyaltyId);
        console.log('App: Set loyaltyId in VoipService on app open:', loyaltyId);
      }
    }
  }, [loggedInUser]);

  // Reset minimized state when app opens/reopens
  useEffect(() => {
    // Reset minimized state on app mount to prevent stale state
    setIsMinimized(false);
    setCallModalVisible(false);
  }, []);

  // Monitor call state to show/hide modal
  useEffect(() => {
    let previousState: string | null = null;
    let isInitialized = false;

    const interval = setInterval(() => {
      const state = getCallState();
      const currentState = state.state;

      // Initialize previousState on first run
      if (!isInitialized) {
        previousState = currentState;
        isInitialized = true;
        // Only reset minimized state if call is idle (no active call)
        // Don't reset if there's an active call - preserve user's minimize action
        if (currentState === 'idle') {
          setIsMinimized(false);
          setCallModalVisible(false);
        } else {
          // If there's an active call, respect the minimized state
          const shouldShow = currentState === 'calling' || currentState === 'ringing' || currentState === 'answered';
          if (shouldShow) {
            if (isMinimized) {
              // User has minimized - keep modal closed
              setCallModalVisible(false);
            } else {
              // User hasn't minimized - show modal
              setCallModalVisible(true);
            }
          }
        }
        return;
      }

      // Show modal if call is in any active state (calling, ringing, answered)
      // Don't show for 'ended' or 'rejected' - those should close the modal
      const shouldShow =
        currentState === 'calling' ||
        currentState === 'ringing' ||
        currentState === 'answered';

      // If call ended or rejected, reset minimized state and close modal immediately
      if (currentState === 'ended' || currentState === 'rejected') {
        setIsMinimized(false);
        setCallModalVisible(false);
        previousState = currentState;
        return;
      }

      // If state changed from idle to active (new call starting)
      if (previousState === 'idle' && shouldShow) {
        // New call starting - reset minimized state for fresh start
        // This ensures minimize works for every new call
        setIsMinimized(false);
        setCallModalVisible(true);
        previousState = currentState;
        return;
      }

      // If state changed from ended/rejected to active (call restarted)
      if ((previousState === 'ended' || previousState === 'rejected') && shouldShow) {
        // Call restarted after ending - reset minimized state for fresh start
        setIsMinimized(false);
        setCallModalVisible(true);
        previousState = currentState;
        return;
      }

      // If state is active and modal should be shown
      if (shouldShow) {
        // CRITICAL: Preserve minimized state - don't reset it during active call
        // Only control modal visibility based on minimized state
        if (!isMinimized) {
          // User hasn't minimized - show modal
          setCallModalVisible(true);
        } else {
          // User has minimized - keep modal closed and minimized view visible
          setCallModalVisible(false);
        }
        // DO NOT reset isMinimized here - preserve user's minimize action
      } else if (currentState === 'idle') {
        // If state is idle, close modal and reset minimized (ready for next call)
        setIsMinimized(false);
        setCallModalVisible(false);
      }

      previousState = currentState;
    }, 300); // Reduced interval for better responsiveness

    return () => clearInterval(interval);
  }, [isMinimized]);

  const handleMinimize = () => {
    const callState = getCallState();
    console.log('📱 handleMinimize called - setting isMinimized to true');
    console.log('   Current call state:', callState.state);
    console.log('   Works in ALL states: incoming (ringing), outgoing (calling), active (answered)');
    
    // Set minimized state - works in ALL call states
    // This will show minimized view in header center and allow scrolling on all screens
    setIsMinimized(true);
    setCallModalVisible(false);
    
    console.log('   ✅ After minimize: isMinimized=true, callModalVisible=false');
    console.log('   ✅ Minimized view will appear in header center');
    console.log('   ✅ All screens will be scrollable');
  };

  const handleExpand = () => {
    console.log('📱 handleExpand called - setting isMinimized to false');
    setIsMinimized(false);
    setCallModalVisible(true);
  };

  const currentCallState = getCallState();
  // Show minimized view if:
  // 1. isMinimized is true (user has minimized)
  // 2. Call is in any active state (calling/outgoing, ringing/incoming, or answered/active)
  // 3. Modal is not visible (to prevent conflicts)
  // This ensures minimize works in ALL calling steps: incoming, outgoing, and active
  const isCallActive = currentCallState.state === 'calling' ||
    currentCallState.state === 'ringing' ||
    currentCallState.state === 'answered';
  
  // Show minimized view when user has minimized AND call is active AND modal is closed
  // This works in ALL call states: incoming (ringing), outgoing (calling), active (answered)
  const showMinimized = isMinimized &&
    !callModalVisible &&
    isCallActive;
  
  // Debug: Log when minimized view state changes (only when minimized to avoid spam)
  useEffect(() => {
    if (isMinimized) {
      const state = getCallState();
      const shouldShow = state.state === 'calling' || state.state === 'ringing' || state.state === 'answered';
      console.log('📱 Minimized view state:', {
        isMinimized,
        callModalVisible,
        callState: state.state,
        isCallActive: shouldShow,
        showMinimized: isMinimized && !callModalVisible && shouldShow,
      });
    }
  }, [isMinimized, callModalVisible, currentCallState.state]);

  return (
    <>
        <StatusBar
            key={`statusbar-${!isDark ? 'dark' : 'light'}`}
            backgroundColor={theme.statusBarBackground}

            barStyle={!isDark ? 'dark-content' : 'light-content'}
        />
      <Navigation />

      {/* Сокет чата с поддержкой + счётчик непрочитанных (пока авторизован и приложение активно) */}
      <SupportSocketBridge />

      {/* Minimized Call View - Centered in header only (not at bottom) */}
      {showMinimized && (
        <View
          style={{
            position: 'absolute',
            top: insets.top + (Platform.OS === 'ios' ? 8 : 12),
            left: 0,
            right: 0,
            // Do NOT set bottom - this ensures it only appears at top (header area)
            // Do NOT set height - let content determine height
            zIndex: 10000,
            pointerEvents: 'box-none', // CRITICAL: Allow touches to pass through to content below, only capture on minimized view itself
            alignItems: 'center',
            justifyContent: 'flex-start', // Align to top (header area)
            width: '100%',
            // Ensure this doesn't block scrolling - pointerEvents: 'box-none' allows touches to pass through
          }}
          collapsable={false}
          removeClippedSubviews={false}>
          <MinimizedCallView onExpand={handleExpand} />
        </View>
      )}

      <CallModal
        visible={callModalVisible && !isMinimized}
        onClose={() => {
          setIsMinimized(false);
          setCallModalVisible(false);
        }}
        onMinimize={handleMinimize}
      />
    </>
  );
}


function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
          <ThemeProvider>
              <SafeAreaProvider>
                  <AiAssistantBridge>
                    <AppContentInner />
                  </AiAssistantBridge>
              </SafeAreaProvider>
          </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
