import express from 'express';
import { authJwt } from '../middleware/authJwt.js';
import { requirePermission } from '../middleware/requirePermission.js';
import {
  submitReport,
  submitAppeal,
  getModerationQueue,
  resolveReport,
  moderatorAction,
  resolveAppeal
} from '../controllers/moderationController.js';

const router = express.Router();

// User routes (Required Authentication)
router.post('/reports', authJwt, submitReport);
router.post('/appeals', authJwt, submitAppeal);

// Admin moderation control plane (Required Authentication + Admin privileges)
router.get('/admin/queue', authJwt, requirePermission('users.read'), getModerationQueue);
router.post('/admin/reports/:reportId/resolve', authJwt, requirePermission('users.update'), resolveReport);
router.post('/admin/spots/:spotId/action', authJwt, requirePermission('users.update'), moderatorAction);
router.post('/admin/appeals/:appealId/resolve', authJwt, requirePermission('users.update'), resolveAppeal);

export default router;
