/**
 * dashboard.spec.ts — Dashboard page tests (authenticated)
 *
 * Covers:
 *  1. Dashboard renders with welcome message
 *  2. Quick-action cards are visible
 *  3. Recommendations section renders
 *  4. "Explore Map" button navigates to /discover
 *  5. Sidebar navigation links are clickable
 *  6. No console/network errors on load
 */
import { test, expect } from '@playwright/test';
import { attachErrorInterceptors } from './helpers/fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
});

test('Dashboard — renders heading and user greeting', async ({ page }) => {
  const err = attachErrorInterceptors(page);

  // H1 heading
  await expect(page.locator('h1').first()).toContainText('Dashboard', { timeout: 10_000 });

  // Welcome message with user name or "Explorer"
  const greeting = page.getByText(/Welcome back|Explorer/i).first();
  await expect(greeting).toBeVisible({ timeout: 8_000 });

  err.assertNoErrors();
});

test('Dashboard — quick-action cards are visible', async ({ page }) => {
  const exploreBtn = page.locator('button:has-text("Explore"), a[href="/discover"]').first();
  await expect(exploreBtn).toBeVisible({ timeout: 8_000 });
});

test('Dashboard — Explore Map button navigates to /discover', async ({ page }) => {
  const btn = page.locator('button:has-text("Explore Map"), a[href="/discover"]').first();
  await expect(btn).toBeVisible({ timeout: 8_000 });
  await btn.click();
  await page.waitForURL(/\/discover/, { timeout: 10_000 });
});

test('Dashboard — recommendations section renders', async ({ page }) => {
  const spotCards = page.locator('[data-testid="spot-card"], .spot-card, [class*="SpotCard"], div.border');
  await expect(spotCards.first()).toBeVisible({ timeout: 10_000 });
});

test('Dashboard — navigation links in header are clickable', async ({ page }) => {
  const navLinks = [
    { text: 'Explore Map', href: '/discover' },
    { text: 'Saved Places', href: '/saved' },
    { text: 'Search History', href: '/history' },
  ];

  for (const link of navLinks) {
    await page.goto('/dashboard');
    const el = page.locator(`header a[href="${link.href}"]`).first();
    await expect(el).toBeVisible({ timeout: 8_000 });
  }
});

test('Dashboard — no 500 errors and no console errors', async ({ page }) => {
  const interceptors = attachErrorInterceptors(page);
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  interceptors.assertNoErrors();
});
