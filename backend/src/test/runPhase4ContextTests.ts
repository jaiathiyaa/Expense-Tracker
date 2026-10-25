import { assistantContextService } from '../services/assistantContextService';
import { assistantNlpService } from '../services/assistantNlpService';
import { prisma } from '../lib/prisma';
import app from '../app';
import http from 'http';

let server: http.Server;
let port: number;
let baseUrl: string;

const assert = (condition: boolean, msg: string) => {
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✅ [PASS] ${msg}`);
};

const makePostRequest = async (path: string, body: any, token?: string): Promise<{ status: number; body: any }> => {
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get('content-type') || '';
  let resBody: any = null;
  if (contentType.includes('application/json')) {
    resBody = await res.json();
  } else {
    resBody = await res.text();
  }
  return { status: res.status, body: resBody };
};

export const runPhase4ContextTests = async () => {
  console.log('\n======================================================');
  console.log('🧪 Starting Phase 4 Conversation Context & Fallback Tests');
  console.log('======================================================\n');

  // Start temporary test server
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      port = addr.port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  const userAEmail = `ctx_usera_${Date.now()}@example.com`;
  const userBEmail = `ctx_userb_${Date.now()}@example.com`;
  const password = 'Password@123';

  let tokenA = '';
  let tokenB = '';
  let userAId = '';
  let userBId = '';

  try {
    // 1. Setup two authenticated users
    console.log('--- Step 1: User Registration & Authentication ---');
    await makePostRequest('/api/auth/register', { name: 'User A', email: userAEmail, password });
    const loginA = await makePostRequest('/api/auth/login', { email: userAEmail, password });
    assert(loginA.status === 200 && Boolean(loginA.body.token), 'User A registered and authenticated');
    tokenA = loginA.body.token;
    userAId = loginA.body.user.id;

    await makePostRequest('/api/auth/register', { name: 'User B', email: userBEmail, password });
    const loginB = await makePostRequest('/api/auth/login', { email: userBEmail, password });
    assert(loginB.status === 200 && Boolean(loginB.body.token), 'User B registered and authenticated');
    tokenB = loginB.body.token;
    userBId = loginB.body.user.id;

    // Seed User A expenses
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    await prisma.transaction.createMany({
      data: [
        {
          userId: userAId,
          title: 'Grocery Store A',
          amount: 2500,
          type: 'EXPENSE',
          category: 'Food & Dining',
          date: now,
        },
        {
          userId: userAId,
          title: 'Zomato Food Order',
          amount: 850,
          type: 'EXPENSE',
          category: 'Food & Dining',
          date: now,
        },
        {
          userId: userAId,
          title: 'Old Grocery Store',
          amount: 4000,
          type: 'EXPENSE',
          category: 'Food & Dining',
          date: lastMonth,
        },
      ],
    });
    console.log('✅ Seeded User A test transactions for current and previous months');

    // 2. Initial question to establish conversation context
    console.log('\n--- Step 2: Establish Context & Follow-Up "What about last month?" ---');
    const q1 = await makePostRequest('/api/assistant/chat', { message: 'How much did I spend this month?' }, tokenA);
    assert(q1.status === 200, 'Initial spending query returned HTTP 200');
    assert(q1.body.intent === 'TOTAL_EXPENSE', 'Initial intent classified as TOTAL_EXPENSE');
    assert(q1.body.data.total === 3350, `Initial total matched ₹3,350 (got ₹${q1.body.data.total})`);

    // Verify in-memory context was populated
    const ctxAfterQ1 = assistantContextService.getContext(userAId);
    assert(ctxAfterQ1 !== null, 'User A conversation context successfully created');
    assert(ctxAfterQ1?.lastIntent === 'TOTAL_EXPENSE', 'User A context intent recorded as TOTAL_EXPENSE');
    assert(ctxAfterQ1?.lastDatePreset === 'this_month', 'User A context datePreset recorded as this_month');

    // Follow-up 1: "What about last month?"
    const q2 = await makePostRequest('/api/assistant/chat', { message: 'What about last month?' }, tokenA);
    assert(q2.status === 200, 'Follow-up query "What about last month?" returned HTTP 200');
    assert(q2.body.intent === 'TOTAL_EXPENSE', 'Follow-up intent inherited TOTAL_EXPENSE from context');
    assert(q2.body.data.total === 4000, `Follow-up total correctly calculated for last month: ₹4,000 (got ₹${q2.body.data.total})`);

    // 3. Follow-up 2: "Only food."
    console.log('\n--- Step 3: Follow-Up "Only food." ---');
    const q3 = await makePostRequest('/api/assistant/chat', { message: 'Only food.' }, tokenA);
    assert(q3.status === 200, 'Follow-up query "Only food." returned HTTP 200');
    assert(q3.body.intent === 'CATEGORY_SPENDING', 'Follow-up resolved to CATEGORY_SPENDING');
    assert(q3.body.data.category === 'Food & Dining', 'Follow-up resolved category to Food & Dining');
    assert(q3.body.data.total === 4000, `Follow-up kept last month period for category spending: ₹4,000 (got ₹${q3.body.data.total})`);

    // 4. Follow-up 3: "Show the top five instead."
    console.log('\n--- Step 4: Follow-Up "Show the top five instead." ---');
    const q4 = await makePostRequest('/api/assistant/chat', { message: 'Show the top five instead.' }, tokenA);
    assert(q4.status === 200, 'Follow-up "Show the top five instead." returned HTTP 200');
    assert(
      q4.body.intent === 'TOP_CATEGORIES' || q4.body.intent === 'LARGEST_EXPENSES',
      `Follow-up switched to ranked intent (${q4.body.intent})`
    );

    // 5. User Isolation: User B asks ambiguous follow-up
    console.log('\n--- Step 5: Multi-Tenant User Isolation ---');
    const userBCtx = assistantContextService.getContext(userBId);
    assert(userBCtx === null, 'User B context is null (never shared from User A)');

    const qUserB = await makePostRequest('/api/assistant/chat', { message: 'What about last month?' }, tokenB);
    assert(qUserB.status === 200, 'User B request returned 200');
    assert(
      qUserB.body.intent === 'UNKNOWN' || qUserB.body.answer.includes("couldn't quite understand"),
      'User B without context safely fell back to UNKNOWN or clarifying prompt without leaking User A context'
    );

    // 6. Context Expiration (>10 minutes TTL simulation)
    console.log('\n--- Step 6: Context Expiration Simulation ---');
    assistantContextService.expireContextForTesting(userAId);
    const expiredCtx = assistantContextService.getContext(userAId);
    assert(expiredCtx === null, 'Context properly expired and cleared after simulated TTL expiry');

    const qExpiredFollowUp = await makePostRequest('/api/assistant/chat', { message: 'What about last month?' }, tokenA);
    assert(
      qExpiredFollowUp.body.intent === 'UNKNOWN' || qExpiredFollowUp.body.answer.includes("couldn't quite understand"),
      'Post-expiration follow-up safely returns UNKNOWN/clarification instead of stale context data'
    );

    // 7. Explicit Context Reset via POST /api/assistant/reset
    console.log('\n--- Step 7: Explicit Context Reset via Endpoint ---');
    // Re-establish context
    await makePostRequest('/api/assistant/chat', { message: 'How much did I spend this month?' }, tokenA);
    assert(assistantContextService.getContext(userAId) !== null, 'Context re-established');

    const resetRes = await makePostRequest('/api/assistant/reset', {}, tokenA);
    assert(resetRes.status === 200, 'POST /api/assistant/reset returned HTTP 200');
    assert(assistantContextService.getContext(userAId) === null, 'Context cleared immediately by reset endpoint');

    // 8. Explicit Reset via chat request flag { resetContext: true }
    console.log('\n--- Step 8: Inline resetContext flag ---');
    await makePostRequest('/api/assistant/chat', { message: 'How much did I spend this month?' }, tokenA);
    assert(assistantContextService.getContext(userAId) !== null, 'Context active');

    await makePostRequest('/api/assistant/chat', { message: 'Hello there!', resetContext: true }, tokenA);
    assert(assistantContextService.getContext(userAId) === null, 'Inline resetContext flag reset user session');

    // 9. Input Sanitization & Untrusted Follow-Up Protection
    console.log('\n--- Step 9: Untrusted Follow-Up Input Sanitization ---');
    const maliciousMsg = "What about last month? \x00'; DROP TABLE users; -- " + 'A'.repeat(600);
    const malRes = await makePostRequest('/api/assistant/chat', { message: maliciousMsg }, tokenA);
    assert(malRes.status === 400, 'Payload exceeding character limits correctly rejected with HTTP 400');

    console.log('\n======================================================');
    console.log('🎉 ALL 9 PHASE 4 CONVERSATION CONTEXT TESTS PASSED');
    console.log('======================================================\n');
  } finally {
    // Cleanup seeded transactions and users
    if (userAId) {
      await prisma.transaction.deleteMany({ where: { userId: userAId } });
      await prisma.user.deleteMany({ where: { id: userAId } });
    }
    if (userBId) {
      await prisma.transaction.deleteMany({ where: { userId: userBId } });
      await prisma.user.deleteMany({ where: { id: userBId } });
    }
    server.close();
  }
};

if (require.main === module) {
  runPhase4ContextTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test execution failed:', err);
      process.exit(1);
    });
}
