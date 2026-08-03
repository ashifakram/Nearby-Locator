import crypto from 'crypto';
import { OtpRepository } from '../repositories/otpRepository.js';
import { IdentityService } from './identityService.js';
import { OTP_CONSTANTS, OTP_ERROR_CODES } from '../constants/otp.js';
import { withTransaction } from '../utils/dbRetry.js';

export const OtpService = {
  generateOtp() {
    const min = Math.pow(10, OTP_CONSTANTS.LENGTH - 1);
    const max = Math.pow(10, OTP_CONSTANTS.LENGTH) - 1;
    return crypto.randomInt(min, max + 1).toString();
  },

  hashOtp(rawOtp) {
    if (!rawOtp || typeof rawOtp !== 'string') {
      throw new Error('Raw OTP string is required for hashing.');
    }
    return crypto.createHash('sha256').update(rawOtp).digest('hex');
  },

  async _issueOtpCore(userId, otpDomainType, metadata = {}, outerExecutor = null) {
    const executeWork = async (executor) => {
      const user = await IdentityService.findByIdForUpdate(userId, executor);
      if (!user) {
        throw new Error(`User with ID '${userId}' not found for OTP issuance.`);
      }

      // Cooldown check (60 seconds)
      const lastRequestCol = otpDomainType === 'verification' ? 'last_verification_request_at' : 'last_reset_request_at';
      const lastRequestAt = user[lastRequestCol];
      if (lastRequestAt) {
        const diffMs = Date.now() - new Date(lastRequestAt).getTime();
        if (diffMs < OTP_CONSTANTS.COOLDOWN_MS) {
          const waitSeconds = Math.ceil((OTP_CONSTANTS.COOLDOWN_MS - diffMs) / 1000);
          return {
            success: false,
            error: {
              code: OTP_ERROR_CODES.THROTTLED,
              message: `Please wait ${waitSeconds} seconds before requesting another code.`
            }
          };
        }
      }

      // Invalidate previous unconsumed OTPs
      if (otpDomainType === 'verification') {
        await OtpRepository.invalidateVerificationOtps(userId, executor);
        await IdentityService.updateLastVerificationRequest(userId, executor);
      } else {
        await OtpRepository.invalidateResetOtps(userId, executor);
        await executor('users').where({ id: userId }).update({ last_reset_request_at: executor.fn.now() });
      }

      // Generate & Hash 6-digit OTP
      const rawOtp = this.generateOtp();
      const otpHash = this.hashOtp(rawOtp);
      const expiresAt = new Date(Date.now() + OTP_CONSTANTS.TTL_MS);

      if (otpDomainType === 'verification') {
        await OtpRepository.createVerificationOtp({ userId, otpHash, expiresAt }, executor);
      } else {
        await OtpRepository.createResetOtp({ userId, otpHash, expiresAt }, executor);
      }

      return {
        success: true,
        rawOtp,
        expiresAt
      };
    };

    if (outerExecutor) {
      return await executeWork(outerExecutor);
    }
    return await withTransaction(executeWork);
  },

  async _verifyOtpCore(userId, rawOtp, otpDomainType, outerExecutor = null) {
    if (!rawOtp || typeof rawOtp !== 'string' || rawOtp.trim().length !== OTP_CONSTANTS.LENGTH) {
      return { success: false, error: { code: OTP_ERROR_CODES.INVALID, message: 'Invalid OTP code format.' } };
    }

    const inputHash = this.hashOtp(rawOtp.trim());

    const executeWork = async (executor) => {
      let otpEntity;
      if (otpDomainType === 'verification') {
        otpEntity = await OtpRepository.findLatestVerificationOtpForUpdate(userId, executor);
      } else {
        otpEntity = await OtpRepository.findLatestResetOtpForUpdate(userId, executor);
      }

      if (!otpEntity) {
        return { success: false, error: { code: OTP_ERROR_CODES.INVALID, message: 'Invalid or missing OTP code.' } };
      }

      if (otpEntity.consumed_at) {
        return { success: false, error: { code: OTP_ERROR_CODES.CONSUMED, message: 'OTP code has already been used.' } };
      }

      if (new Date(otpEntity.expires_at) < new Date()) {
        return { success: false, error: { code: OTP_ERROR_CODES.EXPIRED, message: 'OTP code has expired.' } };
      }

      if (otpEntity.attempt_count >= OTP_CONSTANTS.MAX_ATTEMPTS) {
        return { success: false, error: { code: OTP_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED, message: 'Maximum verification attempts exceeded.' } };
      }

      if (otpEntity.otp_code_hash !== inputHash) {
        const newCount = otpEntity.attempt_count + 1;
        if (otpDomainType === 'verification') {
          await OtpRepository.incrementVerificationOtpAttempt(otpEntity.id, executor);
        } else {
          await OtpRepository.incrementResetOtpAttempt(otpEntity.id, executor);
        }

        if (newCount >= OTP_CONSTANTS.MAX_ATTEMPTS) {
          return { success: false, error: { code: OTP_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED, message: 'Maximum verification attempts exceeded.' } };
        }

        return { success: false, error: { code: OTP_ERROR_CODES.INVALID, message: 'Invalid OTP code.' } };
      }

      if (otpDomainType === 'verification') {
        await OtpRepository.consumeVerificationOtp(otpEntity.id, executor);
      } else {
        await OtpRepository.consumeResetOtp(otpEntity.id, executor);
      }

      return {
        success: true,
        otpEntity
      };
    };

    if (outerExecutor) {
      return await executeWork(outerExecutor);
    }
    return await withTransaction(executeWork);
  },

  // ==========================================
  // PUBLIC PURPOSE-SPECIFIC WRAPPER METHODS
  // ==========================================

  async issueVerificationOtp(userId, metadata = {}, outerExecutor = null) {
    return await this._issueOtpCore(userId, 'verification', metadata, outerExecutor);
  },

  async issuePasswordResetOtp(userId, metadata = {}, outerExecutor = null) {
    return await this._issueOtpCore(userId, 'reset', metadata, outerExecutor);
  },

  async verifyVerificationOtp(userId, rawOtp, outerExecutor = null) {
    return await this._verifyOtpCore(userId, rawOtp, 'verification', outerExecutor);
  },

  async verifyPasswordResetOtp(userId, rawOtp, outerExecutor = null) {
    const result = await this._verifyOtpCore(userId, rawOtp, 'reset', outerExecutor);
    if (!result.success) return result;

    const rawGrantToken = crypto.randomBytes(32).toString('hex');
    const grantTokenHash = crypto.createHash('sha256').update(rawGrantToken).digest('hex');
    const grantExpiresAt = new Date(Date.now() + OTP_CONSTANTS.GRANT_TOKEN_TTL_MS);

    if (outerExecutor) {
      await OtpRepository.setResetGrantToken(result.otpEntity.id, grantTokenHash, grantExpiresAt, outerExecutor);
    } else {
      await OtpRepository.setResetGrantToken(result.otpEntity.id, grantTokenHash, grantExpiresAt);
    }

    return {
      success: true,
      resetGrantToken: rawGrantToken,
      expiresAt: grantExpiresAt
    };
  },

  async verifyResetGrantToken(userId, rawGrantToken, outerExecutor = null) {
    if (!rawGrantToken || typeof rawGrantToken !== 'string') {
      return { success: false, error: { code: OTP_ERROR_CODES.GRANT_TOKEN_INVALID, message: 'Reset grant token is required.' } };
    }

    const grantTokenHash = crypto.createHash('sha256').update(rawGrantToken).digest('hex');

    const executeWork = async (executor) => {
      const grantEntity = await OtpRepository.findResetGrantTokenForUpdate(userId, grantTokenHash, executor);

      if (!grantEntity || !grantEntity.consumed_at) {
        return { success: false, error: { code: OTP_ERROR_CODES.GRANT_TOKEN_INVALID, message: 'Reset grant token is invalid.' } };
      }

      if (new Date(grantEntity.expires_at) < new Date()) {
        return { success: false, error: { code: OTP_ERROR_CODES.GRANT_TOKEN_EXPIRED, message: 'Reset grant token has expired.' } };
      }

      return { success: true, grantEntity };
    };

    if (outerExecutor) {
      return await executeWork(outerExecutor);
    }
    return await withTransaction(executeWork);
  }
};
