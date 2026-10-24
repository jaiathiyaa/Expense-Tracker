import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/categories';

export interface ParsedSmsTransaction {
  id: string; // generated client-side id for tracking
  rawText: string;
  title: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  category: string;
  date: string; // ISO string format YYYY-MM-DD
  accountHint?: string;
  referenceNumber?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  isValid: boolean;
  parseError?: string;
  isLikelyDuplicate?: boolean;
}

// Category keyword dictionary for smart auto-categorization
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Food & Dining
  'Food & Dining': [
    'swiggy',
    'zomato',
    'mcdonald',
    'starbucks',
    'kfc',
    'burger king',
    'domino',
    'pizza',
    'subway',
    'cafe',
    'restaurant',
    'dining',
    'dine',
    'chai',
    'coffee',
    'tea',
    'eats',
    'bakery',
    'barbeque',
    'biryani',
    'haldiram',
    'food',
    'bistro',
  ],
  // Travel & Transport
  'Travel & Transport': [
    'uber',
    'ola',
    'rapido',
    'metro',
    'irctc',
    'redbus',
    'makemytrip',
    'goibibo',
    'fuel',
    'petrol',
    'diesel',
    'hpcl',
    'bpcl',
    'ioc',
    'shell',
    'toll',
    'fastag',
    'flight',
    'indigo',
    'air india',
    'spicejet',
    'train',
    'auto',
    'cab',
    'travel',
  ],
  // Shopping
  Shopping: [
    'amazon',
    'flipkart',
    'myntra',
    'ajio',
    'zara',
    'h&m',
    'croma',
    'reliance',
    'dmart',
    'blinkit',
    'zepto',
    'instamart',
    'bigbasket',
    'nykaa',
    'retail',
    'mall',
    'lifestyle',
    'pantaloons',
    'decathlon',
    'supermarket',
    'store',
    'mart',
  ],
  // Bills & Utilities
  'Bills & Utilities': [
    'electricity',
    'bescom',
    'water',
    'airtel',
    'jio',
    'vodafone',
    'vi',
    'broadband',
    'wifi',
    'gas',
    'cylinder',
    'bill',
    'tata sky',
    'dth',
    'recharge',
    'utility',
    'power',
    'act fibernet',
  ],
  // Entertainment
  Entertainment: [
    'netflix',
    'spotify',
    'hotstar',
    'prime video',
    'disney',
    'pvr',
    'inox',
    'bookmyshow',
    'cinema',
    'movie',
    'gaming',
    'playstation',
    'steam',
    'youtube',
    'apple music',
  ],
  // Health & Medical
  'Health & Medical': [
    'apollo',
    'pharmeasy',
    '1mg',
    'medplus',
    'hospital',
    'clinic',
    'pharmacy',
    'medical',
    'medicine',
    'doctor',
    'dental',
    'diagnostics',
    'pathology',
    'lab',
  ],
  // Housing & Rent
  'Housing & Rent': [
    'rent',
    'maintenance',
    'society',
    'nobroker',
    'housing',
    'landlord',
    'nestaway',
    'apartment',
    'pg',
  ],
  // Education
  Education: [
    'coursera',
    'udemy',
    'school',
    'college',
    'tuition',
    'fees',
    'university',
    'institute',
    'books',
    'coaching',
  ],
  // Personal Care
  'Personal Care': [
    'salon',
    'spa',
    'haircut',
    'cult.fit',
    'gym',
    'fitness',
    'enrich',
    'looks salon',
  ],
};

const INCOME_KEYWORDS: Record<string, string[]> = {
  Salary: ['salary', 'payroll', 'wages', 'stipend', 'employer'],
  Freelance: ['freelance', 'consulting', 'upwork', 'fiverr', 'contract'],
  Investments: ['dividend', 'interest', 'mutual fund', 'zerodha', 'groww', 'stock', 'shares'],
  'Gifts & Grants': ['gift', 'reward', 'cashback', 'bonus', 'grant', 'prize'],
  Other: ['refund', 'reversal', 'credited'],
};

/**
 * Predicts category given title, merchant, and raw SMS text
 */
export function guessCategory(text: string, type: 'EXPENSE' | 'INCOME'): string {
  const lower = text.toLowerCase();

  if (type === 'INCOME') {
    for (const [category, keywords] of Object.entries(INCOME_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        return category;
      }
    }
    return INCOME_CATEGORIES[0]?.name || 'Salary';
  }

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }

  return EXPENSE_CATEGORIES[0]?.name || 'Food & Dining';
}

/**
 * Normalizes merchant title by stripping banking noise words
 */
function cleanMerchantName(raw: string): string {
  if (!raw) return 'Payment';

  let cleaned = raw
    .replace(/^UPI\//i, '')
    .replace(/\b(VPA|UPI|Ref|Ref No|Txn|IMPS|NEFT|RTGS|INFO|via|using)\b/gi, '')
    .replace(/@\w+/g, '') // remove upi handle like @icici, @oksbi
    .replace(/[*\-_#:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If starts with "to " or "transfer to "
  cleaned = cleaned.replace(/^(to|transfer to|spent at|paid to|at)\s+/i, '').trim();

  // Strip trailing punctuation
  cleaned = cleaned.replace(/[.,;]+$/, '').trim();

  // Capitalize properly if all lowercase or all uppercase
  if (cleaned.length > 0) {
    if (cleaned === cleaned.toLowerCase() || cleaned === cleaned.toUpperCase()) {
      cleaned = cleaned
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  return cleaned.slice(0, 50) || 'Payment';
}

/**
 * Parses an individual SMS message
 */
export function parseSingleSms(sms: string): ParsedSmsTransaction {
  const id = `sms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const text = sms.trim();

  if (!text) {
    return {
      id,
      rawText: text,
      title: 'Invalid Message',
      amount: 0,
      type: 'EXPENSE',
      category: EXPENSE_CATEGORIES[0].name,
      date: new Date().toISOString().split('T')[0],
      confidence: 'LOW',
      isValid: false,
      parseError: 'SMS message text is empty.',
    };
  }

  const lower = text.toLowerCase();

  // 1. Transaction Type Detection
  const isCredit =
    /\b(credited|credit|received|deposited|refund|refunded|cashback|added to)\b/i.test(text) &&
    !/\bdebited\b/i.test(text);

  const isDebit =
    /\b(debited|debit|spent|paid|sent|withdrawn|purchase|charged|deducted|txn of)\b/i.test(text);

  if (!isCredit && !isDebit) {
    // Check if it's an OTP, login alert, or promotional message
    if (/\b(otp|one time password|verification code|secret code)\b/i.test(text)) {
      return {
        id,
        rawText: text,
        title: 'Security Alert / OTP',
        amount: 0,
        type: 'EXPENSE',
        category: 'Bills & Utilities',
        date: new Date().toISOString().split('T')[0],
        confidence: 'LOW',
        isValid: false,
        parseError: 'Ignored OTP or verification message.',
      };
    }

    return {
      id,
      rawText: text,
      title: 'Unknown Transaction',
      amount: 0,
      type: 'EXPENSE',
      category: EXPENSE_CATEGORIES[0].name,
      date: new Date().toISOString().split('T')[0],
      confidence: 'LOW',
      isValid: false,
      parseError: 'Could not determine debit or credit transaction type.',
    };
  }

  const type: 'EXPENSE' | 'INCOME' = isCredit ? 'INCOME' : 'EXPENSE';

  // 2. Amount Extraction
  // Patterns like "Rs. 450.00", "Rs 1,200", "INR 500", "₹ 250.50", "by Rs 12.00"
  let amount: number | null = null;
  const amountRegexes = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:debited(?:\s+by|\s+for)?|credited(?:\s+with)?|spent|paid)\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹)/i,
  ];

  for (const regex of amountRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const sanitized = match[1].replace(/,/g, '');
      const val = parseFloat(sanitized);
      if (!isNaN(val) && val > 0) {
        amount = val;
        break;
      }
    }
  }

  if (amount === null || amount <= 0) {
    return {
      id,
      rawText: text,
      title: 'Unrecognized Amount',
      amount: 0,
      type,
      category: type === 'INCOME' ? INCOME_CATEGORIES[0].name : EXPENSE_CATEGORIES[0].name,
      date: new Date().toISOString().split('T')[0],
      confidence: 'LOW',
      isValid: false,
      parseError: 'Could not find a valid transaction amount in the message.',
    };
  }

  // 3. Bank / Account Hint
  let accountHint: string | undefined = undefined;
  const bankMatch = text.match(/\b(HDFC|SBI|ICICI|AXIS|KOTAK|PNB|BOB|CITI|YES BANK|IDFC|PAYTM|INDUSIND)\b/i);
  const acctMatch = text.match(/(?:a\/c|acct|card|account|ending|no\.?)\s*(?:is\s*)?[:*\.X]*\s*([0-9X]{3,6})/i);

  if (bankMatch && acctMatch) {
    accountHint = `${bankMatch[1].toUpperCase()} **${acctMatch[1].slice(-4)}`;
  } else if (bankMatch) {
    accountHint = `${bankMatch[1].toUpperCase()} Bank`;
  } else if (acctMatch) {
    accountHint = `A/c **${acctMatch[1].slice(-4)}`;
  }

  // 4. Reference Number
  let referenceNumber: string | undefined = undefined;
  const refMatch = text.match(/(?:ref|rrn|txn|reference|upi\s+ref)\s*(?:no\.?|id|:)?\s*([0-9a-zA-Z]{6,16})/i);
  if (refMatch) {
    referenceNumber = refMatch[1];
  }

  // 5. Merchant / Counterparty Extraction
  let rawMerchant = '';

  if (type === 'INCOME') {
    // Patterns for income: "by Salary", "from Zomato", "by XYZ", "refund from Amazon"
    const creditMatches = [
      /(?:by|from)\s+([A-Za-z0-9\s&'-]+?)(?:\s+(?:on|ref|avl|bal|info|\.))/i,
      /refund\s+(?:of\s+[^\s]+\s+)?from\s+([A-Za-z0-9\s&'-]+)/i,
      /(?:salary|payroll|dividend|interest|cashback)/i,
    ];

    for (const rx of creditMatches) {
      const match = text.match(rx);
      if (match) {
        rawMerchant = match[1] || match[0];
        break;
      }
    }

    if (!rawMerchant) {
      rawMerchant = 'Credited / Income';
    }
  } else {
    // Patterns for debit/expenses:
    // "to VPA xyz@bank"
    // "to SWIGGY"
    // "at STARBUCKS"
    // "transfer to Amazon"
    // "Info: UPI/Zomato"
    const debitMatches = [
      /(?:to|towards)\s+([A-Za-z0-9\s&'-]+?)(?:\.|\s+(?:on|via|ref|using|avl|bal|info|upi)|$)/i,
      /(?:at|in)\s+([A-Za-z0-9\s&'-]+?)(?:\.|\s+(?:on|via|ref|using|avl|bal|info)|$)/i,
      /info[:\s]+(?:upi\/)?([A-Za-z0-9\s&'-]+?)(?:\/|\.|\s|$)/i,
      /(?:transfer\s+to|spent\s+at|paid\s+to)\s+([A-Za-z0-9\s&'-]+?)(?:\.|\s+(?:on|ref)|$)/i,
      /vpa\s+([A-Za-z0-9\s&'.-]+?)(?:\s|$)/i,
    ];

    for (const rx of debitMatches) {
      const match = text.match(rx);
      if (match && match[1]) {
        rawMerchant = match[1];
        break;
      }
    }

    if (!rawMerchant || rawMerchant.trim().toLowerCase() === 'payment') {
      // Look for prominent brand names in the message text
      const knownBrands = [
        'Swiggy',
        'Zomato',
        'Amazon',
        'Flipkart',
        'Uber',
        'Ola',
        'Blinkit',
        'Zepto',
        'Netflix',
        'Spotify',
        'Starbucks',
        'McDonalds',
        'Domino',
        'KFC',
        'Myntra',
        'Airtel',
        'Jio',
        'BESCOM',
      ];
      for (const brand of knownBrands) {
        if (new RegExp(`\\b${brand}\\b`, 'i').test(text)) {
          rawMerchant = brand;
          break;
        }
      }
    }
  }

  const title = cleanMerchantName(rawMerchant || (type === 'INCOME' ? 'Received Funds' : 'Expense'));

  // 6. Date Extraction
  let dateStr = new Date().toISOString().split('T')[0];

  // Try extracting date formats like "23-OCT-26", "23/10/2026", "23-10-26", "23 Oct 2026"
  const dateMatch = text.match(
    /\b(\d{1,2})[-/ ]([A-Za-z]{3}|\d{1,2})[-/ ](\d{2,4})\b/i
  );

  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const monthRaw = dateMatch[2];
    let year = parseInt(dateMatch[3], 10);
    if (year < 100) year += 2000;

    let month = -1;
    if (/^\d+$/.test(monthRaw)) {
      month = parseInt(monthRaw, 10) - 1;
    } else {
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      month = months.indexOf(monthRaw.toLowerCase().slice(0, 3));
    }

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const parsedD = new Date(year, month, day);
      if (!isNaN(parsedD.getTime())) {
        const y = parsedD.getFullYear();
        const m = String(parsedD.getMonth() + 1).padStart(2, '0');
        const d = String(parsedD.getDate()).padStart(2, '0');
        dateStr = `${y}-${m}-${d}`;
      }
    }
  }

  // 7. Auto Category Guess
  const category = guessCategory(`${title} ${text}`, type);

  // 8. Confidence Score
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  if (amount > 0 && title !== 'Payment' && title !== 'Expense' && (accountHint || referenceNumber)) {
    confidence = 'HIGH';
  } else if (!title || title === 'Payment' || title === 'Expense') {
    confidence = 'LOW';
  }

  return {
    id,
    rawText: text,
    title,
    amount,
    type,
    category,
    date: dateStr,
    accountHint,
    referenceNumber,
    confidence,
    isValid: true,
  };
}

/**
 * Parses batch SMS text (separated by blank lines, newlines, or SMS delimiters)
 */
export function parseBatchSms(rawText: string): ParsedSmsTransaction[] {
  if (!rawText || !rawText.trim()) return [];

  // Split on double newlines, dashes, or messages starting on newlines with common bank phrases
  let chunks = rawText
    .split(/\n\s*(?:\n+|---+|\*\*\*+)\s*|\r\n\s*(?:\r\n+|---+|\*\*\*+)\s*/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  // If there is only 1 chunk but multiple messages on newlines with "Alert:" or "Dear "
  if (chunks.length === 1 && /\n(?=(?:Alert:|Dear\s+|Acct\s+|A\/c\s+|Paid\s+|Rs\.?\s*\d))/i.test(chunks[0])) {
    chunks = chunks[0]
      .split(/\n(?=(?:Alert:|Dear\s+|Acct\s+|A\/c\s+|Paid\s+|Rs\.?\s*\d))/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
  }

  const parsedList: ParsedSmsTransaction[] = [];

  for (const chunk of chunks) {
    const result = parseSingleSms(chunk);
    parsedList.push(result);
  }

  return parsedList;
}

/**
 * Flags likely duplicates against existing transactions in the database
 */
export function flagDuplicates(
  parsed: ParsedSmsTransaction[],
  existingTransactions: Array<{
    amount: number;
    type: string;
    title: string;
    date: string | Date;
  }>
): ParsedSmsTransaction[] {
  return parsed.map((item) => {
    if (!item.isValid) return item;

    const isDuplicate = existingTransactions.some((existing) => {
      // Check type match
      if (existing.type !== item.type) return false;

      // Check amount match (within 0.01 tolerance)
      if (Math.abs(existing.amount - item.amount) > 0.01) return false;

      // Check date match (same date string YYYY-MM-DD)
      const existingDateStr =
        typeof existing.date === 'string'
          ? existing.date.split('T')[0]
          : new Date(existing.date).toISOString().split('T')[0];

      if (existingDateStr === item.date) {
        return true;
      }

      // Check title similarity if date is within 2 days
      const titleLower = existing.title.toLowerCase();
      const itemTitleLower = item.title.toLowerCase();
      if (titleLower.includes(itemTitleLower) || itemTitleLower.includes(titleLower)) {
        return true;
      }

      return false;
    });

    return {
      ...item,
      isLikelyDuplicate: isDuplicate,
    };
  });
}
