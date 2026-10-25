import { Platform } from 'react-native';

// For Android emulator: 10.0.2.2 points to host machine
// For iOS simulator: localhost points to host machine
// For physical devices on the same Wi-Fi: use the local LAN IP
const DEFAULT_HOST = Platform.select({
  android: '10.0.2.2',
  ios: 'localhost',
  default: 'localhost',
});

// Current local machine Wi-Fi LAN IP (convenient for physical testing)
export const LAN_HOST = '192.168.43.167';

export const API_PORT = 3000;

const getBaseHost = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    return window.location.hostname || 'localhost';
  }
  return LAN_HOST || DEFAULT_HOST;
};

// In production release builds, use deployed HTTPS backend if configured via EXPO_PUBLIC_API_URL
const PROD_API_URL = process.env.EXPO_PUBLIC_API_URL;

export const API_CONFIG = {
  BASE_URL: PROD_API_URL || `http://${getBaseHost()}:${API_PORT}/api`,
  TIMEOUT_MS: 15000,
  ENDPOINTS: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    ME: '/auth/me',
    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
    DELETE_ACCOUNT: '/auth/account',
    EXPORT_TRANSACTIONS: '/transactions/export',
    ASSISTANT_CHAT: '/assistant/chat',
    ASSISTANT_RESET: '/assistant/reset',
  },
};
