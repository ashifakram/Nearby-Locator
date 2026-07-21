# 01: Authentication Architecture (FROZEN)

This document represents the finalized, immutable architectural blueprint for the new enterprise Authentication and Authorization module. It consolidates the database design, layer mandates, domain boundaries, and orchestration workflows.

---

## 1. The 4-Tier Layer System

The application strictly enforces a 4-tier layer system to separate orchestration, domain logic, and persistence.

1.  **Controllers**: Edge routing, DTO mapping, and HTTP Cookie generation.
2.  **Application Services** (e.g., `AuthenticationService`): Orchestrates multi-domain workflows. **The only layer allowed to coordinate multiple Domain Services inside a single transaction.**
3.  **Domain Services** (e.g., `IdentityService`, `SessionService`): Isolated, atomic domain logic. **Domain Services may never call each other.**
4.  **Repositories**: Dumb persistence boundaries. **Repositories may never call other repositories.**

---

## 2. Target Database Schema

The monolithic legacy schema has been decentralized into bounded tables:

*   **`users`**: Core identity (email, password hash, status).
*   **`user_oauth_identities`**: 1-to-Many provider links (Google ID mapping).
*   **`user_sessions`**: 1-to-Many cryptographic sessions (Refresh Token, Replay detection, Rotation state).
*   **`email_verification_tokens`**: Ephemeral cryptographic tokens for email verification.
*   **`password_reset_tokens`**: Ephemeral cryptographic tokens for password recovery.
*   **`authentication_events`**: Audit logs detailing login successes, failures, lockouts, and security violations.

---

## 3. Domain Service Boundaries

The Application logic is split into highly specialized, isolated Domain Services.

### 3.1. IdentityService
Owns the core `User` model, cryptographic password operations, and the State Machine (`ACTIVE`, `LOCKED`, etc.). It executes no multi-domain workflows.
*   **Frozen API**: `createIdentity`, `findById`, `findByEmail`, `hashPassword`, `comparePassword`, `updatePasswordHash`, `changeStatus`, `updateEmailVerified`, `incrementFailedLoginCount`, `resetFailedLoginCount`, `updateLastLogin`, `updateIdentity`.

### 3.2. SessionService
Owns the lifecycle of `user_sessions`, detecting replay attacks, handling session rotation, and bulk revocations.
*   **Frozen API**: `createSession`, `validateSession`, `rotateSession`, `revokeSessionFamily`, `revokeAllSessionsForUser`, `revokeAllSessionsExceptCurrent`, `hashToken`.

### 3.3. Token & Validation Services
*   **`JwtService`**: Stateless issuing and verifying of Access JWTs.
*   **`GoogleTokenValidator`**: Purely validates remote Google ID signatures.
*   **`EmailVerificationService`**: Evaluates ephemeral DB hashes for email ownership.
*   **`PasswordRecoveryService`**: Evaluates ephemeral DB hashes for account recovery.

---

## 4. Application Service Orchestration

The `AuthenticationService` is the sole orchestrator of workflows. It initiates transactions (`db.transaction()`), passes the `executor` down to Domain Services, and executes notifications strictly *after* successful commits.

### Orchestrated Workflows
1.  **Local Registration**: Validates identity, creates verification token.
2.  **Email Verification**: Consumes token, activates identity state.
3.  **Resend Verification Email**: Creates token, dispatches notification safely.
4.  **Local Login**: Evaluates lockout limits, increments/resets counts, provisions session.
5.  **Google OAuth Login**: Validates ID, auto-provisions or looks up identity, links account, issues session. (Rejects if local email exists without explicit prior linking).
6.  **Refresh Token Rotation**: Evaluates theft. Triggers full family revocation upon Replay Detection.
7.  **Logout Management**: Singular logout, total global revocation, or "logout all other devices".
8.  **Forgot Password**: Generates secure token, dispatches reset email.
9.  **Reset Password**: Consumes token, updates hash, brutally revokes all active sessions to secure account.
10. **Change Password**: Validates old password, applies new hash (Authenticated context).

### Audit Logging Rule
`AuthenticationService` directly invokes `AuthenticationRepository.logEvent(executor)`. This occurs **exactly once** at the successful termination (or terminal failure branch) of a workflow to prevent bloated transactions.

### Repository Consolidation Rule
`AuthenticationRepository` currently owns audit events, email verification tokens, password reset tokens, and OAuth identities because they form a cohesive persistence module. Future extraction into dedicated repositories remains permitted if cohesion decreases or repository size becomes excessive.

---

## 5. Migration & Backward Compatibility

1.  **Parallel Execution**: The entire Target Architecture (Repositories + Services) is built parallel and inert.
2.  **No Controller Modification**: Legacy monolithic controllers (`authController.js`) remain untouched during Phases 1 through 7.
3.  **Additive Schema**: The database holds both Legacy columns (`users.google_id`, `login_attempts`) and Target tables simultaneously.
4.  **Cutover Phase**: Phase 8 will entail routing the live Controllers away from direct Knex calls and into the newly orchestrated `AuthenticationService`, followed by data-migration and legacy column destruction.
