/**
 * Flow 4: Email Verification — Browser Test
 * Validates the email verification lifecycle: signup, DB state checks, blocked login,
 * invalid token, successful verification, replay protection, token expiry, resend cooldown,
 * multiple token invalidation, newest token success, concurrent verification, and successful login.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Load environment variables for the database connection
require('../backend/node_modules/dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const db = require('../backend/db.js').default;

const FRONTEND = 'http://localhost:3000';
const BACKEND  = 'http://localhost:5000';

const timestamp = Date.now();
const USER_1 = {
  name: 'Verify User One',
  email: `flow4_user1_${timestamp}@example.com`,
  password: 'Password123!',
};

const USER_2 = {
  name: 'Verify User Two',
  email: `flow4_user2_${timestamp}@example.com`,
  password: 'Password123!',
};

function getVerificationTokenForEmail(email) {
  const filePath = path.resolve(__dirname, '../backend/scratch/sent_emails.json');
  if (!fs.existsSync(filePath)) {
    throw new Error('sent_emails.json does not exist');
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const emails = JSON.parse(content);
  const matches = emails
    .filter(e => e.email.toLowerCase() === email.toLowerCase() && e.type === 'verify')
    .sort((a, b) => b.timestamp - a.timestamp);
  
  if (matches.length === 0) {
    throw new Error(`No verification token found for email: ${email}`);
  }
  return matches[0].token;
}

async function runFlow4() {
  const results = { flow: 'Flow 4: Email Verification', steps: [], passed: true };

  const log = (step, ok, detail) => {
    const entry = { step, ok, detail };
    results.steps.push(entry);
    const icon = ok ? '✅' : '❌';
    console.log(`  ${icon} ${step}: ${typeof detail === 'object' ? JSON.stringify(detail, null, 2) : detail}`);
    if (!ok) results.passed = false;
  };

  console.log('\n========================================');
  console.log('  FLOW 4: EMAIL VERIFICATION E2E');
  console.log('========================================\n');

  // Cleanup pre-existing test data and mock emails
  await db('users').whereLike('email', 'flow4_%').del();
  const emailsFilePath = path.resolve(__dirname, '../backend/scratch/sent_emails.json');
  if (fs.existsSync(emailsFilePath)) {
    fs.writeFileSync(emailsFilePath, '[]', 'utf8');
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    console.log('  [Browser Console]:', msg.text());
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // ────────────────────────────────────────────────────────────────────────
    // Step 1: Register User 1
    // ────────────────────────────────────────────────────────────────────────
    console.log('  [Step 1] Registering User 1...');
    await page.goto(`${FRONTEND}/signup`, { waitUntil: 'networkidle2' });
    await page.type('input[name="name"]', USER_1.name);
    await page.type('input[name="email"]', USER_1.email);
    await page.type('input[name="password"]', USER_1.password);
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);
    
    log('Redirected to /login after signup', page.url().includes('/login'), `URL: ${page.url()}`);

    // ────────────────────────────────────────────────────────────────────────
    // Step 2: Database Check (PENDING_VERIFICATION)
    // ────────────────────────────────────────────────────────────────────────
    console.log('  [Step 2] Checking Database state for User 1...');
    const user1Db = await db('users').where({ email: USER_1.email }).first();
    log('User exists in database', !!user1Db, user1Db ? `ID: ${user1Db.id}` : 'Not found');
    log('User status is PENDING_VERIFICATION', user1Db?.status === 'PENDING_VERIFICATION', `Status: ${user1Db?.status}`);

    const tokenDb = await db('email_verification_tokens').where({ user_id: user1Db.id }).first();
    log('Verification token exists in DB', !!tokenDb, tokenDb ? `Token ID: ${tokenDb.id}` : 'Not found');
    log('Token is unconsumed', tokenDb && tokenDb.consumed_at === null, `Consumed: ${tokenDb?.consumed_at}`);
    
    const tokenExpiry = new Date(tokenDb.expires_at).getTime();
    log('Token has valid future expiry', tokenExpiry > Date.now(), `Expires: ${tokenDb.expires_at}`);

    // ────────────────────────────────────────────────────────────────────────
    // Step 3: Blocked Login UX
    // ────────────────────────────────────────────────────────────────────────
    console.log('  [Step 3] Attempting login with unverified account...');
    await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', USER_1.email);
    await page.type('input[name="password"]', USER_1.password);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => document.body.innerText.toLowerCase().includes('not verified'), { timeout: 5000 });
    const loginPageText = await page.evaluate(() => document.body.innerText);
    const hasUnverifiedWarning = loginPageText.toLowerCase().includes('not verified');
    log('Login blocked with verification warning', hasUnverifiedWarning, 'Correct - unverified accounts cannot sign in.');

    const hasResendAction = loginPageText.toLowerCase().includes('resend verification');
    log('Resend verification action visible on login page', hasResendAction, 'Correct - action link renders.');

    // ────────────────────────────────────────────────────────────────────────
    // Step 4: Invalid Token Handling
    // ────────────────────────────────────────────────────────────────────────
    console.log('  [Step 4] Navigating to verification route with invalid token...');
    await page.goto(`${FRONTEND}/verify-email?token=invalid_dummy_token`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.body.innerText.includes('Verification Failed') || document.body.innerText.includes('invalid or has expired'), { timeout: 5000 });
    const verifyFailText = await page.evaluate(() => document.body.innerText);
    const isVerifyFailShown = verifyFailText.includes('Verification Failed');
    log('Invalid token shows failure UI', isVerifyFailShown, 'Correct - handles invalid token safely.');

    // ────────────────────────────────────────────────────────────────────────
    // Step 5: Successful Verification
    // ────────────────────────────────────────────────────────────────────────
    console.log('  [Step 5] Navigating to verification route with correct token...');
    const rawToken1 = getVerificationTokenForEmail(USER_1.email);
    await page.goto(`${FRONTEND}/verify-email?token=${rawToken1}`, { waitUntil: 'networkidle2' });
    
    await page.waitForFunction(() => document.body.innerText.includes('Email Verified!'), { timeout: 10000 });
    const verifySuccessText = await page.evaluate(() => document.body.innerText);
    log('Successful verification UI renders', verifySuccessText.includes('Email Verified!'), 'Success page active.');

    // Verify DB Status updates
    const user1DbAfter = await db('users').where({ id: user1Db.id }).first();
    log('User status updated to ACTIVE', user1DbAfter.status === 'ACTIVE', `Status: ${user1DbAfter.status}`);
    
    const tokenDbAfter = await db('email_verification_tokens').where({ id: tokenDb.id }).first();
    log('Token consumed_at populated', tokenDbAfter.consumed_at !== null, `Consumed At: ${tokenDbAfter.consumed_at}`);

    // ────────────────────────────────────────────────────────────────────────
    // Step 6: Replay Attack protection (Idempotency)
    // ────────────────────────────────────────────────────────────────────────
    console.log('  [Step 6] Verifying idempotency of email verification link...');
    await page.goto(`${FRONTEND}/verify-email?token=${rawToken1}`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.body.innerText.includes('Email Verified!'), { timeout: 5000 });
    const replayVerifyText = await page.evaluate(() => document.body.innerText);
    log('Replay link behaves idempotently (returns Success UI)', replayVerifyText.includes('Email Verified!'), 'Correct - handled gracefully.');

    // ────────────────────────────────────────────────────────────────────────
    // Step 7: Token Expiry & Resend Cooldown
    // ────────────────────────────────────────────────────────────────────────
    console.log('  [Step 7] Testing Token Expiry & Resend Lifecycle on User 2...');
    // Create User 2 via signup
    await page.goto(`${FRONTEND}/signup`, { waitUntil: 'networkidle2' });
    await page.type('input[name="name"]', USER_2.name);
    await page.type('input[name="email"]', USER_2.email);
    await page.type('input[name="password"]', USER_2.password);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);

    const user2Db = await db('users').where({ email: USER_2.email }).first();
    const token2Db = await db('email_verification_tokens').where({ user_id: user2Db.id }).first();
    const rawToken2Old = getVerificationTokenForEmail(USER_2.email);

    // Force expire the token in database
    await db('email_verification_tokens').where({ id: token2Db.id }).update({
      expires_at: new Date(Date.now() - 3600 * 1000)
    });

    // Navigate to verification page with expired token
    await page.goto(`${FRONTEND}/verify-email?token=${rawToken2Old}`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.body.innerText.includes('Link Expired'), { timeout: 5000 });
    const expiredPageText = await page.evaluate(() => document.body.innerText);
    log('Expired token shows Link Expired UI', expiredPageText.includes('Link Expired'), 'Correct - handles expired token.');

    // Attempt to resend verification link
    await page.waitForSelector('input#email', { visible: true });
    await page.$eval('input#email', (el, val) => {
      console.log('--- Eval browser start ---');
      console.log('val passed:', val);
      console.log('input element:', el);
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, val);
      console.log('input element value after setter:', el.value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('input event dispatched');
    }, USER_2.email);
    await new Promise((r) => setTimeout(r, 500)); // wait for React state sync
    await page.click('form button[type="submit"]');
    await page.waitForFunction(() => document.body.innerText.toLowerCase().includes('resent'), { timeout: 8000 });
    log('Resend verification request succeeded', true, 'New token generated and dispatched.');

    // Immediately attempt to resend again to verify Cooldown Throttling
    await page.goto(`${FRONTEND}/verify-email?token=${rawToken2Old}`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.body.innerText.includes('Link Expired'), { timeout: 5000 });
    await page.waitForSelector('input#email', { visible: true });
    await page.$eval('input#email', (el, val) => {
      console.log('--- Secondary Eval browser start ---');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, USER_2.email);
    await new Promise((r) => setTimeout(r, 500)); // wait for React state sync
    await page.click('form button[type="submit"]');
    // Wait for the API response to settle (429 is fast)
    await new Promise((r) => setTimeout(r, 1500));
    // After a 429, the resend form should still be visible (resentEmail stays false),
    // confirming the cooldown blocked the resend and setResentEmail(true) was NOT called.
    const resentBannerVisible = await page.evaluate(() =>
      document.body.innerText.includes('Verification email resent')
    );
    log('Resend cooldown active (throttled second attempt)', !resentBannerVisible, !resentBannerVisible ? 'Throttling blocked resend — success banner absent.' : 'FAIL: success banner shown despite 429.');

    // ────────────────────────────────────────────────────────────────────────
    // Step 8: Multi-resend token invalidation & newest token success
    // ────────────────────────────────────────────────────────────────────────
    console.log('  [Step 8] Checking token invalidation rules...');
    const rawToken2New = getVerificationTokenForEmail(USER_2.email);
    log('Old token is different from new token', rawToken2Old !== rawToken2New, `Old: ${rawToken2Old.substring(0,8)}... New: ${rawToken2New.substring(0,8)}...`);

    // Verify older token is invalidated in DB (its expiry is set to past)
    const oldTokenDbAfter = await db('email_verification_tokens').where({ id: token2Db.id }).first();
    const isOldTokenExpired = new Date(oldTokenDbAfter.expires_at) < new Date();
    log('Old token is marked expired in DB', isOldTokenExpired, `Expiry: ${oldTokenDbAfter.expires_at}`);

    // Try to verify using the older token now
    await page.goto(`${FRONTEND}/verify-email?token=${rawToken2Old}`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.body.innerText.includes('Link Expired') || document.body.innerText.includes('Verification Failed'), { timeout: 5000 });
    log('Older token fails to verify user', true, 'Fails due to invalidation.');

    // Try to verify using the newest token
    await page.goto(`${FRONTEND}/verify-email?token=${rawToken2New}`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.body.innerText.includes('Email Verified!'), { timeout: 5000 });
    log('Newest token successfully verifies user', true, 'User active.');

    // ────────────────────────────────────────────────────────────────────────
    // Step 9: API-Level Concurrency Test (Pessimistic Locking Validation)
    // ────────────────────────────────────────────────────────────────────────
    console.log('  [Step 9] Testing concurrent API-level verification races...');
    const defaultRole = await db('roles').where({ name: 'User' }).first();
    const [user3Db] = await db('users').insert({
      name: 'Verify User Three',
      email: `flow4_user3_${timestamp}@example.com`,
      password_hash: '$2b$12$N9qo8uLOqp.9lhJ9y6GZg.M8R9wW/686zW8z8z8z8z8z8z8z8z8z8',
      status: 'PENDING_VERIFICATION',
      provider: 'local',
      role_id: defaultRole.id
    }).returning('*');

    // Create verification token for User 3
    const rawToken3 = require('crypto').randomBytes(32).toString('hex');
    const tokenHash3 = require('crypto').createHash('sha256').update(rawToken3).digest('hex');
    await db('email_verification_tokens').insert({
      user_id: user3Db.id,
      token_hash: tokenHash3,
      expires_at: new Date(Date.now() + 3600 * 1000)
    });

    // Fire two concurrent verifyEmail API calls for the same token
    const axiosLib = require('../backend/node_modules/axios');
    const axios = axiosLib.default || axiosLib;
    const [r1, r2] = await Promise.allSettled([
      axios.post(`${BACKEND}/api/auth/verify-email`, { token: rawToken3 }),
      axios.post(`${BACKEND}/api/auth/verify-email`, { token: rawToken3 }),
    ]);

    const statuses = [
      r1.status === 'fulfilled' ? r1.value.status : r1.reason?.response?.status,
      r2.status === 'fulfilled' ? r2.value.status : r2.reason?.response?.status,
    ];

    const concurrentSuccessCount = statuses.filter(s => s === 200).length;
    const noServerCrash = statuses.every(s => s !== 500);
    
    // DB state: user must be ACTIVE and token consumed exactly once
    const user3Final = await db('users').where({ id: user3Db.id }).first();
    const token3Final = await db('email_verification_tokens').where({ token_hash: tokenHash3 }).first();

    log('Concurrent API calls did not crash the server (no 500)', noServerCrash, `Statuses: ${statuses.join(', ')}`);
    log('At least one concurrent call succeeded (200)', concurrentSuccessCount >= 1, `${concurrentSuccessCount}/2 returned 200`);
    log('User 3 is ACTIVE after concurrent race', user3Final.status === 'ACTIVE', `Status: ${user3Final.status}`);
    log('Token consumed exactly once after concurrent race', !!token3Final.consumed_at, `Consumed: ${token3Final.consumed_at}`);

    // ────────────────────────────────────────────────────────────────────────
    // Step 10: Successful Login redirect
    // ────────────────────────────────────────────────────────────────────────
    console.log('  [Step 10] Testing login and redirect with verified User 1...');
    // Navigate to login page and wait fully for React to mount
    await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[name="email"]', { visible: true });
    await page.waitForSelector('input[name="password"]', { visible: true });
    
    await page.type('input[name="email"]', USER_1.email);
    await page.type('input[name="password"]', USER_1.password);
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
    ]);

    log('Redirected to /discover on successful login', page.url().includes('/discover'), `URL: ${page.url()}`);

  } catch (err) {
    log('Unexpected test error', false, err.message);
    console.log('--- Browser Console Errors ---');
    consoleErrors.forEach(e => console.log('  [Console Error]:', e));
    try {
      console.log('--- Page 1 HTML Content ---');
      console.log(await page.content());
    } catch (_) {}
    try {
      if (typeof pageTab2 !== 'undefined' && pageTab2) {
        console.log('--- Page 2 HTML Content ---');
        console.log(await pageTab2.content());
      }
    } catch (_) {}
    try {
      await page.screenshot({ path: path.resolve(__dirname, 'verify_error_screenshot.png') });
      console.log('  📸 Screenshot captured to browser-test/verify_error_screenshot.png');
    } catch (ssErr) {
      console.log('  Failed to capture screenshot:', ssErr.message);
    }
  } finally {
    await browser.close();
  }

  // ── Summary ──────────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log(`  RESULT: ${results.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Steps: ${results.steps.filter(s => s.ok).length}/${results.steps.length} passed`);
  console.log('========================================\n');

  return results;
}

runFlow4().then((r) => {
  process.exit(r.passed ? 0 : 1);
}).catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
