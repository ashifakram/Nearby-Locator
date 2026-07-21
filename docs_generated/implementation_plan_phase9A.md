# Phase 9A: OAuth Architecture Implementation Plan

This implementation plan focuses exclusively on transitioning the platform from Local Authentication to a Provider-Agnostic Identity Architecture. It explicitly defers Observability (9B) and MFA Readiness (9C) to subsequent phases to isolate risk.

## Safe Migration Strategy
To guarantee zero downtime and prevent data loss, the schema refactor will occur in a phased approach. **We will NOT drop the legacy `provider` and `google_id` columns in this phase.**

1. **Schema Addition**: Create the `user_oauth_accounts` table and `login_history` table.
2. **Data Backfill**: Execute an `INSERT INTO ... SELECT` query inside the migration to copy all existing Google users from `users` into `user_oauth_accounts`.
3. **Code Transition**: Update `AuthenticationService` and `UserRepository` to exclusively read and write to the new `user_oauth_accounts` table.
4. **Verification**: Run E2E suites and verify production data behaves correctly.
5. **Future Phase**: A strictly destructive migration will be scheduled later to `DROP COLUMN google_id, provider`.

---

## Proposed Implementation Steps

### 1. Database Schema
#### [NEW] `migrations/20260708_create_user_oauth_accounts.js`
- Create `user_oauth_accounts` (id, user_id, provider, provider_user_id, email, is_email_verified, lifecycle_status, linked_at, last_login_at, metadata).
- **Backfill Script**: `INSERT INTO user_oauth_accounts (user_id, provider, provider_user_id, email, is_email_verified) SELECT id, 'google', google_id, email, true FROM users WHERE provider = 'google'`.

#### [NEW] `migrations/20260708_create_login_history.js`
- Create `login_history` (id, user_id, session_family_id, login_method, device_type, os_name, browser_name, location_city, occurred_at). *(Note: Successful logins only, no IPs).*

### 2. Provider Abstraction Layer
#### [NEW] `providers/ProviderFactory.js`
- Resolves the requested provider adapter dynamically.

#### [NEW] `providers/GoogleProvider.js`
- Implements `verifyAndNormalize` logic and strict metadata schema `{hd, picture, locale}` migrating away from the raw `authController` google endpoint.

#### [NEW] `providers/AppleProvider.js`
- A stub implementing the `OAuthProvider` interface to guarantee the architecture can support Apple natively without modifying core domains. Strict metadata schema `{is_private_email, real_user_status}`.

### 3. Repositories
#### [MODIFY] `repositories/userRepository.js`
- Remove legacy `upsertGoogleUser` and `delinkGoogle`.

#### [NEW] `repositories/oauthRepository.js`
- Implement `linkProvider(userId, profile, executor)`.
- Implement `findByProvider(provider, providerId, executor)`.
- Implement `unlinkProvider(userId, provider, executor)` (Sets `lifecycle_status = 'UNLINKED'`).

### 4. Core Domain Service
#### [MODIFY] `services/authenticationService.js`
- Implement `async loginOAuth(normalizedProfile, metadata)`.
- Extract unified `#establishSession(user, amrArray, metadata, executor)`.
- Implement agnostic `unlinkOAuth(userId, provider)`.
- Inject the standard RFC 8112 `"amr"` claim into the JWT payload (`['pwd']`, `['google']`, `['apple']`).

### 5. HTTP Layer
#### [MODIFY] `controllers/authController.js`
- Refactor `googleUpsert` to invoke `ProviderFactory.get('google')` and `AuthenticationService.loginOAuth`.
- Convert `googleDelink` to a dynamic `DELETE /providers/:provider` pointing to `AuthenticationService.unlinkOAuth`.
