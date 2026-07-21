# Provider-Agnostic OAuth Architecture Blueprint

## Objective
Evolve `AuthenticationService` into a provider-agnostic Identity Platform supporting Google, Apple, and future providers without modifying the domain logic.

## 1. JWT Claims Policy (`amr`)
The Access Token (JWT) must NOT use custom claims like `provider: "google"`. Instead, it will adhere strictly to the **RFC 8112 `amr` (Authentication Methods Reference)** standard.
- Local Login: `"amr": ["pwd"]`
- Google Login: `"amr": ["google"]`
- Future Apple + MFA: `"amr": ["apple", "mfa"]`

This allows downstream microservices to demand specific levels of authentication assurance transparently.

## 2. The Provider Abstraction Interface
To decouple `AuthenticationService` from specific vendor logic, all external providers must implement a common `OAuthProvider` interface.

```typescript
interface OAuthProvider {
  /** Uniquely identifies the provider (e.g., 'google', 'apple') */
  get name(): string;

  /** Validates an incoming token/code and normalizes the external profile */
  verifyAndNormalize(tokenOrCode: string): Promise<NormalizedProfile>;

  /** Optional: Revokes the token at the identity provider level (e.g., Apple unlinking requirement) */
  revoke?(providerAccountId: string): Promise<void>;
}

type NormalizedProfile = {
  provider: string;           
  providerUserId: string;     // Immutable remote ID (e.g., 'sub')
  email: string;              
  emailVerified: boolean;     // Cryptographic proof of email ownership
  name?: string;
  avatarUrl?: string;
  metadata?: Record<string, any>; 
};
```

**Implementation Pattern**: The Controller uses a `ProviderFactory` to fetch the correct adapter (e.g., `AppleProvider`), invokes `verifyAndNormalize`, and passes the pure `NormalizedProfile` into `AuthenticationService.loginOAuth(profile)`.

## 3. Provider-Agnostic Unlinking
The unlinking flow (`unlinkOAuth`) must be fully agnostic.
1. HTTP `DELETE /users/me/providers/:provider` is invoked.
2. `AuthenticationService.unlinkOAuth(userId, provider)` verifies that at least one other login method remains (e.g., local password or another OAuth).
3. Service calls `ProviderFactory.get(provider).revoke(accountId)` to optionally notify the external vendor (required by Apple's terms of service).
4. Service deletes the `user_oauth_accounts` mapping via `OAuthRepository`.

## 4. Expanded OAuth Repository Responsibilities
The `OAuthRepository` must manage the complete lifecycle of linked identities.

```typescript
interface OAuthRepository {
  // Authentication
  findByProvider(provider: string, providerUserId: string, executor?): Promise<OAuthAccount>;
  touchLastLogin(accountId: string, executor): Promise<void>;

  // Identity Resolution
  findByUser(userId: string, executor?): Promise<OAuthAccount[]>;
  exists(provider: string, providerUserId: string, executor?): Promise<boolean>;

  // Lifecycle
  linkProvider(userId: string, profile: NormalizedProfile, executor): Promise<OAuthAccount>;
  unlinkProvider(userId: string, provider: string, executor): Promise<number>;
  updateMetadata(accountId: string, email: string, metadata: object, executor): Promise<void>;
}
```

## 5. Core Service Delegation (`AuthenticationService`)
Inside the transaction executor:
1. **User Resolution**: Queries `OAuthRepository.findByProvider`. 
   - If not found, attempts auto-linking by email (if `emailVerified === true`), otherwise creates a new user.
2. **State Validation**: Defers to `IdentityService.findByIdForUpdate` to ensure the user is `ACTIVE`.
3. **Session Establishment**: Defers to unified internal method `#establishSession(user, amrArray)`.
4. **Audit Logging**: Logs `OAUTH_LOGIN_SUCCESS`.
