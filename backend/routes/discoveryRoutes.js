import express from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { DiscoveryController } from '../controllers/discoveryController.js';
import { geoRateLimiter } from '../middleware/geoRateLimiter.js';
import { authJwt } from '../middleware/authJwt.js';

const router = express.Router();

/**
 * Lenient JWT middleware: decodes token and sets req.user if present,
 * otherwise lets the request proceed anonymously.
 */
const lenientAuthJwt = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const secret = config.jwt?.secret || 'test-secret-key';
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
    } catch (err) {
      // Ignore token verification failure and fall back to guest
    }
  }
  next();
};

// 1. Discovery nearby composite query search (rate limited)
router.get('/search', geoRateLimiter(20, 60), lenientAuthJwt, DiscoveryController.search);

// 2. Log click telemetry event (rate limited)
router.post('/click', geoRateLimiter(60, 60), lenientAuthJwt, DiscoveryController.logClick);

// 3. Save location to list (requires strict authentication)
router.post('/save', geoRateLimiter(20, 60), authJwt, DiscoveryController.saveLocation);

// 4. Retrieve saved locations (requires strict authentication)
router.get('/saves', geoRateLimiter(30, 60), authJwt, DiscoveryController.getSaves);

// 5. Retrieve search history (requires strict authentication)
router.get('/history', geoRateLimiter(30, 60), authJwt, DiscoveryController.getHistory);

// 6. Retrieve CTR search telemetry details
router.get('/telemetry', geoRateLimiter(30, 60), DiscoveryController.getTelemetry);

// 5. Autocomplete suggestions (rate limited)
router.get('/autocomplete', geoRateLimiter(60, 60), lenientAuthJwt, DiscoveryController.autocomplete);

export default router;
