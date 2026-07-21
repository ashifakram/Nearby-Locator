import crypto from 'crypto';
import { AuthenticationRepository } from '../repositories/authenticationRepository.js';

// Verification tokens expire in 24 hours
const EXPIRATION_MS = 24 * 60 * 60 * 1000;

export const EmailVerificationService = {
  /**
   * Generates a new email verification token for a user.
   * Command
   * @param {string} userId
   * @param {Object} executor - Knex transaction executor
   * @returns {Promise<string>} The raw token string to be emailed
   */
  async generateVerificationToken(userId, executor) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + EXPIRATION_MS);

    await AuthenticationRepository.createVerificationToken({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt
    }, executor);

    return rawToken;
  },

  /**
   * Validates a verification token.
   * Validation
   * @param {string} rawToken
   * @param {Object} executor
   * @returns {Promise<Object>} Result<TokenEntity>
   */
  async validateVerificationToken(rawToken, executor) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenEntity = await AuthenticationRepository.findVerificationToken(tokenHash, executor);

    if (!tokenEntity) {
      return { success: false, error: { code: 'TOKEN_INVALID', message: 'Verification token is invalid or does not exist.' } };
    }

    if (tokenEntity.consumed_at) {
      return { success: false, error: { code: 'TOKEN_CONSUMED', message: 'Verification token has already been used.' } };
    }

    if (new Date(tokenEntity.expires_at) < new Date()) {
      return { success: false, error: { code: 'TOKEN_EXPIRED', message: 'Verification token has expired.' } };
    }

    return { success: true, data: { token: tokenEntity } };
  }
};
