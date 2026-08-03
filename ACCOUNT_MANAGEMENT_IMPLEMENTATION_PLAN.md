# ACCOUNT MANAGEMENT & USER MANAGEMENT IMPLEMENTATION PLAN

## Executive Summary

This document specifies the technical architecture, database schema migrations, repository definitions, service boundaries, controller endpoints, validation rules, and verification plan for the **Production-Grade Account Management & User Management Module** of the Nearby Locator SaaS Platform.

The core authentication engine, session handling (JWT + Redis + family rotation), RBAC, permissions engine, and route protection are **frozen and intact**. This plan builds cleanly on top of the established architecture.

---

## 1. Current Repository Audit

### 1.1 Existing & Frozen Architecture
- **Authentication & Security Engine**: Password hashing (bcrypt, 12 rounds), Google OAuth 2.0 (id_token & code exchange), email verification tokens, 6-digit OTP engine, sliding-window rate limiters, step-up sudo elevation (`sudoConfirm`), CSRF header protection.
- **Session Management**: Session family tracking (`user_sessions`), refresh token rotation, Redis session caching (`session:active:<sessionId>`), family revocation (`SessionService.revokeSessionFamily`).
- **RBAC & Permission System**: Multi-role support (`user_roles`, `rbac_roles`, `rbac_permissions`, `rbac_role_permissions`), dynamic permission evaluation (`requirePermission`), Redis permission caching (`RbacCache`).
- **Audit & Metrics System**: Asynchronous audit logging (`logAudit`), login history (`login_history`), system error tracking (`system_errors`), Prometheus metrics (`prom-client`).

### 1.2 Existing Database Tables
- `users`: Core identity table containing `id`, `email`, `password_hash`, `name`, `avatar_url`, `provider`, `status` (`ACTIVE`, `PENDING_VERIFICATION`, `DISABLED`, `BANNED`, `LOCKED`, `SOFT_DELETED`), `created_at`, `updated_at`, `created_by`, `updated_by`.
- `user_sessions`: Active and historical session instances with family grouping, IP address, user agent, expiration.
- `user_oauth_accounts`: Linked external OAuth identity records (`google`, etc.) with provider user IDs and profile metadata.
- `login_history`: Record of every authentication attempt with IP, location, user agent, success/failure status.
- `audit_logs`: Administrative and security action logs with JSONB metadata and correlation IDs.
- `system_settings`: Key-value control plane parameters.

### 1.3 Existing Controllers & Routes
- `userController.js` & `userRoutes.js`: Exposes `/api/user/profile` (get/update basic info), `/api/user/delete` (GDPR hard delete), `/api/user/me/devices` (get/revoke sessions), `/api/user/me/permissions`.
- `adminController.js` & `adminRoutes.js`: Exposes `/api/admin/users` (search/page/export users), `/api/admin/users/:userId/suspend` (ban), `/api/admin/users/:userId/unlock` (unsuspend), `/api/admin/users/:userId/logout` (revoke user sessions), `/api/admin/sessions` (session audit/deletion), `/api/admin/roles` & `/api/admin/permissions`.

---

## 2. Gap Analysis

### 2.1 User Account Capabilities Gap Matrix

| Feature Domain | Feature Requirement | Current Status | Action Required |
| :--- | :--- | :--- | :--- |
| **Profile** | View Profile | Implemented (`GET /api/user/profile`) | Enrich with personal info, preferences, privacy, & notification settings. |
| | Update Profile | Partial (`PUT /api/user/profile` supports `name`, `avatar_url`, `timezone`) | Expand to support `first_name`, `last_name`, `display_name`, `username`, `bio`, `phone`, `country`, `state`, `city`, `timezone`, `language`. |
| | Upload Avatar | Missing | Implement file upload / base64 endpoint `POST /api/user/profile/avatar`. |
| | Replace Avatar | Missing | Implement `PUT /api/user/profile/avatar`. |
| | Delete Avatar | Missing | Implement `DELETE /api/user/profile/avatar`. |
| **Account** | Change Email | Missing | Implement `POST /api/user/account/change-email` with OTP/token verification on new email. |
| | Change Password | Partial (`POST /api/auth/password/change` exists) | Expose standard `/api/user/account/change-password` endpoint. |
| **Security** | Active Sessions | Implemented (`GET /api/user/me/devices`) | Standardize under `/api/user/account/security/sessions`. |
| | Revoke Session | Implemented (`DELETE /api/user/me/devices/:id`) | Standardize under `/api/user/account/security/sessions/:id`. |
| | Revoke All Sessions | Partial | Implement `DELETE /api/user/account/security/sessions` (revokes all except current). |
| | Login History | Partial (DB table exists) | Implement `GET /api/user/account/security/login-history`. |
| | Security Events | Partial (DB table exists) | Implement `GET /api/user/account/security/events`. |
| | Connected OAuth Accounts | Partial (DB table exists) | Implement `GET /api/user/account/security/oauth` & `DELETE /api/user/account/security/oauth/:provider`. |
| **Preferences** | Theme, Search, AI, Lang, Timezone | Missing | Create `user_preferences` table & endpoints `GET/PUT /api/user/preferences`. |
| **Privacy** | Profile Visibility, Recs, Marketing | Missing | Create `user_privacy_settings` table & endpoints `GET/PUT /api/user/privacy`. |
| **Notifications** | Email, In-App, Security Alerts | Missing | Create `user_notification_preferences` table & endpoints `GET/PUT /api/user/notifications/settings`. |
| **Lifecycle** | Export Account Data | Missing | Implement `POST /api/user/account/export` data package generation. |
| | Deactivate Account | Missing | Implement `POST /api/user/account/deactivate` (status='DISABLED', revokes sessions). |
| | Delete Account | Partial (hard delete exists) | Implement self-service `DELETE /api/user/account` with confirmation password/verification. |

### 2.2 Admin User Management Gap Matrix

| Feature Domain | Feature Requirement | Current Status | Action Required |
| :--- | :--- | :--- | :--- |
| **User Listing** | Search, Filter, Pagination, CSV Export | Implemented (`GET /api/admin/users`) | Enhance filters (status, role, provider, date range, verified status). |
| **User Details** | Aggregated User Deep-Dive View | Missing | Implement `GET /api/admin/users/:userId` returning composite profile, sessions, login history, OAuth accounts, roles, permissions, audit logs, security events. |
| **Management** | Update User | Missing | Implement `PUT /api/admin/users/:userId`. |
| | Suspend / Unsuspend | Implemented (`POST /api/admin/users/:userId/suspend` & `/unlock`) | Maintain & standardise under `/api/admin/users/:userId/suspend` and `/unsuspend`. |
| | Disable / Enable | Missing | Implement `POST /api/admin/users/:userId/disable` and `/enable`. |
| | Soft Delete / Restore | Missing | Implement `POST /api/admin/users/:userId/delete` (soft delete) and `/restore`. |
| | Manual Email Verification | Missing | Implement `POST /api/admin/users/:userId/verify-email`. |
| | Resend Email Verification | Missing | Implement `POST /api/admin/users/:userId/resend-verification`. |
| | Unlock Account | Implemented (`POST /api/admin/users/:userId/unlock`) | Enhance to reset failed login attempt counters. |
| | Revoke Sessions | Implemented (`DELETE /api/admin/sessions/user/:userId`) | Maintain existing route. |

---

## 3. Database Schema Migration Plan

Migration File: `backend/migrations/20260801_create_account_management_tables.js`

### 3.1 Schema Additions

1. **`user_profiles` Table**
   - `user_id`: UUID (Primary Key, Foreign Key -> `users.id` ON DELETE CASCADE)
   - `first_name`: VARCHAR(100)
   - `last_name`: VARCHAR(100)
   - `display_name`: VARCHAR(150)
   - `username`: VARCHAR(50) UNIQUE NULLABLE
   - `bio`: TEXT
   - `phone`: VARCHAR(30)
   - `country`: VARCHAR(100)
   - `state`: VARCHAR(100)
   - `city`: VARCHAR(100)
   - `timezone`: VARCHAR(50) DEFAULT 'UTC'
   - `language`: VARCHAR(10) DEFAULT 'en'
   - `created_at`, `updated_at`: TIMESTAMPTZ

2. **`user_preferences` Table**
   - `user_id`: UUID (Primary Key, Foreign Key -> `users.id` ON DELETE CASCADE)
   - `theme`: VARCHAR(20) DEFAULT 'system' ('light' | 'dark' | 'system')
   - `language`: VARCHAR(10) DEFAULT 'en'
   - `timezone`: VARCHAR(50) DEFAULT 'UTC'
   - `search_preferences`: JSONB DEFAULT '{}'
   - `ai_preferences`: JSONB DEFAULT '{}'
   - `created_at`, `updated_at`: TIMESTAMPTZ

3. **`user_privacy_settings` Table**
   - `user_id`: UUID (Primary Key, Foreign Key -> `users.id` ON DELETE CASCADE)
   - `profile_visibility`: VARCHAR(20) DEFAULT 'private' ('public' | 'private' | 'contacts')
   - `recommendation_preferences`: JSONB DEFAULT '{}'
   - `marketing_preferences`: JSONB DEFAULT '{"email": false, "in_app": true}'
   - `created_at`, `updated_at`: TIMESTAMPTZ

4. **`user_notification_preferences` Table**
   - `user_id`: UUID (Primary Key, Foreign Key -> `users.id` ON DELETE CASCADE)
   - `email_notifications`: JSONB DEFAULT '{"marketing": false, "security": true, "updates": true}'
   - `in_app_notifications`: JSONB DEFAULT '{"mentions": true, "activity": true}'
   - `security_alerts`: BOOLEAN DEFAULT true
   - `created_at`, `updated_at`: TIMESTAMPTZ

5. **`user_account_exports` Table**
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (Foreign Key -> `users.id` ON DELETE CASCADE)
   - `status`: VARCHAR(20) DEFAULT 'PENDING' ('PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED')
   - `file_path`: TEXT
   - `download_token`: VARCHAR(255)
   - `expires_at`: TIMESTAMPTZ
   - `created_at`, `updated_at`: TIMESTAMPTZ

---

## 4. Architecture & Component Blueprint

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                             HTTP ROUTE LAYER                                │
 │   /api/user/* (userRoutes.js)           /api/admin/users/* (adminRoutes.js) │
 └──────────────────────┬──────────────────────────────┬───────────────────────┘
                        │                              │
 ┌──────────────────────▼──────────────────────────────▼───────────────────────┐
 │                            CONTROLLER LAYER                                 │
 │  userController.js / accountController.js    adminUserController.js          │
 └──────────────────────┬──────────────────────────────┬───────────────────────┘
                        │                              │
 ┌──────────────────────▼──────────────────────────────▼───────────────────────┐
 │                              SERVICE LAYER                                  │
 │  userProfileService.js  │  userAccountService.js  │  adminUserService.js    │
 │  userPreferencesService.js  │  avatarStorageService.js                      │
 └──────────────────────┬──────────────────────────────┬───────────────────────┘
                        │                              │
 ┌──────────────────────▼──────────────────────────────▼───────────────────────┐
 │                            REPOSITORY LAYER                                 │
 │  userProfileRepository.js  │  userPreferencesRepository.js                   │
 │  userPrivacyRepository.js  │  userNotificationPrefRepository.js              │
 │  userRepository.js (extended)  │  oauthRepository.js                        │
 └──────────────────────┬──────────────────────────────┬───────────────────────┘
                        │                              │
 ┌──────────────────────▼──────────────────────────────▼───────────────────────┐
 │                           DATABASE LAYER (Knex)                             │
 │  users │ user_profiles │ user_preferences │ user_privacy_settings │ ...     │
 └─────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Repositories to Create / Extend
- **[NEW] `userProfileRepository.js`**: CRUD operations on `user_profiles`.
- **[NEW] `userPreferencesRepository.js`**: CRUD operations on `user_preferences`.
- **[NEW] `userPrivacyRepository.js`**: CRUD operations on `user_privacy_settings`.
- **[NEW] `userNotificationPrefRepository.js`**: CRUD operations on `user_notification_preferences`.
- **[MODIFY] `userRepository.js`**: Add methods for user search with advanced filters, soft delete (`SOFT_DELETED`), restore, manual email verification, status transitions, and aggregated view queries.

### 4.2 Services to Create / Extend
- **[NEW] `userProfileService.js`**: Business logic for profile retrieval/enrichment, personal data validation, username uniqueness verification.
- **[NEW] `userAccountService.js`**: Business logic for email change requests (dispatches verification email to new address), self-service account deactivation, self-service account deletion, and export package generation.
- **[NEW] `userPreferencesService.js`**: Business logic for retrieving and merging preferences, privacy settings, and notification choices.
- **[NEW] `avatarStorageService.js`**: Secure avatar upload validation (MIME types, max size 5MB), image saving (to `uploads/avatars/`), image replacement, and deletion.
- **[NEW] `adminUserService.js`**: Business logic for administrative user searching, deep-dive profile aggregation, status management (suspend/unsuspend, disable/enable, delete/restore, unlock), and manual email verification.

### 4.3 Controllers to Create / Extend
- **[MODIFY] `userController.js`**: Extended with handlers for profile details, avatar upload/replacement/deletion, email change, sessions, login history, OAuth accounts, preferences, privacy, notification settings, export, deactivation, and self-deletion.
- **[NEW] `adminUserController.js`**: Dedicated controller for `/api/admin/users/*` endpoints (keeping `adminController.js` thin and unburdened).

### 4.4 Middleware & Utilities to Create / Extend
- **[NEW] `avatarUploadMiddleware.js`**: Express multipart upload middleware using `multer` or custom stream parser, restricting files to PNG, JPEG, WEBP, max 5MB.

---

## 5. API Endpoint Specifications

### 5.1 User Endpoints (`/api/user/*`)

| Method | Path | Auth | Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/user/profile` | Bearer | Self | Get full enriched user profile, preferences, privacy, & notification settings. |
| `PUT` | `/api/user/profile` | Bearer | Self | Update personal information (name, first_name, last_name, display_name, username, bio, phone, country, state, city, timezone, language). |
| `POST` | `/api/user/profile/avatar` | Bearer | Self | Upload new avatar image file (multipart/form-data or base64 payload). |
| `PUT` | `/api/user/profile/avatar` | Bearer | Self | Replace existing avatar with new image file. |
| `DELETE` | `/api/user/profile/avatar` | Bearer | Self | Delete custom avatar image and reset to default avatar. |
| `POST` | `/api/user/account/change-email` | Bearer | Self | Request email change (sends verification OTP/link to new email address). |
| `POST` | `/api/user/account/verify-email-change` | Bearer | Self | Verify OTP/token to finalize email change. |
| `POST` | `/api/user/account/change-password` | Bearer | Self | Change password (requires current password + new password satisfying policy). |
| `GET` | `/api/user/account/security/sessions` | Bearer | Self | List active user sessions with IP, location, user agent, current flag. |
| `DELETE` | `/api/user/account/security/sessions/:sessionId` | Bearer | Self | Revoke specific active session. |
| `DELETE` | `/api/user/account/security/sessions` | Bearer | Self | Revoke all other active sessions except current. |
| `GET` | `/api/user/account/security/login-history` | Bearer | Self | Retrieve paginated user login history. |
| `GET` | `/api/user/account/security/events` | Bearer | Self | Retrieve security & audit events for user account. |
| `GET` | `/api/user/account/security/oauth` | Bearer | Self | List linked OAuth accounts (`google`, etc.). |
| `DELETE` | `/api/user/account/security/oauth/:provider` | Bearer | Self | Unlink specified OAuth provider account. |
| `GET` | `/api/user/preferences` | Bearer | Self | Get user UI, search, & AI preferences. |
| `PUT` | `/api/user/preferences` | Bearer | Self | Update user preferences. |
| `GET` | `/api/user/privacy` | Bearer | Self | Get user privacy settings. |
| `PUT` | `/api/user/privacy` | Bearer | Self | Update user privacy settings. |
| `GET` | `/api/user/notifications/settings` | Bearer | Self | Get user notification preferences. |
| `PUT` | `/api/user/notifications/settings` | Bearer | Self | Update user notification preferences. |
| `POST` | `/api/user/account/export` | Bearer | Self | Request full GDPR/CCPA personal account data export. |
| `GET` | `/api/user/account/export/:exportId` | Bearer | Self | Check export status / download data export archive. |
| `POST` | `/api/user/account/deactivate` | Bearer | Self | Deactivate account (sets status='DISABLED', revokes sessions). |
| `DELETE` | `/api/user/account` | Bearer | Self | Permanently delete or soft-delete user account (requires password/OTP verification). |

### 5.2 Admin Endpoints (`/api/admin/users/*`)

| Method | Path | Auth | Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/users` | Bearer | `users.read` | Search, filter (status, role, provider, date range, verification), paginate, & CSV export users. |
| `GET` | `/api/admin/users/:userId` | Bearer | `users.read` | Aggregated deep-dive profile (profile, sessions, login history, OAuth accounts, roles, permissions, audit logs, security events). |
| `PUT` | `/api/admin/users/:userId` | Bearer | `users.update` | Update target user's personal details, email, or metadata. |
| `POST` | `/api/admin/users/:userId/suspend` | Bearer | `users.update` | Suspend user (sets status='BANNED', revokes all sessions). |
| `POST` | `/api/admin/users/:userId/unsuspend` | Bearer | `users.update` | Unsuspend user (sets status='ACTIVE'). |
| `POST` | `/api/admin/users/:userId/disable` | Bearer | `users.update` | Disable user (sets status='DISABLED', revokes sessions). |
| `POST` | `/api/admin/users/:userId/enable` | Bearer | `users.update` | Enable user (sets status='ACTIVE'). |
| `POST` | `/api/admin/users/:userId/delete` | Bearer | `users.delete` | Soft delete user (sets status='SOFT_DELETED', revokes sessions). |
| `POST` | `/api/admin/users/:userId/restore` | Bearer | `users.update` | Restore soft deleted user (sets status='ACTIVE'). |
| `POST` | `/api/admin/users/:userId/verify-email` | Bearer | `users.update` | Manually mark user's email as verified. |
| `POST` | `/api/admin/users/:userId/resend-verification` | Bearer | `users.update` | Trigger email verification resend for target user. |
| `POST` | `/api/admin/users/:userId/unlock` | Bearer | `users.update` | Unlock user account & reset failed login attempts counter. |
| `DELETE` | `/api/admin/users/:userId/sessions` | Bearer | `users.update` | Revoke all active sessions for target user. |

---

## 6. Implementation Order & Phasing

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: DATABASE MIGRATION                                                  │
│ Create migration 20260801_create_account_management_tables.js               │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼───────────────────────────────────────┐
│ STEP 2: REPOSITORIES                                                         │
│ Build userProfileRepository, userPreferencesRepository,                      │
│ userPrivacyRepository, userNotificationPrefRepository, extend userRepository │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼───────────────────────────────────────┐
│ STEP 3: SERVICES                                                             │
│ Build userProfileService, userAccountService, userPreferencesService,        │
│ avatarStorageService, adminUserService                                       │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼───────────────────────────────────────┐
│ STEP 4: CONTROLLERS & ROUTES                                                 │
│ Extend userController & userRoutes; build adminUserController & register in  │
│ adminRoutes                                                                  │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼───────────────────────────────────────┐
│ STEP 5: VALIDATION & TEST SUITES                                             │
│ Build Joi validation schemas, test/accountManagement.test.js,               │
│ test/adminUserManagement.test.js                                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. File Manifest

### 7.1 Files to Create
- `backend/migrations/20260801_create_account_management_tables.js`
- `backend/repositories/userProfileRepository.js`
- `backend/repositories/userPreferencesRepository.js`
- `backend/repositories/userPrivacyRepository.js`
- `backend/repositories/userNotificationPrefRepository.js`
- `backend/services/userProfileService.js`
- `backend/services/userAccountService.js`
- `backend/services/userPreferencesService.js`
- `backend/services/avatarStorageService.js`
- `backend/services/adminUserService.js`
- `backend/controllers/adminUserController.js`
- `backend/middleware/avatarUploadMiddleware.js`
- `backend/test/accountManagement.test.js`
- `backend/test/adminUserManagement.test.js`

### 7.2 Files to Modify
- `backend/repositories/userRepository.js` (add advanced search, soft-delete, restore, manual verify methods)
- `backend/controllers/userController.js` (wire expanded user account endpoints)
- `backend/routes/userRoutes.js` (register new user account routes)
- `backend/routes/adminRoutes.js` (wire new admin user management routes to `adminUserController`)
- `backend/index.js` (serve static uploads directory for avatars: `app.use('/uploads', express.static('uploads'))`)

### 7.3 Files that Must Remain Untouched
- `backend/services/authenticationService.js` (Frozen core auth engine)
- `backend/services/sessionService.js` (Frozen session engine)
- `backend/services/rbacService.js` & `permissionService.js` (Frozen RBAC engine)
- `backend/middleware/authJwt.js` & `requirePermission.js` (Frozen route protection guards)
- All pre-existing migrations (`20241001_*` through `20260725_*`)

---

## 8. Risk Assessment & Mitigation

1. **Risk: Username / Email Collisions during Updates**
   - *Mitigation*: Perform transactional checks in services (`userProfileService` / `userAccountService`) and enforce Knex unique constraints at database level.
2. **Risk: Avatar Upload Vulnerabilities (Malicious Files)**
   - *Mitigation*: Restrict MIME types strictly to `image/png`, `image/jpeg`, `image/webp`. Validate magic file bytes header, cap file size at 5MB, and sanitize saved filenames with random UUIDs.
3. **Risk: Disruption of Existing User Profile Callers**
   - *Mitigation*: Maintain full backward compatibility for `GET /api/user/profile` and `PUT /api/user/profile`. Return merged profile data containing legacy top-level `name`, `avatar_url`, and `timezone` fields alongside enriched `profile`, `preferences`, `privacy`, and `notifications` blocks.

---

## 9. Verification & Automated Test Plan

1. **Unit & Integration Tests**:
   - `npm test` running `test/accountManagement.test.js` and `test/adminUserManagement.test.js`.
   - Test user profile CRUD, username uniqueness validation, avatar upload/replace/delete workflows, email change verification, preference updates, account export, deactivation, and self-deletion.
   - Test admin user management search filters, single user aggregated view, suspend/unsuspend, disable/enable, soft delete/restore, and manual email verification.
2. **Regression Testing**:
   - Run existing test suite (`npm test`) covering `auth.test.js`, `rbac.test.js`, `ownership.test.js`, `admin.test.js` to verify zero regressions.
