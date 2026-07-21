import express from 'express';
import { authJwt } from '../middleware/authJwt.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { sudoConfirm } from '../middleware/sudoConfirm.js';
import { adminRateLimiter } from '../middleware/adminRateLimiter.js';
import {
  sudoConfirm as handleSudoConfirm,
  suspendUser,
  unsuspendUser,
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
  forceLogout
} from '../controllers/adminController.js';

const router = express.Router();

// Apply administrative rate limiter globally across all control plane routes (30 reqs/minute)
router.use(adminRateLimiter(30, 60));

// Step-up verification endpoint
router.post('/sudo-confirm', authJwt, handleSudoConfirm);

// Moderation
router.post('/users/:userId/suspend', authJwt, requirePermission('users.update'), suspendUser);
router.post('/users/:userId/unlock', authJwt, requirePermission('users.update'), unsuspendUser);
router.post('/users/:userId/logout', authJwt, requirePermission('users.update'), forceLogout);

// Roles and Permissions Management
router.get('/roles', authJwt, requirePermission('roles.read'), listRoles);
router.get('/permissions', authJwt, requirePermission('permissions.read'), listPermissions);
router.put('/roles/:roleId/permissions', authJwt, requirePermission('roles.update'), sudoConfirm, updateRolePermissions);
router.put('/users/:userId/role', authJwt, requirePermission('users.update'), sudoConfirm, escalateRole);

// Legacy routes ported to dynamic permissions
router.post('/impersonate', authJwt, requirePermission('users.update'), sudoConfirm, initiateImpersonation);
router.post('/export-data', authJwt, requirePermission('audit.export'), sudoConfirm, exportUserData);
router.get('/export-status/:exportId', authJwt, requirePermission('audit.export'), getExportStatus);
router.get('/downloads/:token', authJwt, requirePermission('audit.export'), downloadExportedData);

router.post('/retention-override', authJwt, requirePermission('settings.update'), sudoConfirm, retentionOverride);

router.get('/audit-logs', authJwt, requirePermission('audit.read'), getAuditLogs);
router.get('/control-plane-metrics', authJwt, requirePermission('metrics.read'), getControlPlaneMetrics);

export default router;
