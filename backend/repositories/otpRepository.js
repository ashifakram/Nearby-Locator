import db from '../db.js';
import { withTransientRetry } from '../utils/dbRetry.js';
import { handleDbError } from '../utils/dbErrors.js';

export const OtpRepository = {
  // ==========================================
  // EMAIL VERIFICATION OTP DOMAIN
  // ==========================================

  async createVerificationOtp({ userId, otpHash, expiresAt }, executor = db) {
    try {
      return await withTransientRetry(async () => {
        const [token] = await executor('email_verification_tokens')
          .insert({
            user_id: userId,
            token_hash: otpHash,
            otp_code_hash: otpHash,
            expires_at: expiresAt,
            attempt_count: 0
          })
          .returning('*');
        return token;
      });
    } catch (err) {
      throw handleDbError(err);
    }
  },

  async findLatestVerificationOtpForUpdate(userId, executor) {
    if (!executor) throw new Error('findLatestVerificationOtpForUpdate requires an explicit transaction object.');
    try {
      return await withTransientRetry(() =>
        executor('email_verification_tokens')
          .where({ user_id: userId })
          .whereNotNull('otp_code_hash')
          .orderBy('created_at', 'desc')
          .forUpdate()
          .first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  async incrementVerificationOtpAttempt(tokenId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('email_verification_tokens')
          .where({ id: tokenId })
          .increment('attempt_count', 1)
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  async consumeVerificationOtp(tokenId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('email_verification_tokens')
          .where({ id: tokenId })
          .whereNull('consumed_at')
          .update({ consumed_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  async invalidateVerificationOtps(userId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('email_verification_tokens')
          .where({ user_id: userId })
          .whereNull('consumed_at')
          .update({ expires_at: new Date(Date.now() - 1000) })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  // ==========================================
  // PASSWORD RESET OTP DOMAIN
  // ==========================================

  async createResetOtp({ userId, otpHash, expiresAt }, executor = db) {
    try {
      return await withTransientRetry(async () => {
        const [token] = await executor('password_reset_tokens')
          .insert({
            user_id: userId,
            token_hash: otpHash,
            otp_code_hash: otpHash,
            expires_at: expiresAt,
            attempt_count: 0
          })
          .returning('*');
        return token;
      });
    } catch (err) {
      throw handleDbError(err);
    }
  },

  async findLatestResetOtpForUpdate(userId, executor) {
    if (!executor) throw new Error('findLatestResetOtpForUpdate requires an explicit transaction object.');
    try {
      return await withTransientRetry(() =>
        executor('password_reset_tokens')
          .where({ user_id: userId })
          .whereNotNull('otp_code_hash')
          .orderBy('created_at', 'desc')
          .forUpdate()
          .first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  async incrementResetOtpAttempt(tokenId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('password_reset_tokens')
          .where({ id: tokenId })
          .increment('attempt_count', 1)
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  async consumeResetOtp(tokenId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('password_reset_tokens')
          .where({ id: tokenId })
          .whereNull('consumed_at')
          .update({ consumed_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  async invalidateResetOtps(userId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('password_reset_tokens')
          .where({ user_id: userId, consumed_at: null, invalidated_at: null })
          .update({ invalidated_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  async setResetGrantToken(tokenId, grantTokenHash, expiresAt, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('password_reset_tokens')
          .where({ id: tokenId })
          .update({
            reset_grant_token_hash: grantTokenHash,
            expires_at: expiresAt
          })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  async findResetGrantTokenForUpdate(userId, grantTokenHash, executor) {
    if (!executor) throw new Error('findResetGrantTokenForUpdate requires an explicit transaction object.');
    try {
      return await withTransientRetry(() =>
        executor('password_reset_tokens')
          .where({ user_id: userId, reset_grant_token_hash: grantTokenHash })
          .forUpdate()
          .first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  }
};
