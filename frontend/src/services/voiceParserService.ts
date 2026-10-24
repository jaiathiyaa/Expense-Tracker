import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/categories';

export interface ParsedVoiceTransaction {
  rawTranscript: string;
  title: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  category: string;
  date: string; // YYYY-MM-DD
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  isValid: boolean;
  missingFields: string[];
  parseError?: string;
}

// Category keyword mappings for voice speech
const VOICE_CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': [
    'lunch',
    'dinner',
    'breakfast',
    'brunch',
    'snack',
    'snacks',
    'coffee',
    'tea',
    'chai',
    'food',
    'restaurant',
    'cafe',
    'swiggy',
    'zomato',
    'pizza',
    'burger',
    'biryani',
    'drinks',
    'meal',
    'groceries',
    'grocery',
    'vegetables',
    'fruits',
    'milk',
  ],
  'Travel & Transport': [
    'petrol',
    'diesel',
    'fuel',
    'uber',
    'ola',
    'rapido',
    'cab',
    'taxi',
    'auto',
    'rickshaw',
    'bus',
    'train',
    'metro',
    'flight',
    'airfare',
    'train ticket',
    'bus ticket',
    'flight ticket',
    'toll',
    'fastag',
    'parking',
    'travel',
  ],
  Shopping: [
    'amazon',
    'flipkart',
    'myntra',
    'clothes',
    'clothing',
    'shoes',
    'shopping',
    'shirt',
    'pants',
    'dress',
    'electronics',
    'mobile',
    'phone',
    'gadget',
    'mall',
    'market',
    'dmart',
    'supermarket',
    'store',
  ],
  'Bills & Utilities': [
    'electricity',
    'water',
    'gas',
    'cylinder',
    'internet',
    'wifi',
    'broadband',
    'bill',
    'bills',
    'recharge',
    'airtel',
    'jio',
    'mobile recharge',
    'phone bill',
    'dth',
    'current bill',
  ],
  Entertainment: [
    'movie',
    'movies',
    'cinema',
    'pvr',
    'netflix',
    'spotify',
    'prime',
    'hotstar',
    'game',
    'gaming',
    'concert',
    'show',
    'outing',
  ],
  'Health & Medical': [
    'medicine',
    'medicines',
    'medical',
    'pharmacy',
    'doctor',
    'hospital',
    'clinic',
    'tablets',
    'dentist',
    'therapy',
    'lab test',
    'apollo',
    '1mg',
  ],
  'Housing & Rent': [
    'rent',
    'house rent',
    'room rent',
    'maintenance',
    'flat',
    'apartment',
    'society maintenance',
  ],
  Education: [
    'course',
    'tuition',
    'books',
    'book',
    'school',
    'college',
    'fees',
    'class',
    'exam',
    'udemy',
    'coursera',
  ],
  'Personal Care': [
    'haircut',
    'salon',
    'spa',
    'gym',
    'fitness',
    'cosmetics',
    'skincare',
    'barber',
  ],
};

const VOICE_INCOME_KEYWORDS: Record<string, string[]> = {
  Salary: ['salary', 'payroll', 'stipend', 'wages', 'paycheck'],
  Freelance: ['freelance', 'client', 'consulting', 'project', 'gig'],
  Investments: ['dividend', 'interest', 'stocks', 'returns', 'crypto', 'profit'],
  'Gifts & Grants': ['gift', 'cashback', 'reward', 'bonus', 'prize'],
  Other: ['refund', 'reversal', 'received', 'got back'],
};

/**
 * Predicts category from title and spoken transcript
 */
export function guessVoiceCategory(text: string, type: 'EXPENSE' | 'INCOME'): string {
  const lower = text.toLowerCase();

  if (type === 'INCOME') {
    for (const [category, keywords] of Object.entries(VOICE_INCOME_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        return category;
      }
    }
    return INCOME_CATEGORIES[0]?.name || 'Salary';
  }

  for (const [category, keywords] of Object.entries(VOICE_CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }

  return EXPENSE_CATEGORIES[0]?.name || 'Food & Dining';
}

/**
 * Converts word-based numbers like "two hundred", "five thousand" into numbers
 */
function parseWordsToNumber(text: string): number | null {
  const smallMap: Record<string, number> = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    sixty: 60,
    seventy: 70,
    eighty: 80,
    ninety: 90,
  };

  const scaleMap: Record<string, number> = {
    hundred: 100,
    thousand: 1000,
    lakh: 100000,
    lac: 100000,
    crore: 10000000,
  };

  const words = text.toLowerCase().split(/\s+/);
  let total = 0;
  let current = 0;
  let foundAny = false;

  for (const w of words) {
    if (smallMap[w] !== undefined) {
      current += smallMap[w];
      foundAny = true;
    } else if (scaleMap[w] !== undefined) {
      current = (current === 0 ? 1 : current) * scaleMap[w];
      if (w === 'thousand' || w === 'lakh' || w === 'lac' || w === 'crore') {
        total += current;
        current = 0;
      }
      foundAny = true;
    }
  }

  total += current;
  return foundAny && total > 0 ? total : null;
}

/**
 * Extracts amount from spoken sentence
 */
export function extractAmount(text: string): number | null {
  const lower = text.toLowerCase();

  // Pattern A: standard digits e.g. "250 rupees", "rs 1200", "50.50", "₹500", "rupees 1000"
  const digitRegexes = [
    /(?:rs\.?|inr|₹|rupees?|bucks?)\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /([0-9]+(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|₹|rupees?|bucks?)/i,
    /\b([0-9]+(?:\.[0-9]{1,2})?)\b/,
  ];

  for (const regex of digitRegexes) {
    const match = lower.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0) {
        return val;
      }
    }
  }

  // Pattern B: words-based e.g. "two hundred fifty rupees", "five thousand"
  const wordVal = parseWordsToNumber(lower);
  if (wordVal !== null) {
    return wordVal;
  }

  return null;
}

/**
 * Extracts date from voice text (today, yesterday, specific dates)
 */
export function extractDate(text: string): string {
  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes('yesterday')) {
    now.setDate(now.getDate() - 1);
    return now.toISOString().split('T')[0];
  }

  if (lower.includes('day before yesterday')) {
    now.setDate(now.getDate() - 2);
    return now.toISOString().split('T')[0];
  }

  // Day of week check (e.g. "on monday", "last friday")
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(days[i])) {
      const currentDay = now.getDay();
      let diff = currentDay - i;
      if (diff <= 0) diff += 7; // look back to previous occurrence
      now.setDate(now.getDate() - diff);
      return now.toISOString().split('T')[0];
    }
  }

  // Fallback to today
  return now.toISOString().split('T')[0];
}

/**
 * Extracts clean Title / Merchant by stripping conversational filler words
 */
export function extractTitle(text: string, type: 'EXPENSE' | 'INCOME', amountVal: number | null): string {
  let cleaned = text.toLowerCase();

  // Strip digits of the amount if present
  if (amountVal !== null) {
    cleaned = cleaned.replace(new RegExp(`\\b${amountVal}\\b`, 'g'), '');
  }

  // Strip conversational noise and financial action keywords
  const noiseWords = [
    'i spent',
    'i payed',
    'i paid',
    'i received',
    'i got',
    'i earned',
    'spent',
    'spend',
    'paid',
    'pay',
    'received',
    'receive',
    'earned',
    'bought',
    'gave',
    'cost',
    'rupees',
    'rupee',
    'bucks',
    'inr',
    'rs',
    '₹',
    'today',
    'yesterday',
    'day before yesterday',
    'using upi',
    'using card',
    'using cash',
    'via upi',
    'via card',
    'on upi',
    'in cash',
    'amount of',
    'amount',
    'towards',
    'for the',
    'for my',
    'for a',
    'for an',
    'on the',
    'on a',
    'on my',
    'at the',
    'at a',
    'from my',
    'to my',
    'for',
    'on',
    'at',
    'to',
    'by',
    'of',
    'in',
    'the',
    'a',
    'an',
    'my',
    'please add',
    'add',
    'log',
    'note',
    'record',
  ];

  for (const word of noiseWords) {
    cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), ' ');
  }

  // Strip trailing punctuation and excessive whitespaces
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s&'-]/g, ' ').replace(/\s+/g, ' ').trim();

  if (!cleaned) {
    return type === 'INCOME' ? 'Income' : 'Expense';
  }

  // Capitalize properly
  const formatted = cleaned
    .split(' ')
    .filter(Boolean)
    .slice(0, 4) // keep first 4 keywords (e.g. "Lunch", "Coffee", "Petrol", "Grocery Shopping")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return formatted || (type === 'INCOME' ? 'Income' : 'Expense');
}

/**
 * Main parser entry point: converts a spoken voice transcript into a proposed transaction
 */
export function parseVoiceTranscript(transcript: string): ParsedVoiceTransaction {
  const text = (transcript || '').trim();
  const missingFields: string[] = [];

  if (!text) {
    return {
      rawTranscript: '',
      title: '',
      amount: 0,
      type: 'EXPENSE',
      category: EXPENSE_CATEGORIES[0].name,
      date: new Date().toISOString().split('T')[0],
      confidence: 'LOW',
      isValid: false,
      missingFields: ['amount', 'title'],
      parseError: 'Transcript is empty. Please speak or type your transaction.',
    };
  }

  const lower = text.toLowerCase();

  // 1. Transaction Type Detection
  const incomeTriggers = [
    'received',
    'receive',
    'got',
    'earned',
    'earn',
    'salary',
    'credited',
    'credit',
    'deposited',
    'deposit',
    'refund',
    'cashback',
    'bonus',
    'dividend',
    'stipend',
  ];

  const isIncome = incomeTriggers.some((t) => lower.includes(t)) && !lower.includes('spent') && !lower.includes('paid');
  const type: 'EXPENSE' | 'INCOME' = isIncome ? 'INCOME' : 'EXPENSE';

  // 2. Amount Extraction
  const amount = extractAmount(text);
  if (amount === null || amount <= 0) {
    missingFields.push('amount');
  }

  // 3. Date Extraction
  const date = extractDate(text);

  // 4. Title / Merchant Extraction
  const title = extractTitle(text, type, amount);
  if (!title || title === 'Expense' || title === 'Income') {
    missingFields.push('title');
  }

  // 5. Category Guessing
  const category = guessVoiceCategory(`${title} ${text}`, type);

  // 6. Confidence Scoring
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  if (amount !== null && amount > 0 && title && title !== 'Expense' && title !== 'Income') {
    confidence = 'HIGH';
  } else if (missingFields.length > 0) {
    confidence = 'LOW';
  }

  const isValid = amount !== null && amount > 0 && title.length > 0;

  return {
    rawTranscript: text,
    title: title || (type === 'INCOME' ? 'Received Funds' : 'Expense'),
    amount: amount || 0,
    type,
    category,
    date,
    confidence,
    isValid,
    missingFields,
    parseError: !isValid
      ? `Missing required details: ${missingFields.join(', ')}. Please review or type below.`
      : undefined,
  };
}
