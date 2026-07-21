import config from '../config/index.js';
import { checkDatabase, checkRedis } from '../utils/healthCheckers.js';

// GET /health/live
export const getLive = (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'nearby-locator-backend',
    ...(config.app.env !== 'production' && { environment: config.app.env }), // Omitted in production to prevent naming disclosure leaks
    version: config.app.version, // Single-source config parameter mapped from APP_VERSION
    uptimeSeconds: Math.round(process.uptime() * 100) / 100,
  });
};

// GET /health/ready
export const getReady = async (req, res) => {
  // Promise.allSettled guarantees graceful degradation and protects orchestration blocks
  const results = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
  ]);

  const dbResult = results[0].status === 'fulfilled' ? results[0].value : { status: 'DOWN', error: 'Check execution failed', latencyMs: 0 };
  const redisResult = results[1].status === 'fulfilled' ? results[1].value : { status: 'DOWN', error: 'Check execution failed', latencyMs: 0 };

  const isReady = dbResult.status === 'UP' && redisResult.status === 'UP';
  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    status: isReady ? 'UP' : 'DOWN',
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: dbResult.status,
        latencyMs: dbResult.latencyMs,
        ...(dbResult.error && { error: dbResult.error }),
      },
      redis: {
        status: redisResult.status,
        latencyMs: redisResult.latencyMs,
        ...(redisResult.error && { error: redisResult.error }),
      },
    },
  });
};

// GET /health/db
export const getDb = async (req, res) => {
  const dbResult = await checkDatabase();
  const statusCode = dbResult.status === 'UP' ? 200 : 503;

  res.status(statusCode).json({
    status: dbResult.status,
    timestamp: new Date().toISOString(),
    database: {
      status: dbResult.status,
      latencyMs: dbResult.latencyMs,
      ...(dbResult.error && { error: dbResult.error }),
    },
  });
};

// GET /health/redis
export const getRedis = async (req, res) => {
  const redisResult = await checkRedis();
  const statusCode = redisResult.status === 'UP' ? 200 : 503;

  res.status(statusCode).json({
    status: redisResult.status,
    timestamp: new Date().toISOString(),
    redis: {
      status: redisResult.status,
      connectionState: redisResult.connectionState || 'closed',
      latencyMs: redisResult.latencyMs,
      ...(redisResult.error && { error: redisResult.error }),
    },
  });
};

let cachedQueueStats = { queueDepth: 0, queueDelayed: 0, queueFailed: 0 };
let lastMetricsFetch = 0;

// GET /health/metrics (Sanitized ephemeral process-local indicators only)
export const getMetrics = async (req, res) => {
  const isProd = config.app.env === 'production';
  const enableMetrics = process.env.ENABLE_METRICS === 'true';

  // Hardened production-disable gate
  if (isProd && !enableMetrics) {
    return res.status(404).json({ error: 'Not Found' });
  }

  // Hardened Access check: strictly allow loopback requests or matching internal headers
  const clientIp = req.ip;
  const isLoopback = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
  
  const internalToken = process.env.INTERNAL_METRICS_TOKEN;
  const hasValidToken = internalToken && req.headers['x-internal-token'] === internalToken;

  if (!isLoopback && !hasValidToken) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const now = Date.now();
  if (now - lastMetricsFetch > 10000) { // 10 seconds cache throttle window
    try {
      const { default: redisClient } = await import('../redisClient.js');
      if (redisClient && redisClient.isOpen) {
        const prefix = config.redis.prefix || 'nearby-locator:';
        // Aggregate lengths of high and low queues
        const [highLen, lowLen, delayed, failed] = await Promise.all([
          redisClient.lLen(`${prefix}queue:high`).catch(() => 0),
          redisClient.lLen(`${prefix}queue:low`).catch(() => 0),
          redisClient.zCard(`${prefix}queue:delayed`).catch(() => 0),
          redisClient.lLen(`${prefix}queue:failed`).catch(() => 0)
        ]);
        cachedQueueStats = {
          queueDepth: highLen + lowLen,
          queueDelayed: delayed,
          queueFailed: failed
        };
        lastMetricsFetch = now;
      }
    } catch (err) {
      // Degrade gracefully during Redis outage spikes
    }
  }

  res.status(200).json({
    status: 'UP',
    ...cachedQueueStats
  });
};
