import http from 'http';
import app from '../app';
import { prisma } from '../lib/prisma';
import { loginRateLimiter, registerRateLimiter } from '../middleware/rateLimiter';

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

const makeRequest = async (
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
): Promise<{ status: number; headers: Headers; body: any }> => {
  const url = `${baseUrl}${path}`;
  const reqHeaders: Record<string, string> = { ...(headers || {}) };
  if (body && !reqHeaders['Content-Type']) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  let resBody: any = null;
  if (contentType.includes('application/json')) {
    resBody = await res.json();
  } else {
    resBody = await res.text();
  }
  return { status: res.status, headers: res.headers, body: resBody };
};

export const runProductionFixTests = async () => {
  console.log('\n======================================================');
  console.log('🧪 Starting Phase 11 Production Readiness Verification Tests');
  console.log('======================================================\n');

  // Start test server
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      port = addr.port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  const testEmail = `prod_test_${Date.now()}@example.com`;
  const testPassword = 'Password@123';
  let testUserId = '';
  let authToken = '';

  try {
    // ------------------------------------------------------------------
    // TEST SUITE 1: Database Health Probe (Fix 5)
    // ------------------------------------------------------------------
    console.log('--- Test Suite 1: Database Health & Readiness Probe (Fix 5) ---');
    const healthRes = await makeRequest('GET', '/api/health');
    assert(healthRes.status === 200, 'GET /api/health returned HTTP 200');
    assert(healthRes.body.status === 'healthy', 'Health status is "healthy"');
    assert(healthRes.body.database === 'connected', 'Database reported as "connected"');
    assert(typeof healthRes.body.uptime === 'number', 'Uptime metric returned');
    assert(Boolean(healthRes.body.timestamp), 'Timestamp returned');

    // ------------------------------------------------------------------
    // TEST SUITE 2: Legacy Insecure Code Removal (Fix 4)
    // ------------------------------------------------------------------
    console.log('\n--- Test Suite 2: Insecure Legacy Code Verification (Fix 4) ---');
    const userController = await import('../controllers/user.controller');
    assert(
      (userController as any).createUser === undefined,
      'Legacy unhashed createUser function is completely removed from user.controller.ts'
    );
    assert(typeof userController.getUserById === 'function', 'getUserById remains intact');
    assert(typeof userController.updateUserById === 'function', 'updateUserById remains intact');

    // ------------------------------------------------------------------
    // TEST SUITE 3: Auth Rate Limiting (Fix 1)
    // ------------------------------------------------------------------
    console.log('\n--- Test Suite 3: Authentication Rate Limiting (Fix 1) ---');
    loginRateLimiter.reset();
    registerRateLimiter.reset();

    // 1. Initial valid registration
    const regRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Prod Tester',
      email: testEmail,
      password: testPassword,
    });
    assert(regRes.status === 201, 'First registration succeeded (HTTP 201)');
    testUserId = regRes.body.user.id;

    // 2. Test registration rate limit (5 attempts/min)
    console.log('Testing registration limit (5 attempts/minute)...');
    let regLimitHit = false;
    for (let i = 2; i <= 7; i++) {
      const burstReg = await makeRequest('POST', '/api/auth/register', {
        name: `Burst ${i}`,
        email: `burst_${Date.now()}_${i}@example.com`,
        password: testPassword,
      });
      if (burstReg.status === 429) {
        regLimitHit = true;
        assert(
          burstReg.body.error.includes('Too many registration attempts'),
          'Registration returned non-sensitive 429 error message'
        );
        assert(Boolean(burstReg.headers.get('Retry-After')), '429 response includes Retry-After header');
        break;
      }
    }
    assert(regLimitHit, 'Registration limiter successfully blocked excessive requests at limit threshold (HTTP 429)');

    // 3. Independent route test: Even though registration is rate-limited, login is NOT blocked
    console.log('Testing route independence: Login is accessible when registration is limited...');
    const loginInitial = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    assert(loginInitial.status === 200, 'Login succeeded independently of registration rate limiter');
    authToken = loginInitial.body.token;

    // 4. Test login rate limit (10 attempts/min)
    console.log('Testing login rate limit (10 attempts/minute)...');
    let loginLimitHit = false;
    for (let i = 2; i <= 12; i++) {
      const burstLogin = await makeRequest('POST', '/api/auth/login', {
        email: testEmail,
        password: 'WrongPassword!',
      });
      if (burstLogin.status === 429) {
        loginLimitHit = true;
        assert(
          burstLogin.body.error.includes('Too many login attempts'),
          'Login returned non-sensitive 429 error message'
        );
        assert(Boolean(burstLogin.headers.get('Retry-After')), 'Login 429 includes Retry-After header');
        break;
      }
    }
    assert(loginLimitHit, 'Login limiter successfully blocked excessive attempts at 10-request threshold (HTTP 429)');

    // 5. Test limiter reset
    console.log('Testing limiter reset capability...');
    loginRateLimiter.reset();
    const loginAfterReset = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    assert(loginAfterReset.status === 200, 'Login succeeded immediately after rate-limiter reset');

    // ------------------------------------------------------------------
    // TEST SUITE 4: CSV Formula Injection Protection (Fix 2)
    // ------------------------------------------------------------------
    console.log('\n--- Test Suite 4: CSV Formula Injection Protection (Fix 2) ---');
    // Seed transactions with potentially malicious formula triggers
    await prisma.transaction.createMany({
      data: [
        {
          userId: testUserId,
          title: '=cmd|\' /C calc\'!A0', // Excel command injection
          amount: 150.5,
          type: 'EXPENSE',
          category: 'Office Supplies',
          date: new Date('2026-10-25'),
        },
        {
          userId: testUserId,
          title: ' +SUM(1,2)', // Leading space + plus formula
          amount: 320.0,
          type: 'EXPENSE',
          category: '+Executive Category',
          date: new Date('2026-10-24'),
        },
        {
          userId: testUserId,
          title: '@HYPERLINK("http://evil.com")', // At sign formula
          amount: 50.0,
          type: 'EXPENSE',
          category: '-Deduction',
          description: '\t=DDE("server")',
          date: new Date('2026-10-23'),
        },
        {
          userId: testUserId,
          title: 'Regular "Item" with quotes, and comma', // Normal RFC 4180 item
          amount: 99.99,
          type: 'EXPENSE',
          category: 'Shopping',
          description: 'Line 1\nLine 2',
          date: new Date('2026-10-22'),
        },
      ],
    });

    const csvRes = await makeRequest(
      'GET',
      '/api/transactions/export',
      undefined,
      { Authorization: `Bearer ${authToken}` }
    );
    assert(csvRes.status === 200, 'GET /api/transactions/export returned HTTP 200');
    assert(csvRes.headers.get('content-type')?.includes('text/csv') || false, 'Content-Type is text/csv');

    const csvContent = typeof csvRes.body === 'string' ? csvRes.body : '';
    // Verify malicious formula triggers are prefixed with apostrophe `'`
    assert(
      csvContent.includes(`"'=cmd|' /C calc'!A0"`),
      'Formula starting with "=" neutralized with leading apostrophe'
    );
    assert(
      csvContent.includes(`"' +SUM(1,2)"`),
      'Formula starting with leading space + "+" neutralized with leading apostrophe'
    );
    assert(
      csvContent.includes(`"'@HYPERLINK(""http://evil.com"")"`),
      'Formula starting with "@" neutralized with leading apostrophe'
    );
    assert(
      csvContent.includes(`"'-Deduction"`),
      'Category starting with "-" neutralized with leading apostrophe'
    );
    assert(
      csvContent.includes(`"'\t=DDE(""server"")"`),
      'Description starting with tab neutralized with leading apostrophe and quotes escaped'
    );

    // Verify legitimate numbers and dates are not corrupted
    assert(csvContent.includes('"150.50"'), 'Numeric amount "150.50" preserved without prepended quote');
    assert(csvContent.includes('"99.99"'), 'Numeric amount "99.99" preserved without prepended quote');
    assert(csvContent.includes('"2026-10-25"'), 'Date string preserved in standard ISO format');
    assert(csvContent.includes(`"Regular ""Item"" with quotes, and comma"`), 'Normal commas and quotes properly escaped');

    // ------------------------------------------------------------------
    // TEST SUITE 5: Configurable CORS (Fix 6)
    // ------------------------------------------------------------------
    console.log('\n--- Test Suite 5: Configurable CORS Verification (Fix 6) ---');
    // 1. Mobile requests (No Origin header) -> Allowed
    const mobileReq = await makeRequest('GET', '/');
    assert(mobileReq.status === 200, 'Mobile app request without Origin header is allowed');

    // 2. Local allowed origin
    const webAllowedReq = await makeRequest('GET', '/', undefined, {
      Origin: 'http://localhost:8081',
    });
    assert(webAllowedReq.status === 200, 'Request from allowed origin http://localhost:8081 is accepted');
    assert(
      webAllowedReq.headers.get('access-control-allow-origin') === 'http://localhost:8081' ||
        webAllowedReq.headers.get('access-control-allow-origin') === '*',
      'Access-Control-Allow-Origin header returned correctly'
    );

    console.log('\n======================================================');
    console.log('🎉 ALL 5 PRODUCTION READINESS FIX TEST SUITES PASSED');
    console.log('======================================================\n');
  } finally {
    // Clean up test data
    if (testUserId) {
      await prisma.transaction.deleteMany({ where: { userId: testUserId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
    server.close();
  }
};

if (require.main === module) {
  runProductionFixTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test execution failed:', err);
      process.exit(1);
    });
}
