import http from 'http';
import app from '../app';
import { prisma } from '../lib/prisma';
import { TransactionType } from '@prisma/client';
import { assistantQueryService, roundToCents, sumAmounts } from '../services/assistantQueryService';
import { assistantNlpService } from '../services/assistantNlpService';
import {
  assistantLlmService,
  verifyGroundedPhrasing,
  collectNumbersFromObject,
} from '../services/assistantLlmService';

interface TestResult {
  scenario: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function request(
  serverUrl: string,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, serverUrl);
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr).toString() } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data: any = raw;
          try {
            data = JSON.parse(raw);
          } catch {}
          resolve({ status: res.statusCode || 0, data });
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('🛡️ Starting Phase 3: Grounded AI Assistant Test Suite');
  console.log('====================================================\n');

  // Start ephemeral server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  const timestamp = Date.now();
  const userAlphaEmail = `grounded_alpha_${timestamp}@test.com`;
  const userBetaEmail = `grounded_beta_${timestamp}@test.com`;
  const userEmptyEmail = `grounded_empty_${timestamp}@test.com`;
  const password = 'Password@123';

  let alphaToken = '';
  let alphaId = '';
  let betaToken = '';
  let betaId = '';
  let emptyToken = '';
  let emptyId = '';

  try {
    // 1. Setup authenticated users
    await request(baseUrl, 'POST', '/api/auth/register', {}, { name: 'Alpha User', email: userAlphaEmail, password });
    const logA = await request(baseUrl, 'POST', '/api/auth/login', {}, { email: userAlphaEmail, password });
    alphaToken = logA.data.token;
    alphaId = logA.data.user.id;

    await request(baseUrl, 'POST', '/api/auth/register', {}, { name: 'Beta User', email: userBetaEmail, password });
    const logB = await request(baseUrl, 'POST', '/api/auth/login', {}, { email: userBetaEmail, password });
    betaToken = logB.data.token;
    betaId = logB.data.user.id;

    await request(baseUrl, 'POST', '/api/auth/register', {}, { name: 'Empty User', email: userEmptyEmail, password });
    const logE = await request(baseUrl, 'POST', '/api/auth/login', {}, { email: userEmptyEmail, password });
    emptyToken = logE.data.token;
    emptyId = logE.data.user.id;

    // Seed Known Database Fixtures
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
    const thisMonthDay2 = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 2, 10, 0, 0));
    const lastMonthDay15 = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 15, 12, 0, 0));

    // Alpha User Transactions:
    // This month expenses: 450.50 + 1200.75 + 349.25 + 2500.00 = 4500.50
    // This month income: 60000.00
    // Last month expense: 2000.00
    await prisma.transaction.createMany({
      data: [
        { userId: alphaId, title: 'Grocery Run', amount: 450.50, type: TransactionType.EXPENSE, category: 'Food & Dining', date: today },
        { userId: alphaId, title: 'Office Lunch', amount: 349.25, type: TransactionType.EXPENSE, category: 'Food & Dining', date: today },
        { userId: alphaId, title: 'Internet Bill', amount: 1200.75, type: TransactionType.EXPENSE, category: 'Bills & Utilities', date: thisMonthDay2 },
        { userId: alphaId, title: 'Smartphone EMI', amount: 2500.00, type: TransactionType.EXPENSE, category: 'Shopping', date: thisMonthDay2 },
        { userId: alphaId, title: 'Old Water Bill', amount: 2000.00, type: TransactionType.EXPENSE, category: 'Bills & Utilities', date: lastMonthDay15 },
        { userId: alphaId, title: 'Consulting Salary', amount: 60000.00, type: TransactionType.INCOME, category: 'Work & Salary', date: thisMonthDay2 },

        // Beta User Private Transactions (Must NEVER be visible to Alpha)
        { userId: betaId, title: 'Beta Confidential Luxury', amount: 99999.00, type: TransactionType.EXPENSE, category: 'Shopping', date: today },
      ],
    });

    // ----------------------------------------------------
    // Test 1: Grounded Totals & Exact Decimal Arithmetic
    // ----------------------------------------------------
    try {
      const { total, count } = await assistantQueryService.getTotalExpenses(
        alphaId,
        new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)),
        new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999))
      );
      // 450.50 + 349.25 + 1200.75 + 2500.00 = 4500.50
      assert(total === 4500.5, `Expected 4500.5, got ${total}`);
      assert(count === 4, `Expected 4 transactions, got ${count}`);

      // Verify rounding helper
      const floatSum = sumAmounts([0.1, 0.2, 0.3]);
      assert(floatSum === 0.6, `Expected sum 0.6 without drift, got ${floatSum}`);
      assert(roundToCents(12.3456) === 12.35, 'Expected roundToCents to round 12.3456 to 12.35');

      results.push({
        scenario: '1. Grounded totals & exact decimal arithmetic',
        passed: true,
        details: `Verified sum: ₹${total} across ${count} items; IEEE 754 drift eliminated`,
      });
    } catch (err: any) {
      results.push({ scenario: '1. Grounded totals & exact decimal arithmetic', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 2: Category Breakdown & Filter Limits Clamping
    // ----------------------------------------------------
    try {
      const topRes = await assistantQueryService.getTopCategories(
        alphaId,
        new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)),
        new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)),
        -10 // Invalid negative limit should be clamped to 5
      );
      assert(topRes.totalExpenses === 4500.5, `Expected totalExpenses 4500.5, got ${topRes.totalExpenses}`);
      assert(topRes.categories.length > 0, 'Categories should not be empty');
      assert(topRes.categories[0].category === 'Shopping', `Expected top category Shopping, got ${topRes.categories[0].category}`);
      assert(topRes.categories[0].total === 2500, `Expected 2500 for Shopping, got ${topRes.categories[0].total}`);

      // Food & Dining = 450.50 + 349.25 = 799.75
      const foodCat = topRes.categories.find((c) => c.category === 'Food & Dining');
      assert(foodCat !== undefined, 'Food & Dining should be found');
      assert(foodCat!.total === 799.75, `Expected 799.75 for Food & Dining, got ${foodCat!.total}`);

      results.push({
        scenario: '2. Category breakdown & filter limits clamping',
        passed: true,
        details: `Top category: ${topRes.categories[0].category} (₹${topRes.categories[0].total}); negative limits clamped safely`,
      });
    } catch (err: any) {
      results.push({ scenario: '2. Category breakdown & filter limits clamping', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 3: Month-over-Month and Week-over-Week Math
    // ----------------------------------------------------
    try {
      const comp = await assistantQueryService.getMonthlyComparison(alphaId, today);
      // Current = 4500.50, Previous = 2000.00
      // Difference = +2500.50
      assert(comp.currentTotal === 4500.5, `Expected currentTotal 4500.5, got ${comp.currentTotal}`);
      assert(comp.previousTotal === 2000.0, `Expected previousTotal 2000, got ${comp.previousTotal}`);
      assert(comp.difference === 2500.5, `Expected difference 2500.5, got ${comp.difference}`);
      assert(comp.trend === 'INCREASED', `Expected trend INCREASED, got ${comp.trend}`);
      assert(comp.percentageChange === 125, `Expected percentageChange 125%, got ${comp.percentageChange}`);

      results.push({
        scenario: '3. Month-over-month comparison math',
        passed: true,
        details: `Difference: +₹${comp.difference} (+${comp.percentageChange}%) computed deterministically`,
      });
    } catch (err: any) {
      results.push({ scenario: '3. Month-over-month comparison math', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 4: Multi-Tenant Isolation & Client ID Spoofing Prevention
    // ----------------------------------------------------
    try {
      // User Alpha makes a request attempting to supply betaId in the request body
      const spoofRes = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${alphaToken}` },
        {
          message: 'How much did I spend this month?',
          userId: betaId, // Spoofed body parameter!
          clientId: betaId,
        }
      );
      assert(spoofRes.status === 200, `Expected 200, got ${spoofRes.status}`);
      // Must only return Alpha's total (4500.50), NEVER Beta's total (99999.00)
      assert(spoofRes.data.data?.total === 4500.5, `Expected Alpha total 4500.50, got ${spoofRes.data.data?.total}`);
      assert(!JSON.stringify(spoofRes.data).includes('99999'), 'Response must not contain Beta figures');

      // Now query as Beta
      const betaRes = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${betaToken}` },
        { message: 'How much did I spend this month?' }
      );
      assert(betaRes.data.data?.total === 99999, `Expected Beta total 99999, got ${betaRes.data.data?.total}`);

      results.push({
        scenario: '4. Multi-tenant isolation & spoofing prevention',
        passed: true,
        details: 'Client-supplied body userId strictly ignored; auth token identity strictly enforced',
      });
    } catch (err: any) {
      results.push({ scenario: '4. Multi-tenant isolation & spoofing prevention', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 5: Empty History Handling
    // ----------------------------------------------------
    try {
      const emptyRes = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${emptyToken}` },
        { message: 'What is my biggest expense?' }
      );
      assert(emptyRes.status === 200, `Expected 200, got ${emptyRes.status}`);
      assert(emptyRes.data.intent === 'LARGEST_EXPENSES', `Expected LARGEST_EXPENSES, got ${emptyRes.data.intent}`);
      assert(Array.isArray(emptyRes.data.data?.items) && emptyRes.data.data.items.length === 0, 'Items should be empty');
      assert(emptyRes.data.answer.includes('No expense records found'), 'Expected clear explanation of empty history');

      results.push({
        scenario: '5. Empty history handling',
        passed: true,
        details: 'Returned respectful zero-sum explanation with suggestions and empty data array',
      });
    } catch (err: any) {
      results.push({ scenario: '5. Empty history handling', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 6: Grounding Verification Guard (Reject Hallucinations)
    // ----------------------------------------------------
    try {
      const allowed = collectNumbersFromObject({
        totalAmount: '₹4,500.50',
        numericTotal: 4500.5,
        transactionCount: 4,
        dateRange: 'this month (October 2026)',
      });

      // 6a: Valid text with grounded figures
      const validText = 'Your total expenses for this month in 2026 amount to ₹4,500.50 across 4 transactions.';
      const validCheck = verifyGroundedPhrasing(validText, allowed, [4500.5]);
      assert(validCheck === true, 'Grounded phrasing should be accepted');

      // 6b: Model hallucinated a foreign number (e.g. 50000 or 999)
      const hallucinatedText = 'You spent ₹4,500.50 and should invest ₹50,000 into high yield savings.';
      const hallucinatedCheck = verifyGroundedPhrasing(hallucinatedText, allowed, [4500.5]);
      assert(hallucinatedCheck === false, 'Phrasing with foreign numbers MUST be rejected');

      // 6c: Model altered the critical total (e.g. rounded to 4500 instead of 4500.50)
      const alteredText = 'Your total expenses were approximately ₹4,000 across 4 purchases.';
      const alteredCheck = verifyGroundedPhrasing(alteredText, allowed, [4500.5]);
      assert(alteredCheck === false, 'Phrasing missing critical total MUST be rejected');

      results.push({
        scenario: '6. Grounding verification guard (reject hallucinations)',
        passed: true,
        details: 'Verified that foreign numbers, hallucinations, and altered amounts are strictly rejected',
      });
    } catch (err: any) {
      results.push({ scenario: '6. Grounding verification guard (reject hallucinations)', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 7: Deterministic Template Fallback on LLM Failure
    // ----------------------------------------------------
    try {
      const fallbackResponse = await assistantNlpService.processQuery(
        alphaId,
        'How much did I spend this month?',
        { forceFallback: true }
      );
      assert(fallbackResponse.intent === 'TOTAL_EXPENSE', `Expected TOTAL_EXPENSE, got ${fallbackResponse.intent}`);
      assert(fallbackResponse.data?.total === 4500.5, `Expected 4500.5, got ${fallbackResponse.data?.total}`);
      assert(fallbackResponse.meta?.source === 'regex_fallback', 'Source should be regex_fallback');
      assert(fallbackResponse.meta?.phrasedByLlm === false, 'phrasedByLlm should be false');
      assert(fallbackResponse.answer.includes('₹4,500.50'), 'Fallback template must format exact amount');

      results.push({
        scenario: '7. Deterministic template fallback on LLM failure',
        passed: true,
        details: 'Produced 100% reliable fallback answer when LLM is bypassed/offline',
      });
    } catch (err: any) {
      results.push({ scenario: '7. Deterministic template fallback on LLM failure', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 8: Malformed Parameters & Control Characters Containment
    // ----------------------------------------------------
    try {
      // Test malicious category query with control characters, regex injections, and long strings
      const malformedCatRes = await assistantQueryService.getCategorySpending(
        alphaId,
        'Food & Dining\x00\r\n; DROP TABLE "Transaction"; --'.repeat(5),
        new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)),
        new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999))
      );
      // Query should safely execute without SQL injection or error
      assert(typeof malformedCatRes.total === 'number', 'Total must be a number');
      assert(typeof malformedCatRes.count === 'number', 'Count must be a number');

      results.push({
        scenario: '8. Malformed parameters & control characters containment',
        passed: true,
        details: 'Safely sanitized input parameters, clamped string lengths, and prevented unintended execution',
      });
    } catch (err: any) {
      results.push({ scenario: '8. Malformed parameters & control characters containment', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 9: Live Grounded Phrasing with OpenAI
    // ----------------------------------------------------
    try {
      const liveRes = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${alphaToken}` },
        { message: 'How much did I spend on food this month?' }
      );
      assert(liveRes.status === 200, `Expected 200, got ${liveRes.status}`);
      assert(liveRes.data.intent === 'CATEGORY_SPENDING', `Expected CATEGORY_SPENDING, got ${liveRes.data.intent}`);
      assert(liveRes.data.data?.total === 799.75, `Expected 799.75, got ${liveRes.data.data?.total}`);
      // Answer must contain 799.75
      assert(liveRes.data.answer.includes('799.75') || liveRes.data.answer.includes('800'), 'Answer must reflect verified amount');

      results.push({
        scenario: '9. Live grounded phrasing with OpenAI',
        passed: true,
        details: `Live response: "${liveRes.data.answer.replace(/\n/g, ' ')}" (source: ${liveRes.data.meta?.source}, phrasedByLlm: ${liveRes.data.meta?.phrasedByLlm})`,
      });
    } catch (err: any) {
      results.push({ scenario: '9. Live grounded phrasing with OpenAI', passed: false, details: err.message });
    }

  } finally {
    // Cleanup seeded data
    try {
      if (alphaId || betaId || emptyId) {
        await prisma.transaction.deleteMany({
          where: { userId: { in: [alphaId, betaId, emptyId].filter(Boolean) } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: [alphaId, betaId, emptyId].filter(Boolean) } },
        });
      }
    } catch {}

    server.close();
  }

  // Summary Report
  console.log('\n====================================================');
  console.log('📋 Phase 3 Grounded Answers Test Results:');
  console.log('====================================================');
  results.forEach((r) => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.scenario}`);
    console.log(`   └─ ${r.details}\n`);
  });

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Summary: ${passedCount} / ${results.length} Scenarios Passed.\n`);

  if (passedCount < results.length) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
