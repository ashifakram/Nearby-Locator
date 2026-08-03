/**
 * Centralized OTP System Constants
 */
export const OTP_CONSTANTS = {
  LENGTH: 6,
  TTL_MS: 10 * 60 * 1000, // 10 minutes
  COOLDOWN_MS: 60 * 1000, // 60 seconds
  MAX_ATTEMPTS: 5,
  GRANT_TOKEN_TTL_MS: 5 * 60 * 1000 // 5 minutes
};

/**
 * Deterministic Domain Error Codes for OTP Operations
 */
export const OTP_ERROR_CODES = {
  THROTTLED: 'OTP_THROTTLED',
  INVALID: 'OTP_INVALID',
  EXPIRED: 'OTP_EXPIRED',
  CONSUMED: 'OTP_CONSUMED',
  MAX_ATTEMPTS_EXCEEDED: 'OTP_MAX_ATTEMPTS_EXCEEDED',
  GRANT_TOKEN_INVALID: 'GRANT_TOKEN_INVALID',
  GRANT_TOKEN_EXPIRED: 'GRANT_TOKEN_EXPIRED'
};
