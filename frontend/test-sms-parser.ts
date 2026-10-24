import {
  parseSingleSms,
  parseBatchSms,
  flagDuplicates,
  guessCategory,
} from './src/services/smsParserService';

const TEST_MESSAGES = [
  {
    name: 'HDFC Debit to Swiggy',
    sms: 'Alert: Rs.450.00 debited from HDFC Bank A/c **1234 on 23-OCT-26 to SWIGGY. Info: UPI/329482. Avl Bal Rs 24,000.',
    expectedType: 'EXPENSE',
    expectedAmount: 450.0,
    expectedCategory: 'Food & Dining',
    expectedValid: true,
  },
  {
    name: 'SBI Debit to Amazon',
    sms: 'Dear SBI User, your A/c ending 4321 debited by Rs 1200.00 on 23-Oct-2026 transfer to Amazon. Ref: 239048.',
    expectedType: 'EXPENSE',
    expectedAmount: 1200.0,
    expectedCategory: 'Shopping',
    expectedValid: true,
  },
  {
    name: 'ICICI Dining via UPI',
    sms: 'Acct XX789 debited for Rs 350.00 on 23-Oct-26. Info: UPI/Zomato/zomato@icici. Available Bal: Rs 15,400.00',
    expectedType: 'EXPENSE',
    expectedAmount: 350.0,
    expectedCategory: 'Food & Dining',
    expectedValid: true,
  },
  {
    name: 'Axis Bank Card Spend at Starbucks',
    sms: 'Rs 620.00 spent on Axis Bank Card ending 9012 at STARBUCKS on 23-10-2026. Avl Lmt Rs 75,000.',
    expectedType: 'EXPENSE',
    expectedAmount: 620.0,
    expectedCategory: 'Food & Dining',
    expectedValid: true,
  },
  {
    name: 'Generic UPI Payment to Chai Point',
    sms: 'Paid Rs. 150 to Chai Point using UPI ref 2394820938.',
    expectedType: 'EXPENSE',
    expectedAmount: 150.0,
    expectedCategory: 'Food & Dining',
    expectedValid: true,
  },
  {
    name: 'Uber Transport Spend',
    sms: 'Rs 280.00 debited from your account towards Uber India on 23-10-2026. UPI Ref 892301.',
    expectedType: 'EXPENSE',
    expectedAmount: 280.0,
    expectedCategory: 'Travel & Transport',
    expectedValid: true,
  },
  {
    name: 'Salary Credit',
    sms: 'Your A/c **1234 is credited with Rs 45,000.00 on 23-OCT-26 by Salary/TRANSFER.',
    expectedType: 'INCOME',
    expectedAmount: 45000.0,
    expectedCategory: 'Salary',
    expectedValid: true,
  },
  {
    name: 'Zomato Refund Credit',
    sms: 'Refund of Rs 299.00 credited to your A/c **4321 on 23-OCT-26 from Zomato. Ref: 893201.',
    expectedType: 'INCOME',
    expectedAmount: 299.0,
    expectedCategory: 'Other',
    expectedValid: true,
  },
  {
    name: 'OTP Message (should be invalid/ignored)',
    sms: 'Your One Time Password (OTP) for transaction is 482901. Valid for 10 mins. Do not share.',
    expectedValid: false,
  },
  {
    name: 'Invalid / Empty Message',
    sms: '   ',
    expectedValid: false,
  },
];

console.log('🧪 Starting SMS Parser Unit Tests...\n');
let passed = 0;
let total = 0;

for (const t of TEST_MESSAGES) {
  total++;
  const res = parseSingleSms(t.sms);

  let success = true;
  const errors: string[] = [];

  if (res.isValid !== t.expectedValid) {
    success = false;
    errors.push(`Expected isValid=${t.expectedValid}, got ${res.isValid} (${res.parseError || 'none'})`);
  }

  if (t.expectedValid) {
    if (t.expectedAmount !== undefined && res.amount !== t.expectedAmount) {
      success = false;
      errors.push(`Expected amount=${t.expectedAmount}, got ${res.amount}`);
    }
    if (t.expectedType !== undefined && res.type !== t.expectedType) {
      success = false;
      errors.push(`Expected type=${t.expectedType}, got ${res.type}`);
    }
    if (t.expectedCategory !== undefined && res.category !== t.expectedCategory) {
      success = false;
      errors.push(`Expected category=${t.expectedCategory}, got ${res.category}`);
    }
  }

  if (success) {
    passed++;
    console.log(`✅ [PASS] ${t.name}: ${res.title} | ₹${res.amount} | ${res.type} | ${res.category} | ${res.date}`);
  } else {
    console.error(`❌ [FAIL] ${t.name}`);
    errors.forEach((e) => console.error(`    -> ${e}`));
  }
}

// Test Batch SMS parsing
console.log('\n🧪 Testing Batch SMS Parsing...');
total++;
const batchText = `
Alert: Rs.450.00 debited from HDFC Bank A/c **1234 on 23-OCT-26 to SWIGGY. Info: UPI/329482.

Dear SBI User, your A/c ending 4321 debited by Rs 1200.00 on 23-Oct-2026 transfer to Amazon. Ref: 239048.
`;
const batchResults = parseBatchSms(batchText);
if (batchResults.length === 2 && batchResults[0].amount === 450 && batchResults[1].amount === 1200) {
  passed++;
  console.log(`✅ [PASS] Batch parsed ${batchResults.length} transactions successfully.`);
} else {
  console.error(`❌ [FAIL] Batch SMS parse returned ${batchResults.length} items`);
}

// Test Duplicate Detection
console.log('\n🧪 Testing Duplicate Detection...');
total++;
const existingMockTransactions = [
  {
    title: 'Swiggy',
    amount: 450.0,
    type: 'EXPENSE',
    date: '2026-10-23',
  },
];
const flagged = flagDuplicates(batchResults, existingMockTransactions);
if (flagged[0].isLikelyDuplicate === true && flagged[1].isLikelyDuplicate === false) {
  passed++;
  console.log('✅ [PASS] Duplicate correctly flagged for Swiggy (450), and Amazon (1200) marked new.');
} else {
  console.error('❌ [FAIL] Duplicate flagging failed:', flagged.map((f) => ({ title: f.title, dup: f.isLikelyDuplicate })));
}

console.log(`\n========================================`);
console.log(`RESULTS: ${passed}/${total} TESTS PASSED`);
console.log(`========================================\n`);

if (passed !== total) {
  process.exit(1);
}
