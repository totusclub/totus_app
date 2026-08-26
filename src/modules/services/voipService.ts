import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { VoIPPushModule } = NativeModules;

export interface VoIPPushPayload {
  uuid: string;
  callerName: string;
  callerNumber: string;
  hasVideo: boolean;
  payload: any;
}

class VoIPService {
  private eventEmitter: NativeEventEmitter | null = null;
  private tokenListeners: ((token: string) => void)[] = [];
  private pushListeners: ((payload: VoIPPushPayload) => void)[] = [];

  constructor() {
    if (Platform.OS === 'ios') {
      console.log('Checking for VoIPPushModule...', VoIPPushModule);
      if (VoIPPushModule) {
        console.log('✅ VoIPPushModule found, setting up event listeners');
        this.eventEmitter = new NativeEventEmitter(VoIPPushModule);
        this.setupEventListeners();
      } else {
        console.error('❌ VoIPPushModule not found!');
        console.error('Please add VoIPPushModule.swift and VoIPPushModule.m to Xcode project');
        console.error('The token will still be logged in Xcode console as "VoIP Push Token: <token>"');
      }
    }
  }

  private setupEventListeners() {
    if (!this.eventEmitter) return;

    this.eventEmitter.addListener('VoIPPushTokenReceived', (data: { token: string }) => {
      console.log('VoIP Push Token received:', data.token);
      this.tokenListeners.forEach(listener => listener(data.token));
    });

    this.eventEmitter.addListener('VoIPPushReceived', (data: VoIPPushPayload) => {
      console.log('VoIP Push received (background/foreground):', data);
      this.pushListeners.forEach(listener => listener(data));
    });

    this.eventEmitter.addListener('VoIPPushTokenInvalidated', () => {
      console.log('VoIP Push token invalidated');
    });
  }

  onTokenReceived(callback: (token: string) => void) {
    this.tokenListeners.push(callback);
    return () => {
      this.tokenListeners = this.tokenListeners.filter(cb => cb !== callback);
    };
  }

  onPushReceived(callback: (payload: VoIPPushPayload) => void) {
    this.pushListeners.push(callback);
    return () => {
      this.pushListeners = this.pushListeners.filter(cb => cb !== callback);
    };
  }

  getToken(): Promise<string | null> {
    return new Promise((resolve) => {
      if (Platform.OS !== 'ios') {
        resolve(null);
        return;
      }

      const unsubscribe = this.onTokenReceived((token) => {
        unsubscribe();
        resolve(token);
      });

      setTimeout(() => {
        unsubscribe();
        resolve(null);
      }, 5000);
    });
  }
}

export const voipService = new VoIPService();

