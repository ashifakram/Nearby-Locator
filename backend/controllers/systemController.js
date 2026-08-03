import db from '../db.js';
import config from '../config/index.js';
import { sendSuccess } from '../middleware/responseFormatter.js';

/**
 * GET /api/admin/system/info
 * Aggregates runtime system diagnostics, db versions, and deployment metrics.
 */
export const getSystemInfo = async (req, res, next) => {
  try {
    // 1. Resolve PostgreSQL Database Version
    const dbVersionQuery = await db.raw('SELECT version();');
    const dbVersion = dbVersionQuery.rows?.[0]?.version || 'Unknown';

    // 2. Fetch Knex Migrations Version
    let migrationInfo = { batch: 0, count: 0, lastRun: null };
    try {
      const migrationBatch = await db('knex_migrations').max('batch as max_batch').first();
      const migrationCount = await db('knex_migrations').count('* as total').first();
      const lastMigration = await db('knex_migrations').orderBy('migration_time', 'desc').first();
      
      migrationInfo = {
        batch: Number(migrationBatch?.max_batch || 0),
        count: Number(migrationCount?.total || 0),
        lastRun: lastMigration?.name || 'None'
      };
    } catch (e) {
      // knex_migrations table may not exist yet or failed to read
    }

    // 3. Construct Runtime Details
    const memory = process.memoryUsage();
    const runtime = {
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        rss: `${Math.round(memory.rss / 1024 / 1024 * 100) / 100} MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024 * 100) / 100} MB`,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024 * 100) / 100} MB`
      }
    };

    const sysInfo = {
      appVersion: config.app.version || '1.0.0',
      apiVersion: '1.0.0',
      environment: config.app.env || process.env.NODE_ENV || 'development',
      databaseVersion: dbVersion,
      migration: migrationInfo,
      runtime
    };

    return sendSuccess(res, sysInfo, 'System diagnostics retrieved successfully');
  } catch (err) {
    next(err);
  }
};
