import client, { getIsRedisAvailable } from '../redisClient.js';
import { sendError } from './responseFormatter.js';
import { dbLogger } from '../utils/dbLogger.js';

export const adminRateLimiter = (limit = 30, windowSeconds = 60) => {
  return async (req, res, next) => {
    if (getIsRedisAvailable()) {
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

        return next();
      } catch (err) {
        dbLogger.warn('Admin rate limiter check failed in Redis mode, allowing request gracefully', err);
      }
    }
    next();
  };
};
