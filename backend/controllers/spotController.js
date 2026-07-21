import { SpotRepository } from '../repositories/spotRepository.js';
import { sendError } from '../middleware/responseFormatter.js';
import { dbLogger } from '../utils/dbLogger.js';

// Structured operational metrics helper
const recordGeoTelemetry = (metricType, payload) => {
  dbLogger.info(`[GEO_TELEMETRY][${metricType}]`, payload);
};

export const searchSpots = async (req, res) => {
  const start = Date.now();
  try {
    const latVal = req.query.latitude || req.query.lat;
    const lngVal = req.query.longitude || req.query.lng;
    const radiusVal = req.query.radius || 5000;
    const limitVal = req.query.limit || 20;
    const category = req.query.category || null;
    const cursor = req.query.cursor || null;

    if (!latVal || !lngVal) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Latitude and longitude coordinates are required.', 400);
    }

    const lat = parseFloat(latVal);
    const lng = parseFloat(lngVal);
    const radius = parseFloat(radiusVal);
    const limit = parseInt(limitVal, 10);

    if (isNaN(lat) || isNaN(lng) || isNaN(radius) || isNaN(limit)) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Coordinates, radius, and limit must be valid numbers.', 400);
    }

    // Boundary constraints enforcement
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return sendError(res, { code: 'OUT_OF_BOUNDS' }, 'Latitude must be between -90 and 90, Longitude between -180 and 180.', 400);
    }
    
    const safeRadius = Math.min(Math.max(1, radius), 50000); // capped at 50km
    const safeLimit = Math.min(Math.max(1, limit), 100);    // capped at 100

    // Parse stable distance cursor (float-safe pagination)
    let lastDistance = null;
    let lastId = null;

    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf8');
        const parts = decoded.split('|');
        if (parts.length === 2) {
          lastDistance = parseFloat(parts[0]);
          lastId = parts[1];
        }
      } catch (err) {
        dbLogger.warn('Quietly ignored malformed pagination cursor payload');
      }
    }

    const result = await SpotRepository.findNearby({
      lat,
      lng,
      radius: safeRadius,
      limit: safeLimit,
      category,
      lastDistance,
      lastId
    });

    const duration = Date.now() - start;

    // Rich Operational Telemetry Recording
    recordGeoTelemetry('SEARCH_QUERY', {
      lat,
      lng,
      radius: safeRadius,
      limit: safeLimit,
      category,
      durationMs: duration,
      rowsScanned: result.rowsScanned,
      resultsCount: result.data.length,
      cacheHeader: res.getHeader('X-Geo-Cache') || 'BYPASS'
    });

    // 1. Slow Query Distribution Logging (>250ms threshold)
    if (duration > 250) {
      dbLogger.warn('[TELEMETRY][SLOW_GEOQUERY] Slow geoquery latency triggered', {
        lat,
        lng,
        radius: safeRadius,
        durationMs: duration,
        rowsScanned: result.rowsScanned
      });
    }

    // 2. High-Density Hotspot Protection (>50 rows scanned)
    if (result.rowsScanned > 50) {
      dbLogger.warn('[TELEMETRY][GEO_HOTSPOT] High-density urban hotspot scanned', {
        lat,
        lng,
        radius: safeRadius,
        rowsScanned: result.rowsScanned
      });
    }

    return res.json({
      data: result.data,
      nextCursor: result.nextCursor
    });
  } catch (err) {
    dbLogger.error('Spot search endpoint failure', err);
    return sendError(res, { code: 'DATABASE_ERROR' }, 'Internal server database error during search.', 500);
  }
};

export const getClusteredMap = async (req, res) => {
  const start = Date.now();
  try {
    const latVal = req.query.latitude || req.query.lat;
    const lngVal = req.query.longitude || req.query.lng;
    const radiusVal = req.query.radius || 10000;
    const zoomVal = req.query.zoom || 12;

    if (!latVal || !lngVal) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Latitude and longitude coordinates are required.', 400);
    }

    const lat = parseFloat(latVal);
    const lng = parseFloat(lngVal);
    const radius = parseFloat(radiusVal);
    const zoom = parseInt(zoomVal, 10);

    if (isNaN(lat) || isNaN(lng) || isNaN(radius) || isNaN(zoom)) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Coordinates, radius, and zoom must be valid numbers.', 400);
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return sendError(res, { code: 'OUT_OF_BOUNDS' }, 'Latitude must be between -90 and 90, Longitude between -180 and 180.', 400);
    }

    const safeRadius = Math.min(Math.max(1, radius), 50000); // capped at 50km
    const safeZoom = Math.min(Math.max(0, zoom), 20);

    const clusters = await SpotRepository.getMapClusters({
      lat,
      lng,
      radius: safeRadius,
      zoom: safeZoom
    });

    const duration = Date.now() - start;

    // Telemetry: Zoom-aware aggregation metrics
    recordGeoTelemetry('CLUSTERING_QUERY', {
      lat,
      lng,
      radius: safeRadius,
      zoom: safeZoom,
      durationMs: duration,
      clustersCount: clusters.length
    });

    return res.json({
      data: clusters
    });
  } catch (err) {
    dbLogger.error('Clustered map endpoint failure', err);
    return sendError(res, { code: 'DATABASE_ERROR' }, 'Internal server database error during clustering.', 500);
  }
};

export const createSpot = async (req, res) => {
  try {
    const { name, category, latitude, longitude, rating, address, is_active } = req.body;

    if (!name || !category || latitude === undefined || longitude === undefined) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Name, category, latitude, and longitude are required fields.', 400);
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Latitude and longitude coordinates must be valid numbers.', 400);
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return sendError(res, { code: 'OUT_OF_BOUNDS' }, 'Coordinates out of physical bounds.', 400);
    }

    const spot = await SpotRepository.create({
      name,
      category,
      latitude: lat,
      longitude: lng,
      rating: rating !== undefined ? parseFloat(rating) : 0.0,
      address,
      is_active: is_active !== undefined ? !!is_active : true,
      creator_id: req.user ? req.user.id : null
    });

    return res.status(201).json({
      spot
    });
  } catch (err) {
    dbLogger.error('Spot creation failure', err);
    return sendError(res, { code: 'DATABASE_ERROR' }, 'Failed to create spot location.', 500);
  }
};
