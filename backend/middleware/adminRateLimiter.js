import client from '../redisClient.js';
import { sendError } from './responseFormatter.js';
import { dbLogger } from '../utils/dbLogger.js';

/**
 * Specialized rate limiter for administrative control-plane endpoints.
 * Caps requests at a strict maximum (e.g. 30 requests per minute per IP).
 */
export const adminRateLimiter = (limit = 30, windowSeconds = 60) => {
  return async (req, res, next) => {
    try {
      const ip = req.ip;
      const key = `rl:admin:${ip}`;
      const now = Date.now();

      const pipeline = client.multi();
      pipeline.zAdd(key, { score: now, value: `${now}:${Math.random()}` });
      pipeline.zRemRangeByScore(key, 0, now - (windowSeconds * 1000));
      pipeline.zCard(key);
      pipeline.expire(key, windowSeconds);

      const execResult = await pipeline.exec();
      const requestCount = execResult[2];

      if (requestCount > limit) {
        dbLogger.warn(`[SECURITY][ADMIN_RATE_LIMIT] Admin IP Rate Limit Exceeded`, { ip, count: requestCount });
        return sendError(res, { code: 'RATE_LIMIT_EXCEEDED' }, 'Too many administrative requests. Please try again later.', 429);
      }

      next();
    } catch (err) {
      dbLogger.error('Admin rate limiter check failed, allowing request gracefully to prevent lockout', err);
      next();
    }
  };
};
