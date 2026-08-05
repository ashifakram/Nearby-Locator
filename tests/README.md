# Nearby Locator — Playwright E2E Test Suite

A comprehensive end-to-end regression suite that exercises the application exactly as a real user would — via the browser UI, not direct HTTP calls.

## Architecture

```
tests/e2e/
├── global.setup.ts          # Auth setup: saves user + admin sessions
├── .auth/                   # Generated auth state (gitignored)
│   ├── user.json
│   └── admin.json
├── helpers/
│   └── fixtures.ts          # Shared helpers, interceptors, page utils
├── auth.spec.ts             # Login, Signup, OTP, Forgot PW, Logout
├── dashboard.spec.ts        # Dashboard page
├── discover.spec.ts         # Discover/Search map page
├── saved-places.spec.ts     # Saved Places
├── history.spec.ts          # Search History
├── notifications.spec.ts    # Notification settings + command palette
├── settings.spec.ts         # All Settings pages (Profile, Security, etc.)
├── profile.spec.ts          # Profile, Avatar, Preferences
└── admin.spec.ts            # Admin panel (requires superadmin session)
```

## Running Tests

### Prerequisites
- Backend running on `:5000` (or let Playwright start it)
- Frontend running on `:3000` (or let Playwright start it)
- `USE_REAL_SMTP=false` in `backend/.env` (dev email log active)

### All tests (headless)
```bash
npm test
```

### Individual suites
```bash
npm run test:auth        # Auth flows (no session required)
npm run test:dashboard   # Dashboard
npm run test:discover    # Discover page
npm run test:settings    # All settings pages
npm run test:admin       # Admin panel
```

### Interactive UI mode
```bash
npm run test:ui
```

### Show HTML report
```bash
npm run test:report
```

## Projects / Auth Modes

| Project | Spec files | Auth state |
|---------|-----------|-----------|
| `setup` | `global.setup.ts` | Creates sessions |
| `chromium-noauth` | `auth.spec.ts` | No session |
| `chromium-auth` | All except auth/admin | `user.json` |
| `chromium-admin` | `admin.spec.ts` | `admin.json` |

## What Each Test Verifies

Every test:
- ✅ Interacts with the **UI** (not direct API calls)
- ✅ Verifies **rendered HTML** (headings, cards, buttons)
- ✅ Intercepts **console errors** → fails on uncaught JS errors
- ✅ Intercepts **5xx responses** → fails on server errors
- ✅ **Screenshots** on failure (in `test-results/`)
- ✅ **HTML report** at `playwright-report/index.html`
- ✅ **JUnit XML** at `test-results/junit.xml`
- ✅ Runs **headlessly** with `headless: true`

## CI Integration

See [`.github/workflows/e2e.yml`](.github/workflows/e2e.yml) for the full GitHub Actions pipeline.

## Test User Credentials

| Role | Email | Password |
|------|-------|----------|
| Regular User | `testuser_runtime_456@example.com` | `Password123!` |
| Admin | `superadmin@nearby-dev.local` | `$ADMIN_PASSWORD` |

## Coverage Map

| Feature | Spec | Tests |
|---------|------|-------|
| Login (valid/invalid/empty) | auth.spec.ts | 4 |
| Signup + OTP verify | auth.spec.ts | 4 |
| Forgot password | auth.spec.ts | 1 |
| Unauthenticated redirects | auth.spec.ts | 3 |
| Logout | auth.spec.ts | 1 |
| Dashboard | dashboard.spec.ts | 5 |
| Discover + search + save | discover.spec.ts | 7 |
| Saved Places | saved-places.spec.ts | 4 |
| Search History | history.spec.ts | 4 |
| Notification settings | notifications.spec.ts | 4 |
| Profile settings | settings.spec.ts | 3 |
| Security + Password change | settings.spec.ts | 3 |
| Privacy settings | settings.spec.ts | 2 |
| Appearance settings | settings.spec.ts | 1 |
| Sessions management | settings.spec.ts | 2 |
| Danger Zone | settings.spec.ts | 2 |
| Profile + Avatar | profile.spec.ts | 4 |
| Admin panel | admin.spec.ts | 9 |
| Admin access control | admin.spec.ts | 1 |
| **Total** | | **~64 tests** |
