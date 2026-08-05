/**
 * auth.spec.ts — Authentication flows
 * Runs WITHOUT pre-loaded auth state (chromium-noauth project).
 *
 * Covers:
 *  1. Landing page renders hero & CTA
 *  2. Login — valid credentials
 *  3. Login — invalid credentials shows error
 *  4. Login — empty form validation
 *  5. Forgot password link navigates
 *  6. Signup — form renders
 *  7. Signup — password mismatch inline error
 *  8. Signup — terms unchecked error
 *  9. Full signup → OTP verify → login flow
 * 10. Forgot Password submission redirects to reset-password
 * 11. Unauthenticated redirects
 * 12. Logout via UI dropdown
 */
import { test, expect } from '@playwright/test';
import { attachErrorInterceptors, enterOtp, getLatestOtp, TEST_USER } from './helpers/fixtures';

test.describe('Landing Page', () => {
  test('renders hero section and CTA', async ({ page }) => {
    const err = attachErrorInterceptors(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Heading
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // CTA links
    const cta = page.locator('a[href="/signup"], a[href="/login"], a[href="/discover"]').first();
    await expect(cta).toBeVisible({ timeout: 8_000 });

    err.assertNoErrors();
  });
});

test.describe('Login', () => {
  test('valid credentials redirects to dashboard', async ({ page }) => {
    const err = attachErrorInterceptors(page);
    await page.goto('/login');

    await page.fill('#email', TEST_USER.email);
    await page.fill('#password', TEST_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(dashboard|discover)/, { timeout: 20_000 });
    await expect(page.locator('h1').first()).toBeVisible();

    err.assertNoErrors();
  });

  test('invalid credentials shows error message', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'nonexistent@test.local');
    await page.fill('#password', 'WrongPass999!');
    await page.click('button[type="submit"]');

    const error = page.locator('[role="alert"], p.text-rose-600, div.text-rose-600').first();
    await expect(error).toBeVisible({ timeout: 8_000 });
    expect(page.url()).toContain('/login');
  });

  test('empty form shows validation errors', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');

    const errors = page.locator('[role="alert"], p.text-rose-600, div.text-rose-600');
    await expect(errors.first()).toBeVisible({ timeout: 5_000 });
  });

  test('forgot password link is visible and navigates', async ({ page }) => {
    await page.goto('/login');
    const forgotLink = page.locator('a[href="/forgot-password"]').first();
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();
    await page.waitForURL(/forgot-password/, { timeout: 8_000 });
  });
});

test.describe('Signup', () => {
  test('renders signup form with all fields', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.locator('#termsAccepted')).toBeVisible();
  });

  test('password mismatch shows inline error', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('#name', 'Test User');
    await page.fill('#email', 'mismatch@test.local');
    await page.fill('#password', 'Password123!');
    await page.fill('#confirmPassword', 'DifferentPass!');
    await page.check('#termsAccepted');
    await page.click('button[type="submit"]');

    const error = page.getByText(/do not match|don't match/i).first();
    await expect(error).toBeVisible({ timeout: 5_000 });
  });

  test('terms unchecked shows error', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('#name', 'Test User');
    await page.fill('#email', 'terms@test.local');
    await page.fill('#password', 'Password123!');
    await page.fill('#confirmPassword', 'Password123!');
    // Do NOT check terms
    await page.click('button[type="submit"]');

    const error = page.getByText(/terms and conditions|must accept/i).first();
    await expect(error).toBeVisible({ timeout: 5_000 });
  });

  test('full signup → OTP verify → login flow', async ({ page }) => {
    const signupEmail = `e2e_user_${Date.now()}@test.local`;
    const signupPass = 'SignupPass123!';

    // 1. Register
    await page.goto('/signup');
    await page.fill('#name', 'E2E Flow User');
    await page.fill('#email', signupEmail);
    await page.fill('#password', signupPass);
    await page.fill('#confirmPassword', signupPass);
    await page.check('#termsAccepted');
    await page.click('button[type="submit"]');

    // 2. Redirect to /verify-email
    await page.waitForURL(/verify-email/, { timeout: 15_000 });

    // 3. Get OTP
    await page.waitForTimeout(2000);
    const otp = getLatestOtp(signupEmail);
    expect(otp).toBeTruthy();

    // 4. Enter OTP & submit
    await enterOtp(page, otp!);
    const verifyBtn = page.locator('button[type="submit"]').first();
    if (await verifyBtn.isVisible()) await verifyBtn.click();

    // 5. Navigate to login
    await page.waitForURL(/email-verified|dashboard|discover|login/, { timeout: 15_000 });

    // 6. Login with newly verified user
    await page.goto('/login');
    await page.fill('#email', signupEmail);
    await page.fill('#password', signupPass);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|discover)/, { timeout: 20_000 });
  });
});

test.describe('Forgot Password', () => {
  test('forgot password page renders and accepts email', async ({ page }) => {
    const err = attachErrorInterceptors(page);
    await page.goto('/forgot-password');
    await expect(page.locator('#email')).toBeVisible();
    await page.fill('#email', TEST_USER.email);
    await page.click('button[type="submit"]');

    // Should redirect to reset-password
    await page.waitForURL(/reset-password/, { timeout: 10_000 });
    err.assertNoErrors();
  });
});

test.describe('Unauthenticated Redirects', () => {
  test('visiting /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/(login|401)/, { timeout: 10_000 });
  });

  test('visiting /settings/profile redirects to /login', async ({ page }) => {
    await page.goto('/settings/profile');
    await page.waitForURL(/\/(login|401)/, { timeout: 10_000 });
  });

  test('visiting /saved redirects to /login', async ({ page }) => {
    await page.goto('/saved');
    await page.waitForURL(/\/(login|401)/, { timeout: 10_000 });
  });
});

test.describe('Logout', () => {
  test('logout via UI clears session and redirects to login', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('#email', TEST_USER.email);
    await page.fill('#password', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|discover)/, { timeout: 20_000 });

    // 2. Open avatar dropdown in header
    const avatarMenuTrigger = page.locator('header button, header .cursor-pointer').last();
    await avatarMenuTrigger.click();

    // 3. Click Sign Out
    const signOutBtn = page.getByText(/sign out|logout/i).first();
    await expect(signOutBtn).toBeVisible({ timeout: 5_000 });
    await signOutBtn.click();

    // 4. Should redirect to /login or /
    await page.waitForURL(/\/(login|$)/, { timeout: 10_000 });

    // 5. Verify /dashboard is protected again
    await page.goto('/dashboard');
    await page.waitForURL(/\/(login|401)/, { timeout: 10_000 });
  });
});
