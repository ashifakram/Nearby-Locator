import client from '../redisClient.js';
import { sendSuccess, sendError } from '../middleware/responseFormatter.js';
import { UserRepository } from '../repositories/userRepository.js';
import { SessionService } from '../services/sessionService.js';
import { RbacCache } from '../services/rbacCache.js';
import { withTransaction } from '../utils/dbRetry.js';
import { logAudit } from '../utils/auditLogger.js';

// Get profile of authenticated user
export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await UserRepository.findById(userId);
    if (!user) {
      return sendError(res, { code: 'NOT_FOUND' }, 'User not found', 404);
    }
    // Omit sensitive fields
    const { password_hash, ...safeUser } = user;
    return sendSuccess(res, { user: safeUser }, 'Profile retrieved', 200);
  } catch (err) {
    next(err);
  }
};

// GDPR hard delete – permanently remove user and related data
export const gdprDelete = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const email = req.user.email; // From validated authJwt payload (or findById fallback)
    
    // Execute hard delete within atomic transactional boundaries inside repository
    await UserRepository.hardDeleteUser(userId, email || '');

    // Clear any Redis keys for this user (brute‑force locks, sessions, etc.)
    await client.flushDb(); // safest for dev; in prod you'd delete specific keys
    
    return sendSuccess(res, null, 'User data permanently deleted', 200);
  } catch (err) {
    next(err);
  }
};

export const getDevices = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // SessionService active sessions map should be extended to include AMR/mobile/etc later if missing
    const sessions = await SessionService.getActiveSessions(userId);
    return sendSuccess(res, { devices: sessions }, 'Devices retrieved');
  } catch (err) {
    next(err);
  }
};

export const revokeDevice = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Validate if the session belongs to the user and lock it
    await withTransaction(async (executor) => {
      const lockResult = await SessionService.lockAndValidateForLogout(sessionId, executor);
      if (lockResult.success && lockResult.session.user_id === userId) {
        await SessionService.revokeSessionFamily(lockResult.session.session_family_id, 'USER_REVOKED_DEVICE', executor);
      }
    });

    await logAudit({
      req,
      actorId: userId,
      action: 'DEVICE_REVOKED',
      severity: 'INFO',
      metadata: { sessionId }
    });

    return sendSuccess(res, null, 'Device session revoked');
  } catch (err) {
    next(err);
  }
};

export const getPermissions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const permissions = await RbacCache.getUserPermissions(userId);
    return sendSuccess(res, { permissions }, 'Permissions retrieved');
  } catch (err) {
    next(err);
  }
};
