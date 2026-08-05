import { sendSuccess, sendError } from '../middleware/responseFormatter.js';
import { UserProfileService } from '../services/userProfileService.js';
import { UserAccountService } from '../services/userAccountService.js';
import { UserPreferencesService } from '../services/userPreferencesService.js';
import { AuthenticationService } from '../services/authenticationService.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * UserController: Thin HTTP layer for User Account Management.
 * Delegates all business logic exclusively to services.
 */

// 1. Profile Management
export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const enriched = await UserProfileService.getEnrichedProfile(userId);
    return sendSuccess(res, { user: enriched }, 'Profile retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const enriched = await UserProfileService.updateProfile(userId, req.body);
    
    await logAudit({
      req,
      actorId: userId,
      action: 'PROFILE_UPDATED',
      severity: 'INFO'
    });

    return sendSuccess(res, { user: enriched }, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await UserProfileService.uploadAvatar(userId, {
      buffer: req.avatarBuffer,
      mimeType: req.avatarMimeType,
      dataUri: req.body.avatar_base64 || req.body.dataUri
    });

    await logAudit({
      req,
      actorId: userId,
      action: 'AVATAR_UPLOADED',
      severity: 'INFO'
    });

    return sendSuccess(res, result, 'Avatar uploaded successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteAvatar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await UserProfileService.deleteAvatar(userId);

    await logAudit({
      req,
      actorId: userId,
      action: 'AVATAR_DELETED',
      severity: 'INFO'
    });

    return sendSuccess(res, result, 'Avatar deleted successfully');
  } catch (err) {
    next(err);
  }
};

// 2. Account & Security Operations
export const requestEmailChange = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { newEmail } = req.body;
    const result = await UserAccountService.requestEmailChange(userId, newEmail);
    return sendSuccess(res, result, 'Email change verification code dispatched');
  } catch (err) {
    next(err);
  }
};

export const verifyEmailChange = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { newEmail, otpCode } = req.body;
    const result = await UserAccountService.verifyEmailChange(userId, newEmail, otpCode);

    await logAudit({
      req,
      actorId: userId,
      action: 'EMAIL_CHANGED',
      severity: 'WARNING',
      metadata: { newEmail }
    });

    return sendSuccess(res, result, 'Email address changed successfully');
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const currentSessionId = req.user.sid || req.user.sessionId;
    const { currentPassword, newPassword } = req.body;
    const result = await AuthenticationService.changePassword(userId, currentSessionId, currentPassword, newPassword);

    if (!result.success) {
      const statusCode = result.error?.code === 'INVALID_CREDENTIALS' ? 401 : 400;
      return res.status(statusCode).json({
        success: false,
        status: statusCode,
        message: result.error?.message || 'Password change failed',
        data: null,
        error: result.error || null
      });
    }

    await logAudit({
      req,
      actorId: userId,
      action: 'PASSWORD_CHANGED',
      severity: 'WARNING'
    });

    return sendSuccess(res, result, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

export const getSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const sessions = await UserAccountService.getActiveSessions(userId);
    return sendSuccess(res, { devices: sessions }, 'Active sessions retrieved');
  } catch (err) {
    next(err);
  }
};

export const revokeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const result = await UserAccountService.revokeSession(userId, sessionId);

    await logAudit({
      req,
      actorId: userId,
      action: 'SESSION_REVOKED',
      severity: 'INFO',
      metadata: { sessionId }
    });

    return sendSuccess(res, result, 'Session revoked');
  } catch (err) {
    next(err);
  }
};

export const revokeAllOtherSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const currentSessionId = req.user.sessionId;
    const result = await UserAccountService.revokeAllOtherSessions(userId, currentSessionId);

    await logAudit({
      req,
      actorId: userId,
      action: 'ALL_OTHER_SESSIONS_REVOKED',
      severity: 'WARNING'
    });

    return sendSuccess(res, result, 'All other active sessions revoked');
  } catch (err) {
    next(err);
  }
};

export const getLoginHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await UserAccountService.getLoginHistory(userId, req.query);
    return sendSuccess(res, result, 'Login history retrieved');
  } catch (err) {
    next(err);
  }
};

export const getSecurityEvents = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await UserAccountService.getSecurityEvents(userId, req.query);
    return sendSuccess(res, result, 'Security events retrieved');
  } catch (err) {
    next(err);
  }
};

export const getOAuthAccounts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const accounts = await UserAccountService.getConnectedOAuthAccounts(userId);
    return sendSuccess(res, { accounts }, 'Connected OAuth accounts retrieved');
  } catch (err) {
    next(err);
  }
};

export const unlinkOAuthAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { provider } = req.params;
    const result = await UserAccountService.unlinkOAuthAccount(userId, provider);

    await logAudit({
      req,
      actorId: userId,
      action: 'OAUTH_UNLINKED',
      severity: 'WARNING',
      metadata: { provider }
    });

    return sendSuccess(res, result, 'OAuth provider account unlinked');
  } catch (err) {
    next(err);
  }
};

// 3. Preferences & Privacy
export const getPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const prefs = await UserPreferencesService.getPreferences(userId);
    return sendSuccess(res, { preferences: prefs }, 'Preferences retrieved');
  } catch (err) {
    next(err);
  }
};

export const updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updated = await UserPreferencesService.updatePreferences(userId, req.body);
    
    await logAudit({
      req,
      actorId: userId,
      action: 'PREFERENCES_UPDATED',
      severity: 'INFO'
    });

    return sendSuccess(res, { preferences: updated }, 'Preferences updated');
  } catch (err) {
    next(err);
  }
};

export const getCookieConsent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const consent = await UserPreferencesService.getCookieConsent(userId);
    return sendSuccess(res, { consent }, 'Cookie consent preferences retrieved');
  } catch (err) {
    next(err);
  }
};

export const updateCookieConsent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { functional, analytics } = req.body;
    const consent = await UserPreferencesService.updateCookieConsent(userId, { functional, analytics });

    await logAudit({
      req,
      actorId: userId,
      action: 'COOKIE_CONSENT_UPDATED',
      severity: 'INFO'
    });

    return sendSuccess(res, { consent }, 'Cookie consent preferences updated');
  } catch (err) {
    next(err);
  }
};

export const getPrivacy = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const privacy = await UserPreferencesService.getPrivacy(userId);
    return sendSuccess(res, { privacy }, 'Privacy settings retrieved');
  } catch (err) {
    next(err);
  }
};

export const updatePrivacy = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updated = await UserPreferencesService.updatePrivacy(userId, req.body);

    await logAudit({
      req,
      actorId: userId,
      action: 'PRIVACY_SETTINGS_UPDATED',
      severity: 'WARNING'
    });

    return sendSuccess(res, { privacy: updated }, 'Privacy settings updated');
  } catch (err) {
    next(err);
  }
};

export const getNotificationSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const settings = await UserPreferencesService.getNotificationSettings(userId);
    return sendSuccess(res, { notifications: settings }, 'Notification settings retrieved');
  } catch (err) {
    next(err);
  }
};

export const updateNotificationSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updated = await UserPreferencesService.updateNotificationSettings(userId, req.body);

    await logAudit({
      req,
      actorId: userId,
      action: 'NOTIFICATION_SETTINGS_UPDATED',
      severity: 'INFO'
    });

    return sendSuccess(res, { notifications: updated }, 'Notification settings updated');
  } catch (err) {
    next(err);
  }
};

// 4. Account Lifecycle & Data Export (HTTP 202 Accepted)
export const exportAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await UserAccountService.requestAccountExport(userId);

    await logAudit({
      req,
      actorId: userId,
      action: 'ACCOUNT_EXPORT_REQUESTED',
      severity: 'INFO',
      metadata: { exportId: result.exportId }
    });

    return res.status(202).json({
      success: true,
      message: result.message,
      data: { exportId: result.exportId, status: result.status }
    });
  } catch (err) {
    next(err);
  }
};

export const getExportStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { exportId } = req.params;
    const status = await UserAccountService.getAccountExportStatus(userId, exportId);
    return sendSuccess(res, status, 'Export status retrieved');
  } catch (err) {
    next(err);
  }
};

export const downloadExport = async (req, res, next) => {
  try {
    const { token } = req.params;
    const download = await UserAccountService.downloadAccountExport(token);

    await logAudit({
      req,
      actorId: download.userId,
      action: 'ACCOUNT_EXPORT_DOWNLOADED',
      severity: 'INFO',
      metadata: { exportId: download.exportId }
    });

    return res.download(download.filePath, `account_export_${download.exportId}.json`);
  } catch (err) {
    next(err);
  }
};

export const deactivateAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;
    const result = await UserAccountService.deactivateAccount(userId, reason);

    await logAudit({
      req,
      actorId: userId,
      action: 'ACCOUNT_DEACTIVATED',
      severity: 'WARNING',
      metadata: { reason }
    });

    return sendSuccess(res, result, 'Account deactivated');
  } catch (err) {
    next(err);
  }
};

export const gdprDelete = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;
    const result = await UserAccountService.selfDeleteAccount(userId, password);

    await logAudit({
      req,
      actorId: userId,
      action: 'ACCOUNT_DELETED',
      severity: 'WARNING'
    });

    return sendSuccess(res, result, 'Account deleted');
  } catch (err) {
    next(err);
  }
};

// Legacy compatibility aliases
export const getDevices = getSessions;
export const revokeDevice = revokeSession;
export const getPermissions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { PermissionService } = await import('../services/permissionService.js');
    const { roles, permissions } = await PermissionService.getUserPermissions(userId);
    return sendSuccess(res, { roles, permissions, permissionVersion: 1 }, 'Permissions retrieved');
  } catch (err) {
    next(err);
  }
};
