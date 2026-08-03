import { sendError } from './responseFormatter.js';
import db from '../db.js';
import { logger, correlationStore } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  // If the response has already been sent, delegate to the Express default handler
  if (res.headersSent) {
    return next(err);
  }

  // 1. Standardize Operational Error Classifications
  const isInvalidSort = err.name === 'InvalidSortFieldError';
  const isOperational = err.isOperational || isInvalidSort || false;
  const category = err.category || (isInvalidSort ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR');
  const status = err.statusCode || err.status || (isInvalidSort ? 400 : 500);
  const message = err.message || 'Internal Server Error';
  const code = err.code || (isInvalidSort ? 'INVALID_SORT_FIELD' : (isOperational ? category : 'INTERNAL_FAILED'));
  const details = err.details || (isInvalidSort ? { allowedFields: err.allowedFields } : null);

  // Centralized DB failure telemetry capture
  const isDbError = err.name && (
    err.name.includes('Database') || 
    err.name.includes('Key') || 
    err.name.includes('ForeignKey')
  ) || (err.message && (
    err.message.includes('Postgres') ||
    err.message.includes('postgres') ||
    err.message.includes('Knex') ||
    err.message.includes('pool')
  )) || category === 'DB_ERROR';

  if (isDbError) {
    status = 503;
    message = 'Database unavailable or query failed. Please try again later.';
    logger.error('DB_FAILURE', message, err);
  }

  // Retrieve correlation ID from AsyncLocalStorage store
  const store = correlationStore.getStore() || {};
  const requestId = store.requestId || null;

  // 2. Telemetry Log Capture
  logger.error(category, `Request execution error: ${message}`, err, {
    url: req.originalUrl,
    method: req.method,
    status
  });

  // 3. Selective, Non-blocking, and Best-effort Postgres system error logging
  if (category === 'INTERNAL_ERROR' && !isOperational) {
    // Fire-and-forget: do NOT wait for database persistence, keeping the client unblocked
    db('system_errors')
      .insert({
        error_message: `[${req.method}] ${req.originalUrl} (${status}): ${message}`.substring(0, 500),
        stack_trace: err.stack ? err.stack.substring(0, 2000) : '',
        created_by: store.userId || null,
        request_id: requestId
      })
      .catch((dbErr) => {
        // Prevent DB-error telemetry recursion: catch and log to stderr gracefully
        logger.error('TELEMETRY_FAILURE', 'Failed to log system error to database asynchronously', dbErr);
      });
  }

  return sendError(res, { code, details }, message, status);
};
