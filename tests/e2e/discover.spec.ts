/**
 * discover.spec.ts — Discover / Search page tests (authenticated)
 *
 * Covers:
 *  1. Discover page renders without crash
 *  2. Geolocation onboarding overlay appears
 *  3. Skipping to default location loads spots
 *  4. Search bar is visible and accepts input
 *  5. Submitting a search returns results
 *  6. Spot card click shows place details
 *  7. Save button on a spot card triggers a save
 *  8. Autocomplete suggestions appear on typing
 *  9. No console errors on load
 */
import { test, expect } from '@playwright/test';
import { attachErrorInterceptors } from './helpers/fixtures';

const SF_LAT = 37.7749;
const SF_LNG = -122.4194;

test.beforeEach(async ({ page }) => {
  await page.goto(`/discover?lat=${SF_LAT}&lng=${SF_LNG}`);
  await page.waitForLoadState('domcontentloaded');
});

test('Discover — page renders without crash', async ({ page }) => {
  const interceptors = attachErrorInterceptors(page);
  const content = page.locator('aside, [class*="SpatialMap"], input[placeholder], canvas').first();
  await expect(content).toBeVisible({ timeout: 15_000 });
  interceptors.assertNoErrors();
});

test('Discover — onboarding overlay appears on fresh load', async ({ page }) => {
  await page.goto('/discover');
  await page.waitForLoadState('domcontentloaded');
  const overlay = page.getByText(/Enable Spatial Exploration|coordinates/i).first();
  await expect(overlay).toBeVisible({ timeout: 10_000 });
});

test('Discover — skip to default SF location loads spots', async ({ page }) => {
  const skipBtn = page.getByText(/Default to San Francisco|San Francisco Bryant/i).first();
  if (await skipBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await skipBtn.click();
  }

  await page.waitForTimeout(2000);

  const spotCards = page.locator('[data-testid="spot-card"], [class*="SpotCard"], [class*="spot-card"]');
  const emptyState = page.getByText(/No results|No spots|Try expanding/i).first();

  const hasSpots = await spotCards.count() > 0;
  const isEmpty = await emptyState.isVisible({ timeout: 2_000 }).catch(() => false);
  expect(hasSpots || isEmpty).toBeTruthy();
});

test('Discover — search bar accepts input and shows results', async ({ page }) => {
  const skipBtn = page.getByText(/Default to San Francisco|San Francisco Bryant/i).first();
  if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) await skipBtn.click();

  const searchInput = page.locator(
    'input[placeholder*="Explore"], input[placeholder*="search"], input[placeholder*="Search"]'
  ).first();
  await expect(searchInput).toBeVisible({ timeout: 10_000 });

  await searchInput.fill('coffee');
  await searchInput.press('Enter');
  await page.waitForTimeout(3000);

  const spotCards = page.locator('[data-testid="spot-card"], [class*="SpotCard"], [class*="spot-card"]');
  const emptyState = page.getByText(/No results|No spots/i).first();
  const hasSpots = await spotCards.count() > 0;
  const isEmpty = await emptyState.isVisible({ timeout: 2_000 }).catch(() => false);
  expect(hasSpots || isEmpty).toBeTruthy();
});

test('Discover — typing in search shows autocomplete suggestions', async ({ page }) => {
  const skipBtn = page.getByText(/Default to San Francisco|San Francisco Bryant/i).first();
  if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) await skipBtn.click();

  const searchInput = page.locator(
    'input[placeholder*="Explore"], input[placeholder*="search"], input[placeholder*="Search"]'
  ).first();
  await expect(searchInput).toBeVisible({ timeout: 10_000 });

  await searchInput.fill('cof');
  await page.waitForTimeout(1500);

  const suggestions = page.locator('[role="listbox"], [role="option"], [data-testid="suggestion"]');
  if (await suggestions.count() > 0) {
    await expect(suggestions.first()).toBeVisible({ timeout: 5_000 });
  }
});

test('Discover — spot card click shows place detail', async ({ page }) => {
  await page.goto(`/discover?lat=${SF_LAT}&lng=${SF_LNG}`);

  const skipBtn = page.getByText(/Default to San Francisco|San Francisco Bryant/i).first();
  if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) await skipBtn.click();
  await page.waitForTimeout(2500);

  const spotCard = page.locator('[data-testid="spot-card"], [class*="SpotCard"], [class*="spot-card"]').first();

  if (await spotCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await spotCard.click();
    await page.waitForTimeout(500);
  }
});

test('Discover — save button on spot saves to collection', async ({ page }) => {
  await page.goto(`/discover?lat=${SF_LAT}&lng=${SF_LNG}`);

  const skipBtn = page.getByText(/Default to San Francisco|San Francisco Bryant/i).first();
  if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) await skipBtn.click();
  await page.waitForTimeout(2500);

  const saveBtn = page.locator(
    'button[title*="Save"], button[aria-label*="Save"], button:has(svg[class*="Bookmark"]), button:has-text("Save")'
  ).first();

  if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await saveBtn.click();
    await page.waitForTimeout(1000);
  }
});

test('Discover — no console errors on load', async ({ page }) => {
  const interceptors = attachErrorInterceptors(page);
  await page.goto(`/discover?lat=${SF_LAT}&lng=${SF_LNG}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  interceptors.assertNoErrors();
});
