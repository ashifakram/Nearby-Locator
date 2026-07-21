# Multi-Factor Authentication (MFA) Readiness Architecture

This document defines the architectural boundaries required to support MFA in the future. **No runtime MFA logic is being implemented.**

## 1. The MFA Provider Abstraction
To prevent hardcoded logic, all MFA methods must be routed through an `MfaProviderFactory`. 

```typescript
interface MfaProvider {
  get name(): string; // 'totp', 'sms', 'email', 'webauthn', 'backup_code'
  
  /** Validates the user's submitted token against their stored secret */
  verify(secret: string, token: string): Promise<boolean>;
  
  /** Generates a challenge (e.g., sends an SMS or Email). No-op for TOTP/WebAuthn. */
  dispatchChallenge?(secret: string): Promise<void>;
}

// The factory handles resolving the correct strategy at runtime
class MfaProviderFactory {
  static get(providerName: string): MfaProvider { ... }
}
```

## 2. Database Schema Additions
### `user_mfa_methods`
- `id` (UUID)
- `user_id` (UUID, FK to users)
- `provider` (VARCHAR - `totp`, `sms`, `webauthn`, `backup_code`)
- `secret` (VARCHAR - Encrypted seed, phone number, or public key)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `last_used_at` (TIMESTAMP)

## 3. Core Flow Modifications (Future)
To support MFA without breaking Phase 9 flows, the internal `#establishSession` method will be intercepted:

1. `AuthenticationService` verifies primary credentials (via Local or `OAuthProvider`).
2. Service queries `user_mfa_methods`.
3. If active factors exist, it issues a short-lived `MFA_REQUIRED` token instead of standard access/refresh tokens.
4. User submits the code to `POST /api/auth/mfa/verify` along with the chosen `provider` type.
5. `MfaProviderFactory.get(provider).verify(secret, code)` evaluates the payload.
6. Upon success, `#establishSession` is invoked to generate the real Session Family, injecting `"amr": ["mfa"]` into the JWT.
