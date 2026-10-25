/**
 * Automated Test Suite for Voice Recognition Service & Voice Parsing Flow
 * Phase 1: Native Speech-to-Text Integration
 */

import {
  voiceRecognitionService,
  VoiceRecognitionCallbacks,
  Platform,
} from './src/services/voiceRecognitionService';
import { parseVoiceTranscript } from './src/services/voiceParserService';

console.log('🧪 Starting Voice Recognition Service Automated Tests...\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function runTests() {
  const originalPlatform = Platform.OS;

  // ==========================================
  // Test 1: Service Lifecycle & State
  // ==========================================
  console.log('--- Test Suite 1: Service Lifecycle & State ---');

  assert(
    typeof voiceRecognitionService.isSupported === 'function',
    'isSupported method exists'
  );

  assert(
    typeof voiceRecognitionService.getEnvironmentInfo === 'function',
    'getEnvironmentInfo method exists'
  );

  assert(
    voiceRecognitionService.isListening() === false,
    'Initial state is not listening'
  );

  assert(
    voiceRecognitionService.getStatus() === 'idle',
    'Initial status is idle'
  );

  // ==========================================
  // Test 2: Native Expo Go Fallback Handling
  // ==========================================
  console.log('\n--- Test Suite 2: Native Expo Go Detection & Error Guidance ---');

  // Set platform to android without native module compiled
  Platform.OS = 'android';

  const envAndroid = voiceRecognitionService.getEnvironmentInfo();
  assert(
    envAndroid.platform === 'android' && envAndroid.isExpoGo === true,
    'getEnvironmentInfo detects Expo Go when native speech module is not compiled in binary'
  );

  assert(
    voiceRecognitionService.isSupported() === false,
    'isSupported returns false in Expo Go without development build'
  );

  let expoGoReportedError = '';
  await voiceRecognitionService.startListening({
    onFinal: () => {},
    onError: (err) => {
      expoGoReportedError = err;
    },
  });

  assert(
    expoGoReportedError.length > 0,
    'startListening in Expo Go triggers onError callback',
    expoGoReportedError
  );

  assert(
    expoGoReportedError.toLowerCase().includes('development build') &&
    expoGoReportedError.toLowerCase().includes('expo go'),
    'Error message specifically clarifies requirement for development build over Expo Go'
  );

  assert(
    voiceRecognitionService.isListening() === false,
    'Service resets listening state after error in Expo Go'
  );

  // ==========================================
  // Test 3: Web Speech API Simulation
  // ==========================================
  console.log('\n--- Test Suite 3: Web Speech API Simulation ---');

  Platform.OS = 'web';

  // Test web when SpeechRecognition is not available in browser
  (globalThis as any).window = {}; // window with no SpeechRecognition
  assert(
    voiceRecognitionService.isSupported() === false,
    'Web isSupported returns false if browser lacks Web Speech API'
  );

  let browserUnsupportedError = '';
  await voiceRecognitionService.startListening({
    onFinal: () => {},
    onError: (err) => {
      browserUnsupportedError = err;
    },
  });

  assert(
    browserUnsupportedError.toLowerCase().includes('browser') ||
    browserUnsupportedError.toLowerCase().includes('chrome'),
    'Web unsupported browser returns clear error and manual text fallback prompt'
  );

  // Now mock window.SpeechRecognition
  let mockRecognitionInstance: any = null;
  class MockSpeechRecognition {
    continuous = false;
    interimResults = false;
    lang = '';
    onstart: (() => void) | null = null;
    onresult: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    onend: (() => void) | null = null;

    constructor() {
      mockRecognitionInstance = this;
    }

    start() {
      setTimeout(() => this.onstart?.(), 10);
    }
    stop() {
      setTimeout(() => this.onend?.(), 10);
    }
    abort() {
      setTimeout(() => {
        this.onerror?.({ error: 'aborted' });
        this.onend?.();
      }, 10);
    }
  }

  (globalThis as any).window.SpeechRecognition = MockSpeechRecognition;

  assert(
    voiceRecognitionService.isSupported() === true,
    'Web isSupported returns true when window.SpeechRecognition is available'
  );

  const webEnv = voiceRecognitionService.getEnvironmentInfo();
  assert(
    webEnv.platform === 'web' && webEnv.implementation === 'web-speech-api',
    'getEnvironmentInfo reports web platform with web-speech-api'
  );

  // Test Web Speech Recognition Flow (Interim -> Final)
  let webStarted = false;
  let webInterim = '';
  let webFinal = '';
  let webFinalCallCount = 0;

  await voiceRecognitionService.startListening({
    onStart: () => {
      webStarted = true;
    },
    onInterim: (text) => {
      webInterim = text;
    },
    onFinal: (text) => {
      webFinal = text;
      webFinalCallCount++;
    },
    onError: (err) => {
      console.error('Unexpected error in web test:', err);
    },
  });

  await new Promise((r) => setTimeout(r, 25));
  assert(webStarted, 'Web speech recognition onStart fired');
  assert(voiceRecognitionService.isListening(), 'Service reports isListening() = true while active');

  // Simulate interim result
  mockRecognitionInstance.onresult({
    resultIndex: 0,
    results: [
      [{ transcript: 'Spent 300 on' }],
    ],
  });

  assert(webInterim === 'Spent 300 on', 'Interim transcript received correctly', webInterim);

  // Simulate final result
  const finalItem: any = [{ transcript: 'Spent 300 on lunch today' }];
  finalItem.isFinal = true;
  mockRecognitionInstance.onresult({
    resultIndex: 0,
    results: [finalItem],
  });

  assert(
    webFinal === 'Spent 300 on lunch today',
    'Final transcript received correctly',
    webFinal
  );

  // Simulate end
  mockRecognitionInstance.onend();
  assert(
    voiceRecognitionService.isListening() === false,
    'Service resets isListening() to false after onend'
  );

  assert(
    webFinalCallCount === 1,
    'Duplicate final callbacks prevented on web (onFinal called exactly once)'
  );

  // Test Web Permission Denial Error
  let permissionError = '';
  await voiceRecognitionService.startListening({
    onFinal: () => {},
    onError: (err) => {
      permissionError = err;
    },
  });
  await new Promise((r) => setTimeout(r, 25));
  mockRecognitionInstance.onerror({ error: 'not-allowed' });

  assert(
    permissionError.toLowerCase().includes('permission') &&
    permissionError.toLowerCase().includes('denied'),
    'Web permission denial is converted into user guidance',
    permissionError
  );

  // Test Web Cancellation without Final Delivery
  let cancelledFinalCalled = false;
  await voiceRecognitionService.startListening({
    onFinal: () => {
      cancelledFinalCalled = true;
    },
    onError: () => {},
  });
  await new Promise((r) => setTimeout(r, 25));
  voiceRecognitionService.abortListening();
  await new Promise((r) => setTimeout(r, 25));

  assert(
    cancelledFinalCalled === false,
    'Web cancelling / aborting DOES NOT deliver a final transcript'
  );

  assert(
    voiceRecognitionService.isListening() === false,
    'Web cancelling resets isListening() to false'
  );

  // ==========================================
  // Test 4: End-to-End Voice Parsing with Extracted Speech
  // ==========================================
  console.log('\n--- Test Suite 4: End-to-End Transcript to Transaction Parsing ---');

  const testSpeechTranscripts = [
    {
      speech: 'Spent 300 on groceries today',
      expectedAmount: 300,
      expectedType: 'EXPENSE',
      expectedCategory: 'Food & Dining',
      expectedTitle: 'Groceries',
    },
    {
      speech: 'I paid 1500 electricity bill yesterday',
      expectedAmount: 1500,
      expectedType: 'EXPENSE',
      expectedCategory: 'Bills & Utilities',
      expectedTitle: 'Electricity Bill',
    },
    {
      speech: 'Received 25000 freelance client payment today',
      expectedAmount: 25000,
      expectedType: 'INCOME',
      expectedCategory: 'Freelance',
      expectedTitle: 'Freelance Client Payment',
    },
    {
      speech: 'Paid 850 for petrol using Google Pay',
      expectedAmount: 850,
      expectedType: 'EXPENSE',
      expectedCategory: 'Travel & Transport',
      expectedTitle: 'Petrol',
    },
  ];

  for (const tc of testSpeechTranscripts) {
    const parsed = parseVoiceTranscript(tc.speech);
    assert(
      parsed.isValid &&
      parsed.amount === tc.expectedAmount &&
      parsed.type === tc.expectedType &&
      parsed.category === tc.expectedCategory,
      `End-to-End parsing: "${tc.speech}" -> ₹${parsed.amount} | ${parsed.type} | ${parsed.category}`,
      `Got: amount=${parsed.amount}, type=${parsed.type}, category=${parsed.category}`
    );
  }

  // Restore environment
  delete (globalThis as any).window;
  Platform.OS = originalPlatform;

  console.log(`\n==============================================`);
  console.log(`RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log(`==============================================\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
