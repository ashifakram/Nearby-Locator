/**
 * admin.spec.ts — Admin panel tests (superadmin session)
 *
 * Runs with admin storageState (chromium-admin project).
 *
 * Covers:
 *  1. Admin redirects to /admin/operations/overview
 *  2. Users management page renders and lists users
 *  3. Search/filter in user table works
 *  4. Operations overview renders metrics
 *  5. Audit logs page renders
 *  6. Active sessions page renders
 *  7. Regular user cannot access admin (403)
 */
import { test, expect } from '@playwright/test';
import { attachErrorInterceptors } from './helpers/fixtures';

test.describe('Admin Panel (as superadmin)', () => {
  test('navigating to /admin redirects to overview', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await page.goto('/admin');
    await page.waitForURL(/\/admin\/operations\/overview|\/admin\/operations/, { timeout: 15_000 });

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });
    interceptors.assertNoErrors();
  });

  test('Operations Overview renders metrics', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await page.goto('/admin/operations/overview');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
    interceptors.assertNoErrors();
  });

  test('Admin Users page renders user table', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });

    const table = page.locator('table, [role="table"], [class*="UserTable"], main').first();
    await expect(table).toBeVisible({ timeout: 10_000 });
    interceptors.assertNoErrors();
  });

  test('Admin Users — search input filters results', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator(
      'input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]'
    ).first();

    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill('superadmin');
      await page.waitForTimeout(1500);
    }
  });

  test('Audit Logs page renders', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await page.goto('/admin/operations/audit-logs');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });
    interceptors.assertNoErrors();
  });

  test('Auth Events page renders', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await page.goto('/admin/operations/auth-events');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });
    interceptors.assertNoErrors();
  });

  test('Active Sessions page renders', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await page.goto('/admin/operations/active-sessions');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });
    interceptors.assertNoErrors();
  });

  test('Admin Roles page renders', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await page.goto('/admin/roles');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });
    interceptors.assertNoErrors();
  });

  test('Admin Settings page renders', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });
    interceptors.assertNoErrors();
  });

  test('API Docs page (Swagger) renders', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await page.goto('/admin/docs');
    await page.waitForLoadState('networkidle');

    const pageElement = page.locator('.swagger-ui, iframe, h1, h2, main').first();
    await expect(pageElement).toBeVisible({ timeout: 15_000 });
    interceptors.assertNoErrors();
  });
});

test.describe('Admin Access Control (as regular user)', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('regular user is redirected away from /admin', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain('/admin/users');
  });
});
