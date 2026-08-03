import { EmailProviderFactory } from '../providers/email/EmailProviderFactory.js';
import { EmailTemplateEngine } from './emailTemplateEngine.js';
import { logger } from '../utils/logger.js';

/**
 * Infrastructure adapter for email delivery.
 * Preserves 100% backward compatibility for all existing public method signatures.
 */
export const EmailService = {
  /**
   * Dispatches a raw or rendered email payload via the active provider.
   * @param {Object} payload - { to, subject, html, text, type, token }
   * @returns {Promise<{ success: boolean, messageId?: string }>}
   */
  async sendEmail(payload) {
    const provider = EmailProviderFactory.getProvider();
    return await provider.send(payload);
  },

  /**
   * Dispatches a verification email post-registration.
   * Backward-compatible signature.
   * @param {string} email - Destination email address
   * @param {string} tokenString - The raw token to embed in the verification link
   * @returns {Promise<boolean>}
   */
  async sendVerificationEmail(email, tokenString) {
    logger.info(`[EmailService] Dispatched verification email to: ${email}`);

    const result = await this.sendEmail({
      to: email,
      subject: 'Verify your email address',
      html: `<p>Please verify your email using the following token link: ${tokenString}</p>`,
      text: `Verification token: ${tokenString}`,
      type: 'verify',
      token: tokenString
    });

    return Promise.resolve(result.success);
  },

  /**
   * Dispatches a password reset email.
   * Backward-compatible signature.
   * @param {string} email - Destination email address
   * @param {string} tokenString - The raw token to embed in the reset link
   * @returns {Promise<boolean>}
   */
  async sendPasswordResetConfirmation(email, tokenString) {
    logger.info(`[EmailService] Dispatched password reset email to: ${email}`);

    const result = await this.sendEmail({
      to: email,
      subject: 'Reset your password',
      html: `<p>Password reset requested. Use the following token link: ${tokenString}</p>`,
      text: `Password reset token: ${tokenString}`,
      type: 'reset',
      token: tokenString
    });

    return Promise.resolve(result.success);
  }
};
