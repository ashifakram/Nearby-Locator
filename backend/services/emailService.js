import { logger } from '../utils/logger.js';

/**
 * Minimal infrastructure adapter for email delivery.
 * Exposes only the public methods required by the authentication workflows.
 */
export const EmailService = {
  /**
   * Dispatches a verification email post-registration.
   * @param {string} email - Destination email address
   * @param {string} tokenString - The raw token to embed in the verification link
   * @returns {Promise<boolean>}
   */
  async sendVerificationEmail(email, tokenString) {
    // Intercept in development/testing to allow E2E verification
    if (process.env.NODE_ENV !== 'production') {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const dir = path.resolve(process.cwd(), 'scratch');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const filePath = path.resolve(dir, 'sent_emails.json');
        let emails = [];
        if (fs.existsSync(filePath)) {
          try {
            emails = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          } catch (_) {}
        }
        emails.push({ email, token: tokenString, type: 'verify', timestamp: Date.now() });
        fs.writeFileSync(filePath, JSON.stringify(emails, null, 2), 'utf8');
      } catch (err) {
        logger.error('Failed to log mock email to scratch:', err);
      }
    }
    // Adapter logic (e.g., SendGrid/SES) would go here.
    // For now, act as a minimal implementation that logs success.
    logger.info(`[EmailService] Dispatched verification email to: ${email}`);
    return Promise.resolve(true);
  },

  /**
   * Dispatches a password reset email.
   * @param {string} email - Destination email address
   * @param {string} tokenString - The raw token to embed in the reset link
   * @returns {Promise<boolean>}
   */
  async sendPasswordResetConfirmation(email, tokenString) {
    if (process.env.NODE_ENV !== 'production') {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const dir = path.resolve(process.cwd(), 'scratch');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const filePath = path.resolve(dir, 'sent_emails.json');
        let emails = [];
        if (fs.existsSync(filePath)) {
          try {
            emails = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          } catch (_) {}
        }
        emails.push({ email, token: tokenString, type: 'reset', timestamp: Date.now() });
        fs.writeFileSync(filePath, JSON.stringify(emails, null, 2), 'utf8');
      } catch (err) {
        logger.error('Failed to log mock email to scratch:', err);
      }
    }
    logger.info(`[EmailService] Dispatched password reset email to: ${email}`);
    return Promise.resolve(true);
  }
};
