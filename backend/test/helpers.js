import db from '../db.js';
import client from '../redisClient.js';
import config from '../config/index.js';
import { clearWarningCaps, metricsStore, closeWarningTimers } from '../utils/logger.js';
import { clearRateLimiterCache, closeRateLimiter } from '../middleware/rateLimiter.js';

// Strict Test Environment & Test Database Safety Guard
export const validateTestEnvironment = () => {
  const dbUrl = config.db.url || '';
  const isTestDb = dbUrl.includes('_test') || dbUrl.endsWith('_test') || (process.env.DATABASE_URL || '').includes('_test');
  
  if (process.env.NODE_ENV !== 'test' || !isTestDb) {
    throw new Error(
      `[CRITICAL ENVIRONMENT VIOLATION] Destructive operations are strictly locked! ` +
      `Ensure process.env.NODE_ENV === 'test' and database connection maps strictly to a '_test' database. ` +
      `Current DB URL: "${dbUrl}", NODE_ENV: "${process.env.NODE_ENV}"`
    );
  }
};

// PostgreSQL-Native Cascading Truncation and Sequence Resets for Test Isolation
export const cleanDatabase = async () => {
  validateTestEnvironment();
  
  // Natively truncate all active tables using PostgreSQL CASCADE to clear dependent foreign keys
  await db.raw('TRUNCATE TABLE search_synonyms, search_terms, search_suggestions, spot_moderation_history, moderation_appeals, reports, discovery_saves, discovery_clicks, discovery_searches, dead_letter_jobs, webhook_deliveries, webhook_subscriptions, notification_deliveries, suppression_list, user_notification_preferences, spots, audit_logs, moderation_history, analytics_events, daily_analytics_rollups, user_sessions, login_attempts, system_errors, users CASCADE;');
};

import { clearGeoRateLimiterCache } from '../middleware/geoRateLimiter.js';

// Clean process-local caches, metrics counters, and warning limits between tests
export const resetGlobalState = () => {
  clearWarningCaps();
  clearRateLimiterCache();
  clearGeoRateLimiterCache();
  
  // Purge ephemeral telemetry counters
  metricsStore.requestsTotal = 0;
  metricsStore.requestDurationMsTotal = 0;
  metricsStore.authFailures = 0;
  metricsStore.replayDetections = 0;
  metricsStore.rateLimitTriggers = 0;
  metricsStore.dbFailures = 0;
  metricsStore.redisDegradations = 0;
};

// Clean Redis session caches completely
export const flushRedisTestCache = async () => {
  validateTestEnvironment();
  try {
    await client.flushDb();
  } catch (err) {
    // Graceful catch for in-memory mocked / offline modes
  }
};

// Teardown connections and clean warning intervals (ensures no CI hanging open handles)
export const teardownConnections = async () => {
  closeWarningTimers();
  closeRateLimiter();
  
  try {
    await client.quit();
  } catch (err) {}
  
  try {
    await db.destroy();
  } catch (err) {}
};
