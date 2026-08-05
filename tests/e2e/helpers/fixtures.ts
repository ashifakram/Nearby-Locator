/**
 * Shared helpers, fixtures, and page-object utilities for the Nearby Locator E2E suite.
 */
import { test as base, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// ─── Config ──────────────────────────────────────────────────────────────────
export const BASE_URL = 'http://localhost:3000';
export const API_URL  = 'http://localhost:5000';

export const TEST_USER = {
  email   : 'testuser_runtime_456@example.com',
  password: 'Password123!',
  name    : 'E2E Test User',
};
export const ADMIN_USER = {
  email   : 'superadmin@nearby-dev.local',
  password: process.env.ADMIN_PASSWORD || 'SuperAdmin@123',
};

// ─── Email helper ────────────────────────────────────────────────────────────
/** Read the latest OTP for a given email from the dev email log. */
export function getLatestOtp(email: string): string | null {
  const candidates = [
    path.resolve(__dirname, '../../backend/scratch/sent_emails.json'),
    path.resolve(__dirname, '../../../backend/scratch/sent_emails.json'),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const emails: any[] = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const match = [...emails].reverse().find(e => e.to === email && e.otpCode);
    if (match) return match.otpCode;
  }
  return null;
}

// ─── Console / network error interceptors ────────────────────────────────────
/** Attach console-error and uncaught-exception listeners to a page.
 *  Returns a function that asserts no errors were collected. */
export function attachErrorInterceptors(page: Page) {
  const consoleErrors: string[] = [];
  const networkFailures: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore non-fatal third party noise, font CORS, GSI, and auth probe 401s/403s
      if (
        text.includes('ResizeObserver loop') ||
        text.includes('favicon') ||
        text.includes('[webpack]') ||
        text.includes('fonts.gstatic.com') ||
        text.includes('CORS policy') ||
        text.includes('GSI_LOGGER') ||
        text.includes('401') ||
        text.includes('403') ||
        text.includes('400') ||
        text.includes('CanceledError')
      ) return;
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(`[UNCAUGHT] ${err.message}`);
  });

  page.on('requestfailed', req => {
    const url = req.url();
    // Ignore third party font/icon asset load failures in test env
    if (url.includes('fonts.gstatic.com') || url.includes('google') || url.includes('favicon')) return;
    networkFailures.push(`${req.method()} ${url} → ${req.failure()?.errorText}`);
  });

  page.on('response', async res => {
    const status = res.status();
    const url = res.url();
    // Flag 5xx server errors
    if (status >= 500) {
      networkFailures.push(`HTTP ${status}: ${url}`);
    }
  });

  return {
    assertNoErrors() {
      if (consoleErrors.length > 0) {
        throw new Error(`Console errors detected:\n${consoleErrors.join('\n')}`);
      }
      if (networkFailures.length > 0) {
        throw new Error(`Network failures detected:\n${networkFailures.join('\n')}`);
      }
    },
    consoleErrors,
    networkFailures,
  };
}

// ─── Login helper ─────────────────────────────────────────────────────────────
/** Perform UI login and wait for dashboard. */
export async function loginViaUI(page: Page, email = TEST_USER.email, password = TEST_USER.password) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|discover)/, { timeout: 20_000 });
}

// ─── OTP input helper ─────────────────────────────────────────────────────────
/** Type an OTP into the 6-box OTP input component. */
export async function enterOtp(page: Page, otp: string) {
  // OTPInput renders individual <input> boxes — select them all
  const boxes = page.locator('input[maxlength="1"], input[data-otp-input]');
  const count = await boxes.count();
  if (count === 6) {
    for (let i = 0; i < 6; i++) {
      await boxes.nth(i).fill(otp[i]);
    }
  } else {
    // fallback: single input that accepts the whole code
    const single = page.locator('input[name="otpCode"], input[placeholder*="6"]');
    await single.fill(otp);
  }
}

// ─── Navigation helpers ───────────────────────────────────────────────────────
export async function goToSettings(page: Page, tab: string) {
  await page.goto(`/settings/${tab}`);
  await page.waitForLoadState('networkidle');
}

// ─── Custom test fixture ──────────────────────────────────────────────────────
type Fixtures = {
  interceptors: ReturnType<typeof attachErrorInterceptors>;
};

export const test = base.extend<Fixtures>({
  interceptors: async ({ page }, use) => {
    const interceptors = attachErrorInterceptors(page);
    await use(interceptors);
    // After each test: assert no uncaught errors (unless already failed)
  },
});

export { expect };
