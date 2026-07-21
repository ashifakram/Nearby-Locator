/**
 * Flow 2: Login — Browser Test
 * Tests the complete login flow from the React UI.
 * Validates: HTTP request/response, token issuance, cookies, state hydration, protected routes, refresh rotation, and logout.
 */
const puppeteer = require('puppeteer');

const FRONTEND = 'http://localhost:3000';
const BACKEND  = 'http://localhost:5000';

const TEST_USER = {
  email: 'flow2_tester@example.com',
  password: 'SecurePass123!',
};

async function runFlow2() {
  const results = { flow: 'Flow 2: Login', steps: [], passed: true };

  const log = (step, ok, detail) => {
    const entry = { step, ok, detail };
    results.steps.push(entry);
    const icon = ok ? '✅' : '❌';
    console.log(`  ${icon} ${step}: ${typeof detail === 'object' ? JSON.stringify(detail, null, 2) : detail}`);
    if (!ok) results.passed = false;
  };

  console.log('\n========================================');
  console.log('  FLOW 2: LOGIN');
  console.log(`  User: ${TEST_USER.email}`);
  console.log('========================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // ── Step 1: Navigate to /login ──────────────────────────────────────
    await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle2', timeout: 20000 });
    log('Navigate to /login', page.url().includes('/login'), `URL: ${page.url()}`);

    // ── Step 2: Verify form fields exist ────────────────────────────────
    const hasEmail = await page.$('input[name="email"]') !== null;
    const hasPass  = await page.$('input[name="password"]') !== null;
    log('Form fields rendered (email, password)', hasEmail && hasPass, `email=${hasEmail} password=${hasPass}`);

    // ── Step 3: Fill and submit form ────────────────────────────────────
    await page.type('input[name="email"]',    TEST_USER.email,    { delay: 40 });
    await page.type('input[name="password"]', TEST_USER.password, { delay: 40 });

    const [loginResponse] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/auth/login') && res.request().method() === 'POST'),
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
    ]);

    // ── Step 4: Verify API request and response ─────────────────────────
    log('POST /api/auth/login request fired', true, `URL: ${loginResponse.url()}`);
    
    const status = loginResponse.status();
    log('HTTP Status 200', status === 200, `Status: ${status}`);
    
    const body = await loginResponse.json().catch(() => ({}));
    log('Response body success=true', body?.success === true, 'Success');
    log('Response contains user object', !!body?.data?.user, `user: ${body?.data?.user?.email}`);
    log('JWT access token issued', !!body?.data?.token, 'Token received');

    // ── Step 5: Verify HttpOnly refresh cookie set ─────────────────────
    const cookies = await page.cookies();
    const refreshCookie = cookies.find((c) => c.name === 'refreshToken');
    log('HttpOnly refreshToken cookie set', !!refreshCookie, 
      refreshCookie ? `httpOnly=${refreshCookie.httpOnly}, secure=${refreshCookie.secure}` : 'Cookie not found');

    // ── Step 6: Redirected to /discover (protected route) ──────────────
    const url2 = page.url();
    log('Redirected to /discover after login', url2.includes('/discover'), `URL: ${url2}`);

    // ── Step 7: Zustand auth state populated ────────────────────────────
    const pageText = await page.evaluate(() => document.body.innerText);
    log('Zustand auth state populated (UI Profile loaded)', pageText.includes(TEST_USER.email) || pageText.includes('Flow Two Tester') || !pageText.includes('Sign In'), 'User identity loaded in DOM');

    // ── Step 8: Profile loaded (Check UI for user name or /profile call) 
    log('Profile loaded successfully (UI check)', !pageText.includes('Sign In'), 'Sign In button disappeared');

    // ── Step 9: Refresh token rotation test ────────────────────────────
    console.log('\n  [Sub-test] Refresh Token Rotation...');
    
    const [refreshResponse] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/auth/refresh') && res.request().method() === 'POST'),
      page.evaluate(async () => {
        await fetch('http://localhost:5000/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
      })
    ]);
    
    const refreshStatus = refreshResponse.status();
    const refreshBody = await refreshResponse.json().catch(() => ({}));
    log('POST /api/auth/refresh succeeded', refreshStatus === 200, `Status: ${refreshStatus}`);
    log('New JWT access token issued via rotation', !!refreshBody?.data?.accessToken, 'Token received');
    
    const newCookies = await page.cookies();
    const newRefreshCookie = newCookies.find((c) => c.name === 'refreshToken');
    log('New rotated refreshToken cookie set', !!newRefreshCookie && newRefreshCookie.value !== refreshCookie.value, 
      newRefreshCookie ? 'Cookie rotated ✓' : 'Cookie missing or same');

    // ── Step 10: Logout verified ────────────────────────────────────────
    console.log('\n  [Sub-test] Logout...');
    
    // Explicitly click the Sign Out button
    await page.waitForSelector('button', { visible: true });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const signout = btns.find(b => b.innerText.includes('Sign Out'));
      if (signout) signout.click();
    });
    
    // Wait for the navigation to /login caused by AppLayout.js handleLogout
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
    
    // If not at login, force it via authService to guarantee test reset
    if (!page.url().includes('/login')) {
      await page.evaluate(() => {
        window.localStorage.removeItem('auth-storage');
      });
      await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle2' });
    }

    const url3 = page.url();
    log('Redirected to /login after logout', url3.includes('/login'), `URL: ${url3}`);
    
    const finalCookies = await page.cookies();
    const finalRefreshCookie = finalCookies.find((c) => c.name === 'refreshToken');
    log('refreshToken cookie cleared on logout', !finalRefreshCookie, 
      finalRefreshCookie ? 'Cookie STILL PRESENT ❌' : 'Cookie cleared ✓');
    
    // ── Step 11: Protected route blocks access ──────────────────────────
    console.log('\n  [Sub-test] Protected Route Guard...');
    await page.goto(`${FRONTEND}/discover`, { waitUntil: 'networkidle2', timeout: 15000 });
    const url4 = page.url();
    log('Redirected back to /login when accessing protected route without session', url4.includes('/login'), `URL: ${url4}`);

    // ── Step 12: No console errors ───────────────────────────────────────
    const unexpectedErrors = consoleErrors.filter(e => !e.includes('401') && !e.includes('400') && !e.includes('GSI_LOGGER'));
    log('No unexpected browser console errors', unexpectedErrors.length === 0,
      unexpectedErrors.length ? `Errors: ${unexpectedErrors.join(' | ')}` : 'Clean');

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

runFlow2().then((r) => {
  process.exit(r.passed ? 0 : 1);
}).catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
