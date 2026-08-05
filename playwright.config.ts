import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,           // serial to avoid shared auth state conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    // Inject geolocation so discover page gets SF coords without a real GPS prompt
    geolocation: { latitude: 37.7749, longitude: -122.4194 },
    permissions: ['geolocation'],
  },

  projects: [
    // ── Phase 1: Setup — authenticate once and save sessions ──────────────
    {
      name: 'setup',
      testMatch: /global\.setup\.[tj]s/,
    },

    // ── Phase 2a: Auth tests (no pre-loaded session) ──────────────────────
    {
      name: 'chromium-noauth',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/auth.spec.[tj]s'],
    },

    // ── Phase 2b: Regular-user tests (use saved session) ─────────────────
    {
      name: 'chromium-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: ['**/auth.spec.[tj]s', '**/admin.spec.[tj]s'],
    },

    // ── Phase 2c: Admin tests (use saved admin session) ───────────────────
    {
      name: 'chromium-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/admin.json',
      },
      testMatch: ['**/admin.spec.[tj]s'],
      dependencies: ['setup'],
    },
  ],

  // Auto-start servers if not already running (reuse existing in dev)
  webServer: [
    {
      command: 'npm start',
      cwd: 'backend',
      // Discovery search with no creds returns 200 — use as health check
      url: 'http://localhost:5000/api/discovery/search?lat=0&lng=0&radius=1',
      reuseExistingServer: true,
      ignoreHTTPSErrors: true,
      timeout: 30_000,
    },
    {
      command: 'npm run dev',
      cwd: 'frontend',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      ignoreHTTPSErrors: true,
      timeout: 60_000,
    },
  ],
});
