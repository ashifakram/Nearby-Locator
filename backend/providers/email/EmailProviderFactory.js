import { DevJsonEmailProvider } from './DevJsonEmailProvider.js';
import { SmtpEmailProvider } from './SmtpEmailProvider.js';
import { NullEmailProvider } from './NullEmailProvider.js';
import { logger } from '../../utils/logger.js';

let cachedProvider = null;

export const EmailProviderFactory = {
  /**
   * Resolves and returns the active email provider singleton.
   * STRICT SECURITY RULE: DevJsonEmailProvider MUST NEVER be instantiated in production.
   * In dev mode, set USE_REAL_SMTP=true to dispatch real emails via configured SMTP host.
   * @returns {import('./BaseEmailProvider.js').BaseEmailProvider}
   */
  getProvider() {
    if (cachedProvider) return cachedProvider;

    const env = process.env.NODE_ENV;
    const smtpHost = process.env.SMTP_HOST;
    const forceSmtp = process.env.USE_REAL_SMTP === 'true';

    if (env === 'production') {
      if (smtpHost) {
        logger.info(`[EmailProviderFactory] Instantiating SmtpEmailProvider for production host: ${smtpHost}`);
        cachedProvider = new SmtpEmailProvider();
      } else {
        logger.error('[EmailProviderFactory] Production environment detected without SMTP_HOST! Instantiating NullEmailProvider.');
        cachedProvider = new NullEmailProvider();
      }
    } else if (forceSmtp && smtpHost) {
      logger.info(`[EmailProviderFactory] USE_REAL_SMTP enabled. Instantiating SmtpEmailProvider for host: ${smtpHost}`);
      cachedProvider = new SmtpEmailProvider();
    } else {
      logger.info('[EmailProviderFactory] Instantiating DevJsonEmailProvider for development/test environment');
      cachedProvider = new DevJsonEmailProvider();
    }

    return cachedProvider;
  },

  /**
   * Resets the cached provider instance (useful for test isolation).
   */
  resetCache() {
    cachedProvider = null;
  }
};
