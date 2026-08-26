import CallKeep from 'react-native-callkeep';
import { Platform, PermissionsAndroid } from 'react-native';
import { VoIPPushPayload } from './voipService';

interface CallKeepOptions {
  ios: {
    appName: string;
    supportsVideo?: boolean;
    maximumCallGroups?: number;
    maximumCallsPerCallGroup?: number;
  };
  android: {
    alertTitle: string;
    alertDescription: string;
    cancelButton: string;
    okButton: string;
    imageName?: string;
    additionalPermissions?: string[];
    selfManaged?: boolean;
  };
}

class CallKeepService {
  private initialized = false;
  private currentCallUUID: string | null = null;

  /**
   * Initialize CallKeep
   */
  async initialize(options: CallKeepOptions) {
    if (this.initialized) {
      console.warn('CallKeep already initialized');
      return;
    }

    try {
      if (Platform.OS === 'android') {
        // Request permissions on Android
        await this.requestAndroidPermissions();
      }

      await CallKeep.setup(options);
      this.setupEventHandlers();
      this.initialized = true;
      console.log('CallKeep initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CallKeep:', error);
      throw error;
    }
  }

  private async requestAndroidPermissions() {
    if (Platform.OS !== 'android') return;

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      
      const allGranted = Object.values(granted).every(
        status => status === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        console.warn('Some permissions were not granted');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  }

  private setupEventHandlers() {
    // Handle call answer
    CallKeep.addEventListener('answerCall', ({ callUUID }) => {
      console.log('Call answered:', callUUID);
      this.currentCallUUID = callUUID;
      // Emit event or call callback
    });

    // Handle call end
    CallKeep.addEventListener('endCall', ({ callUUID }) => {
      console.log('Call ended:', callUUID);
      if (this.currentCallUUID === callUUID) {
        this.currentCallUUID = null;
      }
    });

    // Handle call held
    CallKeep.addEventListener('holdCall', ({ callUUID, hold }) => {
      console.log('Call held:', callUUID, hold);
    });

    // Handle mute
    CallKeep.addEventListener('muteCall', ({ callUUID, muted }) => {
      console.log('Call muted:', callUUID, muted);
    });

    // Handle DTMF
    CallKeep.addEventListener('DTMFAction', ({ callUUID, digits }) => {
      console.log('DTMF:', callUUID, digits);
    });

    // Handle audio route change (iOS)
    if (Platform.OS === 'ios') {
      CallKeep.addEventListener('changeAudioRoute', ({ callUUID, output }) => {
        console.log('Audio route changed:', callUUID, output);
      });
    }
  }

  /**
   * Display incoming call UI
   */
  async displayIncomingCall(
    uuid: string,
    callerName: string,
    callerNumber: string,
    hasVideo: boolean = false
  ) {
    try {
      await CallKeep.displayIncomingCall(uuid, callerName, callerNumber, 'generic', hasVideo);
      this.currentCallUUID = uuid;
      console.log('Incoming call displayed:', uuid);
    } catch (error) {
      console.error('Failed to display incoming call:', error);
      throw error;
    }
  }

  /**
   * Answer an incoming call
   */
  async answerCall(uuid: string) {
    try {
      await CallKeep.answerIncomingCall(uuid);
      this.currentCallUUID = uuid;
      console.log('Call answered:', uuid);
    } catch (error) {
      console.error('Failed to answer call:', error);
      throw error;
    }
  }

  /**
   * End a call
   */
  async endCall(uuid: string) {
    try {
      await CallKeep.endCall(uuid);
      if (this.currentCallUUID === uuid) {
        this.currentCallUUID = null;
      }
      console.log('Call ended:', uuid);
    } catch (error) {
      console.error('Failed to end call:', error);
      throw error;
    }
  }

  /**
   * End all calls
   */
  async endAllCalls() {
    try {
      await CallKeep.endAllCalls();
      this.currentCallUUID = null;
      console.log('All calls ended');
    } catch (error) {
      console.error('Failed to end all calls:', error);
      throw error;
    }
  }

  /**
   * Set call on hold
   */
  async setOnHold(uuid: string, hold: boolean) {
    try {
      await CallKeep.setOnHold(uuid, hold);
      console.log('Call hold set:', uuid, hold);
    } catch (error) {
      console.error('Failed to set call on hold:', error);
      throw error;
    }
  }

  /**
   * Report call ended
   */
  async reportEndCallWithUUID(uuid: string, reason: number) {
    try {
      await CallKeep.reportEndCallWithUUID(uuid, reason);
      if (this.currentCallUUID === uuid) {
        this.currentCallUUID = null;
      }
      console.log('Call ended reported:', uuid, reason);
    } catch (error) {
      console.error('Failed to report end call:', error);
      throw error;
    }
  }

  /**
   * Get current call UUID
   */
  getCurrentCallUUID(): string | null {
    return this.currentCallUUID;
  }

  /**
   * Check if CallKeep is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

export const callKeepService = new CallKeepService();

