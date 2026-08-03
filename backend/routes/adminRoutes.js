import express from 'express';
import { authJwt } from '../middleware/authJwt.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { sudoConfirm } from '../middleware/sudoConfirm.js';
import { adminRateLimiter } from '../middleware/adminRateLimiter.js';
import {
  sudoConfirm as handleSudoConfirm,
  escalateRole,
  initiateImpersonation,
  exportUserData,
  getExportStatus,
  downloadExportedData,
  retentionOverride,
  getAuditLogs,
  getControlPlaneMetrics,
  listRoles,
  listPermissions,
  updateRolePermissions,
  getAuthEvents,
  getSystemErrors,
  getSessions,
  revokeSession,
  getDashboardAnalytics,
  getAuthEventsAnalytics,
  getSystemErrorsAnalytics,
  getAuditLogsAnalytics
} from '../controllers/adminController.js';

import {
  getUsers,
  getUserDetail,
  updateUser,
  suspendUser,
  unsuspendUser,
  disableUser,
  enableUser,
  softDeleteUser,
  restoreUser,
  verifyEmail,
  resendVerification,
  unlockAccount,
  revokeUserSessions
} from '../controllers/adminUserController.js';

import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { updateSetting } from '../controllers/systemSettingController.js';
import { getFeatureFlags, updateFeatureFlag } from '../controllers/featureFlagController.js';
import { getQueueMetrics, getQueueJobs, retryDlqJob, purgeQueueJob, flushCacheByPrefix } from '../controllers/adminOpsController.js';
import { getInfrastructureHealth, getSlowQueries } from '../controllers/adminDiagnosticsController.js';
import { getDashboardWidgets } from '../controllers/dashboardController.js';
import { getProviderHealth, getPromptHistory } from '../controllers/aiAnalyticsController.js';
import { getZeroResultQueries, getSearchQualityAnalytics } from '../controllers/searchAnalyticsController.js';
import { getThreatTelemetry } from '../controllers/securityAnalyticsController.js';
import { globalSearch } from '../controllers/globalSearchController.js';
import { getSystemInfo } from '../controllers/systemController.js';

const router = express.Router();

// Apply administrative rate limiter globally across all control plane routes (30 reqs/minute)
router.use(adminRateLimiter(30, 60));

// Step-up verification endpoint
router.post('/sudo-confirm', authJwt, handleSudoConfirm);

// Executive Dashboard & AI Provider Health
router.get('/dashboard/widgets', authJwt, requirePermission('metrics.read'), getDashboardWidgets);
router.get('/ai/provider-health', authJwt, requirePermission('metrics.read'), getProviderHealth);
router.get('/ai/prompt-history', authJwt, requirePermission('metrics.read'), getPromptHistory);

// Search Quality Analytics & Global Search
router.get('/search', authJwt, requirePermission('users.read'), globalSearch);
router.get('/search-quality/zero-results', authJwt, requirePermission('metrics.read'), getZeroResultQueries);
router.get('/search-quality/analytics', authJwt, requirePermission('metrics.read'), getSearchQualityAnalytics);

// Security Center & Threat Telemetry
router.get('/security/telemetry', authJwt, requirePermission('audit.read'), getThreatTelemetry);

// User Management (AdminUserController)
router.get('/users', authJwt, requirePermission('users.read'), getUsers);
router.get('/users/:userId', authJwt, requirePermission('users.read'), getUserDetail);
router.put('/users/:userId', authJwt, requirePermission('users.update'), updateUser);

router.post('/users/:userId/suspend', authJwt, requirePermission('users.update'), suspendUser);
router.post('/suspend', authJwt, requirePermission('users.update'), suspendUser); // Legacy support
router.post('/users/:userId/unsuspend', authJwt, requirePermission('users.update'), unsuspendUser);

router.post('/users/:userId/disable', authJwt, requirePermission('users.update'), disableUser);
router.post('/users/:userId/enable', authJwt, requirePermission('users.update'), enableUser);

router.post('/users/:userId/delete', authJwt, requirePermission('users.delete'), softDeleteUser);
router.post('/users/:userId/restore', authJwt, requirePermission('users.update'), restoreUser);

router.post('/users/:userId/verify-email', authJwt, requirePermission('users.update'), verifyEmail);
router.post('/users/:userId/resend-verification', authJwt, requirePermission('users.update'), resendVerification);

router.post('/users/:userId/unlock', authJwt, requirePermission('users.update'), unlockAccount);
router.post('/users/:userId/logout', authJwt, requirePermission('users.update'), revokeUserSessions);

// Roles and Permissions Management
router.get('/roles', authJwt, requirePermission('roles.read'), listRoles);
router.get('/permissions', authJwt, requirePermission('permissions.read'), listPermissions);
router.put('/roles/:roleId/permissions', authJwt, requirePermission('roles.update'), sudoConfirm, updateRolePermissions);
router.put('/users/:userId/role', authJwt, requirePermission('roles.update'), sudoConfirm, escalateRole);
router.post('/escalate-role', authJwt, requirePermission('roles.update'), sudoConfirm, escalateRole);

// Control Plane Operations
router.post('/impersonate', authJwt, requirePermission('admin.impersonate'), sudoConfirm, initiateImpersonation);
router.post('/export-data', authJwt, requirePermission('audit.export'), sudoConfirm, exportUserData);
router.get('/export-status/:exportId', authJwt, requirePermission('audit.export'), getExportStatus);
router.get('/downloads/:token', authJwt, requirePermission('audit.export'), downloadExportedData);

router.post('/retention-override', authJwt, requirePermission('settings.update'), sudoConfirm, retentionOverride);

router.get('/audit-logs', authJwt, requirePermission('audit.read'), getAuditLogs);
router.get('/control-plane-metrics', authJwt, requirePermission('metrics.read'), getControlPlaneMetrics);

// Queue & Worker Operations
router.get('/ops/queues', authJwt, requirePermission('system.ops'), getQueueMetrics);
router.get('/ops/queues/jobs', authJwt, requirePermission('system.ops'), getQueueJobs);
router.post('/ops/queues/jobs/:jobId/retry', authJwt, requirePermission('system.ops'), sudoConfirm, retryDlqJob);
router.delete('/ops/queues/jobs/:jobId', authJwt, requirePermission('system.ops'), sudoConfirm, purgeQueueJob);
router.post('/ops/redis/flush-cache', authJwt, requirePermission('system.ops'), sudoConfirm, flushCacheByPrefix);

// Infrastructure Diagnostics
router.get('/ops/health/infrastructure', authJwt, requirePermission('system.diagnostics'), getInfrastructureHealth);
router.get('/ops/db/slow-queries', authJwt, requirePermission('system.diagnostics'), getSlowQueries);

// Operations Center Expansion
router.get('/auth-events', authJwt, requirePermission('audit.read'), getAuthEvents);
router.get('/system-errors', authJwt, requirePermission('logs.read'), getSystemErrors);
router.get('/sessions', authJwt, requirePermission('users.read'), getSessions);
router.delete('/sessions/:id', authJwt, requirePermission('users.update'), revokeSession);
router.delete('/sessions/user/:userId', authJwt, requirePermission('users.update'), revokeUserSessions);

// Feature Flags Governance
router.get('/feature-flags', authJwt, requirePermission('settings.read'), getFeatureFlags);
router.put('/feature-flags/:flagKey', authJwt, requirePermission('settings.update'), sudoConfirm, updateFeatureFlag);

// Analytics
router.get('/analytics/dashboard', authJwt, requirePermission('metrics.read'), getDashboardAnalytics);
router.get('/analytics/auth-events', authJwt, requirePermission('audit.read'), getAuthEventsAnalytics);
router.get('/analytics/system-errors', authJwt, requirePermission('logs.read'), getSystemErrorsAnalytics);
router.get('/analytics/audit-logs', authJwt, requirePermission('audit.read'), getAuditLogsAnalytics);

// Settings
router.get('/settings', authJwt, requirePermission('settings.read'), getSettings);
router.put('/settings', authJwt, requirePermission('settings.update'), sudoConfirm, updateSettings);
router.put('/settings/:key', authJwt, requirePermission('settings.update'), sudoConfirm, updateSetting);

// System diagnostics
router.get('/system/info', authJwt, requirePermission('metrics.read'), getSystemInfo);

export default router;
