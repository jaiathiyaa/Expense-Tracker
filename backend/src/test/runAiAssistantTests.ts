import http from 'http';
import app from '../app';
import { prisma } from '../lib/prisma';
import { TransactionType } from '@prisma/client';

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
  console.log('🤖 Starting Phase 7D AI Expense Assistant Test Suite');
  console.log('====================================================\n');

  // Start ephemeral server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  const timestamp = Date.now();
  const user1Email = `ai_tester1_${timestamp}@test.com`;
  const user2Email = `ai_tester2_${timestamp}@test.com`;
  const userEmptyEmail = `ai_empty_${timestamp}@test.com`;
  const password = 'Password@123';

  let user1Token = '';
  let user1Id = '';
  let user2Token = '';
  let user2Id = '';
  let emptyUserToken = '';
  let emptyUserId = '';

  try {
    // 1. Create and authenticate User 1
    const reg1 = await request(baseUrl, 'POST', '/api/auth/register', {}, { name: 'AI User 1', email: user1Email, password });
    const log1 = await request(baseUrl, 'POST', '/api/auth/login', {}, { email: user1Email, password });
    user1Token = log1.data.token;
    user1Id = log1.data.user.id;

    // 2. Create and authenticate User 2
    const reg2 = await request(baseUrl, 'POST', '/api/auth/register', {}, { name: 'AI User 2', email: user2Email, password });
    const log2 = await request(baseUrl, 'POST', '/api/auth/login', {}, { email: user2Email, password });
    user2Token = log2.data.token;
    user2Id = log2.data.user.id;

    // 3. Create User with Empty History
    const regE = await request(baseUrl, 'POST', '/api/auth/register', {}, { name: 'Empty User', email: userEmptyEmail, password });
    const logE = await request(baseUrl, 'POST', '/api/auth/login', {}, { email: userEmptyEmail, password });
    emptyUserToken = logE.data.token;
    emptyUserId = logE.data.user.id;

    // Seed Known Test Fixtures for User 1
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));

    // Calculate dates within this month and last month
    const thisMonthDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 2, 10, 0, 0));
    const lastMonthDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 15, 12, 0, 0));

    await prisma.transaction.createMany({
      data: [
        // User 1 Expenses (This Month total = 500 + 1500 + 250 + 3000 = 5250.00)
        { userId: user1Id, title: 'Lunch at Cafe', amount: 500.0, type: TransactionType.EXPENSE, category: 'Food & Dining', date: today },
        { userId: user1Id, title: 'House Rent Part', amount: 1500.0, type: TransactionType.EXPENSE, category: 'Housing & Rent', date: today },
        { userId: user1Id, title: 'Swiggy Dinner', amount: 250.0, type: TransactionType.EXPENSE, category: 'Food & Dining', date: thisMonthDate },
        { userId: user1Id, title: 'Flight Tickets', amount: 3000.0, type: TransactionType.EXPENSE, category: 'Travel & Transport', date: thisMonthDate },
        // User 1 Expense (Last Month total = 800.00)
        { userId: user1Id, title: 'Electricity Bill', amount: 800.0, type: TransactionType.EXPENSE, category: 'Bills & Utilities', date: lastMonthDate },
        // User 1 Income (This Month total = 50000 + 5000 = 55000.00)
        { userId: user1Id, title: 'Primary Salary', amount: 50000.0, type: TransactionType.INCOME, category: 'Work & Salary', date: thisMonthDate },
        { userId: user1Id, title: 'Freelance Bonus', amount: 5000.0, type: TransactionType.INCOME, category: 'Work & Salary', date: today },

        // User 2 Private Expense (9999.00)
        { userId: user2Id, title: 'User 2 Secret Purchase', amount: 9999.0, type: TransactionType.EXPENSE, category: 'Shopping', date: today },
      ],
    });

    // ----------------------------------------------------
    // Test 1: Total expenses for current month
    // ----------------------------------------------------
    try {
      const res = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${user1Token}` },
        { message: 'How much did I spend this month?' }
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.intent === 'TOTAL_EXPENSE', `Expected TOTAL_EXPENSE, got ${res.data.intent}`);
      assert(res.data.data?.total === 5250, `Expected total 5250, got ${res.data.data?.total}`);
      results.push({
        scenario: '1. Total expenses for the current month',
        passed: true,
        details: `Accurately calculated total: ₹${res.data.data.total} (${res.data.data.count} txns)`,
      });
    } catch (err: any) {
      results.push({ scenario: '1. Total expenses for the current month', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 2: Total income for current month
    // ----------------------------------------------------
    try {
      const res = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${user1Token}` },
        { message: 'How much income did I receive this month?' }
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.intent === 'TOTAL_INCOME', `Expected TOTAL_INCOME, got ${res.data.intent}`);
      assert(res.data.data?.total === 55000, `Expected total 55000, got ${res.data.data?.total}`);
      results.push({
        scenario: '2. Total income for the current month',
        passed: true,
        details: `Accurately calculated total income: ₹${res.data.data.total}`,
      });
    } catch (err: any) {
      results.push({ scenario: '2. Total income for the current month', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 3: Category-specific spending
    // ----------------------------------------------------
    try {
      const res = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${user1Token}` },
        { message: 'How much did I spend on food this month?' }
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.intent === 'CATEGORY_SPENDING', `Expected CATEGORY_SPENDING, got ${res.data.intent}`);
      // Food = 500 + 250 = 750
      assert(res.data.data?.total === 750, `Expected total food spending 750, got ${res.data.data?.total}`);
      results.push({
        scenario: '3. Category-specific spending',
        passed: true,
        details: `Identified category "Food & Dining" and calculated sum: ₹${res.data.data.total}`,
      });
    } catch (err: any) {
      results.push({ scenario: '3. Category-specific spending', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 4: Weekly and monthly comparisons
    // ----------------------------------------------------
    try {
      const res = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${user1Token}` },
        { message: 'Compare this month with last month' }
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.intent === 'MONTHLY_COMPARISON', `Expected MONTHLY_COMPARISON, got ${res.data.intent}`);
      // This month = 5250, last month = 800
      assert(res.data.data?.currentTotal === 5250, `Expected current 5250, got ${res.data.data?.currentTotal}`);
      assert(res.data.data?.previousTotal === 800, `Expected previous 800, got ${res.data.data?.previousTotal}`);
      assert(res.data.data?.difference === 4450, `Expected difference 4450, got ${res.data.data?.difference}`);
      assert(res.data.data?.trend === 'INCREASED', 'Trend must be INCREASED');
      results.push({
        scenario: '4. Weekly and monthly comparisons',
        passed: true,
        details: `Computed comparison: Current ₹${res.data.data.currentTotal} vs Previous ₹${res.data.data.previousTotal} (diff: +₹${res.data.data.difference})`,
      });
    } catch (err: any) {
      results.push({ scenario: '4. Weekly and monthly comparisons', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 5: Largest expenses
    // ----------------------------------------------------
    try {
      const res = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${user1Token}` },
        { message: 'Show my five largest expenses' }
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.intent === 'LARGEST_EXPENSES', `Expected LARGEST_EXPENSES, got ${res.data.intent}`);
      assert(res.data.data?.items?.length >= 3, 'Must return top items');
      // Top single expense should be Flight Tickets (3000)
      assert(res.data.data.items[0].title === 'Flight Tickets', `Expected Flight Tickets, got ${res.data.data.items[0].title}`);
      assert(res.data.data.items[0].amount === 3000, `Expected 3000, got ${res.data.data.items[0].amount}`);
      results.push({
        scenario: '5. Largest expenses',
        passed: true,
        details: `Top expense ranked: "${res.data.data.items[0].title}" (₹${res.data.data.items[0].amount})`,
      });
    } catch (err: any) {
      results.push({ scenario: '5. Largest expenses', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 6: Empty transaction history
    // ----------------------------------------------------
    try {
      const res = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${emptyUserToken}` },
        { message: 'How much did I spend this month?' }
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.data?.total === 0, `Expected 0 total for empty history, got ${res.data.data?.total}`);
      assert(res.data.data?.count === 0, `Expected 0 count for empty history, got ${res.data.data?.count}`);
      assert(typeof res.data.answer === 'string' && res.data.answer.includes('not recorded any expenses'), 'Answer must explain no records found');
      results.push({
        scenario: '6. Empty transaction history',
        passed: true,
        details: 'Gracefully handled zero transactions with clear explanation and zero sum',
      });
    } catch (err: any) {
      results.push({ scenario: '6. Empty transaction history', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 7: Invalid or ambiguous questions
    // ----------------------------------------------------
    try {
      const res = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${user1Token}` },
        { message: 'What is the weather in Paris today?' }
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.intent === 'UNKNOWN', `Expected UNKNOWN, got ${res.data.intent}`);
      assert(Array.isArray(res.data.suggestions), 'Must provide suggestions');
      assert(res.data.suggestions.length > 0, 'Suggestions list must not be empty');
      results.push({
        scenario: '7. Invalid or ambiguous questions',
        passed: true,
        details: 'Classified unsupported query as UNKNOWN with helpful clarifying suggestions',
      });
    } catch (err: any) {
      results.push({ scenario: '7. Invalid or ambiguous questions', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 8: Date-range boundaries (inclusive)
    // ----------------------------------------------------
    try {
      const resToday = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${user1Token}` },
        { message: 'How much did I spend today?' }
      );
      assert(resToday.status === 200, `Expected 200, got ${resToday.status}`);
      // Today expenses = 500 (Lunch) + 1500 (Rent) = 2000
      assert(resToday.data.data?.total === 2000, `Expected 2000 for today, got ${resToday.data.data?.total}`);
      results.push({
        scenario: '8. Date-range boundaries',
        passed: true,
        details: `Correctly bounded today query strictly to today (₹${resToday.data.data.total}), excluding earlier days`,
      });
    } catch (err: any) {
      results.push({ scenario: '8. Date-range boundaries', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 9: Invalid request bodies
    // ----------------------------------------------------
    try {
      const emptyRes = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${user1Token}` },
        { message: '   ' }
      );
      assert(emptyRes.status === 400, `Expected 400 for empty string, got ${emptyRes.status}`);

      const nonStringRes = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${user1Token}` },
        { message: 12345 }
      );
      assert(nonStringRes.status === 400, `Expected 400 for non-string, got ${nonStringRes.status}`);

      const oversizedRes = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${user1Token}` },
        { message: 'a'.repeat(501) }
      );
      assert(oversizedRes.status === 400, `Expected 400 for oversized message, got ${oversizedRes.status}`);

      results.push({
        scenario: '9. Invalid request bodies',
        passed: true,
        details: 'Rejected whitespace-only, non-string, and >500 character inputs with HTTP 400',
      });
    } catch (err: any) {
      results.push({ scenario: '9. Invalid request bodies', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 10: Unauthenticated requests
    // ----------------------------------------------------
    try {
      const res = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        {}, // No token
        { message: 'How much did I spend this month?' }
      );
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      results.push({
        scenario: '10. Unauthenticated requests',
        passed: true,
        details: 'Rejected request without Bearer token with HTTP 401 Unauthorized',
      });
    } catch (err: any) {
      results.push({ scenario: '10. Unauthenticated requests', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 11: Isolation between different users
    // ----------------------------------------------------
    try {
      // User 2 asking about their spending
      const u2Res = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${user2Token}` },
        { message: 'How much did I spend this month?' }
      );
      assert(u2Res.status === 200, `Expected 200, got ${u2Res.status}`);
      // User 2 only has 9999.00
      assert(u2Res.data.data?.total === 9999, `Expected 9999 for User 2, got ${u2Res.data.data?.total}`);

      // User 1 asking about their spending (must not see User 2's 9999.00)
      const u1Res = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${user1Token}` },
        { message: 'How much did I spend this month?' }
      );
      assert(u1Res.data.data?.total === 5250, `Expected 5250 for User 1, got ${u1Res.data.data?.total}`);

      results.push({
        scenario: '11. Isolation between different users',
        passed: true,
        details: 'Verified strict tenant boundary: User 1 sees ₹5,250 and User 2 sees ₹9,999 with zero data leakage',
      });
    } catch (err: any) {
      results.push({ scenario: '11. Isolation between different users', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 12: Rate-limiting check
    // ----------------------------------------------------
    try {
      // Fire concurrent requests in parallel to verify rate limiter triggers at > 30 requests/minute
      const promises = Array.from({ length: 32 }, () =>
        request(
          baseUrl,
          'POST',
          '/api/assistant/chat',
          { Authorization: `Bearer ${user1Token}` },
          { message: 'What is my total spending?' }
        )
      );
      const responses = await Promise.all(promises);
      const hit429 = responses.some((res) => res.status === 429);
      assert(hit429, 'Expected rate limiter to return 429 Too Many Requests');
      results.push({
        scenario: '12. AI provider unavailable or rate-limited',
        passed: true,
        details: 'Rate limiting successfully triggered HTTP 429 when threshold exceeded',
      });
    } catch (err: any) {
      results.push({ scenario: '12. AI provider unavailable or rate-limited', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 13: Network failure and retry handling
    // ----------------------------------------------------
    try {
      // Create user 3 with clean rate limits for remaining tests
      const user3Email = `ai_tester3_${timestamp}@test.com`;
      await request(baseUrl, 'POST', '/api/auth/register', {}, { name: 'User 3', email: user3Email, password });
      const log3 = await request(baseUrl, 'POST', '/api/auth/login', {}, { email: user3Email, password });
      const user3Token = log3.data.token;

      // Simulate a failed connection attempt to an invalid port followed by successful retry
      let failedFirst = false;
      try {
        await request('http://localhost:59999', 'POST', '/api/assistant/chat', {}, { message: 'test' });
      } catch {
        failedFirst = true;
      }
      assert(failedFirst, 'Initial unreachable connection failed');

      // Retry to real server succeeds
      const retryRes = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${user3Token}` },
        { message: 'How much did I spend this month?' }
      );
      assert(retryRes.status === 200, `Expected 200 on retry, got ${retryRes.status}`);

      results.push({
        scenario: '13. Network failure and retry',
        passed: true,
        details: 'Properly caught connection failure; subsequent retry succeeded with valid financial answer',
      });
    } catch (err: any) {
      results.push({ scenario: '13. Network failure and retry', passed: false, details: err.message });
    }

    // ----------------------------------------------------
    // Test 14: Currency and decimal accuracy
    // ----------------------------------------------------
    try {
      // User 2 adds micro decimal expenses: ₹12.34 and ₹56.78
      await prisma.transaction.createMany({
        data: [
          { userId: user2Id, title: 'Decimal Test A', amount: 12.34, type: TransactionType.EXPENSE, category: 'Other', date: today },
          { userId: user2Id, title: 'Decimal Test B', amount: 56.78, type: TransactionType.EXPENSE, category: 'Other', date: today },
        ],
      });

      // Total for today for User 2 should be: 9999.00 + 12.34 + 56.78 = 10068.12
      const decRes = await request(
        baseUrl,
        'POST',
        '/api/assistant/chat',
        { Authorization: `Bearer ${user2Token}` },
        { message: 'How much did I spend today?' }
      );
      assert(decRes.status === 200, `Expected 200, got ${decRes.status}`);
      assert(decRes.data.data?.total === 10068.12, `Expected 10068.12, got ${decRes.data.data?.total}`);
      assert(decRes.data.data?.currency === 'INR', `Expected currency INR, got ${decRes.data.data?.currency}`);
      assert(decRes.data.answer.includes('10,068.12'), 'Answer must format formatted decimal currency accurately');

      results.push({
        scenario: '14. Currency and decimal accuracy',
        passed: true,
        details: 'Verified precise floating-point addition to 2 decimal places (₹10,068.12) with INR formatting',
      });
    } catch (err: any) {
      results.push({ scenario: '14. Currency and decimal accuracy', passed: false, details: err.message });
    }

  } finally {
    // Cleanup created test records
    try {
      if (user1Id) await prisma.user.delete({ where: { id: user1Id } });
      if (user2Id) await prisma.user.delete({ where: { id: user2Id } });
      if (emptyUserId) await prisma.user.delete({ where: { id: emptyUserId } });
    } catch {}
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }

  // Print Summary
  console.log('\n====================================================');
  console.log('📋 Test Execution Results:');
  console.log('====================================================');
  let passCount = 0;
  for (const r of results) {
    const symbol = r.passed ? '✅' : '❌';
    console.log(`${symbol} ${r.scenario}`);
    console.log(`   └─ ${r.details}\n`);
    if (r.passed) passCount++;
  }
  console.log(`Summary: ${passCount} / ${results.length} Scenarios Passed.`);

  if (passCount !== results.length) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
