import db from '../db.js';
import config from '../config/index.js';
import { dbLogger } from './dbLogger.js';

// Compile/import-time guard: Eliminate security exposure risks by crashing immediately if loaded in production
if (config.app.env === 'production') {
  throw new Error('Security policy: dbExplain query planner utility is strictly banned in production environments');
}

// Mutation-safe EXPLAIN ANALYZE query planner analysis utility (Bans Writable CTEs completely)
export async function analyzeQueryPlan(knexQuery) {
  if (config.app.env === 'production') {
    throw new Error('Security policy: Query execution planning analysis is banned in production');
  }

  try {
    const rawSql = knexQuery.toSQL().sql;
    const bindings = knexQuery.toSQL().bindings;
    
    const trimmedSql = rawSql.trim();
    
    // Strict Mutation Shield: Prevent updates, inserts, deletes, alters anywhere in query (including CTEs & comments)
    // Note: Regex-based SQL mutation detection is heuristic (AST parsing is planned for V2 migrations)
    const containsMutation = /\b(insert|update|delete|alter|drop|truncate|create|grant|revoke)\b/i.test(trimmedSql);
    
    // Enforce SELECT-only statement starts case-insensitively (banning WITH starts to completely stop writable CTEs)
    const isSafeSelect = /^select\b/i.test(trimmedSql);

    if (!isSafeSelect || containsMutation) {
      const errorMsg = 'Blocked potentially mutating or write CTE statement from EXPLAIN execution';
      dbLogger.warn(errorMsg, { sql: trimmedSql.substring(0, 100) });
      throw new Error(errorMsg);
    }
    
    // Execute SQL with EXPLAIN modifier
    const planResult = await db.raw(`EXPLAIN (ANALYZE, BUFFERS) ${trimmedSql}`, bindings);
    const planLines = planResult.rows.map(row => row['QUERY PLAN']);
    
    dbLogger.info('--- QUERY PLAN EXPLAIN ANALYZE OUTPUT ---');
    // Note: Plan lines are routed through dbLogger.info rather than direct console.log
    planLines.forEach(line => dbLogger.info(line));
    dbLogger.info('------------------------------------------');
    
    const hasSeqScan = planLines.some(line => line.includes('Seq Scan'));
    if (hasSeqScan) {
      dbLogger.warn('Performance Risk: Query plan contains a "Seq Scan" (Sequential Scan)! Consider adding an index.');
    }
    
    return planLines;
  } catch (err) {
    dbLogger.error('Failed to run explain query planner analysis', err);
    throw err;
  }
}
