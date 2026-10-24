import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  CURRENCY: 'expense_tracker_currency',
  APPEARANCE: 'expense_tracker_appearance',
  NOTIFICATIONS: 'expense_tracker_notifications',
};

// Memory fallback for environments where SecureStore isn't available
const memoryStore: Record<string, string> = {
  [STORAGE_KEYS.CURRENCY]: 'INR',
  [STORAGE_KEYS.APPEARANCE]: 'light',
  [STORAGE_KEYS.NOTIFICATIONS]: 'true',
};

async function getItem(key: string, defaultValue: string): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(key);
        return val !== null ? val : defaultValue;
      }
      return memoryStore[key] || defaultValue;
    }
    const val = await SecureStore.getItemAsync(key);
    return val !== null ? val : defaultValue;
  } catch (err) {
    console.warn(`Failed to read ${key} from storage:`, err);
    return memoryStore[key] || defaultValue;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  try {
    memoryStore[key] = value;
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    console.warn(`Failed to save ${key} to storage:`, err);
  }
}

export const settingsStorage = {
  async getCurrency(): Promise<string> {
    return getItem(STORAGE_KEYS.CURRENCY, 'INR');
  },

  async saveCurrency(currency: string): Promise<void> {
    return setItem(STORAGE_KEYS.CURRENCY, currency);
  },

  async getAppearance(): Promise<'light' | 'dark' | 'system'> {
    const val = await getItem(STORAGE_KEYS.APPEARANCE, 'light');
    if (val === 'dark' || val === 'system') return val;
    return 'light';
  },

  async saveAppearance(mode: 'light' | 'dark' | 'system'): Promise<void> {
    return setItem(STORAGE_KEYS.APPEARANCE, mode);
  },

  async getNotificationsEnabled(): Promise<boolean> {
    const val = await getItem(STORAGE_KEYS.NOTIFICATIONS, 'true');
    return val !== 'false';
  },

  async saveNotificationsEnabled(enabled: boolean): Promise<void> {
    return setItem(STORAGE_KEYS.NOTIFICATIONS, enabled ? 'true' : 'false');
  },
};
