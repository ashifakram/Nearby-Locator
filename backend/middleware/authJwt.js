import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import client from '../redisClient.js';
import db from '../db.js';
import { sendError } from './responseFormatter.js';
import { dbLogger } from '../utils/dbLogger.js';
import { logAudit } from '../utils/auditLogger.js';

const BREAK_GLASS_STARTUP_TIME = Date.now();
let lastBreakGlassWarningLogged = 0;

const getBreakGlassStartupTime = () => {
  if (process.env.TEST_BREAK_GLASS_STARTUP_TIME) {
    return Number(process.env.TEST_BREAK_GLASS_STARTUP_TIME);
  }
  return BREAK_GLASS_STARTUP_TIME;
};

// Security-Hardened JWT Authentication Middleware (PII-free token validation)
export const authJwt = async (req, res, next) => {
  // 1. Check for Break-Glass Operational Bypass mode
  const breakGlassHeader = req.headers['x-break-glass-secret'];
  if (breakGlassHeader && process.env.BREAK_GLASS_ENABLED === 'true') {
    const elapsed = Date.now() - getBreakGlassStartupTime();
    if (elapsed > 3600000) {
      return sendError(res, { code: 'BREAK_GLASS_EXPIRED' }, 'Emergency break-glass session has expired', 403);
    }

    if (breakGlassHeader === process.env.BREAK_GLASS_SECRET) {
      req.user = {
        id: null,
        role: 'super_admin',
        isSudo: true, // Emergency actions carry absolute clearance
        isBreakGlass: true
      };

      // Guarantee that emergency-access flows still require audit logging and elevated telemetry
      await logAudit({
        req,
        actorId: null,
        action: 'BREAK_GLASS_OVERRIDE_USED',
        severity: 'CRITICAL',
        metadata: { breakGlass: true }
      });

      const now = Date.now();
      if (now - lastBreakGlassWarningLogged > 5 * 60 * 1000) {
        lastBreakGlassWarningLogged = now;
        dbLogger.warn('🩺 [CRITICAL][SECURITY][BREAK_GLASS_ACTIVE] Emergency break-glass override used!');
      }

      return next();
    }
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, { code: 'NO_TOKEN' }, 'Authorization token missing', 401);
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.auth.jwtSecret);
    
    // Extract claims (sub: userId, sid: sessionId)
    const userId = payload.sub;
    const sessionId = payload.sid;
    
    if (!userId || !sessionId) {
      return sendError(res, { code: 'INVALID_TOKEN' }, 'Invalid or incomplete token claims', 401);
    }

    // Explicitly block impersonated sessions from high-risk security/account changes
    if (payload.scope === 'impersonation') {
      const blockedPaths = [
        '/api/auth/password/reset',
        '/api/auth/google/delink',
        '/api/auth/logout-all',
        '/api/admin/sudo-confirm',
        '/api/admin/export-data',
        '/api/admin/escalate-role',
        '/api/admin/suspend',
        '/api/admin/unsuspend',
        '/api/admin/impersonate'
      ];
      const reqPath = (req.baseUrl || '') + req.path;
      if (blockedPaths.some(p => reqPath.startsWith(p))) {
        return sendError(res, { code: 'FORBIDDEN' }, 'Dangerous actions are blocked during impersonation sessions', 403);
      }
    }
    
    const cacheKey = `session:active:${sessionId}`;
    let sessionCache = null;
    
    try {
      const cached = await client.get(cacheKey);
      if (cached) {
        try {
          sessionCache = JSON.parse(cached);
        } catch {
          // Fallback if legacy cache stored string "1"
          sessionCache = null;
        }
      }
    } catch (redisErr) {
      dbLogger.error('Redis active session cache fetch failed, fallback to database verification', redisErr);
    }
    
    if (sessionCache === null) {
      // Cache miss or Redis outage: Verify active session status directly in PostgreSQL database
      const session = await db('user_sessions')
        .where({ id: sessionId, is_revoked: false, is_rotated: false })
        .first();
        
      if (!session) {
        return sendError(res, { code: 'REVOKED_SESSION' }, 'Session has been revoked or expired', 401);
      }

      // Fetch user role, email, status for metadata
      const userRecord = await db('users')
        .join('roles', 'users.role_id', '=', 'roles.id')
        .select('users.email', 'users.status', 'roles.name as role')
        .where('users.id', userId)
        .first();

      if (!userRecord) {
        return sendError(res, { code: 'REVOKED_SESSION' }, 'User not found', 401);
      }

      const isSuspended = userRecord.status === 'BANNED' || userRecord.status === 'DISABLED';

      sessionCache = {
        userId,
        email: userRecord.email,
        role: userRecord.role || 'user',
        isSuspended: isSuspended,
        sudoUntil: null
      };
      
      // Cache the metadata back in Redis for 15 minutes
      try {
        await client.set(cacheKey, JSON.stringify(sessionCache), { EX: 15 * 60 });
      } catch (redisErr) {
        dbLogger.error('Failed to update active session cache back in Redis', redisErr);
      }
    }
    
    // Immediate Suspension Enforcement Gating
    if (sessionCache.isSuspended) {
      return sendError(res, { code: 'REVOKED_SESSION' }, 'User account has been suspended', 401);
    }

    const isSudo = sessionCache.sudoUntil ? (Number(sessionCache.sudoUntil) > Date.now()) : false;

    // Set user attributes
    req.user = {
      id: userId,
      sessionId,
      email: sessionCache.email || null,
      role:  sessionCache.role  || 'user',
      isSudo,
      isImpersonated: false
    };

    // Impersonation JWT Verification and Session-Invalidation Checks
    if (payload.scope === 'impersonation') {
      const impersonatorId = payload.impersonator_id;
      const impersonatorSid = payload.sid;

      if (!impersonatorId || !impersonatorSid) {
        return sendError(res, { code: 'INVALID_TOKEN' }, 'Invalid impersonation token claims', 401);
      }

      // Verify the impersonating administrator's own session is still valid
      const adminCacheKey = `session:active:${impersonatorSid}`;
      let adminCache = null;
      try {
        const cachedAdmin = await client.get(adminCacheKey);
        if (cachedAdmin) {
          adminCache = JSON.parse(cachedAdmin);
        }
      } catch (err) {}

      if (adminCache === null) {
        const adminSession = await db('user_sessions')
          .where({ id: impersonatorSid, is_revoked: false, is_rotated: false })
          .first();
        if (!adminSession) {
          return sendError(res, { code: 'REVOKED_SESSION' }, 'Impersonation actor session revoked', 401);
        }

        const adminRecord = await db('users')
          .join('roles', 'users.role_id', '=', 'roles.id')
          .select('users.email', 'users.status', 'roles.name as role')
          .where('users.id', impersonatorId)
          .first();

        const isAdminSuspended = adminRecord ? (adminRecord.status === 'BANNED' || adminRecord.status === 'DISABLED') : true;

        if (!adminRecord || isAdminSuspended) {
          return sendError(res, { code: 'REVOKED_SESSION' }, 'Impersonation actor suspended or removed', 401);
        }

        adminCache = {
          userId: impersonatorId,
          email: adminRecord.email,
          role: adminRecord.role || 'user',
          isSuspended: false
        };
        try {
          await client.set(adminCacheKey, JSON.stringify(adminCache), { EX: 15 * 60 });
        } catch (err) {}
      }

      if (adminCache.isSuspended) {
        return sendError(res, { code: 'REVOKED_SESSION' }, 'Impersonation actor has been suspended', 401);
      }

      // Verify role is qualified
      if (adminCache.role !== 'support_lead' && adminCache.role !== 'super_admin') {
        return sendError(res, { code: 'FORBIDDEN' }, 'Actor does not possess impersonation privileges', 403);
      }

      // Apply double-attributed impersonation details
      req.user.isImpersonated = true;
      req.user.impersonatorId = impersonatorId;
      req.user.impersonatorSessionId = impersonatorSid;
    }
    
    // Bind authenticated userId to AsyncLocalStorage context store for automated telemetry correlation
    const { correlationStore } = await import('../utils/logger.js');
    const store = correlationStore.getStore();
    if (store) {
      store.userId = userId;
    }
    
    next();
  } catch (err) {
    return sendError(res, { code: 'INVALID_TOKEN' }, 'Invalid or expired token', 401);
  }
};
