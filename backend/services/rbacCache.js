import redisClient, { getIsRedisAvailable } from '../redisClient.js';
import { RbacService } from './rbacService.js';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

const TTL_SECONDS = 15 * 60; // 15 minutes
const CACHE_PREFIX = 'authz:user:';

export const RbacCache = {
  /**
   * Retrieves permissions for a user from Redis cache or falls back seamlessly to DB.
   * Resilient against Redis offline / connection failure states.
   */
  async getUserPermissions(userId) {
    const cacheKey = `${CACHE_PREFIX}${userId}`;

    // 1. Try Redis if available
    if (getIsRedisAvailable()) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        logger.warn('[RbacCache] Redis read failed, falling back to DB:', err.message);
      }
    }

    // 2. Cache Miss or Redis Offline: Fall back to DB
    const permissions = await RbacService.getUserPermissions(userId);

    // 3. Populate Cache if Redis is available
    if (getIsRedisAvailable()) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(permissions), 'EX', TTL_SECONDS);
      } catch (err) {
        logger.warn('[RbacCache] Redis write failed:', err.message);
      }
    }

    return permissions;
  },

  /**
   * Invalidates a specific user's permission cache.
   */
  async invalidateUserCache(userId) {
    if (!getIsRedisAvailable()) return;
    try {
      const cacheKey = `${CACHE_PREFIX}${userId}`;
      await redisClient.del(cacheKey);
    } catch (err) {
      logger.warn('[RbacCache] Invalidate user cache failed:', err.message);
    }
  },

  /**
   * Invalidates global permission cache via pattern scan.
   */
  async invalidateGlobalCache() {
    if (!getIsRedisAvailable()) return;
    try {
      let cursor = '0';
      do {
        const result = await redisClient.scan(cursor, 'MATCH', `${config.redis.prefix}${CACHE_PREFIX}*`, 'COUNT', '100');
        cursor = result[0];
        const keys = result[1];
        if (keys.length > 0) {
          const pipeline = redisClient.pipeline();
          keys.forEach((k) => {
            const keyWithoutPrefix = k.replace(config.redis.prefix, '');
            pipeline.del(keyWithoutPrefix);
          });
          await pipeline.exec();
        }
      } while (cursor !== '0');
    } catch (err) {
      logger.warn('[RbacCache] Invalidate global cache failed:', err.message);
    }
  }
};
