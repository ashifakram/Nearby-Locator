import redisClient from '../redisClient.js';
import { RbacService } from './rbacService.js';
import config from '../config/index.js';

const TTL_SECONDS = 15 * 60; // 15 minutes
const CACHE_PREFIX = 'authz:user:';

export const RbacCache = {
  /**
   * Retrieves permissions for a user from Redis or falls back to the database.
   */
  async getUserPermissions(userId) {
    const cacheKey = `${CACHE_PREFIX}${userId}`;
    
    // 1. Try Redis
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 2. Cache Miss: Fall back to DB
    const permissions = await RbacService.getUserPermissions(userId);

    // 3. Populate Cache
    await redisClient.set(cacheKey, JSON.stringify(permissions), 'EX', TTL_SECONDS);

    return permissions;
  },

  /**
   * Invalidates a specific user's permission cache.
   */
  async invalidateUserCache(userId) {
    const cacheKey = `${CACHE_PREFIX}${userId}`;
    await redisClient.del(cacheKey);
  },

  /**
   * Invalidates multiple users' caches (e.g., when a role's permissions change, 
   * we might just pattern flush or rely on lazy loading, but since users share roles, 
   * pattern flush is safer for system-wide role updates).
   */
  async invalidateGlobalCache() {
    // In a production Redis Cluster, `keys` is dangerous.
    // Instead, we could use SCAN, but a simpler approach for this architecture is a namespace prefix rotation
    // Or iterating SCAN.
    let cursor = '0';
    do {
      const result = await redisClient.scan(cursor, 'MATCH', `${config.redis.prefix}${CACHE_PREFIX}*`, 'COUNT', '100');
      cursor = result[0];
      const keys = result[1];
      if (keys.length > 0) {
        // Strip the global prefix if the redis client automatically prepends it, 
        // wait, ioredis automatically prepends it if prefix is set.
        // If we got the keys from SCAN, they MIGHT include the prefix.
        // Let's just use a direct pipeline deletion of the keys returned.
        const pipeline = redisClient.pipeline();
        keys.forEach(k => {
          // ioredis `del` expects key without prefix if prefix is configured,
          // but we can just use the raw key if we parse it out.
          const keyWithoutPrefix = k.replace(config.redis.prefix, '');
          pipeline.del(keyWithoutPrefix);
        });
        await pipeline.exec();
      }
    } while (cursor !== '0');
  }
};
