import client from '../redisClient.js';
import { logger } from '../utils/logger.js';

const localAbuseCache = new Map();
const LOCAL_CACHE_MAX_ENTRIES = 5000;

/**
 * Sliding Window Redis Rate Limiter for Password Reset requests.
 * Caps password reset attempts to 3 requests per hour per email to prevent spam floods.
 */
export const passwordResetAbuseLimiter = (limit = 3, windowSeconds = 3600) => {
  return async (req, res, next) => {
    const email = (req.body.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Email field is required.' } });
    }

    const key = `abuse:password-reset:${email}`;
    const now = Date.now();

    try {
      if (!client.isOpen) {
        throw new Error('Redis client connection is offline.');
      }

      const pipeline = client.multi();
      pipeline.zAdd(key, { score: now, value: `${now}:${Math.random()}` });
      pipeline.zRemRangeByScore(key, 0, now - (windowSeconds * 1000));
      pipeline.zCard(key);
      pipeline.expire(key, windowSeconds + 10);

      const execResult = await pipeline.exec();
      const count = execResult[2];

      if (count > limit) {
        logger.warn('SECURITY_ABUSE_DETECTED', `Password reset flood blocked for email: ${email}`, { count });
        return res.status(429).json({
          error: {
            code: 'PASSWORD_RESET_FLOOD_BLOCKED',
            message: 'Too many password reset requests. Please try again in an hour.'
          }
        });
      }

      next();
    } catch (err) {
      // Degraded Mode: Safe local in-memory fallback
      logger.warn('ABUSE_LIMITER_DEGRADED', 'Abuse limiter using local Map fallback:', err.message);
      
      const now = Date.now();
      let emailRecord = localAbuseCache.get(email) || [];
      
      // Filter out stale timestamps
      emailRecord = emailRecord.filter(time => time > now - (windowSeconds * 1000));
      emailRecord.push(now);

      // LRU cache eviction logic
      if (localAbuseCache.size > LOCAL_CACHE_MAX_ENTRIES) {
        const firstKey = localAbuseCache.keys().next().value;
        localAbuseCache.delete(firstKey);
      }
      
      localAbuseCache.set(email, emailRecord);

      if (emailRecord.length > limit) {
        return res.status(429).json({
          error: {
            code: 'PASSWORD_RESET_FLOOD_BLOCKED',
            message: 'Too many password reset requests. Please try again in an hour.'
          }
        });
      }

      next();
    }
  };
};

/**
 * Clear local abuse caches during testing resets.
 */
export const clearAbuseCache = () => {
  localAbuseCache.clear();
};
