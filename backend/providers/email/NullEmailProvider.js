import { BaseEmailProvider } from './BaseEmailProvider.js';
import { logger } from '../../utils/logger.js';

export class NullEmailProvider extends BaseEmailProvider {
  async send(options) {
    const { to, subject } = options;

    logger.error(
      `[SECURITY][OPERATIONAL_CRITICAL] Email provider is unconfigured in production! ` +
      `Email to "${to}" (Subject: "${subject}") was dropped. Populate SMTP configuration in production.`
    );

    return {
      success: false,
      error: 'EMAIL_PROVIDER_UNCONFIGURED'
    };
  }
}
