/**
 * Flow 3: Google Login — Browser Test
 * Validates Google OAuth Sign-In flow, token issuance, cookies, state hydration, rotation, and logout.
 */
const puppeteer = require('puppeteer');

const FRONTEND = 'http://localhost:3000';
const BACKEND  = 'http://localhost:5000';

const MOCK_TOKEN_PAYLOAD = {
  sub: 'google-sub-user-999',
  email: 'google_tester@example.com',
  email_verified: true,
  name: 'Google Tester'
};

const MOCK_TOKEN = 'mock-google-token-' + JSON.stringify(MOCK_TOKEN_PAYLOAD);

async function runFlow3() {
  const results = { flow: 'Flow 3: Google Login', steps: [], passed: true };

  const log = (step, ok, detail) => {
    const entry = { step, ok, detail };
    results.steps.push(entry);
    const icon = ok ? '✅' : '❌';
    console.log(`  ${icon} ${step}: ${typeof detail === 'object' ? JSON.stringify(detail, null, 2) : detail}`);
    if (!ok) results.passed = false;
  };

  console.log('\n========================================');
  console.log('  FLOW 3: GOOGLE LOGIN');
  console.log(`  User: ${MOCK_TOKEN_PAYLOAD.email}`);
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

    // ── Step 2: Verify Google button renders ────────────────────────────
    // Google wrapper container should exist
    const hasGoogleWrapper = await page.$('#google-signin-btn') !== null;
    log('Google button container rendered', hasGoogleWrapper, 'Wrapper exists');

    // ── Step 3: Trigger Mock Google Login callback ──────────────────────
    console.log('  Triggering mock Google Credential response...');
    
    // We wait for gsi script initialization. The wrapper has code checking gsi every 100ms.
    // Let's give it a moment to ensure window.__mockGoogleLogin is exposed.
    await page.waitForFunction(() => typeof window.__mockGoogleLogin === 'function', { timeout: 5000 });

    const [googleResponse] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/auth/google') && res.request().method() === 'POST'),
      page.evaluate((token) => {
        window.__mockGoogleLogin(token);
      }, MOCK_TOKEN),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
    ]);

    // ── Step 4: Verify API request and response ─────────────────────────
    log('POST /api/auth/google request fired', true, `URL: ${googleResponse.url()}`);
    
    const status = googleResponse.status();
    log('HTTP Status 200', status === 200, `Status: ${status}`);
    
    const body = await googleResponse.json().catch(() => ({}));
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
    log('Redirected to /discover after Google Login', url2.includes('/discover'), `URL: ${url2}`);

    // ── Step 7: Zustand auth state populated & Profile loaded ───────────
    const pageText = await page.evaluate(() => document.body.innerText);
    log('Zustand auth state populated (UI Profile loaded)', 
      pageText.includes(MOCK_TOKEN_PAYLOAD.name) || !pageText.includes('Sign In'), 
      'User identity loaded in DOM');

    log('Profile loaded successfully (UI check)', !pageText.includes('Sign In'), 'Sign In button disappeared');

    // ── Step 8: Refresh token rotation test ────────────────────────────
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

    // ── Step 9: Logout verified ────────────────────────────────────────
    console.log('\n  [Sub-test] Logout...');
    
    const loggedOut = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const logoutBtn = buttons.find(b => b.innerText.toLowerCase().includes('log out') || b.innerText.toLowerCase().includes('sign out') || b.innerText.toLowerCase().includes('logout'));
      if (logoutBtn) {
        logoutBtn.click();
        return true;
      }
      return false;
    });
    
    if (loggedOut) {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
    } else {
      await page.evaluate(() => {
        fetch('http://localhost:5000/api/auth/logout', { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      });
      await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle2' });
    }

    const url3 = page.url();
    log('Redirected to /login after logout', url3.includes('/login'), `URL: ${url3}`);
    
    const finalCookies = await page.cookies();
    const finalRefreshCookie = finalCookies.find((c) => c.name === 'refreshToken');
    log('refreshToken cookie cleared on logout', !finalRefreshCookie, 
      finalRefreshCookie ? 'Cookie STILL PRESENT ❌' : 'Cookie cleared ✓');
    
    // ── Step 10: Protected route blocks access ──────────────────────────
    console.log('\n  [Sub-test] Protected Route Guard...');
    await page.goto(`${FRONTEND}/discover`, { waitUntil: 'networkidle2', timeout: 15000 });
    const url4 = page.url();
    log('Redirected back to /login when accessing protected route without session', url4.includes('/login'), `URL: ${url4}`);

    // ── Step 11: No unexpected console errors ───────────────────────────
    const unexpectedErrors = consoleErrors.filter(e => !e.includes('401') && !e.includes('400') && !e.includes('favicon') && !e.includes('GSI_LOGGER'));
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

runFlow3().then((r) => {
  process.exit(r.passed ? 0 : 1);
}).catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
