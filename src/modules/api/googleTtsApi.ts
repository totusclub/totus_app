// src/modules/api/googleTtsApi.ts
//
// Google Cloud Text-to-Speech API client
// Calls the backend TTS service to synthesize speech

import axios from 'axios';

// Backend TTS server URL
// Use the same backend URL as VoIP service
const BACKEND_TTS_URL = __DEV__
  ? 'http://192.168.1.101:4444' // Development backend (local network)
  : 'https://server.totus.club'; // Production backend

export interface GoogleTtsOptions {
  languageCode?: string;
  ssmlGender?: 'FEMALE' | 'MALE' | 'NEUTRAL';
  audioEncoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
  voiceName?: string;
}

export interface GoogleTtsResponse {
  ok: boolean;
  audioContent: string; // base64-encoded audio
  audioSize: number;
  audioEncoding: string;
  languageCode: string;
}

/**
 * Synthesize speech using Google Cloud TTS via backend
 * @param text - Text to synthesize
 * @param options - Optional TTS configuration
 * @returns Promise with base64-encoded audio content
 */
export async function synthesizeGoogleTts(
  text: string,
  options: GoogleTtsOptions = {}
): Promise<GoogleTtsResponse> {
  try {
    const {
      languageCode = 'ru-RU',
      ssmlGender = 'FEMALE',
      audioEncoding = 'MP3',
      voiceName = null,
    } = options;

    console.log('🎤 Calling Google TTS API:', {
      textLength: text.length,
      languageCode,
      ssmlGender,
      audioEncoding,
    });

    const response = await axios.post<GoogleTtsResponse>(
      `${BACKEND_TTS_URL}/api/tts/synthesize`,
      {
        text,
        languageCode,
        ssmlGender,
        audioEncoding,
        voiceName,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout
      }
    );

    if (response.data.ok && response.data.audioContent) {
      console.log('✅ Google TTS synthesized successfully:', {
        audioSize: response.data.audioSize,
        audioEncoding: response.data.audioEncoding,
      });
      return response.data;
    } else {
      throw new Error('Invalid response from TTS service');
    }
  } catch (error: any) {
    console.error('❌ Google TTS API error:', error);
    if (error.response) {
      console.error('Response error:', error.response.data);
      throw new Error(
        `Google TTS API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
      );
    } else if (error.request) {
      console.error('Request error:', error.request);
      throw new Error('Google TTS API: No response received from server.');
    } else {
      console.error('Setup error:', error.message);
      throw new Error(`Google TTS API error: ${error.message}`);
    }
  }
}

/**
 * Play audio from base64-encoded audio content
 * Converts base64 to file and plays using react-native-sound-player
 */
export async function playGoogleTtsAudio(
  base64Audio: string,
  audioEncoding: string = 'MP3'
): Promise<void> {
  try {
    const SoundPlayer = require('react-native-sound-player').default;
    const { Platform } = require('react-native');
    
    // Try to import react-native-fs with proper error handling
    let RNFS: any = null;
    let basePath: string = '';
    
    try {
      const fsModule = require('react-native-fs');
      // Handle both default export and named export
      RNFS = fsModule.default || fsModule;
      
      if (RNFS) {
        // Try different path options based on platform
        if (Platform.OS === 'ios') {
          basePath = RNFS.DocumentDirectoryPath || RNFS.CachesDirectoryPath || RNFS.MainBundlePath || '';
        } else {
          basePath = RNFS.CachesDirectoryPath || RNFS.ExternalDirectoryPath || RNFS.DocumentDirectoryPath || '';
        }
      }
    } catch (fsError: any) {
      console.error('❌ react-native-fs not available:', fsError.message);
      throw new Error('react-native-fs is not properly linked. Please run: cd ios && pod install');
    }

    if (!RNFS || !basePath) {
      throw new Error('No file system path available. react-native-fs may need to be linked.');
    }

    // Create temporary file path
    const fileName = `tts-${Date.now()}.${audioEncoding.toLowerCase()}`;
    const filePath = `${basePath}/${fileName}`;

    console.log('📁 Writing audio file:', {
      filePath,
      basePath,
      fileName,
      audioSize: base64Audio.length,
    });

    // Write base64 audio to file
    await RNFS.writeFile(filePath, base64Audio, 'base64');
    
    // Verify file was written
    const fileExists = await RNFS.exists(filePath);
    if (!fileExists) {
      throw new Error('Failed to write audio file');
    }
    
    console.log('✅ Audio file written successfully');

    console.log('🔊 Playing Google TTS audio:', {
      filePath,
      audioSize: base64Audio.length,
      audioEncoding,
      platform: Platform.OS,
    });

    // Play the audio file using react-native-sound-player
    console.log('🎵 Preparing to play audio from:', filePath);
    console.log('📊 SoundPlayer available methods:', Object.keys(SoundPlayer));
    
    // For iOS, we need file:// protocol, for Android we can try both
    const fileUrl = Platform.OS === 'ios' ? `file://${filePath}` : filePath;
    
    try {
      console.log('🎵 Playing audio from URL:', fileUrl);
      
      // Use playUrl - it should work for both local files and remote URLs
      SoundPlayer.playUrl(fileUrl);
      
      // Wait a moment to ensure playback started
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ Audio playback command sent');
      
      // Try to get playback info if available
      try {
        if (SoundPlayer.getInfo) {
          const info = SoundPlayer.getInfo();
          console.log('📊 Playback info:', info);
        }
      } catch (infoError) {
        // Non-critical - just log
        console.log('⚠️ Could not get playback info (non-critical)');
      }
      
    } catch (playError: any) {
      console.error('❌ playUrl failed:', playError);
      console.error('Error details:', {
        message: playError.message,
        stack: playError.stack,
        filePath,
        fileUrl,
        platform: Platform.OS,
      });
      
      // Try alternative: Use file:// for both platforms
      try {
        console.log('🔄 Trying alternative: file:// protocol...');
        const altUrl = `file://${filePath}`;
        SoundPlayer.playUrl(altUrl);
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('✅ Alternative playback method succeeded');
      } catch (altError: any) {
        console.error('❌ Alternative playback also failed:', altError);
        // Don't throw - just log the error so the app doesn't crash
        console.warn('⚠️ Audio playback failed but continuing...');
        // You might want to show a user-friendly message here
      }
    }
    
    return Promise.resolve();
  } catch (error: any) {
    console.error('❌ Error playing Google TTS audio:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

