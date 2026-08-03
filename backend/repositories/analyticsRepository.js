import db from '../db.js';

class AnalyticsRepository {
  /**
   * Aggregate auth events over time
   */
  async getAuthEventsTimeSeries(startDate, endDate, interval = 'day') {
    let dateTrunc;
    switch(interval) {
      case 'hour': dateTrunc = "to_char(occurred_at, 'YYYY-MM-DD HH24:00:00')"; break;
      case 'week': dateTrunc = "to_char(occurred_at, 'IYYY-IW')"; break;
      case 'day':
      default:
        dateTrunc = "to_char(occurred_at, 'YYYY-MM-DD')";
    }

    const query = db('auth_events')
      .select(db.raw(`${dateTrunc} as timestamp`))
      .count('* as count')
      .select(db.raw("SUM(CASE WHEN event_type = 'LOGIN_SUCCESS' THEN 1 ELSE 0 END) as success_count"))
      .select(db.raw("SUM(CASE WHEN event_type = 'LOGIN_FAILED' THEN 1 ELSE 0 END) as failed_count"))
      .where('occurred_at', '>=', new Date(startDate).toISOString())
      .where('occurred_at', '<=', new Date(endDate).toISOString())
      .groupBy('timestamp')
      .orderBy('timestamp', 'asc');

    return await query;
  }

  /**
   * Aggregate system errors over time
   */
  async getSystemErrorsTimeSeries(startDate, endDate, interval = 'day') {
    let dateTrunc;
    switch(interval) {
      case 'hour': dateTrunc = "to_char(occurred_at, 'YYYY-MM-DD HH24:00:00')"; break;
      case 'week': dateTrunc = "to_char(occurred_at, 'IYYY-IW')"; break;
      case 'day':
      default:
        dateTrunc = "to_char(occurred_at, 'YYYY-MM-DD')";
    }

    const query = db('system_errors')
      .select(db.raw(`${dateTrunc} as timestamp`))
      .count('* as count')
      .select(db.raw("SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count"))
      .select(db.raw("SUM(CASE WHEN severity = 'WARNING' THEN 1 ELSE 0 END) as warning_count"))
      .select(db.raw("SUM(CASE WHEN severity = 'ERROR' THEN 1 ELSE 0 END) as error_count"))
      .where('occurred_at', '>=', new Date(startDate).toISOString())
      .where('occurred_at', '<=', new Date(endDate).toISOString())
      .groupBy('timestamp')
      .orderBy('timestamp', 'asc');

    return await query;
  }

  /**
   * Get user role distribution
   */
  async getUserRoleDistribution() {
    return await db('users')
      .join('user_roles', 'users.id', 'user_roles.user_id')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .select('roles.name as category')
      .count('users.id as count')
      .groupBy('roles.name');
  }

  /**
   * Get error severity distribution
   */
  async getErrorSeverityDistribution() {
    return await db('system_errors')
      .select('severity as category')
      .count('* as count')
      .groupBy('severity');
  }

  /**
   * Aggregate audit logs over time
   */
  async getAuditLogsTimeSeries(startDate, endDate, interval = 'day') {
    let dateTrunc;
    switch(interval) {
      case 'hour': dateTrunc = "to_char(occurred_at, 'YYYY-MM-DD HH24:00:00')"; break;
      case 'week': dateTrunc = "to_char(occurred_at, 'IYYY-IW')"; break;
      case 'day':
      default:
        dateTrunc = "to_char(occurred_at, 'YYYY-MM-DD')";
    }

    const query = db('audit_logs')
      .select(db.raw(`${dateTrunc} as timestamp`))
      .count('* as count')
      .where('occurred_at', '>=', new Date(startDate).toISOString())
      .where('occurred_at', '<=', new Date(endDate).toISOString())
      .groupBy('timestamp')
      .orderBy('timestamp', 'asc');

    return await query;
  }
}

export default new AnalyticsRepository();
