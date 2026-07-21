import knex from 'knex';
import config from './config/index.js';
import { instrumentDb } from './utils/dbTelemetry.js';
import { dbLogger } from './utils/dbLogger.js';

// Initialize Knex instance for PostgreSQL using the validated, immutable configuration singleton.
// Connection parameters and pooling boundaries are loaded securely on startup.
const db = knex({
  client: 'pg',
  connection: {
    connectionString: config.db.url,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
    query_timeout: 5000, // Safe driver-level query timeout (5 seconds)
  },
  pool: {
    min: config.db.poolMin,
    max: config.db.poolMax,
    // propagateCreateError is omitted to allow fail-fast startup behavior on pg connection loss
  },
  acquireConnectionTimeout: 10000, // Wait maximum 10s to acquire connection from pool under load
});

// Mount telemetry hooks
instrumentDb(db);

// Teardown function for graceful shutdowns
export async function closeDatabase() {
  dbLogger.info('Draining and destroying Knex database connection pool...');
  await db.destroy();
  dbLogger.info('Knex connection pool destroyed.');
}

export default db;
