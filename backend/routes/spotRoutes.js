import express from 'express';
import { searchSpots, getClusteredMap, createSpot } from '../controllers/spotController.js';
import { geoRateLimiter } from '../middleware/geoRateLimiter.js';
import { geoCacheMiddleware } from '../middleware/geoCache.js';

const router = express.Router();

// 1. Create a new spot location (Supports test seeding)
router.post('/', createSpot);

// 2. High-performance stable nearby search (Coordinates rate-limited & first-page snapped-cached)
router.get('/search', geoRateLimiter(10, 60), geoCacheMiddleware(), searchSpots);

// 3. Zoom-aware grid-snapped map clustering (Coordinates rate-limited)
router.get('/clusters', geoRateLimiter(20, 60), getClusteredMap);

export default router;
