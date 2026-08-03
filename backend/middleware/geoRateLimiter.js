import client, { getIsRedisAvailable } from '../redisClient.js';
import { sendError } from './responseFormatter.js';
import { dbLogger } from '../utils/dbLogger.js';

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Pure, self-contained Geohash encoder.
 * Avoids any external library overhead while guaranteeing high speed and 100% precision.
 */
export function encodeGeohash(lat, lon, precision = 5) {
  let minLat = -90, maxLat = 90;
  let minLon = -180, maxLon = 180;
  let geohash = '';
  let bit = 0;
  let ch = 0;
  let isEven = true;

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (minLon + maxLon) / 2;
      if (lon > mid) {
        ch = (ch << 1) | 1;
        minLon = mid;
      } else {
        ch = (ch << 1) | 0;
        maxLon = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat > mid) {
        ch = (ch << 1) | 1;
        minLat = mid;
      } else {
        ch = (ch << 1) | 0;
        maxLat = mid;
      }
    }

    isEven = !isEven;
    bit++;

    if (bit === 5) {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return geohash;
}

// Bounded local map cache in case Redis degrades/disconnects
const localCrawlerCache = new Map();
const LOCAL_CACHE_MAX_ENTRIES = 5000;

/**
 * Geohash-based coordinate crawling rate limiter.
 * Tracks distinct Geohash-5 cells queried by a client IP or User ID over a sliding window.
 * Limits bot scraping/crawling of geo-coordinates.
 */
export const geoRateLimiter = (limit = 10, windowSeconds = 60) => {
  return async (req, res, next) => {
    const latVal = req.query.latitude || req.query.lat || req.body.latitude || req.body.lat;
    const lngVal = req.query.longitude || req.query.lng || req.body.longitude || req.body.lng;
    
    if (!latVal || !lngVal) {
      return next();
    }

    const lat = parseFloat(latVal);
    const lng = parseFloat(lngVal);

    if (isNaN(lat) || isNaN(lng)) {
      return next();
    }

    const geohash = encodeGeohash(lat, lng, 5);
    const actorId = req.user ? req.user.id : req.ip;

    if (getIsRedisAvailable()) {
      try {
        const key = `geo:rl:${actorId}`;
        const pipeline = client.multi();
        pipeline.sAdd(key, geohash);
        pipeline.sCard(key);
        pipeline.expire(key, windowSeconds);

        const execResult = await pipeline.exec();
        const uniqueCount = execResult[1];

        if (uniqueCount > limit) {
          dbLogger.warn(`[SECURITY][GEO_CRAWL_LIMIT] Coordinate crawling block triggered`, { actorId, uniqueCount });
          return sendError(
            res,
            { code: 'GEO_CRAWLING_DETECTED' },
            'Query limit exceeded across multiple geo regions. Access suspended momentarily.',
            429
          );
        }
        return next();
      } catch (err) {
        dbLogger.warn('Geo Rate Limiter failed in Redis mode, falling back to local memory', err);
      }
    }

    // Local Fallback Logic
    const now = Date.now();
    let record = localCrawlerCache.get(actorId) || { geohashes: new Set(), expiresAt: now + windowSeconds * 1000 };
    
    if (now > record.expiresAt) {
      record = { geohashes: new Set(), expiresAt: now + windowSeconds * 1000 };
    }
    
    record.geohashes.add(geohash);
    
    if (localCrawlerCache.size > LOCAL_CACHE_MAX_ENTRIES) {
      const firstKey = localCrawlerCache.keys().next().value;
      localCrawlerCache.delete(firstKey);
    }
    
    localCrawlerCache.set(actorId, record);

    if (record.geohashes.size > limit) {
      return sendError(
        res,
        { code: 'GEO_CRAWLING_DETECTED' },
        'Query limit exceeded across multiple geo regions. Access suspended momentarily.',
        429
      );
    }

    next();
  };
};

export const clearGeoRateLimiterCache = () => {
  localCrawlerCache.clear();
};
