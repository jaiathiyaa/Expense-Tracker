import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  CurrencyInfo,
  SUPPORTED_CURRENCIES,
  setActiveCurrencyCode,
  formatCurrency,
} from '../utils/formatters';
import { applyThemeMode } from '../theme';
import { settingsStorage } from '../services/settingsStorage';
import { transactionService } from '../services/transactionService';
import { useAuth } from './AuthContext';
import { Platform, Alert, Appearance } from 'react-native';

interface SettingsContextType {
  currency: string;
  currencyInfo: CurrencyInfo;
  setCurrency: (code: string) => Promise<void>;
  appearance: 'light' | 'dark' | 'system';
  isDark: boolean;
  setAppearance: (mode: 'light' | 'dark' | 'system') => Promise<void>;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  formatAmount: (amount: number, showSign?: boolean) => string;
  exportTransactions: () => Promise<{ success: boolean; rowCount?: number }>;
  isExporting: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [currency, setCurrencyState] = useState<string>('INR');
  const [appearance, setAppearanceState] = useState<'light' | 'dark' | 'system'>('light');
  const [systemColorScheme, setSystemColorScheme] = useState<'light' | 'dark'>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
  );
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const isDark =
    appearance === 'dark' || (appearance === 'system' && systemColorScheme === 'dark');

  // Apply theme mode whenever isDark changes
  useEffect(() => {
    applyThemeMode(isDark ? 'dark' : 'light');
  }, [isDark]);

  // Listen to system color scheme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => subscription.remove();
  }, []);

  // Load persisted settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedCurrency = await settingsStorage.getCurrency();
        if (SUPPORTED_CURRENCIES[storedCurrency]) {
          setCurrencyState(storedCurrency);
          setActiveCurrencyCode(storedCurrency);
        }

        const storedAppearance = await settingsStorage.getAppearance();
        setAppearanceState(storedAppearance);

        const storedNotifications = await settingsStorage.getNotificationsEnabled();
        setNotificationsEnabledState(storedNotifications);
      } catch (err) {
        console.warn('Failed to load initial settings:', err);
      }
    };

    loadSettings();
  }, []);

  const setCurrency = async (code: string) => {
    if (SUPPORTED_CURRENCIES[code]) {
      setCurrencyState(code);
      setActiveCurrencyCode(code);
      await settingsStorage.saveCurrency(code);
    }
  };

  const setAppearance = async (mode: 'light' | 'dark' | 'system') => {
    setAppearanceState(mode);
    await settingsStorage.saveAppearance(mode);
  };

  const setNotificationsEnabled = async (enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    await settingsStorage.saveNotificationsEnabled(enabled);
  };

  const formatAmount = (amount: number, showSign: boolean = false): string => {
    return formatCurrency(amount, showSign, currency);
  };

  const exportTransactions = async (): Promise<{ success: boolean; rowCount?: number }> => {
    if (!token) {
      throw new Error('Authentication required to export transactions.');
    }

    try {
      setIsExporting(true);
      const csvText = await transactionService.exportTransactionsCsv(token);
      const lines = csvText.trim().split('\n');
      const rowCount = Math.max(0, lines.length - 1);

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        const dateStr = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `expense_tracker_transactions_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }

      return { success: true, rowCount };
    } catch (err: any) {
      console.error('Error during transaction export:', err);
      throw err;
    } finally {
      setIsExporting(false);
    }
  };

  const currencyInfo = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.INR;

  return (
    <SettingsContext.Provider
      value={{
        currency,
        currencyInfo,
        setCurrency,
        appearance,
        isDark,
        setAppearance,
        notificationsEnabled,
        setNotificationsEnabled,
        formatAmount,
        exportTransactions,
        isExporting,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
