import client, { getIsRedisAvailable } from '../redisClient.js';
import { sendError } from './responseFormatter.js';
import { dbLogger } from '../utils/dbLogger.js';
import { authRateLimitExceededTotal } from '../utils/metrics.js';

const localLimiterCache = new Map();
const LOCAL_CACHE_MAX_ENTRIES = 10000;

// Rate-limiting logs to prevent console alert spam during attack bursts
const loggedWarningKeys = new Set();

const rateLimitedWarnLog = (message, meta = {}) => {
  const key = `${message}:${JSON.stringify(meta)}`;
  if (!loggedWarningKeys.has(key)) {
    loggedWarningKeys.add(key);
    dbLogger.warn(message, meta);
  }
};

// Graceful Timer Management: Clean local warning lists via exported maintenance loops
const warnClearInterval = setInterval(() => loggedWarningKeys.clear(), 5 * 60 * 1000);

export const closeRateLimiter = () => {
  clearInterval(warnClearInterval);
};

export const ipRateLimiter = (limit = 60, windowSeconds = 60, namespace = 'global') => {
  return async (req, res, next) => {
    // Bypass in development and test environments to prevent local E2E test failures
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    const ip = req.ip;
    const now = Date.now();

    if (getIsRedisAvailable()) {
      try {
        const key = `rl:ip:${namespace}:${ip}`;
        
        const pipeline = client.multi();
        pipeline.zAdd(key, { score: now, value: `${now}:${Math.random()}` });
        pipeline.zRemRangeByScore(key, 0, now - (windowSeconds * 1000));
        pipeline.zCard(key);
        pipeline.expire(key, windowSeconds);
        
        const execResult = await pipeline.exec();
        const requestCount = execResult[2];
        
        if (requestCount > limit) {
          rateLimitedWarnLog(`[SECURITY][RATE_LIMIT] IP Rate Limit Exceeded`, { count: requestCount });
          authRateLimitExceededTotal.labels(namespace).inc();
          return sendError(res, { code: 'RATE_LIMIT_EXCEEDED' }, 'Too many requests. Please try again later.', 429);
        }
        
        return next();
      } catch (err) {
        dbLogger.warn('IP Rate Limiter failed in Redis mode, using bounded local in-memory fallback', err);
      }
    }

    // Degraded-Mode: Fall back to memory map, preventing PG database self-DOS
    let ipRecord = localLimiterCache.get(ip) || [];
    ipRecord = ipRecord.filter(time => time > now - (windowSeconds * 1000));
    ipRecord.push(now);
    
    if (localLimiterCache.size > LOCAL_CACHE_MAX_ENTRIES) {
      const firstKey = localLimiterCache.keys().next().value;
      localLimiterCache.delete(firstKey);
    }
    localLimiterCache.set(ip, ipRecord);
    
    if (ipRecord.length > limit) {
      return sendError(res, { code: 'RATE_LIMIT_EXCEEDED' }, 'Too many requests. Please try again later.', 429);
    }
    next();
  };
};

// Account Login Brute Force Lockout with Static 500ms Fallback Throttle
export const checkAccountLockout = async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next();
  
  if (getIsRedisAvailable()) {
    try {
      const blockKey = `bf:block:${email}`;
      const isBlocked = await client.get(blockKey);
      
      if (isBlocked) {
        rateLimitedWarnLog(`[SECURITY][LOCKOUT] Blocked access attempt on locked account`);
        return sendError(res, { code: 'ACCOUNT_LOCKED' }, 'Too many failed login attempts. Please try again in 15 minutes.', 429);
      }
      
      return next();
    } catch (err) {
      dbLogger.warn('Lockout middleware check failed, falling back to static throttle delay', err);
    }
  }

  // Anti-Self-DOS Throttle: Add a static 500ms delay to failed/excess requests to naturally throttle brute forces
  await new Promise(resolve => setTimeout(resolve, 500));
  next();
};

export const clearRateLimiterCache = () => {
  localLimiterCache.clear();
  loggedWarningKeys.clear();
};
