import express from 'express';
import { authJwt } from '../middleware/authJwt.js';
import { requirePermission } from '../middleware/requirePermission.js';
import {
  submitReport,
  submitAppeal,
  getModerationQueue,
  getAdminReports,
  getAdminAppeals,
  resolveReport,
  moderatorAction,
  resolveAppeal
} from '../controllers/moderationController.js';

const router = express.Router();

// User routes (Required Authentication)
router.post('/reports', authJwt, submitReport);
router.post('/appeals', authJwt, submitAppeal);

// Admin moderation control plane (Required Authentication + Admin privileges)
router.get('/admin/queue', authJwt, requirePermission('moderation.read'), getModerationQueue);
router.get('/admin/reports', authJwt, requirePermission('moderation.read'), getAdminReports);
router.get('/admin/appeals', authJwt, requirePermission('moderation.read'), getAdminAppeals);
router.post('/admin/reports/:reportId/resolve', authJwt, requirePermission('moderation.update'), resolveReport);
router.post('/admin/spots/:spotId/action', authJwt, requirePermission('moderation.update'), moderatorAction);
router.post('/admin/appeals/:appealId/resolve', authJwt, requirePermission('moderation.update'), resolveAppeal);

export default router;
