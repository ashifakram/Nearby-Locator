import db from '../db.js';
import { sendSuccess, sendError } from '../middleware/responseFormatter.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// GET /api/admin/analytics/dashboard
//
// Access control (layered):
//   1. authJwt middleware validates active session JWT (mounted in router).
//   2. requirePermission('metrics.read') middleware enforces RBAC access (mounted in router).
//   3. This controller additionally verifies loopback or internal-token origin.
//
// Returns last 30 rollup rows (compact — never raw event table scans).
// ---------------------------------------------------------------------------
export const getAnalyticsDashboard = async (req, res) => {
  // Layer 3: IP origin guard (defence-in-depth beyond RBAC)
  const clientIp = req.ip;
  const isLoopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(clientIp);
  const internalToken = process.env.INTERNAL_METRICS_TOKEN;
  const hasValidToken = internalToken && req.headers['x-internal-token'] === internalToken;

  if (!isLoopback && !hasValidToken) {
    logger.warn('ADMIN_ANALYTICS_BLOCKED', 'Analytics dashboard blocked: non-loopback origin without token.', { ip: clientIp });
    return sendError(res, { code: 'FORBIDDEN' }, 'Access denied', 403);
  }

  try {
    // Rollup table query — no raw event table scans (fast, sub-10ms)
    const rows = await db('daily_analytics_rollups')
      .select(
        'rollup_date', 'dau', 'wau', 'mau', 'new_signups',
        'event_counts', 'funnel_metrics', 'security_summary', 'computed_at'
      )
      .orderBy('rollup_date', 'desc')
      .limit(30); // Last 30 days

    // Parse stored JSONB blobs (Knex returns them as strings in some drivers)
    const data = rows.map(row => ({
      ...row,
      event_counts:     typeof row.event_counts === 'string'     ? JSON.parse(row.event_counts)     : row.event_counts,
      funnel_metrics:   typeof row.funnel_metrics === 'string'   ? JSON.parse(row.funnel_metrics)   : row.funnel_metrics,
      security_summary: typeof row.security_summary === 'string' ? JSON.parse(row.security_summary) : row.security_summary,
    }));

    return sendSuccess(res, { rollups: data }, 'Analytics dashboard data retrieved successfully');
  } catch (err) {
    logger.error('ADMIN_ANALYTICS_ERROR', 'Failed to retrieve analytics dashboard data:', err);
    return sendError(res, { code: 'INTERNAL_ERROR' }, 'Failed to retrieve analytics data', 500);
  }
};
