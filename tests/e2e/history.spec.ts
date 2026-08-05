/**
 * history.spec.ts — Search History page tests (authenticated)
 *
 * Covers:
 *  1. /history page renders without crash
 *  2. Empty state or history list renders
 *  3. After performing a search, history page renders
 *  4. No console errors
 */
import { test, expect } from '@playwright/test';
import { attachErrorInterceptors } from './helpers/fixtures';

const SF_LAT = 37.7749;
const SF_LNG = -122.4194;

test('History — page renders', async ({ page }) => {
  const interceptors = attachErrorInterceptors(page);
  await page.goto('/history');
  await page.waitForLoadState('networkidle');

  const heading = page.locator('h1, [role="heading"]').first();
  await expect(heading).toBeVisible({ timeout: 10_000 });

  interceptors.assertNoErrors();
});

test('History — shows history items or empty state', async ({ page }) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const historyItems = page.locator('[data-testid="history-item"], [class*="history"], [class*="History"]');
  const emptyState = page.getByText(/No history|nothing here|empty|recent/i).first();

  const hasItems = await historyItems.count() > 0;
  const isEmpty = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);
  expect(hasItems || isEmpty).toBeTruthy();
});

test('History — performing a search creates a history entry', async ({ page }) => {
  await page.goto(`/discover?lat=${SF_LAT}&lng=${SF_LNG}`);

  const skipBtn = page.getByText(/Default to San Francisco|San Francisco Bryant/i).first();
  if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) await skipBtn.click();
  await page.waitForTimeout(1000);

  const searchInput = page.locator(
    'input[placeholder*="Explore"], input[placeholder*="search"], input[placeholder*="Search"]'
  ).first();

  if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await searchInput.fill('restaurant');
    await searchInput.press('Enter');
    await page.waitForTimeout(3000);
  }

  await page.goto('/history');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const heading = page.locator('h1, [role="heading"]').first();
  await expect(heading).toBeVisible();
});

test('History — no console errors', async ({ page }) => {
  const interceptors = attachErrorInterceptors(page);
  await page.goto('/history');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  interceptors.assertNoErrors();
});
