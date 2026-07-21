# Grafana Dashboard Plan

To provide complete operational visibility, we will provision four distinct Grafana dashboards.

---

## Dashboard 1: Authentication & Identity (Business / KPI)
**Target Audience**: Product Managers, Engineering Managers.
- **Graphs**: Login Velocity by provider, Signup Funnel, Password Resets vs Changes, Active Tokens Gauge.
- **KPIs**: 24h Login Success Rate, OAuth vs Local Adoption.

## Dashboard 2: Authentication Operations (SRE)
**Target Audience**: DevOps, Backend Engineers.
- **Graphs**: 
  - `auth_oauth_callback_latency_seconds` (P95/P99)
  - `auth_db_lock_wait_time_seconds` (Lock contention heatmap)
  - `auth_bcrypt_duration_seconds`
  - `auth_transaction_duration_seconds`
- **Alerts**: 
  - OAuth Outage Alert (Callback failures > 5%).
  - High Latency Alert (P99 > 1.5s).

## Dashboard 3: Security & Abuse (SecOps)
**Target Audience**: Security Team.
- **Graphs**: Login Failure Ratios (Stuffing Detection), Account Lockouts Gauge.
- **Alerts**: Credential Stuffing Alert (Failure > 40%), Rate Limit Breaches.

---

## Dashboard 4: Audit & Compliance (Administrators)
**Target Audience**: Risk Management, Administrators.
- **Graphs & Tables**: 
  - **Token Replay Attacks**: Real-time table of `TOKEN_REPLAY_DETECTED` events.
  - **Administrative Actions**: Stream of `ACCOUNT_SUSPENDED` and `ADMIN_FORCE_LOGOUT` events.
  - **Provider Usage Anomalies**: Tracking unexpected spikes in Apple vs Google linking.
  - **Session Revocations**: Timeline of forced vs manual logouts.
- **Alerts**:
  - **Replay Attack Alert**: Trigger PagerDuty instantly.
  - **Admin Action Alert**: Slack notification on any destructive admin event.
