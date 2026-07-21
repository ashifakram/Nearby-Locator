import { performance } from 'perf_hooks';
import config from '../config/index.js';
import { dbLogger } from './dbLogger.js';

export function instrumentDb(knexInstance) {
  const activeQueries = new Map();
  const thresholdMs = config.telemetry.slowQueryThresholdMs;

  knexInstance.on('query', (query) => {
    const { __knexQueryUid: uid, sql } = query;
    activeQueries.set(uid, {
      sql,
      start: performance.now(),
    });
  });

  knexInstance.on('query-response', (response, query) => {
    const { __knexQueryUid: uid } = query;
    const active = activeQueries.get(uid);
    if (active) {
      activeQueries.delete(uid);
      const latencyMs = Math.round(performance.now() - active.start);
      const tableNameMatch = active.sql.match(/(?:from|into|update)\s+["']?([a-zA-Z0-9_]+)["']?/i);
      const table = tableNameMatch ? tableNameMatch[1].toLowerCase() : 'unknown';
      const operationRaw = active.sql.split(' ')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
      const operation = ['begin', 'commit', 'rollback'].includes(operationRaw) ? 'transaction' : operationRaw;
      const finalTable = operation === 'transaction' ? 'transaction' : table;
      
      // Import metric dynamically but avoid top-level await syntax inside non-async
      import('./metrics.js').then(({ dbQueryDurationSeconds }) => {
        dbQueryDurationSeconds.labels(operation, finalTable).observe(latencyMs / 1000);
      }).catch(() => {});

      if (latencyMs > thresholdMs) {
        // Normalize consecutive whitespaces, carriage returns, and newlines
        const cleanedSql = active.sql
          .replace(/[\r\n]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const truncatedSql = cleanedSql.substring(0, 150) + (cleanedSql.length > 150 ? '...' : '');
        dbLogger.warn(`Slow Query (${latencyMs}ms): ${truncatedSql}`);
      }
    }
  });

  knexInstance.on('query-error', (error, query) => {
    const { __knexQueryUid: uid } = query;
    const active = activeQueries.get(uid);
    if (active) {
      activeQueries.delete(uid);
      const latencyMs = Math.round(performance.now() - active.start);
      const tableNameMatch = active.sql.match(/(?:from|into|update)\s+["']?([a-zA-Z0-9_]+)["']?/i);
      const table = tableNameMatch ? tableNameMatch[1].toLowerCase() : 'unknown';
      const operationRaw = active.sql.split(' ')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
      const operation = ['begin', 'commit', 'rollback'].includes(operationRaw) ? 'transaction' : operationRaw;
      const finalTable = operation === 'transaction' ? 'transaction' : table;
      
      import('./metrics.js').then(({ dbQueryDurationSeconds }) => {
        dbQueryDurationSeconds.labels('error_' + operation, finalTable).observe(latencyMs / 1000);
      }).catch(() => {});

      const cleanedSql = active.sql
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const truncatedSql = cleanedSql.substring(0, 150) + (cleanedSql.length > 150 ? '...' : '');
      dbLogger.error(`Query Failed (${latencyMs}ms): ${truncatedSql}`, error);
    }
  });
}
