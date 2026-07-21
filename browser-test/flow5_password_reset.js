/**
 * Flow 5: Password Reset — Browser Test
 * Validates the complete forgot password flow, token extraction, reset,
 * session revocation, replay protection, and rate limiting.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const FRONTEND = 'http://localhost:3000';
const BACKEND  = 'http://localhost:5000';

const TEST_USER = {
  name: 'Flow Five Tester',
  email: `flow5_${Date.now()}@example.com`,
  password: 'SecurePass123!',
  newPassword: 'NewSecurePass123!'
};

const fetchClient = async (path, body) => {
  const response = await fetch(`${BACKEND}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify(body)
  });
  let data;
  try { data = await response.json(); } catch (_) {}
  return { status: response.status, data, headers: response.headers };
};

async function runFlow5() {
  const results = { flow: 'Flow 5: Password Reset', steps: [], passed: true };

  const log = (step, ok, detail) => {
    results.steps.push({ step, ok, detail });
    const icon = ok ? '✅' : '❌';
    console.log(`  ${icon} ${step}: ${typeof detail === 'object' ? JSON.stringify(detail, null, 2) : detail}`);
    if (!ok) results.passed = false;
  };

  console.log('\n========================================');
  console.log('  FLOW 5: PASSWORD RESET');
  console.log(`  User: ${TEST_USER.email}`);
  console.log('========================================\n');

  // 1. Setup - Create a user to reset password for
  console.log('  [Setup] Registering user for test...');
  await fetchClient('/auth/signup', {
    name: TEST_USER.name, email: TEST_USER.email, password: TEST_USER.password
  });

  console.log('  [Setup] Verifying email...');
  const emailsPath = path.resolve(__dirname, '../backend/scratch/sent_emails.json');
  const allEmails = JSON.parse(fs.readFileSync(emailsPath, 'utf8'));
  const verifyEmails = allEmails.filter(e => e.email === TEST_USER.email && e.type === 'verify');
  const verifyToken = verifyEmails[verifyEmails.length - 1].token;
  await fetchClient('/auth/verify-email', { token: verifyToken });

  console.log('  [Setup] Logging in to establish a session...');
  const loginRes = await fetchClient('/auth/login', { email: TEST_USER.email, password: TEST_USER.password });
  // The backend uses Set-Cookie for refresh_token, we must capture it
  let cookies = loginRes.headers?.get('set-cookie') || '';
  if (Array.isArray(cookies)) cookies = cookies.join('; ');
  
  // Extract token from response payload
  const accessToken = loginRes.data?.data?.token;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // ── Step 1: User Enumeration Protection ──────────────────────────────
    console.log('\n  [Sub-test] Enumeration Protection...');
    const fakeEmail = 'doesnotexist@example.com';
    const enumRes = await fetchClient('/auth/password/reset-request', { email: fakeEmail });
    log('Reset request for fake email returns 200 (Enumeration protection)', enumRes.status === 200, `Status: ${enumRes.status}`);

    // ── Step 2: Request Password Reset ──────────────────────────────────
    console.log('\n  [Sub-test] Request Reset...');
    await page.goto(`${FRONTEND}/forgot-password`, { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', TEST_USER.email);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => document.body.innerText.includes('Check Your Inbox'), { timeout: 5000 });
    const successUI = await page.evaluate(() => document.body.innerText.includes('Check Your Inbox'));
    log('Forgot Password UI shows success message', successUI, successUI ? 'Found' : 'Not found');

    // ── Step 3: Cooldown Rate Limiting ──────────────────────────────────
    console.log('\n  [Sub-test] Cooldown Protection...');
    const cooldownRes = await fetchClient('/auth/password/reset-request', { email: TEST_USER.email });
    log('Second request within 60s blocked (429)', cooldownRes.status === 429, `Status: ${cooldownRes.status}`);

    // ── Step 4: Extract Token from File ─────────────────────────────────
    console.log('\n  [Sub-test] Extract Token...');
    const emailsPath = path.resolve(__dirname, '../backend/scratch/sent_emails.json');
    const emails = JSON.parse(fs.readFileSync(emailsPath, 'utf8'));
    // Find the latest reset token for this user
    const userEmails = emails.filter(e => e.email === TEST_USER.email && e.type === 'reset');
    const token = userEmails[userEmails.length - 1].token;
    log('Password reset token extracted', !!token, token ? 'Token found' : 'Token missing');

    // ── Step 5: Concurrent Reset Protection ─────────────────────────────
    console.log('\n  [Sub-test] Concurrent Reset (Pessimistic Locking)...');
    const resetReq1 = fetchClient('/auth/password/reset', { token, newPassword: TEST_USER.newPassword });
    const resetReq2 = fetchClient('/auth/password/reset', { token, newPassword: TEST_USER.newPassword });
    const [res1, res2] = await Promise.all([resetReq1, resetReq2]);
    
    const statuses = [res1.status, res2.status].sort();
    log('Concurrent resets serialize (one 200, one 400)', statuses[0] === 200 && statuses[1] === 400, `Statuses: ${statuses}`);

    // ── Step 6: Replay Protection ───────────────────────────────────────
    console.log('\n  [Sub-test] Replay Protection...');
    const replayRes = await fetchClient('/auth/password/reset', { token, newPassword: 'AnotherPassword1!' });
    log('Replaying consumed token blocked (400)', replayRes.status === 400, `Status: ${replayRes.status}`);

    // ── Step 7: Old Password Fails ──────────────────────────────────────
    console.log('\n  [Sub-test] Old Password Failure...');
    const oldLoginRes = await fetchClient('/auth/login', { email: TEST_USER.email, password: TEST_USER.password });
    log('Login with old password fails (401)', oldLoginRes.status === 401, `Status: ${oldLoginRes.status}`);

    // ── Step 8: Session Revocation ──────────────────────────────────────
    console.log('\n  [Sub-test] Session Revocation...');
    // Attempt to use the old refresh token
    const refreshRes = await fetch(`${BACKEND}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      }
    });
    log('Old refresh token is revoked (401/403)', [401, 403].includes(refreshRes.status), `Status: ${refreshRes.status}`);
    
    // Attempt to use the old access token (should still work if not expired, but let's test if it works... actually JWT is stateless.
    // However, the prompt asked to test "refresh token rejection after reset" and "session revocation". 
    // We proved the refresh token is dead.

    // ── Step 9: New Password Succeeds ───────────────────────────────────
    console.log('\n  [Sub-test] New Password Login...');
    const newLoginRes = await fetchClient('/auth/login', { email: TEST_USER.email, password: TEST_USER.newPassword });
    const isSuccess = newLoginRes.status === 200;
    log('Login with new password authenticated', isSuccess, `Status: ${newLoginRes.status}`);

    // ── Step 10: No Console Errors ───────────────────────────────────────
    const unexpectedErrors = consoleErrors.filter(e => !e.includes('401') && !e.includes('400') && !e.includes('429') && !e.includes('GSI_LOGGER'));
    log('No unexpected browser console errors', unexpectedErrors.length === 0,
      unexpectedErrors.length ? `Errors: ${unexpectedErrors.join(' | ')}` : 'Clean');

  } catch (err) {
    console.error('Test execution failed:', err);
    results.passed = false;
  } finally {
    await browser.close();
  }

  console.log('\n========================================');
  console.log(`  RESULT: ${results.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Steps: ${results.steps.filter(s => s.ok).length}/${results.steps.length} passed`);
  console.log('========================================\n');

  process.exit(results.passed ? 0 : 1);
}

runFlow5();
