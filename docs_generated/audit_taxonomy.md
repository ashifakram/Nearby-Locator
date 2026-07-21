# Enterprise Audit Model Taxonomy & Metadata

An enterprise SaaS product requires highly granular, structured, and searchable audit trails.

## 1. Audit Metadata Dictionary

Every event stored in `audit_logs` must be enriched with deep context for distributed tracing and compliance.

### Mandatory (Required for compliance & basic auditing)
- `occurred_at`: UTC timestamp.
- `action`: Canonical event identifier.
- `severity`: `INFO`, `WARNING`, `CRITICAL`.
- `status`: `SUCCESS`, `FAILURE`.
- `actor_id`: `user_id` performing the action.
- `target_user_id`: `user_id` being acted upon.
- `ip`: IP Address.

### Recommended (Distributed Tracing & SecOps)
- `requestId`: Unique ID for the specific HTTP request.
- `correlationId`: Identifier tracing a workflow across microservices.
- `traceId` / `spanId`: OpenTelemetry context variables for deep APM tracing.
- `tenantId` / `organizationId`: The B2B tenant context.
- `sessionId` / `sessionFamilyId`: Session linkage.
- `forwardedIp`: The `X-Forwarded-For` chain.
- `reason`: Machine-readable failure reason.
- `provider`: Authentication method used.

### Optional (Advanced threat intelligence)
- `deviceId`: Client-side trusted device identifier.
- `browser` / `browserVersion` / `OS`: Parsed User-Agent components.
- `country` / `city` / `timezone`: GeoIP data.
- `riskScore`: Computed anomaly score.
- `authenticationMethod` (`amr`): Full token methods (e.g. `['apple', 'mfa']`).
- `latencyMs`: Duration of the authentication operation.

## 2. Authentication Lifecycle Taxonomy

| Event | Severity | Status | Trigger Condition / Purpose |
| :--- | :--- | :--- | :--- |
| `LOGIN_SUCCESS` | INFO | SUCCESS | Local password login. |
| `OAUTH_LOGIN_SUCCESS` | INFO | SUCCESS | Provider login (Metadata: `provider`). |
| `LOGIN_FAILED` | WARNING | FAILURE | Incorrect credentials (Reason: `INVALID_CREDENTIALS`). |
| `LOGIN_LOCKED` | WARNING | FAILURE | User locked out via rate limiting. |
| `SESSION_REVOKED` | INFO | SUCCESS | User logs out. |
| `TOKEN_REFRESHED` | INFO | SUCCESS | Session rotation. |
| `TOKEN_REPLAY_DETECTED` | CRITICAL | FAILURE | Theft attempt detected. |
| `ACCOUNT_CREATED` | INFO | SUCCESS | Initial signup. |
| `PASSWORD_CHANGED` | INFO | SUCCESS | Password changed successfully. |
| `PASSWORD_RESET` | INFO | SUCCESS | Password recovered via token. |

## 3. OAuth Specific Events
| Event | Severity | Status | Trigger Condition / Purpose |
| :--- | :--- | :--- | :--- |
| `ACCOUNT_LINKED` | INFO | SUCCESS | Identity merged via auto-link or manual link. |
| `ACCOUNT_LINK_FAILED` | WARNING | FAILURE | Attempt to link an identity already owned by another user. |
| `ACCOUNT_UNLINKED` | WARNING | SUCCESS | Identity severed by user request. |
| `OAUTH_TOKEN_EXCHANGED` | INFO | SUCCESS | Code exchanged for token during initial OAuth callback. |
| `OAUTH_PROVIDER_REVOKED`| WARNING | SUCCESS | The external vendor (e.g., Apple) signaled revocation via webhook. |
