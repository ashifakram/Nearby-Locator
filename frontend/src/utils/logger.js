import { config } from '../app/config';

export const logger = {
  debug: (...args) => {
    if (!config.isProduction) {
      console.log('🩺 [DEBUG]', ...args);
    }
  },
  info: (...args) => {
    if (!config.isProduction) {
      console.info('🩺 [INFO]', ...args);
    }
  },
  warn: (...args) => {
    console.warn('⚠️ [WARN]', ...args);
  },
  error: (...args) => {
    console.error('❌ [ERROR]', ...args);
  }
};
