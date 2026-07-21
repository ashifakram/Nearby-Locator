# Phase 9B: Enterprise Observability Implementation Plan

## Goal Description
Transition the backend observability stack from an in-memory, basic `console`-wrapped logger to a production-grade enterprise observability layer. This phase establishes structured ELK-compatible logging, Prometheus metric collection, and distributed tracing readiness (OpenTelemetry foundations), ensuring the entire Authentication platform is fully transparent and auditable.

> [!WARNING]
> **Strict Constraints:** This phase will *not* modify business logic, authentication behavior, JWT rules, database schemas, or introduce MFA.

## 1. Architectural Changes & Integrations

### Structured JSON Logging (Pino)
- **Target:** `backend/utils/logger.js`
- **Change:** Replace the custom logging class with `pino()`. Pino is strictly chosen for its zero-allocation, extremely fast JSON structure, which perfectly supports ELK (Elasticsearch, Logstash, Kibana) ingest.
- **ELK Compatibility:** Logs will be structured with `@timestamp`, `level`, `message`, `correlation_id`, `service: "auth-platform"`, and nested `metadata`.

### Correlation IDs & Request Lifecycle
- **Target:** `backend/middleware/observability.js`
- **Change:** `AsyncLocalStorage` is already in use (`correlationStore`). We will expand it to automatically append `requestId` (as `correlation_id`) and `userId` to *every* Pino log statement implicitly.
- **Tracing Readiness:** Prepare OpenTelemetry compatible trace boundaries (e.g., propagating `traceparent` headers if present).

### Prometheus Metrics
- **Target:** `backend/utils/metrics.js` (New)
- **Change:** Introduce `prom-client`. Replace the ephemeral `metricsStore` (in `logger.js`) with true Prometheus Registries.
- **Endpoints:** Mount `/metrics` (Prometheus scrape endpoint) in `backend/index.js` or `routes/metricRoutes.js`.
- **Health endpoints:** Expand existing `/health` to explicitly support Kubernetes/Prometheus probes: `/health/liveness` and `/health/readiness`.

---

## 2. Metric Inventory

The Prometheus `/metrics` endpoint will export the following metrics:

### Business Metrics (Counters)
- `auth_login_success_total` (labels: `provider`, `flow`)
- `auth_signup_total` (labels: `provider`)
- `auth_account_linked_total` (labels: `provider`)
- `auth_account_unlinked_total` (labels: `provider`)
- `auth_password_reset_total` (labels: `status`)

### Security Metrics (Counters & Gauges)
- `auth_login_failure_total` (labels: `reason`)
- `auth_rate_limit_exceeded_total` (labels: `endpoint`, `ip`)
- `auth_token_replay_detected_total`
- `auth_csrf_failure_total`
- `auth_active_sessions_gauge` (Estimate based on Redis token TTLs if feasible)

### Performance Metrics (Histograms)
- `http_request_duration_seconds` (labels: `method`, `route`, `status_code`)
- `auth_bcrypt_duration_seconds` (Tracking CPU-bound password hashing time)

### Infrastructure & Database Metrics
- `db_query_duration_seconds` (labels: `operation`, `table`)
- `db_connection_pool_active` (Gauge)
- `redis_command_duration_seconds` (labels: `command`)
- `process_cpu_user_seconds_total`, `process_resident_memory_bytes` (Default `prom-client` metrics)

---

## 3. Logging Inventory & ELK Schema

### Mandatory Log Fields (Every Event)
- `@timestamp` (ISO8601)
- `level` (INFO, WARN, ERROR, FATAL)
- `message` (String)
- `correlation_id` (UUID mapped to `X-Request-ID`)
- `service` (Hardcoded `nearby-locator-backend`)

### Optional Contextual Fields
- `user_id` (UUID, if authenticated)
- `ip_address` (String)
- `user_agent` (String)
- `duration_ms` (Number, for request completion)
- `error.message`, `error.stack`, `error.code` (For errors)

### Redaction Rules (Strictly Enforced via Pino formatters)
- **Always Redacted (`[REDACTED]`):** `password`, `password_hash`, `refresh_token`, `authorization` headers, `cookie`, `access_token`, API Keys.
- **Email Redaction:** Emails logged in generic warnings/errors will be partially obfuscated (e.g., `us***@ex***.com`) unless they are part of a strict security `AUDIT` log.

### Retention Recommendations (For ELK / Cloud Watch)
- `DEBUG` / `INFO` (HTTP logs): 14 days
- `WARN` / `ERROR`: 90 days
- `AUDIT` (Security Events): 7 years (Cold storage after 1 year)

---

## 4. Audit Event Coverage Review
Every authentication flow has been audited for observability gaps. The implementation will guarantee `logger.audit()` fires for:

1. **Local Signup / Login:** Captures `ip_address`, `user_agent`, `status` (Success/Fail).
2. **Google OAuth Login:** Captures `provider`, `providerUserId`, `status`.
3. **Refresh Token Rotation:** Captures `token_family`, `rotation_status`.
4. **Logout / Logout All:** Captures `target_sessions_revoked`.
5. **Password Reset / Change:** Captures `user_id`, `ip_address`.
6. **Account Linking / Unlinking:** Captures `action`, `provider`, `user_id`.
7. **Token Replay Detection:** Captures `compromised_family_id`, `ip_address`.
8. **Rate Limiting / CSRF:** Captures `blocked_ip`, `route`, `reason`.
9. **Admin Actions:** Captures `admin_id`, `target_user_id`, `action` (already handled via `auditLogger.js`, will pipe to Pino).

---

## 5. Grafana Dashboard Plan
The dashboards will be built consuming the Prometheus `/metrics` endpoint.

1. **Auth & Business KPIs Panel:** 
   - *Time-series:* Successful Logins vs Signups.
   - *Pie chart:* Provider breakdown (Local vs Google).
2. **Security Operations Center (SOC) Panel:**
   - *Heatmap/Counters:* Failed logins by reason, Rate limit triggers, Token replay alerts (High priority red thresholds).
3. **Performance & Infrastructure Panel:**
   - *Histograms (p50, p90, p99):* `http_request_duration_seconds`, Database latency, Bcrypt hashing duration.
   - *Gauges:* Node.js Memory usage, DB pool size.

---

## 6. Implementation Roadmap (Execution Steps)

1. **Step 1: Install Dependencies**
   - Install `pino`, `pino-pretty` (dev), `prom-client`.
2. **Step 2: Replace Core Logger (`utils/logger.js`)**
   - Migrate `metricsStore` logic to Prometheus metrics.
   - Refactor `logger.info`, `logger.warn`, `logger.error`, `logger.audit` to use Pino with `AsyncLocalStorage` bindings.
3. **Step 3: Integrate Middleware (`middleware/observability.js`)**
   - Implement `prom-client` HTTP duration histograms in the request lifecycle.
4. **Step 4: Expose Telemetry Endpoints (`index.js`)**
   - Mount `/metrics` endpoint (secured or internal port based on architecture).
   - Refine `/health/liveness` and `/health/readiness`.
5. **Step 5: E2E Verification**
   - Verify log structures and Prometheus scrape format using existing tests.

---

## User Review Required
> [!IMPORTANT]
> **Open Questions for Approval:**
> 1. Should the `/metrics` endpoint be secured behind an `adminCheck` middleware, or is it safe to expose assuming the deployment architecture will block external access via a reverse proxy/Ingress?
> 2. Do you approve the adoption of `pino` and `prom-client` as the core libraries for Phase 9B?

Please review and click **Proceed** or provide your feedback!
