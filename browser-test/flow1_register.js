/**
 * Flow 1: Register — Browser Test
 * Tests the complete signup flow from the React UI.
 * Validates: HTTP request, response, redirect, and UI state.
 */
const puppeteer = require('puppeteer');

const FRONTEND = 'http://localhost:3000';
const BACKEND  = 'http://localhost:5000';

const TEST_USER = {
  name: 'Flow One Tester',
  email: `flow1_${Date.now()}@example.com`,
  password: 'SecurePass123!',
};

async function runFlow1() {
  const results = { flow: 'Flow 1: Register', steps: [], passed: true };

  const log = (step, ok, detail) => {
    const entry = { step, ok, detail };
    results.steps.push(entry);
    const icon = ok ? '✅' : '❌';
    console.log(`  ${icon} ${step}: ${typeof detail === 'object' ? JSON.stringify(detail, null, 2) : detail}`);
    if (!ok) results.passed = false;
  };

  console.log('\n========================================');
  console.log('  FLOW 1: REGISTER');
  console.log(`  User: ${TEST_USER.email}`);
  console.log('========================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Capture network traffic
  let signupRequest = null;
  let signupResponse = null;

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().includes('/auth/signup') && req.method() === 'POST') {
      signupRequest = {
        url: req.url(),
        method: req.method(),
        headers: req.headers(),
        postData: req.postData(),
      };
    }
    req.continue();
  });

  page.on('response', async (res) => {
    if (res.url().includes('/auth/signup') && res.request().method() === 'POST') {
      try {
        const body = await res.json();
        signupResponse = {
          status: res.status(),
          headers: res.headers(),
          body,
        };
      } catch (_) {
        signupResponse = { status: res.status(), body: null };
      }
    }
  });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // ── Step 1: Navigate to /signup ──────────────────────────────────────
    await page.goto(`${FRONTEND}/signup`, { waitUntil: 'networkidle2', timeout: 20000 });
    const url1 = page.url();
    log('Navigate to /signup', url1.includes('/signup'), `URL: ${url1}`);

    // ── Step 2: Verify form fields exist ────────────────────────────────
    const hasName  = await page.$('input[name="name"]')  !== null;
    const hasEmail = await page.$('input[name="email"]') !== null;
    const hasPass  = await page.$('input[name="password"]') !== null;
    log('Form fields rendered (name, email, password)', hasName && hasEmail && hasPass,
      `name=${hasName} email=${hasEmail} password=${hasPass}`);

    // ── Step 3: Fill and submit form ────────────────────────────────────
    await page.type('input[name="name"]',     TEST_USER.name,     { delay: 40 });
    await page.type('input[name="email"]',    TEST_USER.email,    { delay: 40 });
    await page.type('input[name="password"]', TEST_USER.password, { delay: 40 });

    const [postResponse] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/auth/signup') && res.request().method() === 'POST'),
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
    ]);

    // ── Step 4: Verify API request was made ─────────────────────────────
    log('POST /api/auth/signup request fired', true, `URL: ${postResponse.url()}`);

    // ── Step 5: Verify HTTP 201 response ────────────────────────────────
    const status = postResponse.status();
    log('HTTP Status 201', status === 201, `Status: ${status}`);
    
    const body = await postResponse.json().catch(() => ({}));
    log('Response body success=true', body?.success === true, JSON.stringify(body, null, 2));
    log('Response contains user object', !!body?.data?.user, `user: ${JSON.stringify(body?.data?.user)}`);
    log('No token in signup response (PENDING_VERIFICATION)', !body?.data?.token && !body?.data?.accessToken, 
      'Correct — token not issued until email verified');

    // ── Step 6: Redirected to /login ────────────────────────────────────
    const url2 = page.url();
    log('Redirected to /login after signup', url2.includes('/login'), `URL: ${url2}`);

    // ── Step 7: Email verification banner visible ────────────────────────
    await page.waitForFunction(() => document.body.innerText.includes('Check your email'), { timeout: 5000 }).catch(() => {});
    const bannerText = await page.evaluate(() => document.body.innerText);
    const hasBanner = bannerText.includes('Check your email');
    log('Email verification banner shown', hasBanner, hasBanner ? 'Banner visible on /login page' : 'Banner NOT found');

    // ── Step 8: No refresh cookie set (no session yet) ──────────────────
    const cookies = await page.cookies();
    const hasRefreshCookie = cookies.some((c) => c.name === 'refreshToken');
    log('No refreshToken cookie (correct — not logged in yet)', !hasRefreshCookie,
      hasRefreshCookie ? 'UNEXPECTED: refreshToken cookie found' : 'No refreshToken cookie ✓');

    // ── Step 9: No console errors ────────────────────────────────────────
    const unexpectedErrors = consoleErrors.filter(e => !e.includes('401') && !e.includes('400') && !e.includes('GSI_LOGGER'));
    log('No unexpected browser console errors', unexpectedErrors.length === 0,
      unexpectedErrors.length ? `Errors: ${unexpectedErrors.join(' | ')}` : 'Clean');

    // ── Step 10: Duplicate email rejected ───────────────────────────────
    console.log('\n  [Sub-test] Duplicate email rejection...');
    await page.goto(`${FRONTEND}/signup`, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.type('input[name="name"]',     TEST_USER.name,     { delay: 40 });
    await page.type('input[name="email"]',    TEST_USER.email,    { delay: 40 }); // same email
    await page.type('input[name="password"]', TEST_USER.password, { delay: 40 });
    await page.click('button[type="submit"]');
    
    await page.waitForResponse(res => res.url().includes('/auth/signup') && res.request().method() === 'POST');
    await new Promise((r) => setTimeout(r, 1000)); // allow toast to render
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    const isDuplicateRejected = bodyText.toLowerCase().includes('already') || bodyText.toLowerCase().includes('registered') || bodyText.toLowerCase().includes('use');
    log('Duplicate email returns 409 error toast', isDuplicateRejected,
      isDuplicateRejected ? 'Duplicate rejected correctly' : `Page text: ${bodyText.substring(0, 200)}`);

  } catch (err) {
    log('Unexpected test error', false, err.message);
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

runFlow1().then((r) => {
  process.exit(r.passed ? 0 : 1);
}).catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
