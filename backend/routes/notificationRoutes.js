import express from 'express';
import { authJwt } from '../middleware/authJwt.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { NotificationController } from '../controllers/notificationController.js';
import { passwordResetAbuseLimiter } from '../middleware/notificationAbuse.js';

const router = express.Router();

// Preferences management
router.get('/preferences', authJwt, NotificationController.getPreferences);
router.put('/preferences', authJwt, NotificationController.updatePreferences);

// Test notification dispatch endpoint (protected under basic user access)
router.post('/test', authJwt, NotificationController.testSend);

// Create webhook subscriptions
router.post('/webhooks/subscriptions', authJwt, requirePermission('admin.access'), NotificationController.createWebhook);

// Inbound carrier bounce/suppression ingestion webhook (public, called by SendGrid/Twilio APIs)
router.post('/providers/webhooks', NotificationController.inboundProviderWebhook);

// Queue metrics telemetry dashboard (protected, requires compliance/super_admin logs access)
router.get('/telemetry', authJwt, requirePermission('metrics.read'), NotificationController.getQueueTelemetry);

// Password Reset Abuse Limiter Endpoint (demonstrating abuse limits integration)
router.post('/password-reset-trigger', passwordResetAbuseLimiter(3, 3600), (req, res) => {
  return res.json({ message: 'Password reset request dispatched successfully.' });
});

export default router;
