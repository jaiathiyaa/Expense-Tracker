import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'expense_tracker_auth_token';

// In-memory fallback if SecureStore is unavailable (e.g. web testing)
let memoryToken: string | null = null;

export const authStorage = {
  async saveToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(AUTH_TOKEN_KEY, token);
        } else {
          memoryToken = token;
        }
        return;
      }
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    } catch (error) {
      console.warn('Failed to save auth token to secure storage', error);
      memoryToken = token;
    }
  },

  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem(AUTH_TOKEN_KEY);
        }
        return memoryToken;
      }
      return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    } catch (error) {
      console.warn('Failed to read auth token from secure storage', error);
      return memoryToken;
    }
  },

  async clearToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        }
        memoryToken = null;
        return;
      }
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      memoryToken = null;
    } catch (error) {
      console.warn('Failed to clear auth token from secure storage', error);
      memoryToken = null;
    }
  },
};
