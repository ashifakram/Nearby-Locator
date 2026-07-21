import db from '../db.js';
import client from '../redisClient.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { sendError, sendSuccess } from '../middleware/responseFormatter.js';
import { logAudit } from '../utils/auditLogger.js';
import { enqueue } from '../utils/queue.js';
import { dbLogger } from '../utils/dbLogger.js';
import { RbacService } from '../services/rbacService.js';
import { RbacCache } from '../services/rbacCache.js';
import { SessionService } from '../services/sessionService.js';
import { IdentityService } from '../services/identityService.js';
import { withTransaction } from '../utils/dbRetry.js';

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
    const { userId, requestedRoleId } = req.body;
    if (!userId || !requestedRoleId) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Target user ID and requested role ID are required', 400);
    }

    await RbacService.assignUserRole(req.user.id, userId, requestedRoleId);
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
      metadata: { requestedRoleId }
    });

    return sendSuccess(res, { newRoleId: requestedRoleId }, 'User role successfully updated');
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

    const operatorWeight = ROLE_WEIGHTS[req.user.role] || 0;
    const targetWeight = ROLE_WEIGHTS[targetUser.role] || 0;

    if (operatorWeight <= targetWeight) {
      return sendError(res, { code: 'FORBIDDEN' }, 'Cannot impersonate equal-or-higher role user', 403);
    }

    // Issue standard, non-refreshable, 5-minute token with impersonation scope
    const impersonationPayload = {
      sub: targetUserId,
      impersonator_id: req.user.id,
      sid: req.user.sessionId,
      scope: 'impersonation'
    };

    const token = jwt.sign(impersonationPayload, config.auth.jwtSecret, { expiresIn: '5m' });

    // Set impersonation indicator key in Redis
    await client.set(`impersonation:active:${targetUserId}`, req.user.id, { EX: 300 });

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId,
      action: 'IMPERSONATION_INITIATED',
      severity: 'WARNING',
      metadata: { impersonated: true }
    });

    return sendSuccess(res, { token }, 'Impersonation session established');
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
 * 9. GET /api/admin/audit-logs
 * Bounded search queries with paginated indexing and 90-day search limitations.
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { action, actorId, targetUserId, severity, limit = 50, page = 1 } = req.query;

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
      .select('users.id as userId', 'users.email', 'users.role', 'user_sessions.ip_address', 'user_sessions.id as sessionId')
      .where({ 'user_sessions.is_revoked': false, 'user_sessions.is_rotated': false })
      .whereIn('users.role', ['support_agent', 'support_lead', 'compliance', 'super_admin']);

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
