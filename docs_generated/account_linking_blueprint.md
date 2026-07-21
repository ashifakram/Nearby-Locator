# Account Linking & Identity Resolution Blueprint

## 1. Core Principles
- **Provider IDs are Immutable**: Identity is bound to the `provider_id` (e.g., Google's `sub`), not the email. 
- **Minimum One Credential**: A user cannot unlink a provider if it is their *only* means of authentication.
- **Trust Only Verified Emails**: Automatic linking is ONLY permitted if the external provider cryptographically asserts `email_verified: true`.

## 2. Automatic Identity Resolution (Login/Signup)

### Scenario A: Local Account Exists + Google Login (Same Email)
1. Verify Google JWT. Extract `email` and `email_verified: true`.
2. Search `users` by email. Match found.
3. **Auto-Link**: Trust the verified email. Insert into `user_oauth_accounts`. Log `ACCOUNT_LINKED`.

### Scenario B: Google Account Exists + Local Signup (Same Email)
1. Search `users` by email. Match found.
2. **Block Signup**: Return `409 Conflict`.
3. **UX Flow**: Frontend prompts: *"An account with this email exists. Please log in using Google, or reset your password to create a local login."*

### Scenario C: Apple Private Relay Email
1. User signs in with Apple "Hide My Email".
2. `provider_id` is captured. The proxy email will not match existing accounts.
3. **New Account** is created unconditionally.

### Scenario D: Google Email Changes
1. Lookup by `provider='google'` AND `provider_id='sub'`. Match found.
2. The email in the JWT differs from `user_oauth_accounts.email`.
3. **Update Metadata**: Update `user_oauth_accounts.email` to the new value. The core `users.email` is not changed.

## 3. Manual Account Linking & Unlinking

### Manual Linking (`POST /users/me/providers/:provider`)
- **Action**: Validates the OAuth token via the generic `OAuthProvider` interface and inserts the link. Fails if the OAuth identity is already linked to a *different* user.

### Manual Unlinking (`DELETE /users/me/providers/:provider`)
- **Action**: Provider-agnostic unlinking flow.
- **Security Rules**:
  1. **Minimum Factor Check**: Must verify that `(count(oauth_accounts) + has_password) >= 2`.
  2. **Provider Revocation**: Call `ProviderFactory.get(provider).revoke(accountId)` to sever the trust natively at the external vendor if supported (Apple requirement).
  3. **Repository Deletion**: `OAuthRepository.unlinkProvider` removes the database record.
