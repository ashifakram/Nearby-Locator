/**
 * Global setup: authenticate as regular user and admin, persist storage state.
 * Runs once before all tests.
 */
import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import http from 'http';

const USER_EMAIL = 'testuser_runtime_456@example.com';
const USER_PASSWORD = 'Password123!';

const ADMIN_EMAIL = 'superadmin@nearby-dev.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SuperAdmin@123';

const AUTH_DIR = path.join(__dirname, '.auth');

// Helper: read latest OTP from dev email log
function getLatestOtp(email: string): string | null {
  try {
    const logPath = path.resolve(
      __dirname, '../../../backend/scratch/sent_emails.json'
    );
    const emails = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    const match = [...emails]
      .reverse()
      .find((e: any) => e.to === email && e.otpCode);
    return match?.otpCode ?? null;
  } catch {
    return null;
  }
}

// Helper: call backend API directly to get OTP (for tests only)
function httpPost(path: string, body: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 5000, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'http://localhost:3000',
        'Content-Length': Buffer.byteLength(data),
      }
    };
    const req = http.request(opts, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch { resolve({}); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

setup('authenticate as regular user', async ({ page }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // --- Ensure the test user exists and is verified ---
  // Try to register (may already exist — that's fine)
  const signup = await httpPost('/api/auth/signup', {
    email: USER_EMAIL,
    password: USER_PASSWORD,
    name: 'E2E Test User',
  });

  // If just registered, verify email via OTP
  if (signup.status === 201) {
    await new Promise(r => setTimeout(r, 1000)); // let email be written
    const otp = getLatestOtp(USER_EMAIL);
    if (otp) {
      await httpPost('/api/auth/verify-email', { email: USER_EMAIL, otpCode: otp });
    }
  }

  // --- Navigate to login and authenticate ---
  await page.goto('/login');
  await page.fill('#email', USER_EMAIL);
  await page.fill('#password', USER_PASSWORD);
  await page.click('button[type="submit"]');

  // Should redirect to dashboard
  await page.waitForURL(/\/(dashboard|discover)/, { timeout: 15_000 });

  // Persist storage state
  await page.context().storageState({ path: path.join(AUTH_DIR, 'user.json') });
  console.log('[setup] Regular user session saved.');
});

setup('authenticate as admin user', async ({ page }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  await page.goto('/login');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');

  // Admin might land on dashboard or admin panel
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15_000 });
  await page.context().storageState({ path: path.join(AUTH_DIR, 'admin.json') });
  console.log('[setup] Admin session saved.');
});
