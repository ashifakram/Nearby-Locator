# Data Model Schema Review (Phase 9A)

## 1. Core Platform User Updates
- **Remove**: `provider` enum and `google_id`.
- **Keep**: `password_hash` (remains nullable, enabling passwordless/OAuth-only users).

## 2. `user_oauth_accounts` Table (Expanded Lifecycle)
A 1-to-Many table mapping one internal `users.id` to many external identity providers.

| Column Name | Type | Constraints | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Unique identifier for the link. |
| `user_id` | UUID | FK (`users.id`), CASCADE | Associates the OAuth identity with the platform user. |
| `provider` | VARCHAR(50) | Not Null | E.g., 'google', 'apple'. |
| `provider_user_id` | VARCHAR(255) | Not Null | Immutable ID from the provider (e.g., `sub`). |
| `email` | VARCHAR(255) | Not Null | Email returned by the provider. |
| `is_email_verified`| BOOLEAN | Not Null | Did the provider explicitly verify this email? |
| `lifecycle_status`| VARCHAR(50) | Default 'ACTIVE' | `ACTIVE`, `UNLINKED` (soft deleted by user), `REVOKED_BY_PROVIDER` (revoked remotely), or `DISABLED` (admin action). |
| `linked_at` | TIMESTAMP | Not Null, Default NOW() | When the user authorized this provider. |
| `last_login_at` | TIMESTAMP | Nullable | Track usage of specific providers. |
| `metadata` | JSONB | Not Null, Default '{}'| Strictly validated JSON matching the schema for the specific provider. |

### Provider Metadata Schemas
Instead of arbitrary JSON, the application layer will strictly validate provider metadata:
- **Google**: `{ "hd": string (hosted domain), "picture": string, "locale": string }`
- **Apple**: `{ "is_private_email": boolean, "real_user_status": number (0-2) }`

## 3. Dedicated `login_history` Table
A dedicated table heavily indexed for fast, paginated frontend display. 
**Crucial Rule**: This table stores ONLY `SUCCESS` events. Failed login attempts (invalid credentials, rate-limit locks) are treated strictly as security intelligence and remain exclusively in the retention-controlled `audit_logs` table.

| Column Name | Type | Constraints | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Unique ID. |
| `user_id` | UUID | FK (`users.id`), CASCADE | Fast lookup for the user's settings page. |
| `session_family_id`| UUID | Nullable | Maps the login to the current session (if still active). |
| `login_method` | VARCHAR(50) | Not Null | E.g., `local`, `google`, `apple`. |
| `device_type` | VARCHAR(50) | Nullable | `Mobile`, `Desktop`, `Tablet`. |
| `os_name` | VARCHAR(50) | Nullable | `iOS`, `Windows`, `macOS`. |
| `browser_name` | VARCHAR(50) | Nullable | `Safari`, `Chrome`. |
| `location_city` | VARCHAR(100) | Nullable | Resolved location (e.g., 'San Francisco, CA'). |
| `occurred_at` | TIMESTAMP | Not Null, Default NOW() | Display timestamp. |

*Note: `ip_address` is intentionally omitted from this permanent user-facing table as it is considered PII and must be strictly retention-controlled. If IP display is required, it must be fetched dynamically from the retention-managed `audit_logs`.*

## 4. Expanded `user_sessions` Metadata
To support Enterprise Device Management, the existing `user_sessions` table must be expanded with a `metadata` JSONB block containing:
- `deviceId`: Unique fingerprint.
- `os_family`, `browser_family`, `ip_country`.
- `amr`: The authentication methods used to establish this session (e.g. `["apple", "mfa"]`).
