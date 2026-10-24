import {
  parseVoiceTranscript,
  extractAmount,
  extractDate,
  extractTitle,
  guessVoiceCategory,
} from './src/services/voiceParserService';

const TEST_VOICE_CASES = [
  {
    name: 'Standard Expense: Lunch',
    transcript: 'I spent 250 rupees on lunch today.',
    expectedType: 'EXPENSE',
    expectedAmount: 250,
    expectedTitle: 'Lunch',
    expectedCategory: 'Food & Dining',
    expectedValid: true,
  },
  {
    name: 'Yesterday Coffee Spend',
    transcript: 'Paid 120 for coffee yesterday.',
    expectedType: 'EXPENSE',
    expectedAmount: 120,
    expectedTitle: 'Coffee',
    expectedCategory: 'Food & Dining',
    expectedValid: true,
  },
  {
    name: 'Salary Income',
    transcript: 'I received 5000 rupees salary today.',
    expectedType: 'INCOME',
    expectedAmount: 5000,
    expectedTitle: 'Salary',
    expectedCategory: 'Salary',
    expectedValid: true,
  },
  {
    name: 'Petrol Travel Spend with UPI Mention',
    transcript: 'Spent 800 on petrol using UPI.',
    expectedType: 'EXPENSE',
    expectedAmount: 800,
    expectedTitle: 'Petrol',
    expectedCategory: 'Travel & Transport',
    expectedValid: true,
  },
  {
    name: 'Spoken Word Numbers (five hundred)',
    transcript: 'Spent five hundred on movie tickets.',
    expectedType: 'EXPENSE',
    expectedAmount: 500,
    expectedCategory: 'Entertainment',
    expectedValid: true,
  },
  {
    name: 'Missing Amount Case',
    transcript: 'I bought some coffee at starbucks.',
    expectedValid: false,
    expectedMissing: 'amount',
  },
  {
    name: 'Unclear / Non-financial Transcript',
    transcript: 'Hello, how are you doing today?',
    expectedValid: false,
  },
  {
    name: 'Empty Transcript',
    transcript: '   ',
    expectedValid: false,
  },
];

console.log('🧪 Starting Voice Parser Unit Tests...\n');
let passed = 0;
let total = 0;

for (const tc of TEST_VOICE_CASES) {
  total++;
  const res = parseVoiceTranscript(tc.transcript);

  let success = true;
  const errors: string[] = [];

  if (res.isValid !== tc.expectedValid) {
    success = false;
    errors.push(`Expected isValid=${tc.expectedValid}, got ${res.isValid} (${res.parseError || 'none'})`);
  }

  if (tc.expectedValid) {
    if (tc.expectedAmount !== undefined && res.amount !== tc.expectedAmount) {
      success = false;
      errors.push(`Expected amount=${tc.expectedAmount}, got ${res.amount}`);
    }
    if (tc.expectedType !== undefined && res.type !== tc.expectedType) {
      success = false;
      errors.push(`Expected type=${tc.expectedType}, got ${res.type}`);
    }
    if (tc.expectedCategory !== undefined && res.category !== tc.expectedCategory) {
      success = false;
      errors.push(`Expected category=${tc.expectedCategory}, got ${res.category}`);
    }
    if (tc.expectedTitle !== undefined && !res.title.toLowerCase().includes(tc.expectedTitle.toLowerCase())) {
      success = false;
      errors.push(`Expected title to include "${tc.expectedTitle}", got "${res.title}"`);
    }
  }

  if (tc.expectedMissing && !res.missingFields.includes(tc.expectedMissing)) {
    success = false;
    errors.push(`Expected missingFields to include "${tc.expectedMissing}", got ${res.missingFields.join(', ')}`);
  }

  if (success) {
    passed++;
    console.log(`✅ [PASS] ${tc.name}: "${res.title}" | ₹${res.amount} | ${res.type} | ${res.category} | ${res.date}`);
  } else {
    console.error(`❌ [FAIL] ${tc.name}`);
    errors.forEach((e) => console.error(`    -> ${e}`));
  }
}

// Test Date relative offset calculation
console.log('\n🧪 Testing Date Calculations...');
total++;
const yesterdayDate = extractDate('Paid yesterday');
const today = new Date();
today.setDate(today.getDate() - 1);
const expectedYDateStr = today.toISOString().split('T')[0];

if (yesterdayDate === expectedYDateStr) {
  passed++;
  console.log(`✅ [PASS] extractDate("yesterday") = ${yesterdayDate} (matches expected ${expectedYDateStr})`);
} else {
  console.error(`❌ [FAIL] extractDate("yesterday") = ${yesterdayDate}, expected ${expectedYDateStr}`);
}

console.log(`\n========================================`);
console.log(`RESULTS: ${passed}/${total} VOICE PARSER TESTS PASSED`);
console.log(`========================================\n`);

if (passed !== total) {
  process.exit(1);
}
