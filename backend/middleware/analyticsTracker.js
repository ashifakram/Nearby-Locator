import redisClient from '../redisClient.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Analytics Tracker Middleware
 * - Mock country resolution based on IP (simple placeholder returning 'US').
 * - Create or refresh a user session entry in Redis with a 5‑minute TTL.
 * - Expose `req.sessionId` and `req.country` for downstream controllers.
 */
export const analyticsTracker = async (req, res, next) => {
  try {
    // Simple mock country lookup – in real code you’d call a geo IP service.
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || '0.0.0.0';
    const country = 'US'; // placeholder
    req.country = country;

    // Session handling – reuse if client supplies, otherwise generate.
    const sessionId = req.headers['x-session-id'] || uuidv4();
    req.sessionId = sessionId;
    const key = `session:${sessionId}`;
    const payload = {
      ip,
      country,
      path: req.originalUrl,
      method: req.method,
      lastSeen: Date.now(),
    };
    // Store with 5‑minute expiration (300 s).
    await redisClient.set(key, JSON.stringify(payload), { EX: 300 });
    res.setHeader('X-Session-Id', sessionId);
  } catch (e) {
    console.error('Analytics tracker error:', e);
    // Continue without blocking the request.
  }
  next();
};
