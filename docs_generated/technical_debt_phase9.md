# Technical Debt & Impact Audit (Phases 9A, 9B, 9C)

Transitioning the authentication subsystem into a Provider-Agnostic Identity Platform requires touching specific legacy components. To minimize risk, the execution has been split into three distinct phases. The following files are explicitly impacted.

---

## Phase 9A: OAuth Architecture & Provider Abstraction
*Status: Executed & Verified*

| Component Area | Impacted Files | Description |
| :--- | :--- | :--- |
| **Migrations** | `migrations/..._create_user_oauth_accounts.js` | Migrated away from hardcoded Google columns in the `users` table via the `user_oauth_accounts` mapping table. |
| **Domain Services**| `services/authenticationService.js` | Extracted `#establishSession`. Unified Token generation (AMR claim injection). Implemented `loginOAuth` and `unlinkOAuth`. |
| **Repositories** | `repositories/userRepository.js`, `oauthRepository.js`| Removed legacy `upsertGoogleUser`. Implemented provider lifecycle queries. |
| **Providers** | `providers/ProviderFactory.js` | HTTP Layer now delegates to specific `OAuthProvider` interface adapters (e.g., `GoogleProvider`). |

---

## Phase 9B: Enterprise Observability (Pending)
*Focus: Structured ELK logging, Prometheus Metrics, and advanced Grafana tracing.*

| Component Area | Impacted Files | Description |
| :--- | :--- | :--- |
| **Observability Core** | `utils/logger.js`, `utils/metrics.js` | Introduce Winston/Pino for JSON structured logs. Integrate `prom-client` to expose `/metrics` for Prometheus. |
| **Middleware** | `middleware/auditLogger.js` (New) | Inject Edge `correlationId` tracking across all protected endpoints. |
| **Services** | `services/authenticationService.js` | Inject metric counters (`auth_login_total`, `auth_bcrypt_duration_seconds`) and ELK logging structures. |
| **System** | `index.js`, `routes/metricRoutes.js` | Mount Prometheus scrape endpoint. |

---

## Phase 9C: MFA Readiness (Pending)
*Focus: Backend data modeling for multi-factor authentication without enforcing runtime UI blocks yet.*

| Component Area | Impacted Files | Description |
| :--- | :--- | :--- |
| **Migrations** | `migrations/..._create_mfa_tables.js` | Provision `user_mfa_methods` supporting TOTP, SMS, and WebAuthn. |
| **MFA Factory** | `providers/MfaProviderFactory.js` | Abstraction resolving dynamic strategies (WebAuthn vs SMS). |
| **Services** | `services/authenticationService.js` | Modify `#establishSession` entry point to intercept flows and issue `MFA_REQUIRED` tokens if active factors exist. |
