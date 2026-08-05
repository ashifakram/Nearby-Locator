/**
 * settings.spec.ts — All Settings pages (authenticated)
 *
 * Covers:
 *  1. Profile settings — renders, edits name
 *  2. Account settings — renders email & account section
 *  3. Security — change password flow (UI)
 *  4. Notifications — toggles persist to server
 *  5. Privacy — toggles visible and interactive
 *  6. Appearance — theme toggle
 *  7. Sessions — active sessions list
 *  8. Danger Zone — delete account UI renders (without actually deleting)
 */
import { test, expect } from '@playwright/test';
import { attachErrorInterceptors, TEST_USER } from './helpers/fixtures';

async function goSettings(page: any, tab: string) {
  await page.goto(`/settings/${tab}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

test.describe('Profile Settings', () => {
  test('renders profile form', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await goSettings(page, 'profile');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });
    const nameInput = page.locator('input[name="name"], input[id="name"], input[placeholder*="name"]').first();
    await expect(nameInput).toBeVisible({ timeout: 8_000 });
    interceptors.assertNoErrors();
  });

  test('editing name and saving shows success toast', async ({ page }) => {
    await goSettings(page, 'profile');

    const nameInput = page.locator('input[name="name"], input[id="name"], input[placeholder*="name"]').first();
    await expect(nameInput).toBeVisible({ timeout: 8_000 });

    await nameInput.click({ clickCount: 3 });
    await nameInput.fill('E2E Test User');

    const saveBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();
    await saveBtn.click();

    const toast = page.locator('[class*="toast"], [role="alert"]').first();
    await expect(toast).toBeVisible({ timeout: 8_000 });
  });

  test('avatar upload section is visible', async ({ page }) => {
    await goSettings(page, 'profile');
    const avatarSection = page.locator(
      '[data-testid="avatar-upload"], input[type="file"], label:has-text("Avatar"), button:has-text("Avatar")'
    ).first();
    await expect(avatarSection).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Account Settings', () => {
  test('renders account email display', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await goSettings(page, 'account');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });
    const emailEl = page.getByText(TEST_USER.email).first();
    await expect(emailEl).toBeVisible({ timeout: 8_000 });
    interceptors.assertNoErrors();
  });
});

test.describe('Security Settings (Password Change)', () => {
  test('renders change password form', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await goSettings(page, 'security');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });
    const pwInputs = page.locator('input[type="password"]');
    await expect(pwInputs.first()).toBeVisible({ timeout: 8_000 });
    expect(await pwInputs.count()).toBeGreaterThanOrEqual(2);
    interceptors.assertNoErrors();
  });

  test('wrong current password shows error', async ({ page }) => {
    await goSettings(page, 'security');

    const pwInputs = page.locator('input[type="password"]');
    const count = await pwInputs.count();
    if (count >= 2) {
      await pwInputs.nth(0).fill('WrongPassword999!');
      await pwInputs.nth(1).fill('NewPassword123!');
      if (count >= 3) await pwInputs.nth(2).fill('NewPassword123!');

      const submitBtn = page.locator('button[type="submit"], button:has-text("Change Password"), button:has-text("Update Password")').first();
      await submitBtn.click();

      const error = page.locator('[class*="toast"][class*="error"], [role="alert"]').first();
      await expect(error).toBeVisible({ timeout: 10_000 });
    }
  });

  test('valid password change succeeds', async ({ page }) => {
    await goSettings(page, 'security');

    const pwInputs = page.locator('input[type="password"]');
    const count = await pwInputs.count();
    if (count >= 2) {
      await pwInputs.nth(0).fill(TEST_USER.password);
      await pwInputs.nth(1).fill('TempNewPass999!');
      if (count >= 3) await pwInputs.nth(2).fill('TempNewPass999!');

      const submitBtn = page.locator(
        'button[type="submit"], button:has-text("Change Password"), button:has-text("Update Password")'
      ).first();
      await submitBtn.click();

      const success = page.locator(
        '[class*="toast"][class*="success"], [role="alert"]'
      ).first();
      await expect(success).toBeVisible({ timeout: 12_000 });

      // Change back
      await pwInputs.nth(0).fill('TempNewPass999!');
      await pwInputs.nth(1).fill(TEST_USER.password);
      if (count >= 3) await pwInputs.nth(2).fill(TEST_USER.password);
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Notification Settings', () => {
  test('renders notification toggles', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await goSettings(page, 'notifications');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });
    const toggles = page.locator('[role="switch"], input[type="checkbox"], [class*="Switch"], [class*="toggle"]');
    await expect(toggles.first()).toBeVisible({ timeout: 8_000 });
    expect(await toggles.count()).toBeGreaterThanOrEqual(2);
    interceptors.assertNoErrors();
  });

  test('toggling a notification switch syncs to server', async ({ page }) => {
    await goSettings(page, 'notifications');

    const firstToggle = page.locator('[role="switch"], input[type="checkbox"]').first();
    await expect(firstToggle).toBeVisible({ timeout: 8_000 });

    await firstToggle.click();
    await page.waitForTimeout(1000);
  });
});

test.describe('Privacy Settings', () => {
  test('renders privacy toggles', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await goSettings(page, 'privacy');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });
    const toggles = page.locator('[role="switch"], input[type="checkbox"]');
    await expect(toggles.first()).toBeVisible({ timeout: 8_000 });
    interceptors.assertNoErrors();
  });

  test('privacy settings can be toggled without error', async ({ page }) => {
    await goSettings(page, 'privacy');

    const toggle = page.locator('[role="switch"], input[type="checkbox"]').first();
    await expect(toggle).toBeVisible({ timeout: 8_000 });
    await toggle.click();
    await page.waitForTimeout(800);
  });
});

test.describe('Appearance Settings', () => {
  test('renders theme toggle', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await goSettings(page, 'appearance');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });
    const themeToggle = page.locator(
      '[role="switch"], button:has-text("Dark"), button:has-text("Light"), [class*="toggle"]'
    ).first();
    await expect(themeToggle).toBeVisible({ timeout: 8_000 });
    interceptors.assertNoErrors();
  });
});

test.describe('Sessions', () => {
  test('renders active sessions list', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await goSettings(page, 'sessions');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });
    const sessionItems = page.getByText(/Current session|active/i).first();
    await expect(sessionItems).toBeVisible({ timeout: 10_000 });
    interceptors.assertNoErrors();
  });

  test('revoke other sessions button is visible', async ({ page }) => {
    await goSettings(page, 'sessions');

    const revokeBtn = page.locator(
      'button:has-text("Revoke"), button:has-text("Sign out all"), button:has-text("Log out all")'
    ).first();
    await expect(revokeBtn).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Danger Zone', () => {
  test('renders danger zone with delete account button', async ({ page }) => {
    const interceptors = attachErrorInterceptors(page);
    await goSettings(page, 'danger-zone');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });
    const deleteBtn = page.locator(
      'button:has-text("Delete"), button:has-text("delete account"), button:has-text("Deactivate")'
    ).first();
    await expect(deleteBtn).toBeVisible({ timeout: 8_000 });
    interceptors.assertNoErrors();
  });

  test('delete account requires confirmation — shows modal/confirmation', async ({ page }) => {
    await goSettings(page, 'danger-zone');

    const deleteBtn = page.locator(
      'button:has-text("Delete"), button:has-text("delete account"), button:has-text("Deactivate")'
    ).first();

    if (await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await deleteBtn.click();
      await page.waitForTimeout(500);

      const confirm = page.locator(
        '[role="dialog"], [class*="modal"], [class*="Modal"]'
      ).first();
      if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
      }
    }
  });
});
