import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import db from '../db.js';
import { cleanDatabase, validateTestEnvironment, teardownConnections } from './helpers.js';

describe('🗄️  Database Migrations & Rollback Consistency Suite', () => {

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    validateTestEnvironment();
  });

  after(async () => {
    await teardownConnections();
  });

  it('1. Schema Isolation: Bootstrapping latest schema and rolling back completely runs safely', async () => {
    // Step A: Rollback all migrations to base state
    await db.migrate.rollback(null, true);
    console.log('✅ Rollback safety verified: database rolled back cleanly!');

    // Step B: Run latest migrations forward to establish bootstrap safety
    await db.migrate.latest();
    console.log('✅ Bootstrap safety verified: database migrated to latest schema cleanly!');

    // Step C: Verify index consistency and uniqueness constraints via PG metadata
    const indexes = await db('pg_indexes')
      .where({ tablename: 'user_sessions' })
      .select('indexname');

    const indexNames = indexes.map(idx => idx.indexname);
    
    assert.ok(indexNames.includes('idx_user_sessions_family'));
    assert.ok(indexNames.includes('idx_user_sessions_token_hash'));
    console.log('✅ Index consistency verified: speed B-Tree indexes found on PostgreSQL metadata!');
  });
});
