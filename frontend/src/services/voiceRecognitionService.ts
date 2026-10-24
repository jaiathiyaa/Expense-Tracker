import { Platform } from 'react-native';

export interface VoiceRecognitionCallbacks {
  onStart?: () => void;
  onInterim?: (transcript: string) => void;
  onFinal: (transcript: string) => void;
  onError: (error: string) => void;
  onEnd?: () => void;
}

class VoiceRecognitionService {
  private recognition: any = null;
  private listening: boolean = false;

  public isSupported(): boolean {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRec =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      return !!SpeechRec;
    }
    // On native Expo Go, external native modules are not bundled by default
    return false;
  }

  public isListening(): boolean {
    return this.listening;
  }

  public startListening(callbacks: VoiceRecognitionCallbacks): void {
    if (this.listening) {
      this.stopListening();
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRec =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRec) {
        callbacks.onError(
          'Speech recognition is not supported in this browser. Please use the manual text fallback below.'
        );
        return;
      }

      try {
        const recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // optimized for Indian financial terms, English fallback

        let finalTranscript = '';

        recognition.onstart = () => {
          this.listening = true;
          callbacks.onStart?.();
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (interimTranscript) {
            callbacks.onInterim?.(interimTranscript);
          }
          if (finalTranscript) {
            callbacks.onFinal(finalTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          this.listening = false;
          let message = 'Speech recognition encountered an issue.';
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            message = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
          } else if (event.error === 'no-speech') {
            message = 'No speech was detected. Please try again or type below.';
          } else if (event.error === 'network') {
            message = 'Network error during speech recognition. Please check connection.';
          }
          callbacks.onError(message);
        };

        recognition.onend = () => {
          this.listening = false;
          callbacks.onEnd?.();
        };

        this.recognition = recognition;
        recognition.start();
      } catch (err: any) {
        this.listening = false;
        callbacks.onError(err.message || 'Could not start speech recognition.');
      }
    } else {
      callbacks.onError(
        'Native speech recognition is not available in Expo Go without a custom native development build. Please type or use your mobile keyboard dictation below.'
      );
    }
  }

  public stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore if already stopped
      }
      this.recognition = null;
    }
    this.listening = false;
  }

  public abortListening(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    this.listening = false;
  }
}

export const voiceRecognitionService = new VoiceRecognitionService();
