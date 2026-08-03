import analyticsRepository from '../repositories/analyticsRepository.js';
import db from '../db.js';

class AnalyticsService {
  
  _getDefaultDateRange(query) {
    let startDate = query.startDate;
    let endDate = query.endDate;
    
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30); // default to last 30 days
      
      if (!startDate) startDate = start.toISOString();
      if (!endDate) endDate = end.toISOString();
    }
    return { startDate, endDate };
  }

  async getAuthEventsAnalytics(query) {
    const { startDate, endDate } = this._getDefaultDateRange(query);
    const interval = query.interval || 'day';
    
    const data = await analyticsRepository.getAuthEventsTimeSeries(startDate, endDate, interval);
    return {
      metric: 'auth_events',
      interval,
      data
    };
  }

  async getSystemErrorsAnalytics(query) {
    const { startDate, endDate } = this._getDefaultDateRange(query);
    const interval = query.interval || 'day';
    
    const data = await analyticsRepository.getSystemErrorsTimeSeries(startDate, endDate, interval);
    return {
      metric: 'system_errors',
      interval,
      data
    };
  }

  async getAuditLogsAnalytics(query) {
    const { startDate, endDate } = this._getDefaultDateRange(query);
    const interval = query.interval || 'day';
    
    const data = await analyticsRepository.getAuditLogsTimeSeries(startDate, endDate, interval);
    return {
      metric: 'audit_logs',
      interval,
      data
    };
  }

  async getDashboardAnalytics() {
    const [userRoleDist, errorSeverityDist, rollupRows] = await Promise.all([
      analyticsRepository.getUserRoleDistribution(),
      analyticsRepository.getErrorSeverityDistribution(),
      db('daily_analytics_rollups')
        .select(
          'rollup_date', 'dau', 'wau', 'mau', 'new_signups',
          'event_counts', 'funnel_metrics', 'security_summary', 'computed_at'
        )
        .orderBy('rollup_date', 'desc')
        .limit(30)
    ]);

    const rollups = rollupRows.map(row => ({
      ...row,
      event_counts:     typeof row.event_counts === 'string'     ? JSON.parse(row.event_counts)     : (row.event_counts || {}),
      funnel_metrics:   typeof row.funnel_metrics === 'string'   ? JSON.parse(row.funnel_metrics)   : (row.funnel_metrics || {}),
      security_summary: typeof row.security_summary === 'string' ? JSON.parse(row.security_summary) : (row.security_summary || {}),
    }));

    return {
      rollups,
      distributions: {
        user_roles: userRoleDist,
        error_severity: errorSeverityDist
      }
    };
  }
}

export default new AnalyticsService();
