import client from 'prom-client';

// Create a Registry
export const register = new client.Registry();

// Enable default metrics (Node.js memory, CPU, event loop lag, etc.)
client.collectDefaultMetrics({ register, prefix: 'node_' });

// ==========================================
// BUSINESS METRICS (Authentication & Users)
// ==========================================

export const authLoginSuccessTotal = new client.Counter({
  name: 'auth_login_success_total',
  help: 'Total successful logins',
  labelNames: ['provider', 'flow'],
  registers: [register]
});

export const authLoginFailureTotal = new client.Counter({
  name: 'auth_login_failure_total',
  help: 'Total failed logins',
  labelNames: ['reason', 'provider'],
  registers: [register]
});

export const authSignupTotal = new client.Counter({
  name: 'auth_signup_total',
  help: 'Total successful signups',
  labelNames: ['provider'],
  registers: [register]
});

export const authAccountLinkedTotal = new client.Counter({
  name: 'auth_account_linked_total',
  help: 'Total successful account linking operations',
  labelNames: ['provider'],
  registers: [register]
});

export const authAccountUnlinkedTotal = new client.Counter({
  name: 'auth_account_unlinked_total',
  help: 'Total successful account unlinking operations',
  labelNames: ['provider'],
  registers: [register]
});

export const authPasswordResetTotal = new client.Counter({
  name: 'auth_password_reset_total',
  help: 'Total password resets',
  labelNames: ['status'],
  registers: [register]
});

export const authRefreshTokenTotal = new client.Counter({
  name: 'auth_refresh_token_total',
  help: 'Total token refreshes',
  labelNames: ['status'],
  registers: [register]
});

export const authLogoutTotal = new client.Counter({
  name: 'auth_logout_total',
  help: 'Total logouts',
  labelNames: ['type'], // single or all
  registers: [register]
});

export const authPasswordResetRequestTotal = new client.Counter({
  name: 'auth_password_reset_request_total',
  help: 'Total password reset requests',
  labelNames: ['status'],
  registers: [register]
});

export const authPasswordChangeTotal = new client.Counter({
  name: 'auth_password_change_total',
  help: 'Total authenticated password changes',
  labelNames: ['status'],
  registers: [register]
});

// ==========================================
// SECURITY METRICS
// ==========================================

export const authRateLimitExceededTotal = new client.Counter({
  name: 'auth_rate_limit_exceeded_total',
  help: 'Total rate limit rejections',
  labelNames: ['endpoint'],
  registers: [register]
});

export const authTokenReplayDetectedTotal = new client.Counter({
  name: 'auth_token_replay_detected_total',
  help: 'Total token replay attempts detected during session refresh',
  registers: [register]
});

export const authCsrfFailureTotal = new client.Counter({
  name: 'auth_csrf_failure_total',
  help: 'Total CSRF validation failures',
  registers: [register]
});

export const rbacAuthorizationFailureTotal = new client.Counter({
  name: 'rbac_authorization_failure_total',
  help: 'Total RBAC permission denials',
  labelNames: ['permission'],
  registers: [register]
});

// ==========================================
// PERFORMANCE & HTTP METRICS
// ==========================================

export const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

export const authBcryptDurationSeconds = new client.Histogram({
  name: 'auth_bcrypt_duration_seconds',
  help: 'Duration of bcrypt hashing and verification',
  labelNames: ['operation'], // 'hash' or 'compare'
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2],
  registers: [register]
});

// ==========================================
// INFRASTRUCTURE & DB METRICS
// ==========================================

export const dbQueryDurationSeconds = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query latency',
  labelNames: ['operation', 'table'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register]
});

export const dbConnectionPoolActive = new client.Gauge({
  name: 'db_connection_pool_active',
  help: 'Number of active database connections in the pool',
  registers: [register]
});

export const redisCommandDurationSeconds = new client.Histogram({
  name: 'redis_command_duration_seconds',
  help: 'Redis command latency',
  labelNames: ['command'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  registers: [register]
});
