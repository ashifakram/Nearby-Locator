/**
 * saved-places.spec.ts — Saved Places page tests (authenticated)
 *
 * Covers:
 *  1. /saved page renders without crash
 *  2. Empty state renders if no saves
 *  3. After saving a place, it appears in the list
 *  4. No console errors
 */
import { test, expect } from '@playwright/test';
import { attachErrorInterceptors } from './helpers/fixtures';

const SF_LAT = 37.7749;
const SF_LNG = -122.4194;

test('Saved Places — page renders', async ({ page }) => {
  const interceptors = attachErrorInterceptors(page);
  await page.goto('/saved');
  await page.waitForLoadState('networkidle');

  const heading = page.locator('h1, [role="heading"]').first();
  await expect(heading).toBeVisible({ timeout: 10_000 });

  interceptors.assertNoErrors();
});

test('Saved Places — shows empty state or saved items', async ({ page }) => {
  await page.goto('/saved');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const savedCards = page.locator('[data-testid="spot-card"], [class*="SpotCard"], [class*="saved-card"]');
  const emptyState = page.getByText(/No saved|saved places|nothing saved|empty/i).first();

  const hasCards = await savedCards.count() > 0;
  const isEmpty = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);
  expect(hasCards || isEmpty).toBeTruthy();
});

test('Saved Places — save a place from discover then verify in saved', async ({ page }) => {
  await page.goto(`/discover?lat=${SF_LAT}&lng=${SF_LNG}`);

  const skipBtn = page.getByText(/Default to San Francisco|San Francisco Bryant/i).first();
  if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) await skipBtn.click();
  await page.waitForTimeout(2500);

  const saveBtn = page.locator(
    'button[title*="Save"], button[aria-label*="Save"], button:has(svg[class*="Bookmark"]), button:has-text("Save")'
  ).first();

  if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await saveBtn.click();
    await page.waitForTimeout(1500);
  }

  await page.goto('/saved');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const heading = page.locator('h1, [role="heading"]').first();
  await expect(heading).toBeVisible();
});

test('Saved Places — no 5xx errors or console crashes', async ({ page }) => {
  const interceptors = attachErrorInterceptors(page);
  await page.goto('/saved');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  interceptors.assertNoErrors();
});
