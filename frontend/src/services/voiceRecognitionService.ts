import type {
  ExpoSpeechRecognitionModule,
  ExpoSpeechRecognitionResultEvent,
  ExpoSpeechRecognitionErrorEvent,
} from 'expo-speech-recognition';

// Safely resolve Platform across React Native (Metro), Web, and Node test environments
function getPlatform(): { OS: 'ios' | 'android' | 'web' | string; select: <T>(spec: any) => T } {
  try {
    const rnName = 'react-native';
    const mod = require(rnName);
    if (mod?.Platform) return mod.Platform;
  } catch {}
  try {
    const rnwName = 'react-native-web';
    const mod = require(rnwName);
    if (mod?.Platform) return mod.Platform;
  } catch {}
  return {
    OS: typeof window !== 'undefined' ? 'web' : 'android',
    select: (spec: any) => spec.default,
  };
}

export const Platform = getPlatform();

type NativeSpeechModule = typeof ExpoSpeechRecognitionModule;

export type VoiceRecognitionStatus =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'processing'
  | 'cancelled'
  | 'error';

export interface VoiceRecognitionCallbacks {
  onStart?: () => void;
  onInterim?: (transcript: string) => void;
  onFinal: (transcript: string) => void;
  onError: (error: string) => void;
  onEnd?: () => void;
  onCancel?: () => void;
  onStatusChange?: (status: VoiceRecognitionStatus) => void;
}

export interface VoiceRecognitionOptions {
  /**
   * BCP-47 language tag (default: 'en-IN' for Indian financial terminology with English vocabulary)
   */
  lang?: string;
}

export interface EnvironmentInfo {
  platform: 'web' | 'android' | 'ios' | 'unsupported';
  isSupported: boolean;
  isExpoGo: boolean;
  implementation: 'web-speech-api' | 'expo-speech-recognition' | 'none';
  details: string;
}

/**
 * Safely retrieves the native ExpoSpeechRecognitionModule without breaking on Web or in Expo Go.
 */
let cachedNativeModule: NativeSpeechModule | null | undefined = undefined;

function getNativeSpeechModule(): NativeSpeechModule | null {
  if (Platform.OS === 'web') {
    return null;
  }
  if (cachedNativeModule !== undefined) {
    return cachedNativeModule;
  }

  try {
    // Dynamic require prevents bundle-evaluation crashes when running in standard Expo Go
    // where native binary modules are not compiled into the client.
    const mod = require('expo-speech-recognition');
    if (mod?.ExpoSpeechRecognitionModule && typeof mod.ExpoSpeechRecognitionModule.start === 'function') {
      cachedNativeModule = mod.ExpoSpeechRecognitionModule as NativeSpeechModule;
      return cachedNativeModule;
    }
  } catch {
    // Native module is not available in current binary runtime
  }

  cachedNativeModule = null;
  return null;
}

class VoiceRecognitionService {
  // Web speech recognition reference
  private webRecognition: any = null;

  // Native subscriptions tracker for expo-speech-recognition
  private nativeSubscriptions: Array<{ remove: () => void }> = [];

  // State flags
  private listening: boolean = false;
  private abortedByUser: boolean = false;
  private deliveredFinal: boolean = false;
  private currentStatus: VoiceRecognitionStatus = 'idle';

  private setStatus(status: VoiceRecognitionStatus, callbacks?: VoiceRecognitionCallbacks) {
    this.currentStatus = status;
    callbacks?.onStatusChange?.(status);
  }

  /**
   * Checks whether speech recognition can be initiated in the current environment.
   */
  public isSupported(): boolean {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return false;
      const SpeechRec =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      return !!SpeechRec;
    }

    const nativeMod = getNativeSpeechModule();
    return !!nativeMod;
  }

  /**
   * Detailed inspection of environment, platform, and speech engine capability.
   */
  public getEnvironmentInfo(): EnvironmentInfo {
    if (Platform.OS === 'web') {
      const hasWebSpeech =
        typeof window !== 'undefined' &&
        !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

      return {
        platform: 'web',
        isSupported: hasWebSpeech,
        isExpoGo: false,
        implementation: hasWebSpeech ? 'web-speech-api' : 'none',
        details: hasWebSpeech
          ? 'Browser Web Speech API is supported.'
          : 'Browser does not support Web Speech API. Use Chrome/Edge/Safari or manual text entry.',
      };
    }

    const nativeMod = getNativeSpeechModule();
    if (nativeMod) {
      return {
        platform: Platform.OS as 'android' | 'ios',
        isSupported: true,
        isExpoGo: false,
        implementation: 'expo-speech-recognition',
        details: 'Native expo-speech-recognition module is compiled and ready.',
      };
    }

    // Module not linked (standard Expo Go)
    return {
      platform: (Platform.OS as 'android' | 'ios') || 'unsupported',
      isSupported: false,
      isExpoGo: true,
      implementation: 'none',
      details:
        'Native speech recognition requires an Expo development build (npx expo run:android or npx expo run:ios). Standard Expo Go does not bundle native speech recognition.',
    };
  }

  public isListening(): boolean {
    return this.listening;
  }

  public getStatus(): VoiceRecognitionStatus {
    return this.currentStatus;
  }

  /**
   * Cleans up all active native event listener subscriptions to prevent memory leaks and duplicates.
   */
  private cleanupNativeSubscriptions(): void {
    for (const sub of this.nativeSubscriptions) {
      try {
        sub.remove();
      } catch {
        // Subscription already removed or invalidated
      }
    }
    this.nativeSubscriptions = [];
  }

  /**
   * Requests permissions asynchronously across web or native.
   */
  public async requestPermissions(): Promise<{ granted: boolean; canAskAgain?: boolean; error?: string }> {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
          return { granted: true };
        } catch (err: any) {
          return {
            granted: false,
            error: 'Microphone permission was denied in your browser settings.',
          };
        }
      }
      return { granted: true };
    }

    const nativeMod = getNativeSpeechModule();
    if (!nativeMod) {
      return {
        granted: false,
        error:
          'Native speech recognition is not available in Expo Go without a custom development build (npx expo run:android / npx expo run:ios).',
      };
    }

    try {
      const response = await nativeMod.requestPermissionsAsync();
      return {
        granted: !!response.granted,
        canAskAgain: response.canAskAgain,
      };
    } catch (err: any) {
      return {
        granted: false,
        error: err?.message || 'Failed to request speech permissions.',
      };
    }
  }

  /**
   * Starts listening for speech, delegating to the appropriate platform implementation.
   */
  public async startListening(
    callbacks: VoiceRecognitionCallbacks,
    options?: VoiceRecognitionOptions
  ): Promise<void> {
    // Stop any existing session before starting
    if (this.listening) {
      this.stopListening();
    }

    this.abortedByUser = false;
    this.deliveredFinal = false;
    const targetLang = options?.lang || 'en-IN';

    // 1. Web Platform (Browser Web Speech API)
    if (Platform.OS === 'web') {
      this.startWebListening(callbacks, targetLang);
      return;
    }

    // 2. Native Android / iOS (expo-speech-recognition)
    const nativeMod = getNativeSpeechModule();
    if (nativeMod) {
      await this.startNativeListening(nativeMod, callbacks, targetLang);
      return;
    }

    // 3. Unsupported Environment (e.g. Expo Go without development build)
    this.listening = false;
    this.setStatus('error', callbacks);
    callbacks.onError(
      'Native speech recognition requires an Expo development build (npx expo run:android or npx expo run:ios). Standard Expo Go does not bundle native speech recognition. Please use manual text entry below.'
    );
  }

  /**
   * Browser Web Speech API implementation
   */
  private startWebListening(callbacks: VoiceRecognitionCallbacks, lang: string): void {
    if (typeof window === 'undefined') {
      this.setStatus('error', callbacks);
      callbacks.onError('Window object not available for speech recognition.');
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      this.setStatus('error', callbacks);
      callbacks.onError(
        'Speech recognition is not supported in this browser. Please use Chrome, Edge, Safari, or manual text fallback below.'
      );
      return;
    }

    try {
      this.setStatus('requesting_permission', callbacks);
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang;

      let lastInterim = '';

      recognition.onstart = () => {
        if (this.abortedByUser) {
          try {
            recognition.abort();
          } catch {}
          return;
        }
        this.listening = true;
        this.setStatus('listening', callbacks);
        callbacks.onStart?.();
      };

      recognition.onresult = (event: any) => {
        if (this.abortedByUser) return;

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';
          if (item.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        if (interimTranscript && interimTranscript !== lastInterim) {
          lastInterim = interimTranscript;
          callbacks.onInterim?.(interimTranscript.trim());
        }

        if (finalTranscript && !this.deliveredFinal) {
          this.deliveredFinal = true;
          this.setStatus('processing', callbacks);
          callbacks.onFinal(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        this.listening = false;
        if (this.abortedByUser || event.error === 'aborted') {
          this.setStatus('cancelled', callbacks);
          callbacks.onCancel?.();
          return;
        }

        this.setStatus('error', callbacks);
        let message = 'Speech recognition encountered an issue.';
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          message = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
        } else if (event.error === 'no-speech') {
          message = 'No speech was detected. Please try speaking again or type below.';
        } else if (event.error === 'network') {
          message = 'Network error during speech recognition. Please check your connection.';
        } else if (event.error === 'language-not-supported') {
          message = `The language "${lang}" is not supported by your browser speech recognizer.`;
        }
        callbacks.onError(message);
      };

      recognition.onend = () => {
        this.listening = false;
        if (!this.abortedByUser && !this.deliveredFinal && lastInterim.trim()) {
          // If recognition ended before emitting isFinal, submit the last heard interim
          this.deliveredFinal = true;
          callbacks.onFinal(lastInterim.trim());
        }
        if (this.currentStatus !== 'error' && this.currentStatus !== 'cancelled') {
          this.setStatus('idle', callbacks);
        }
        callbacks.onEnd?.();
      };

      this.webRecognition = recognition;
      recognition.start();
    } catch (err: any) {
      this.listening = false;
      this.setStatus('error', callbacks);
      callbacks.onError(err?.message || 'Could not start browser speech recognition.');
    }
  }

  /**
   * Native expo-speech-recognition implementation
   */
  private async startNativeListening(
    nativeMod: NativeSpeechModule,
    callbacks: VoiceRecognitionCallbacks,
    lang: string
  ): Promise<void> {
    try {
      this.setStatus('requesting_permission', callbacks);

      // Check and request permissions
      const permResponse = await nativeMod.requestPermissionsAsync();
      if (!permResponse.granted) {
        this.listening = false;
        this.setStatus('error', callbacks);
        const errorMsg =
          permResponse.canAskAgain === false
            ? 'Microphone and speech recognition permissions are disabled. Please enable them in your device settings to record expenses.'
            : 'Microphone or speech recognition permission was denied. Please grant permission to record expenses.';
        callbacks.onError(errorMsg);
        return;
      }

      // Check device recognition service availability
      if (typeof nativeMod.isRecognitionAvailable === 'function' && !nativeMod.isRecognitionAvailable()) {
        this.listening = false;
        this.setStatus('error', callbacks);
        callbacks.onError(
          'Speech recognition service is not available on this device. Please use manual text entry below.'
        );
        return;
      }

      // Clear any stale subscriptions before attaching new ones
      this.cleanupNativeSubscriptions();

      let lastInterim = '';

      // 1. start event
      const subStart = nativeMod.addListener('start', () => {
        if (this.abortedByUser) {
          try {
            nativeMod.abort();
          } catch {}
          return;
        }
        this.listening = true;
        this.setStatus('listening', callbacks);
        callbacks.onStart?.();
      });
      this.nativeSubscriptions.push(subStart);

      // 2. result event (interim & final)
      const subResult = nativeMod.addListener('result', (event: ExpoSpeechRecognitionResultEvent) => {
        if (this.abortedByUser) return;

        const results = event.results;
        if (!results || results.length === 0) return;

        const primaryResult = results[0];
        const text = primaryResult?.transcript?.trim() || '';
        if (!text) return;

        if (event.isFinal) {
          if (!this.deliveredFinal) {
            this.deliveredFinal = true;
            this.setStatus('processing', callbacks);
            callbacks.onFinal(text);
          }
        } else {
          lastInterim = text;
          callbacks.onInterim?.(text);
        }
      });
      this.nativeSubscriptions.push(subResult);

      // 3. error event
      const subError = nativeMod.addListener('error', (event: ExpoSpeechRecognitionErrorEvent) => {
        this.listening = false;
        this.cleanupNativeSubscriptions();

        if (this.abortedByUser || event.error === 'aborted') {
          this.setStatus('cancelled', callbacks);
          callbacks.onCancel?.();
          return;
        }

        this.setStatus('error', callbacks);
        let message = 'Speech recognition error occurred.';
        switch (event.error) {
          case 'not-allowed':
            message =
              'Microphone or speech recognition permission was not granted. Please check device settings.';
            break;
          case 'no-speech':
          case 'speech-timeout':
            message = 'No speech was detected. Please try speaking again or type below.';
            break;
          case 'network':
            message = 'Network error during speech recognition. Please check your connection.';
            break;
          case 'language-not-supported':
            message = `Language "${lang}" is not supported by your device speech recognizer.`;
            break;
          case 'service-not-allowed':
            message = 'Speech recognition service is unavailable on this device.';
            break;
          case 'busy':
            message = 'Speech recognizer is busy. Please try again in a moment.';
            break;
          case 'audio-capture':
            message = 'Audio capture failed. Ensure another app is not using the microphone.';
            break;
          default:
            message = event.message || 'Speech recognition encountered an issue. Please try again.';
            break;
        }
        callbacks.onError(message);
      });
      this.nativeSubscriptions.push(subError);

      // 4. nomatch event (silence or unintelligible speech)
      const subNoMatch = nativeMod.addListener('nomatch', () => {
        if (!this.deliveredFinal && !this.abortedByUser) {
          callbacks.onError('Could not understand speech. Please speak clearly or type below.');
        }
      });
      this.nativeSubscriptions.push(subNoMatch);

      // 5. end event
      const subEnd = nativeMod.addListener('end', () => {
        this.listening = false;
        this.cleanupNativeSubscriptions();

        if (!this.abortedByUser && !this.deliveredFinal && lastInterim.trim()) {
          // Deliver last interim if recognition ended without explicit isFinal flag
          this.deliveredFinal = true;
          callbacks.onFinal(lastInterim.trim());
        }

        if (this.currentStatus !== 'error' && this.currentStatus !== 'cancelled') {
          this.setStatus('idle', callbacks);
        }
        callbacks.onEnd?.();
      });
      this.nativeSubscriptions.push(subEnd);

      // Start recognition natively
      nativeMod.start({
        lang,
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
      });
    } catch (err: any) {
      this.listening = false;
      this.cleanupNativeSubscriptions();
      this.setStatus('error', callbacks);
      callbacks.onError(err?.message || 'Failed to start native speech recognition.');
    }
  }

  /**
   * Stops listening gracefully and attempts to finalize any pending results.
   */
  public stopListening(): void {
    if (Platform.OS === 'web') {
      if (this.webRecognition) {
        try {
          this.webRecognition.stop();
        } catch {
          // Already stopped
        }
        this.webRecognition = null;
      }
    } else {
      const nativeMod = getNativeSpeechModule();
      if (nativeMod) {
        try {
          nativeMod.stop();
        } catch {
          // Already stopped
        }
      }
    }

    this.listening = false;
  }

  /**
   * Aborts listening immediately without delivering final results (e.g. on user cancellation or screen unmount).
   */
  public abortListening(): void {
    this.abortedByUser = true;

    if (Platform.OS === 'web') {
      if (this.webRecognition) {
        try {
          this.webRecognition.abort();
        } catch {
          // Ignore
        }
        this.webRecognition = null;
      }
    } else {
      const nativeMod = getNativeSpeechModule();
      if (nativeMod) {
        try {
          nativeMod.abort();
        } catch {
          // Ignore
        }
      }
      this.cleanupNativeSubscriptions();
    }

    this.listening = false;
    this.setStatus('cancelled');
  }
}

export const voiceRecognitionService = new VoiceRecognitionService();
