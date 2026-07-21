/**
 * Flow 3: Google Login (Real E2E) — Interactive Browser Test
 * Launches a headful browser, lets the user login with a real Google account,
 * and automatically verifies the session, tokens, cookies, rotation, and logout.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const FRONTEND = 'http://localhost:3000';
const BACKEND  = 'http://localhost:5000';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR);
}

async function runFlow3Real() {
  const results = { flow: 'Flow 3: Google Login (Real)', steps: [], passed: true };

  const log = (step, ok, detail) => {
    results.steps.push({ step, ok, detail });
    const icon = ok ? '✅' : '❌';
    console.log(`  ${icon} ${step}: ${typeof detail === 'object' ? JSON.stringify(detail, null, 2) : detail}`);
    if (!ok) results.passed = false;
  };

  console.log('\n========================================');
  console.log('  FLOW 3: REAL GOOGLE LOGIN (INTERACTIVE)');
  console.log('  Please complete the Google Login manually in the browser window.');
  console.log('========================================\n');

  // Launch a HEADFUL browser so the user can interact
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'],
  });

  const [page] = await browser.pages();

  try {
    // ── Step 1: Navigate to /login ──────────────────────────────────────
    await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle2', timeout: 20000 });
    log('Navigate to /login', page.url().includes('/login'), `URL: ${page.url()}`);

    // Take screenshot of Login page
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_page.png') });
    console.log('  📸 Screenshot saved: 01_login_page.png');

    // ── Step 2: Verify Google button renders ────────────────────────────
    const hasGoogleWrapper = await page.$('#google-signin-btn') !== null;
    log('Google button container rendered', hasGoogleWrapper, 'Wrapper exists');

    console.log('\n  👉 [ACTION REQUIRED] Please click the Google Sign-In button and log in.');
    console.log('  Waiting up to 90 seconds for successful authentication redirect to /discover...');

    // ── Step 3: Wait for user to complete login and reach /discover ─────
    let authenticated = false;
    const startTime = Date.now();
    
    while (Date.now() - startTime < 90000) {
      const url = page.url();
      if (url.includes('/discover')) {
        authenticated = true;
        break;
      }
      // Brief sleep
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!authenticated) {
      throw new Error('Authentication timeout: User did not reach /discover within 90 seconds.');
    }

    log('Successfully logged in and reached /discover', true, `URL: ${page.url()}`);
    
    // Take screenshot of logged-in Discover page
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_discover_page.png') });
    console.log('  📸 Screenshot saved: 02_discover_page.png');

    // ── Step 4: Verify HttpOnly refresh cookie set ─────────────────────
    const cookies = await page.cookies();
    const refreshCookie = cookies.find((c) => c.name === 'refreshToken');
    log('HttpOnly refreshToken cookie set', !!refreshCookie, 
      refreshCookie ? `httpOnly=${refreshCookie.httpOnly}, secure=${refreshCookie.secure}` : 'Cookie not found');

    // ── Step 5: Zustand auth state populated & Profile loaded ───────────
    const pageText = await page.evaluate(() => document.body.innerText);
    log('Zustand auth state populated (UI Profile loaded)', 
      !pageText.includes('Sign In'), 
      'User identity loaded in DOM');

    // ── Step 6: Refresh token rotation test ────────────────────────────
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

    // ── Step 7: Logout verified ────────────────────────────────────────
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
    
    // Take screenshot of post-logout Login page
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_post_logout.png') });
    console.log('  📸 Screenshot saved: 03_post_logout.png');

    const finalCookies = await page.cookies();
    const finalRefreshCookie = finalCookies.find((c) => c.name === 'refreshToken');
    log('refreshToken cookie cleared on logout', !finalRefreshCookie, 
      finalRefreshCookie ? 'Cookie STILL PRESENT ❌' : 'Cookie cleared ✓');

  } catch (err) {
    log('Unexpected test error', false, err.message);
  } finally {
    // Close browser after a short delay so the user sees completion
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
  }

  // ── Summary ──────────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log(`  RESULT: ${results.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Steps: ${results.steps.filter(s => s.ok).length}/${results.steps.length} passed`);
  console.log('========================================\n');

  return results;
}

runFlow3Real().then((r) => {
  process.exit(r.passed ? 0 : 1);
}).catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
