import { logger } from './logger.js';

// Centralized logging proxy, keeping database telemetry decoupled and fully correlated
export const dbLogger = {
  info(message, meta = {}) {
    logger.info(message, meta, 'DATABASE');
  },
  warn(message, meta = {}) {
    logger.warn('DB_WARN', message, meta);
  },
  error(message, error = null) {
    logger.error('DB_ERROR', message, error, {
      errCode: error ? error.code : undefined
    });
  }
};
