import db from '../db.js';
import client from '../redisClient.js';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Perform batched, chunked deletion of rows to prevent locking tables,
 * bloating transaction logs, or causing database replication lag.
 */
async function deleteInBatches(tableName, queryBuilderFn, batchSize = 1000) {
  let totalDeleted = 0;
  let deletedCount;

  do {
    // 1. Fetch matching primary keys up to the batch limit
    const rows = await queryBuilderFn().select('id').limit(batchSize);
    if (rows.length === 0) break;

    const ids = rows.map(r => r.id);

    // 2. Perform isolated delete transaction
    deletedCount = await db(tableName).whereIn('id', ids).del();
    totalDeleted += deletedCount;

    // 3. Short 50ms cooldown to release locks and yield execution to HTTP events
    await new Promise(resolve => setTimeout(resolve, 50));

  } while (deletedCount >= batchSize);

  return totalDeleted;
}

/**
 * CLEANUP_EXPIRED_SESSIONS:
 * Removes database sessions where expires_at < now.
 * Also pipeline-evicts their corresponding active session keys in Redis.
 */
export async function cleanupExpiredSessions() {
  logger.info('Starting scheduled task: CLEANUP_EXPIRED_SESSIONS');
  const now = new Date();

  // Find expired session IDs to clear in Redis
  const expiredSessions = await db('user_sessions')
    .select('id')
    .where('expires_at', '<', now)
    .limit(5000); // Bounded query size to prevent memory bloat

  if (expiredSessions.length > 0) {
    const prefix = config.redis.prefix || 'nearby-locator:';
    const pipeline = client.multi();
    
    for (const session of expiredSessions) {
      pipeline.del(`${prefix}session:active:${session.id}`);
    }
    
    await pipeline.exec();
    logger.info(`Evicted ${expiredSessions.length} active session keys from Redis.`);
  }

  // Delete matching rows in chunked batches
  const queryBuilderFn = () => db('user_sessions').where('expires_at', '<', now);
  const deletedCount = await deleteInBatches('user_sessions', queryBuilderFn);

  logger.info(`Successfully completed CLEANUP_EXPIRED_SESSIONS. Pruned ${deletedCount} database rows.`);
}

/**
 * PRUNE_STALE_TOKENS:
 * Removes database sessions that are marked as rotated or revoked.
 * Keeps them for a short 24-hour window for telemetry/audit, then prunes.
 */
export async function pruneStaleTokens() {
  logger.info('Starting scheduled task: PRUNE_STALE_TOKENS');
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  const queryBuilderFn = () => db('user_sessions')
    .where(function() {
      this.where('is_rotated', true).orWhere('is_revoked', true);
    })
    .andWhere('updated_at', '<', cutoff);

  const deletedCount = await deleteInBatches('user_sessions', queryBuilderFn);
  logger.info(`Successfully completed PRUNE_STALE_TOKENS. Pruned ${deletedCount} rotated/revoked rows.`);
}

/**
 * PRUNE_TELEMETRY:
 * Prunes system_errors older than 7 days.
 */
export async function pruneTelemetry() {
  logger.info('Starting scheduled task: PRUNE_TELEMETRY');
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  const queryBuilderFn = () => db('system_errors').where('occurred_at', '<', cutoff);
  const deletedCount = await deleteInBatches('system_errors', queryBuilderFn);

  logger.info(`Successfully completed PRUNE_TELEMETRY. Pruned ${deletedCount} error logs.`);
}

/**
 * PRUNE_LOGIN_ATTEMPTS:
 * Prunes login_attempts older than 14 days.
 */
export async function pruneLoginAttempts() {
  logger.info('Starting scheduled task: PRUNE_LOGIN_ATTEMPTS');
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 days ago

  const queryBuilderFn = () => db('login_attempts').where('attempted_at', '<', cutoff);
  const deletedCount = await deleteInBatches('login_attempts', queryBuilderFn);

  logger.info(`Successfully completed PRUNE_LOGIN_ATTEMPTS. Pruned ${deletedCount} login attempt rows.`);
}

/**
 * PRUNE_DISCOVERY_TELEMETRY:
 * Prunes discovery_searches, discovery_clicks, and discovery_saves older than 90 days.
 */
export async function pruneDiscoveryTelemetry() {
  logger.info('Starting scheduled task: PRUNE_DISCOVERY_TELEMETRY');
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

  const clicksPruned = await deleteInBatches('discovery_clicks', () =>
    db('discovery_clicks').where('created_at', '<', cutoff)
  );

  const searchesPruned = await deleteInBatches('discovery_searches', () =>
    db('discovery_searches').where('created_at', '<', cutoff)
  );

  const savesPruned = await deleteInBatches('discovery_saves', () =>
    db('discovery_saves').where('created_at', '<', cutoff)
  );

  logger.info(`Successfully completed PRUNE_DISCOVERY_TELEMETRY. Pruned: ${clicksPruned} clicks, ${searchesPruned} searches, ${savesPruned} saves.`);
}
