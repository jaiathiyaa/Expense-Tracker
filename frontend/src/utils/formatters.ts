export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)', locale: 'en-IN' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar ($)', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro (€)', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound (£)', locale: 'en-GB' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$)', locale: 'en-CA' },
  AUD: { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar (AU$)', locale: 'en-AU' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)', locale: 'ja-JP' },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)', locale: 'en-AE' },
};

let activeCurrencyCode = 'INR';

export const setActiveCurrencyCode = (code: string) => {
  if (SUPPORTED_CURRENCIES[code]) {
    activeCurrencyCode = code;
  }
};

export const getActiveCurrencyCode = (): string => {
  return activeCurrencyCode;
};

export const getActiveCurrencyInfo = (): CurrencyInfo => {
  return SUPPORTED_CURRENCIES[activeCurrencyCode] || SUPPORTED_CURRENCIES.INR;
};

/**
 * Formats a number with the configured or specified currency.
 * Automatically handles Indian numbering system for INR and international grouping for others.
 */
export const formatCurrency = (
  amount: number,
  showSign: boolean = false,
  customCurrencyCode?: string
): string => {
  const code = customCurrencyCode || activeCurrencyCode;
  const curr = SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.INR;

  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${curr.symbol}0.00`;
  }

  const isNegative = amount < 0;
  const absVal = Math.abs(amount).toFixed(code === 'JPY' ? 0 : 2);
  const [intPart, decPart] = absVal.split('.');

  let formattedInt = '';

  if (code === 'INR') {
    // Indian numbering format (Lakhs, Crores)
    let lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    if (otherNumbers !== '') {
      lastThree = ',' + lastThree;
    }
    formattedInt =
      otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  } else {
    // Standard thousands grouping
    formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const sign = isNegative ? '-' : showSign ? '+' : '';
  const decimal = decPart ? `.${decPart}` : '';

  return `${sign}${curr.symbol}${formattedInt}${decimal}`;
};

/**
 * Formats a number into the currently active display currency format.
 * (Maintains complete backwards compatibility with all existing calls throughout the codebase)
 */
export const formatINR = (amount: number, showSign: boolean = false): string => {
  return formatCurrency(amount, showSign);
};

/**
 * Returns a time-of-day greeting (Good morning, Good afternoon, Good evening)
 */
export const getTimeOfDayGreeting = (): { greeting: string; emoji: string } => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { greeting: 'Good morning', emoji: '☀️' };
  } else if (hour >= 12 && hour < 17) {
    return { greeting: 'Good afternoon', emoji: '🌤️' };
  } else if (hour >= 17 && hour < 21) {
    return { greeting: 'Good evening', emoji: '🌆' };
  } else {
    return { greeting: 'Good night', emoji: '🌙' };
  }
};

/**
 * Formats a transaction date into a readable string (e.g. "Today", "Yesterday", "Oct 15, 2026")
 */
export const formatTransactionDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    const formattedTime = date.toLocaleTimeString('en-IN', timeOptions);

    if (isToday) {
      return `Today, ${formattedTime}`;
    }
    if (isYesterday) {
      return `Yesterday, ${formattedTime}`;
    }

    const dateOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };
    return `${date.toLocaleDateString('en-IN', dateOptions)}, ${formattedTime}`;
  } catch {
    return dateString;
  }
};
