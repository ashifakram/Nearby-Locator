import express from 'express';
import { submitContact } from '../controllers/contactController.js';
import { adminRateLimiter } from '../middleware/adminRateLimiter.js';

const router = express.Router();

// Rate limit: 3 contact submissions per IP per 10 minutes (prevents spam)
const contactRateLimit = adminRateLimiter(3, 600);

/**
 * POST /api/contact/submit
 * Public — submit a contact form inquiry
 */
router.post('/submit', contactRateLimit, submitContact);

export default router;
