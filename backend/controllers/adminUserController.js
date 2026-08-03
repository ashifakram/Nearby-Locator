import { sendSuccess, sendError } from '../middleware/responseFormatter.js';
import { AdminUserService } from '../services/adminUserService.js';
import { SessionService } from '../services/sessionService.js';
import { logAudit } from '../utils/auditLogger.js';
import { CsvBuilder } from '../utils/csvExport.js';

/**
 * AdminUserController: Dedicated thin HTTP controller for Administrative User Management.
 * Delegates business logic exclusively to AdminUserService.
 */

// Search, filter, and paginate users with CSV export support
export const getUsers = async (req, res, next) => {
  try {
    const result = await AdminUserService.searchUsers(req.query);

    if (req.query.export === 'csv') {
      const csv = CsvBuilder.build(result.users, [
        { header: 'ID', key: 'id' },
        { header: 'Email', key: 'email' },
        { header: 'Name', key: 'name' },
        { header: 'Provider', key: 'provider' },
        { header: 'Status', key: 'status' },
        { header: 'Created At', key: 'created_at' }
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="admin_users_export.csv"');
      await logAudit({ req, actorId: req.user.id, action: 'EXPORT_CSV', severity: 'INFO', metadata: { type: 'admin_users' } });
      return res.send(csv);
    }

    return sendSuccess(res, result, 'Users retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// Aggregated deep-dive single user detail view
export const getUserDetail = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const detail = await AdminUserService.getAggregatedUserDetail(userId);
    return sendSuccess(res, detail, 'User detail retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// Update user profile/attributes administratively
export const updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updated = await AdminUserService.updateUser(userId, req.body);

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: userId,
      action: 'ADMIN_USER_UPDATED',
      severity: 'WARNING',
      metadata: req.body
    });

    return sendSuccess(res, updated, 'User updated successfully');
  } catch (err) {
    next(err);
  }
};

// Suspend user
export const suspendUser = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.body.userId;
    const reason = req.body.reason || 'Suspended by administrator';

    const result = await AdminUserService.suspendUser(userId, reason);

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: userId,
      action: 'USER_SUSPENDED',
      severity: 'WARNING',
      metadata: { reason }
    });

    return sendSuccess(res, result, 'User suspended');
  } catch (err) {
    next(err);
  }
};

// Unsuspend user
export const unsuspendUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await AdminUserService.unsuspendUser(userId);

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: userId,
      action: 'USER_UNSUSPENDED',
      severity: 'INFO'
    });

    return sendSuccess(res, result, 'User unsuspended');
  } catch (err) {
    next(err);
  }
};

// Disable user
export const disableUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const reason = req.body.reason || 'Disabled by administrator';
    const result = await AdminUserService.disableUser(userId, reason);

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: userId,
      action: 'USER_DISABLED',
      severity: 'WARNING',
      metadata: { reason }
    });

    return sendSuccess(res, result, 'User disabled');
  } catch (err) {
    next(err);
  }
};

// Enable user
export const enableUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await AdminUserService.enableUser(userId);

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: userId,
      action: 'USER_ENABLED',
      severity: 'INFO'
    });

    return sendSuccess(res, result, 'User enabled');
  } catch (err) {
    next(err);
  }
};

// Soft delete user
export const softDeleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await AdminUserService.softDeleteUser(userId);

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: userId,
      action: 'USER_SOFT_DELETED',
      severity: 'WARNING'
    });

    return sendSuccess(res, result, 'User soft deleted');
  } catch (err) {
    next(err);
  }
};

// Restore soft deleted user
export const restoreUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await AdminUserService.restoreUser(userId);

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: userId,
      action: 'USER_RESTORED',
      severity: 'INFO'
    });

    return sendSuccess(res, result, 'User restored');
  } catch (err) {
    next(err);
  }
};

// Manually verify email
export const verifyEmail = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await AdminUserService.verifyEmail(userId);

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: userId,
      action: 'ADMIN_EMAIL_VERIFIED',
      severity: 'INFO'
    });

    return sendSuccess(res, result, 'User email verified');
  } catch (err) {
    next(err);
  }
};

// Resend verification email
export const resendVerification = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await AdminUserService.resendVerification(userId);

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: userId,
      action: 'ADMIN_RESEND_VERIFICATION',
      severity: 'INFO'
    });

    return sendSuccess(res, result, 'Verification email dispatched');
  } catch (err) {
    next(err);
  }
};

// Unlock user account
export const unlockAccount = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await AdminUserService.unlockAccount(userId);

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: userId,
      action: 'USER_UNLOCKED',
      severity: 'INFO'
    });

    return sendSuccess(res, result, 'User account unlocked');
  } catch (err) {
    next(err);
  }
};

// Revoke all sessions for target user
export const revokeUserSessions = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.params.id;
    const sessions = await SessionService.getActiveSessions(userId);

    for (const s of sessions) {
      try {
        await SessionService.revokeSessionFamily(s.session_family_id, 'ADMIN_FORCE_LOGOUT');
      } catch (e) {}
    }

    await logAudit({
      req,
      actorId: req.user.id,
      targetUserId: userId,
      action: 'FORCE_LOGOUT',
      severity: 'WARNING'
    });

    return sendSuccess(res, null, 'User sessions revoked successfully');
  } catch (err) {
    next(err);
  }
};
