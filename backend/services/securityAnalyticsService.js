import db from '../db.js';

class SecurityAnalyticsService {
  async getThreatTelemetry() {
    const [failedLogins, lockedAccounts] = await Promise.all([
      db('auth_events').where({ event_type: 'LOGIN_FAILED' }).count('* as count').first().catch(() => ({ count: 0 })),
      db('users').where({ status: 'LOCKED' }).count('* as count').first().catch(() => ({ count: 0 }))
    ]);

    return {
      failedLoginsToday: parseInt(failedLogins?.count || 0, 10),
      lockedAccountsCount: parseInt(lockedAccounts?.count || 0, 10),
      suspiciousIpCount: 0,
      tokenRefreshAnomaliesCount: 0,
      threatLevel: 'LOW'
    };
  }
}

export default new SecurityAnalyticsService();
