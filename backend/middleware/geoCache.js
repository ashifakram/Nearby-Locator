import client from '../redisClient.js';
import { dbLogger } from '../utils/dbLogger.js';

/**
 * Snapped geo-caching middleware.
 * - Restricts caching strictly to the first page of queries (no active cursor) to prevent Redis memory explosion.
 * - Snaps coordinates to 3 decimal places (~110m grid cell) and radius to the nearest 500m to maximize cache hit rates.
 * - Maintains a 5-minute TTL to ensure fresh results.
 * - Records cache hit/miss ratio metrics in Redis for operational visibility.
 */
export const geoCacheMiddleware = () => {
  return async (req, res, next) => {
    try {
      const latVal = req.query.latitude || req.query.lat || req.body.latitude || req.body.lat;
      const lngVal = req.query.longitude || req.query.lng || req.body.longitude || req.body.lng;
      const radiusVal = req.query.radius || req.body.radius || 5000;
      const category = req.query.category || req.body.category || 'all';
      const cursor = req.query.cursor || req.body.cursor || req.query.lastId || null;

      // Rule: Caching is strictly limited to first-page queries (no cursor) to prevent cache pollution
      if (cursor) {
        return next();
      }

      if (!latVal || !lngVal) {
        return next();
      }

      const lat = parseFloat(latVal);
      const lng = parseFloat(lngVal);
      const radius = parseFloat(radiusVal);

      if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
        return next();
      }

      // Snap coordinates to 3 decimal places (~110m precision)
      const snappedLat = lat.toFixed(3);
      const snappedLng = lng.toFixed(3);
      
      // Snap radius to nearest 500m increment
      const snappedRadius = Math.round(radius / 500) * 500;

      const cacheKey = `geo:cache:${snappedLat}:${snappedLng}:${snappedRadius}:${category}`;

      let cachedResponse;
      try {
        cachedResponse = await client.get(cacheKey);
      } catch (err) {
        // Safe degradation: skip cache on Redis retrieval failures
        dbLogger.error('Geo-Cache read error, degrading gracefully', err);
        return next();
      }

      if (cachedResponse) {
        // Record hit metrics
        try {
          await client.incr('geo:metrics:hits');
        } catch (mErr) {}

        // Add telemetry marker to response headers
        res.setHeader('X-Geo-Cache', 'HIT');
        return res.json(JSON.parse(cachedResponse));
      }

      // Record miss metrics
      try {
        await client.incr('geo:metrics:misses');
      } catch (mErr) {}

      res.setHeader('X-Geo-Cache', 'MISS');

      // Intercept res.json to populate the Redis cache on a successful database query
      const originalJson = res.json;
      res.json = function (body) {
        res.json = originalJson;
        
        // Cache only successful responses (typically contains data array)
        if (res.statusCode === 200 && body && body.data) {
          // Bounded 5-minute TTL (300 seconds)
          client.setEx(cacheKey, 300, JSON.stringify(body)).catch(err => {
            dbLogger.error('Failed to write response to geo-cache', err);
          });
        }
        
        return originalJson.call(this, body);
      };

      next();
    } catch (err) {
      dbLogger.error('Geo-Cache middleware threw an unexpected error, bypassing cache', err);
      next();
    }
  };
};
