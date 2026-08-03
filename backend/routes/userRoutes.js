import express from 'express';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  requestEmailChange,
  verifyEmailChange,
  changePassword,
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
  getLoginHistory,
  getSecurityEvents,
  getOAuthAccounts,
  unlinkOAuthAccount,
  getPreferences,
  updatePreferences,
  getPrivacy,
  updatePrivacy,
  getNotificationSettings,
  updateNotificationSettings,
  exportAccount,
  getExportStatus,
  downloadExport,
  deactivateAccount,
  gdprDelete,
  getDevices,
  revokeDevice,
  getPermissions
} from '../controllers/userController.js';
import { authJwt } from '../middleware/authJwt.js';
import { avatarUploadMiddleware } from '../middleware/avatarUploadMiddleware.js';
import {
  validateUpdateProfile,
  validateChangeEmail,
  validateVerifyEmailChange,
  validateChangePassword,
  validatePreferences,
  validatePrivacy,
  validateNotifications
} from '../middleware/accountValidation.js';

const router = express.Router();

// 1. Profile Management
router.get('/profile', authJwt, getProfile);
router.put('/profile', authJwt, validateUpdateProfile, updateProfile);
router.patch('/profile', authJwt, validateUpdateProfile, updateProfile);
router.post('/profile/avatar', authJwt, avatarUploadMiddleware, uploadAvatar);
router.put('/profile/avatar', authJwt, avatarUploadMiddleware, uploadAvatar);
router.delete('/profile/avatar', authJwt, deleteAvatar);

// 2. Account Security & Operations
router.post('/account/change-email', authJwt, validateChangeEmail, requestEmailChange);
router.post('/account/verify-email-change', authJwt, validateVerifyEmailChange, verifyEmailChange);
router.post('/account/change-password', authJwt, validateChangePassword, changePassword);

router.get('/account/security/sessions', authJwt, getSessions);
router.delete('/account/security/sessions/others', authJwt, revokeAllOtherSessions);
router.delete('/account/security/sessions/:sessionId', authJwt, revokeSession);

router.get('/account/security/login-history', authJwt, getLoginHistory);
router.get('/account/security/events', authJwt, getSecurityEvents);

router.get('/account/security/oauth', authJwt, getOAuthAccounts);
router.delete('/account/security/oauth/:provider', authJwt, unlinkOAuthAccount);

// 3. Preferences & Privacy & Notifications
router.get('/preferences', authJwt, getPreferences);
router.put('/preferences', authJwt, validatePreferences, updatePreferences);
router.patch('/preferences', authJwt, validatePreferences, updatePreferences);

router.get('/privacy', authJwt, getPrivacy);
router.put('/privacy', authJwt, validatePrivacy, updatePrivacy);
router.patch('/privacy', authJwt, validatePrivacy, updatePrivacy);

router.get('/notifications/settings', authJwt, getNotificationSettings);
router.put('/notifications/settings', authJwt, validateNotifications, updateNotificationSettings);
router.patch('/notifications/settings', authJwt, validateNotifications, updateNotificationSettings);

// 4. Account Lifecycle & Data Exports
router.post('/account/export', authJwt, exportAccount);
router.get('/account/export/:exportId', authJwt, getExportStatus);
router.get('/account/export/download/:token', downloadExport);

router.post('/account/deactivate', authJwt, deactivateAccount);
router.delete('/account', authJwt, gdprDelete);

// 5. Legacy Route Compatibility
router.delete('/delete', authJwt, gdprDelete);
router.get('/me/devices', authJwt, getDevices);
router.delete('/me/devices/:sessionId', authJwt, revokeDevice);
router.get('/me/permissions', authJwt, getPermissions);

export default router;
