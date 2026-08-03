/**
 * Base Email Provider Interface
 * Abstract contract for all email transport adapters.
 */
export class BaseEmailProvider {
  /**
   * Sends an email payload.
   * @param {Object} options - { to, subject, html, text, from }
   * @returns {Promise<{ success: boolean, messageId?: string }>}
   */
  async send(options) {
    throw new Error('BaseEmailProvider.send() must be implemented by concrete subclass.');
  }
}
