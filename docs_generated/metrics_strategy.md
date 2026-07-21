# Metrics Strategy (Prometheus)

Metrics must be cleanly separated into **Business Metrics** (counts of events, usage) and **Operational Metrics** (latencies, errors, lock times).

## 1. Business Metrics (Usage & Adoption)
| Metric Name | Type | Labels | Purpose |
| :--- | :--- | :--- | :--- |
| `auth_login_total` | Counter | `provider`, `status`, `reason` | Global login velocity. |
| `auth_oauth_accounts_active` | Gauge | `provider` | Count of total linked OAuth accounts in the database. |
| `auth_signup_total` | Counter | `provider` | Registration velocity. |
| `auth_refresh_total` | Counter | `status`, `reason` | Session rotation volume. |
| `auth_provider_links_total` | Counter | `action="link|unlink"`, `provider` | Tracks manual account mapping usage. |
| `auth_password_operations_total`| Counter | `operation="reset_req|reset|change"`, `status` | Password recovery volume. |

## 2. Operational Metrics (SRE / Performance)
| Metric Name | Type | Labels | Purpose |
| :--- | :--- | :--- | :--- |
| `auth_oauth_callback_latency_seconds` | Histogram | `provider` | Measures how long Google/Apple takes to verify a token over HTTP. |
| `auth_oauth_callback_failures_total` | Counter | `provider`, `error_code` | Identifies network timeouts or API outages at identity providers. |
| `auth_jwt_generation_duration_seconds`| Histogram | none | CPU time taken to sign JWTs synchronously. |
| `auth_bcrypt_duration_seconds` | Histogram | none | CPU time taken to hash or compare passwords. |
| `auth_db_lock_wait_time_seconds` | Histogram | `table` | Measures lock contention. How long does `FOR UPDATE` block? |
| `auth_transaction_duration_seconds` | Histogram | `domain` | Total time the Postgres transaction remains open. |
| `auth_redis_command_duration_seconds` | Histogram | `command` | Measures latency of the Redis caching tier (vital for middleware lookups). |
| `auth_audit_write_duration_seconds` | Histogram | none | Time taken to append structured rows to `audit_logs`. |
| `auth_email_delivery_duration_seconds`| Histogram | `template` | Measures latency of the third-party email provider (e.g. SendGrid). |

## 3. Security Metrics (SecOps)
| Metric Name | Type | Labels | Purpose |
| :--- | :--- | :--- | :--- |
| `auth_security_events_total` | Counter | `event="token_replay|csrf_blocked"` | Real-time threat detection. |
| `auth_locked_accounts_gauge` | Gauge | none | Immediate view into rate-limiting impact. |
