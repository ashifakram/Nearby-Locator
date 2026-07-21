import { Router } from 'express';
import { getLive, getReady, getDb, getRedis, getMetrics } from '../controllers/healthController.js';

const router = Router();

/**
 * FUTURE ROADMAP NOTE: Rate Limiting & Authentication Bypass
 * As the application scales and implements strict rate limiters, global auth middlewares, 
 * or logging interceptors, healthRouter MUST be registered BEFORE those blockers.
 * This guarantees that orchestrators (like Kubernetes Readiness Probes, HAProxy, AWS ALBs)
 * are never rate-limited or blocked from monitoring application health.
 */

// Anti-caching middleware to prevent reverse proxy, CDN, or browser caching
const noCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
};

// Enforce strict anti-caching across all diagnostic checkpoints
router.use(noCache);

router.get('/live', getLive);
router.get('/ready', getReady);
router.get('/db', getDb);
router.get('/redis', getRedis);
router.get('/metrics', getMetrics);

export default router;
