import express from 'express';
import { subscribe, unsubscribe } from '../controllers/newsletterController.js';
import { adminRateLimiter } from '../middleware/adminRateLimiter.js';

const router = express.Router();

// Rate limit: max 5 subscribe attempts per IP per 15 minutes using project's Redis rate limiter
const subscribeRateLimit = adminRateLimiter(5, 900); // 5 requests per 900 seconds (15 min)

/**
 * POST /api/newsletter/subscribe
 * Public — subscribe an email to the newsletter
 */
router.post('/subscribe', subscribeRateLimit, subscribe);

/**
 * GET /api/newsletter/unsubscribe?token=...
 * Public — unsubscribe via email link token
 */
router.get('/unsubscribe', unsubscribe);

export default router;
