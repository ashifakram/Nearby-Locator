import db from '../db.js';
import client from '../redisClient.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { sendError, sendSuccess } from '../middleware/responseFormatter.js';
import { logAudit } from '../utils/auditLogger.js';
import { CsvBuilder } from '../utils/csvExport.js';
import { enqueue } from '../utils/queue.js';
import { dbLogger } from '../utils/dbLogger.js';
import { RbacService } from '../services/rbacService.js';
import { RbacRepository } from '../repositories/rbacRepository.js';
import { AuthenticationRepository } from '../repositories/authenticationRepository.js';
import { SystemErrorRepository } from '../repositories/systemErrorRepository.js';
import { RbacCache } from '../services/rbacCache.js';
import { SessionService } from '../services/sessionService.js';
import { IdentityService } from '../services/identityService.js';
import { withTransaction } from '../utils/dbRetry.js';
import analyticsService from '../services/analyticsService.js';
import { buildSortClause, buildPaginationClause, applyDateRange } from '../utils/queryUtils.js';

const BREAK_GLASS_STARTUP_TIME = Date.now();

const getBreakGlassStartupTime = () => {
  if (process.env.TEST_BREAK_GLASS_STARTUP_TIME) {
    return Number(process.env.TEST_BREAK_GLASS_STARTUP_TIME);
  }
  return BREAK_GLASS_STARTUP_TIME;
};

// Telemetry warning logging tracker for active break-glass
let lastBreakGlassWarningLogged = 0;

/**
 * 1. POST /api/admin/sudo-confirm
 * Out-of-bound step-up authentication. Sets sudoUntil inside the active session context in Redis.
 */
export const sudoConfirm = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Password is required for step-up verification', 400);
    }

    // Retrieve active user record
    const user = await db('users').where({ id: req.user.id }).first();
    if (!user || !user.password_hash) {
      return sendError(res, { code: 'UNAUTHORIZED' }, 'User record or password hashes missing', 401);
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      // Log failed step-up auth attempt
      await logAudit({
        req,
        actorId: req.user.id,
        action: 'SUDO_ELEVATION_FAILED',
        severity: 'WARNING'
      });
      return sendError(res, { code: 'INVALID_CREDENTIALS' }, 'Invalid password provided', 401);
    }

    // Success step-up: Write out-of-band to Redis session cache
    const cacheKey = `session:active:${req.user.sessionId}`;
    const cached = await client.get(cacheKey);
    let sessionData = {};
    if (cached) {
      try {
        sessionData = JSON.parse(cached);
      } catch {}
    }

    const sudoUntil = Date.now() + 5 * 60 * 1000; // 5 minutes elevation
    sessionData.sudoUntil = sudoUntil;

    await client.set(cacheKey, JSON.stringify(sessionData), { EX: 15 * 60 });

    await logAudit({
      req,
      actorId: req.user.id,
      action: 'SUDO_ELEVATION_GRANTED',
      severity: 'INFO'
    });

    return sendSuccess(res, { sudoUntil: new Date(sudoUntil).toISOString() }, 'Step-up authentication confirmed');
  } catch (err) {
    next(err);
  }
};

/**
 * 2. POST /api/admin/suspend
 * Gated suspension endpoint. Revokes sessions, clears Redis, and writes history log.
 */
export const suspendUser = async (req, res, next) => {
  try {
    const { userId, reason } = req.body;
    if (!userId || !reason || reason.length < 10) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Target user ID and valid reason (minimum 10 chars) are required', 400);
    }

    // Rely on RbacService to enforce privilege boundaries and Last Super Admin rules
    await RbacService.suspendUser(req.user.id, userId);

    await db('moderation_history').insert({
      user_id: userId,
      moderator_id: req.user.id || null,
      action: 'SUSPEND',
      reason
    });

    // Revoke all sessions securely through SessionService
    await withTransaction(async (executor) => {
      await SessionService.revokeAllSessionsForUser(userId, executor);
    });

    // Evict active session cache in Redis for immediate propagation
    const userSessions = await db('user_sessions').where({ user_id: userId }).select('id');
    for (const s of userSessions) {
      await client.del(`session:active:${s.id}`).catch(() => {});
    }

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: userId,
      action: 'USER_SUSPENDED',
      severity: 'WARNING',
      metadata: { reason }
    });

    return sendSuccess(res, null, 'User suspended and all active sessions revoked successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 3. POST /api/admin/unsuspend
 */
export const unsuspendUser = async (req, res, next) => {
  try {
    const { userId, reason } = req.body;
    if (!userId || !reason || reason.length < 10) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Target user ID and valid reason (minimum 10 chars) are required', 400);
    }

    // To unlock, we do not have a dedicated RbacService endpoint, but we can validate boundaries
    const targetUser = await db('users').where({ id: userId }).first();
    if (!targetUser) return sendError(res, { code: 'NOT_FOUND' }, 'User not found', 404);
    
    // Validate boundary manually or create a method. We'll use the existing IdentityService.changeStatus
    await withTransaction(async (executor) => {
      await IdentityService.changeStatus(userId, 'ACTIVE', executor);
    });

    await db('moderation_history').insert({
      user_id: userId,
      moderator_id: req.user.id || null,
      action: 'UNSUSPEND',
      reason
    });

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: userId,
      action: 'USER_UNSUSPENDED',
      severity: 'INFO',
      metadata: { reason }
    });

    return sendSuccess(res, null, 'User account unsuspended successfully');
  } catch (err) {
    next(err);
  }
};

export const forceLogout = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await withTransaction(async (executor) => {
      await SessionService.revokeAllSessionsForUser(userId, executor);
    });
    
    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: userId,
      action: 'ALL_SESSIONS_REVOKED',
      severity: 'WARNING'
    });

    return sendSuccess(res, null, 'User sessions revoked');
  } catch (err) {
    next(err);
  }
};

/**
 * 4. POST /api/admin/escalate-role
 * Elevates user roles with strict role hierarchy weights and super_admin boundaries.
 */
export const escalateRole = async (req, res, next) => {
  try {
    let { userId, requestedRoleId, requestedRole, roleId } = req.body;
    let targetRoleId = requestedRoleId || roleId || requestedRole;

    if (!userId || !targetRoleId) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Target user ID and requested role ID or name are required', 400);
    }

    if (typeof targetRoleId === 'string' && !targetRoleId.includes('-')) {
      const roleNameMap = { 'super_admin': 'Super Admin', 'admin': 'Admin', 'user': 'User', 'support_agent': 'User', 'support_lead': 'Admin' };
      const mappedName = roleNameMap[targetRoleId] || targetRoleId;
      const roleRecord = await db('roles').whereILike('name', mappedName).first();
      if (roleRecord) {
        targetRoleId = roleRecord.id;
      }
    }

    await RbacService.assignUserRole(req.user.id, userId, targetRoleId);
    await RbacCache.invalidateUserCache(userId);
    
    // Evict sessions to force active update propagation immediately
    await withTransaction(async (executor) => {
      await SessionService.revokeAllSessionsForUser(userId, executor);
    });

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: userId,
      action: 'USER_ROLE_CHANGED',
      severity: 'CRITICAL',
      metadata: { targetRoleId }
    });

    return sendSuccess(res, null, 'User role escalated successfully');
  } catch (err) {
    next(err);
  }
};

export const listRoles = async (req, res, next) => {
  try {
    const roles = await RbacService.getRoles();
    return sendSuccess(res, { roles }, 'Roles retrieved');
  } catch (err) {
    next(err);
  }
};

export const listPermissions = async (req, res, next) => {
  try {
    const permissions = await RbacService.getPermissions();
    return sendSuccess(res, { permissions }, 'Permissions retrieved');
  } catch (err) {
    next(err);
  }
};

export const updateRolePermissions = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body; // array of permission names
    await RbacService.updateRolePermissions(req.user.id, roleId, permissions);
    await RbacCache.invalidateGlobalCache();
    
    await logAudit({
      req,
      actorId: req.user.id,
      action: 'ROLE_PERMISSIONS_UPDATED',
      severity: 'CRITICAL',
      metadata: { roleId, permissions }
    });

    return sendSuccess(res, null, 'Role permissions updated');
  } catch (err) {
    next(err);
  }
};

/**
 * 5. POST /api/admin/impersonate
 * Generates short-lived, explicit-scope, audited troubleshooting token.
 */
export const initiateImpersonation = async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Target user ID is required', 400);
    }

    const targetUser = await db('users').where({ id: targetUserId }).first();
    if (!targetUser) {
      return sendError(res, { code: 'NOT_FOUND' }, 'Target user not found', 404);
    }

    const actorRole = await RbacRepository.getUserRole(req.user.id);
    const targetRole = await RbacRepository.getUserRole(targetUserId);

    if (actorRole && targetRole) {
      RbacService._validatePriorityBoundary(actorRole, targetRole);
    }

    // Issue standard, non-refreshable, 5-minute token with impersonation scope
    const impersonationSessionId = crypto.randomUUID();
    const impersonationPayload = {
      sub: targetUserId,
      impersonator_id: req.user.id,
      impersonator_sid: req.user.sessionId,
      sid: impersonationSessionId,
      scope: 'impersonation'
    };

    const token = jwt.sign(impersonationPayload, config.auth.jwtSecret, { expiresIn: '5m' });

    // Store target user session metadata in Redis for impersonation token lookup
    const impersonationCache = {
      userId: targetUserId,
      email: targetUser.email,
      role: targetRole ? targetRole.name : 'user',
      isSuspended: targetUser.status === 'BANNED' || targetUser.status === 'DISABLED',
      sudoUntil: null
    };
    await client.set(`session:active:${impersonationSessionId}`, JSON.stringify(impersonationCache), { EX: 300 });

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: targetUserId,
      action: 'IMPERSONATION_STARTED',
      severity: 'CRITICAL',
      metadata: { impersonated: true }
    });

    return sendSuccess(res, { token }, 'Impersonation token issued');
  } catch (err) {
    next(err);
  }
};

/**
 * 6. POST /api/admin/export-data
 * Asynchronous user data export workflow.
 */
export const exportUserData = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Target user ID is required for data export', 400);
    }

    const exportId = crypto.randomUUID();

    // Mark as processing in Redis
    await client.set(`export:status:${exportId}`, JSON.stringify({ status: 'PROCESSING' }), { EX: 600 });

    // Queue data gathering task
    await enqueue('EXPORT_USER_DATA', {
      userId,
      exportId,
      requesterId: req.user.id
    }, { priority: 'high' });

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: userId,
      action: 'EXPORT_REQUESTED',
      severity: 'WARNING'
    });

    return res.status(202).json({
      success: true,
      data: { exportId, status: 'PROCESSING' },
      message: 'Export workflow initiated'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/export-status/:exportId
 */
export const getExportStatus = async (req, res, next) => {
  try {
    const { exportId } = req.params;
    const cached = await client.get(`export:status:${exportId}`);
    if (!cached) {
      return sendError(res, { code: 'NOT_FOUND' }, 'Export ticket not found or expired', 404);
    }
    return sendSuccess(res, JSON.parse(cached), 'Export status retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * 7. GET /api/admin/downloads/:token
 * Secure single-use download token access.
 */
export const downloadExportedData = async (req, res, next) => {
  try {
    const { token } = req.params;
    const payloadKey = `download:payload:${token}`;

    const payloadStr = await client.get(payloadKey);
    if (!payloadStr) {
      return sendError(res, { code: 'INVALID_TOKEN' }, 'Download token expired, invalid, or already consumed', 410);
    }

    // Delete token immediately to enforce single-use behavior
    await client.del(payloadKey);

    const payload = JSON.parse(payloadStr);

    await logAudit({
      req,
      actorId: req.user.id,
      action: 'EXPORT_DOWNLOADED',
      severity: 'CRITICAL'
    });

    return res.json({
      success: true,
      data: payload
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 8. POST /api/admin/retention-override
 * Pauses active database retention sweeps under strict safety limits.
 */
export const retentionOverride = async (req, res, next) => {
  try {
    const { durationDays, reason } = req.body;
    if (!durationDays || !reason || reason.length < 10) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Duration in days and a valid reason (min 10 chars) are required', 400);
    }

    if (durationDays < 1 || durationDays > 7) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Retention override duration must be between 1 and 7 days', 400);
    }

    const cooldownKey = 'retention:override:last_timestamp';
    const lastOverride = await client.get(cooldownKey);
    if (lastOverride) {
      const timeSinceLast = Date.now() - Number(lastOverride);
      const cooldownMs = 14 * 24 * 60 * 60 * 1000; // 14 days cooldown
      if (timeSinceLast < cooldownMs) {
        const daysLeft = Math.ceil((cooldownMs - timeSinceLast) / (24 * 60 * 60 * 1000));
        return sendError(res, { code: 'COOLDOWN_ACTIVE' }, `Retention override cooldown is active. Wait ${daysLeft} days.`, 429);
      }
    }

    const pauseMs = durationDays * 24 * 60 * 60 * 1000;
    const pausedUntil = Date.now() + pauseMs;

    // Set pause flags in Redis
    await client.set('retention:paused_until', String(pausedUntil), { EX: durationDays * 24 * 60 * 60 });
    await client.set(cooldownKey, String(Date.now()));

    await logAudit({
      req,
      actorId: req.user.id,
      action: 'RETENTION_OVERRIDE_PAUSE',
      severity: 'CRITICAL',
      metadata: { durationMs: pauseMs, reason }
    });

    return sendSuccess(res, { pausedUntil: new Date(pausedUntil).toISOString() }, 'Retention sweeps successfully paused');
  } catch (err) {
    next(err);
  }
};

/**
 * 9. GET /api/admin/users
 * Paginated list of users for administration.
 */
export const getUsers = async (req, res, next) => {
  try {
    const { limit = 50, page = 1, search } = req.query;

    const { limit: parsedLimit, offset, page: parsedPage } = buildPaginationClause(req.query, 50, 100);
    const { column, order } = buildSortClause(req.query, 'created_at', 'desc', ['created_at', 'name', 'email', 'status', 'role_id']);

    const query = db('users');

    if (search) {
      query.where(builder => {
        builder.where('email', 'ILIKE', `%${search}%`)
               .orWhere('name', 'ILIKE', `%${search}%`)
               .orWhere('id', search);
      });
    }

    if (req.query.export === 'csv') {
      const allUsers = await query.clone().select('id', 'email', 'name', 'provider', 'role_id', 'status', 'created_at').orderBy(column, order).limit(10000);
      const csv = CsvBuilder.build(allUsers, [
        { header: 'ID', key: 'id' },
        { header: 'Email', key: 'email' },
        { header: 'Name', key: 'name' },
        { header: 'Provider', key: 'provider' },
        { header: 'Role ID', key: 'role_id' },
        { header: 'Status', key: 'status' },
        { header: 'Created At', key: 'created_at' }
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="admin_users_export.csv"');
      await logAudit({ req, actorId: req.user.id, action: 'EXPORT_CSV', severity: 'INFO', metadata: { type: 'admin_users' } });
      return res.send(csv);
    }

    const countQuery = query.clone().clearSelect().count('* as total').first();

    const [countResult, users] = await Promise.all([
      countQuery,
      query.clone()
        .select('id', 'email', 'name', 'provider', 'role_id', 'status', 'created_at')
        .orderBy(column, order)
        .limit(parsedLimit)
        .offset(offset)
    ]);

    const total = Number(countResult?.total || 0);

    return sendSuccess(res, {
      total,
      limit: parsedLimit,
      page: parsedPage,
      users
    }, 'Users retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 9. GET /api/admin/audit-logs
 * Retrieves paginated audit logs.
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { action, actorId, targetUserId, severity, search, export: isExport, limit = 50, page = 1 } = req.query;

    const parsedLimit = Math.min(Number(limit) || 50, 100);
    const parsedPage = Math.max(Number(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    // Enforce 90-day maximum search window
    const maxSearchDate = new Date();
    maxSearchDate.setDate(maxSearchDate.getDate() - 90);

    const query = db('audit_logs').where('occurred_at', '>=', maxSearchDate);

    if (action) query.where({ action });
    if (actorId) query.where({ actor_id: actorId });
    if (targetUserId) query.where({ target_user_id: targetUserId });
    if (severity) query.where({ severity });
    
    // Correlation ID or JSONB search
    if (search) {
      query.whereRaw(`metadata->>'correlationId' = ?`, [search]);
    }

    if (isExport === 'csv') {
      // Bounded massive export (max 10k rows)
      const logs = await query.clone().select('*').orderBy('occurred_at', 'desc').limit(10000);
      
      const csv = CsvBuilder.build(logs, [
        { header: 'ID', key: 'id' },
        { header: 'Actor ID', key: 'actor_id' },
        { header: 'Target User ID', key: 'target_user_id' },
        { header: 'Action', key: 'action' },
        { header: 'Severity', key: 'severity' },
        { header: 'IP Address', key: 'ip_address' },
        { header: 'Occurred At', key: 'occurred_at' },
        { header: 'Metadata', key: 'metadata' }
      ]);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit_logs_export.csv"');
      await logAudit({ req, actorId: req.user.id, action: 'EXPORT_CSV', severity: 'INFO', metadata: { type: 'audit_logs' } });
      return res.send(csv);
    }

    const countQuery = query.clone().clearSelect().count('* as total').first();

    const [countResult, logs] = await Promise.all([
      countQuery,
      query.clone()
        .select('*')
        .orderBy('occurred_at', 'desc')
        .limit(parsedLimit)
        .offset(offset)
    ]);

    const total = Number(countResult?.total || 0);

    return sendSuccess(res, {
      total,
      limit: parsedLimit,
      page: parsedPage,
      logs
    }, 'Audit records retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 10. GET /api/admin/control-plane-metrics
 * Aggregates operational session metrics and suspicious concurrent admin logins.
 */
export const getControlPlaneMetrics = async (req, res, next) => {
  try {
    // 1. Fetch active admin sessions from database (fully indexed joins)
    const activeAdminSessions = await db('user_sessions')
      .join('users', 'user_sessions.user_id', 'users.id')
      .join('roles', 'users.role_id', 'roles.id')
      .select('users.id as userId', 'users.email', 'roles.name as role', 'user_sessions.ip_address', 'user_sessions.id as sessionId')
      .where({ 'user_sessions.is_revoked': false, 'user_sessions.is_rotated': false })
      .whereIn('roles.name', ['Support Agent', 'Support Lead', 'Compliance', 'Super Admin', 'Admin']);

    // 2. Count active impersonations by scanning keys in Redis
    let impersonationCount = 0;
    let cursor = 0;
    do {
      const scanResult = await client.scan(cursor, { MATCH: 'impersonation:active:*', COUNT: 100 });
      cursor = Number(scanResult.cursor);
      impersonationCount += scanResult.keys.length;
    } while (cursor !== 0);

    // 3. Scan suspicious concurrent admin sessions (distinct IPs)
    const adminSessionsGrouped = {};
    for (const session of activeAdminSessions) {
      if (!adminSessionsGrouped[session.userId]) {
        adminSessionsGrouped[session.userId] = {
          email: session.email,
          role: session.role,
          ips: new Set()
        };
      }
      adminSessionsGrouped[session.userId].ips.add(session.ip_address);
    }

    const suspiciousConcurrentLogins = [];
    for (const [userId, group] of Object.entries(adminSessionsGrouped)) {
      if (group.ips.size > 1) {
        suspiciousConcurrentLogins.push({
          userId,
          email: group.email,
          role: group.role,
          distinctIpCount: group.ips.size,
          ips: Array.from(group.ips)
        });
      }
    }

    // 4. Emergency break-glass checks
    const breakGlassEnabled = process.env.BREAK_GLASS_ENABLED === 'true';
    const breakGlassTimeElapsed = Date.now() - getBreakGlassStartupTime();
    const breakGlassExpired = breakGlassTimeElapsed >= 3600000;
    const breakGlassActive = breakGlassEnabled && !breakGlassExpired;

    // Telemetry warning interval trigger
    if (breakGlassActive) {
      const now = Date.now();
      if (now - lastBreakGlassWarningLogged > 5 * 60 * 1000) {
        lastBreakGlassWarningLogged = now;
        dbLogger.warn('🩺 [CRITICAL][SECURITY][BREAK_GLASS_ACTIVE] Emergency break-glass mode is currently running!');
      }
    }

    return sendSuccess(res, {
      activeAdminSessionCount: activeAdminSessions.length,
      activeImpersonationCount: impersonationCount,
      suspiciousConcurrentLogins,
      breakGlass: {
        enabled: breakGlassEnabled,
        active: breakGlassActive,
        expired: breakGlassExpired,
        secondsRemaining: breakGlassActive ? Math.max(0, Math.ceil((3600000 - breakGlassTimeElapsed) / 1000)) : 0
      }
    }, 'Operational intelligence control plane metrics compiled');
  } catch (err) {
    next(err);
  }
};

/**
 * 11. GET /api/admin/auth-events
 * Retrieves paginated authentication events (Login, Register, Suspicious IPs, etc).
 */
export const getAuthEvents = async (req, res, next) => {
  try {
    const { search, eventCategory, eventType, export: isExport, limit = 50, page = 1 } = req.query;

    const parsedLimit = Math.min(Number(limit) || 50, 100);
    const parsedPage = Math.max(Number(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    if (isExport === 'csv') {
      // Bounded export (up to 10k rows) for performance
      const { events } = await AuthenticationRepository.getAdminEvents({ search, eventCategory, eventType, limit: 10000, offset: 0 });
      
      const csv = CsvBuilder.build(events, [
        { header: 'ID', key: 'id' },
        { header: 'User ID', key: 'user_id' },
        { header: 'Category', key: 'event_category' },
        { header: 'Type', key: 'event_type' },
        { header: 'Created At', key: 'created_at' },
        { header: 'Metadata', key: 'metadata' }
      ]);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="auth_events_export.csv"');
      await logAudit({ req, actorId: req.user.id, action: 'EXPORT_CSV', severity: 'INFO', metadata: { type: 'auth_events' } });
      return res.send(csv);
    }

    const result = await AuthenticationRepository.getAdminEvents({ search, eventCategory, eventType, limit: parsedLimit, offset });

    return sendSuccess(res, {
      total: result.total,
      limit: parsedLimit,
      page: parsedPage,
      events: result.events
    }, 'Authentication events retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 12. GET /api/admin/system-errors
 * Retrieves paginated system errors.
 */
export const getSystemErrors = async (req, res, next) => {
  try {
    const { search, severity, statusCode, export: isExport, limit = 50, page = 1 } = req.query;

    const parsedLimit = Math.min(Number(limit) || 50, 100);
    const parsedPage = Math.max(Number(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    if (isExport === 'csv') {
      const { errors } = await SystemErrorRepository.getErrors({ search, severity, statusCode, limit: 10000, offset: 0 });
      
      const csv = CsvBuilder.build(errors, [
        { header: 'ID', key: 'id' },
        { header: 'Correlation ID', key: 'correlation_id' },
        { header: 'Severity', key: 'severity' },
        { header: 'Status Code', key: 'status_code' },
        { header: 'Message', key: 'message' },
        { header: 'URL', key: 'url' },
        { header: 'Occurred At', key: 'occurred_at' }
      ]);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="system_errors_export.csv"');
      await logAudit({ req, actorId: req.user.id, action: 'EXPORT_CSV', severity: 'INFO', metadata: { type: 'system_errors' } });
      return res.send(csv);
    }

    const result = await SystemErrorRepository.getErrors({ search, severity, statusCode, limit: parsedLimit, offset });

    return sendSuccess(res, {
      total: result.total,
      limit: parsedLimit,
      page: parsedPage,
      errors: result.errors
    }, 'System errors retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 13. GET /api/admin/sessions
 * Retrieves all active sessions.
 */
export const getSessions = async (req, res, next) => {
  try {
    const { search, export: isExport, limit = 50, page = 1 } = req.query;
    
    const parsedLimit = Math.min(Number(limit) || 50, 100);
    const parsedPage = Math.max(Number(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const query = db('user_sessions')
      .join('users', 'user_sessions.user_id', 'users.id')
      .join('roles', 'users.role_id', 'roles.id')
      .select(
        'user_sessions.id',
        'user_sessions.user_id',
        'users.email',
        'roles.name as role',
        'user_sessions.ip_address',
        'user_sessions.user_agent',
        'user_sessions.created_at',
        'user_sessions.updated_at'
      )
      .where({ 'user_sessions.is_revoked': false });

    if (search) {
      query.where(builder => {
        builder.where('users.email', 'ILIKE', `%${search}%`)
               .orWhere('user_sessions.ip_address', search);
      });
    }

    if (isExport === 'csv') {
      const sessions = await query.clone().orderBy('user_sessions.updated_at', 'desc').limit(10000);
      const csv = CsvBuilder.build(sessions, [
        { header: 'Session ID', key: 'id' },
        { header: 'User ID', key: 'user_id' },
        { header: 'Email', key: 'email' },
        { header: 'Role', key: 'role' },
        { header: 'IP Address', key: 'ip_address' },
        { header: 'User Agent', key: 'user_agent' },
        { header: 'Created At', key: 'created_at' },
        { header: 'Last Active', key: 'updated_at' }
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="active_sessions_export.csv"');
      await logAudit({ req, actorId: req.user.id, action: 'EXPORT_CSV', severity: 'INFO', metadata: { type: 'active_sessions' } });
      return res.send(csv);
    }

    const countQuery = query.clone().clearSelect().count('* as total').first();
    const [countResult, sessions] = await Promise.all([
      countQuery,
      query.clone().orderBy('user_sessions.updated_at', 'desc').limit(parsedLimit).offset(offset)
    ]);

    return sendSuccess(res, {
      total: Number(countResult?.total || 0),
      limit: parsedLimit,
      page: parsedPage,
      sessions
    }, 'Active sessions retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getDashboardAnalytics();
    return sendSuccess(res, data, 'Dashboard analytics retrieved');
  } catch (err) {
    next(err);
  }
};

export const getAuthEventsAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getAuthEventsAnalytics(req.query);
    return sendSuccess(res, data, 'Auth events analytics retrieved');
  } catch (err) {
    next(err);
  }
};

export const getSystemErrorsAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getSystemErrorsAnalytics(req.query);
    return sendSuccess(res, data, 'System errors analytics retrieved');
  } catch (err) {
    next(err);
  }
};

export const getAuditLogsAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getAuditLogsAnalytics(req.query);
    return sendSuccess(res, data, 'Audit logs analytics retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * 14. DELETE /api/admin/sessions/:id
 * Revokes a specific session.
 */
export const revokeSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await db('user_sessions').where({ id }).first();
    if (!session) {
      return sendError(res, 404, 'Session not found');
    }
    
    // Revoke using the existing service
    await SessionService.revokeSession(session.id, session.user_id, req.user.id);
    
    await logAudit(req, 'REVOKE_SESSION', session.user_id, 'WARNING', { sessionId: session.id, reason: 'Admin revoked session' });
    return sendSuccess(res, null, 'Session revoked successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 15. DELETE /api/admin/sessions/user/:userId
 * Revokes all sessions for a specific user.
 */
export const revokeUserSessions = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await SessionService.revokeAllSessions(userId, req.user.id);
    await logAudit(req, 'REVOKE_ALL_SESSIONS', userId, 'WARNING', { reason: 'Admin revoked all sessions' });
    return sendSuccess(res, null, 'All sessions revoked successfully');
  } catch (err) {
    next(err);
  }
};
