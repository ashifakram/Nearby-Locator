import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import config from '../config/index.js';
import client from '../redisClient.js';
import { sendSuccess, sendError } from '../middleware/responseFormatter.js';
import { UserRepository } from '../repositories/userRepository.js';
import { dbLogger } from '../utils/dbLogger.js';
import { AuthenticationService } from '../services/authenticationService.js';
import { SessionService } from '../services/sessionService.js';
import ProviderFactory from '../providers/ProviderFactory.js';
import { logAudit } from '../utils/auditLogger.js';

// Map domain errors to HTTP statuses
const mapDomainErrorToStatus = (code) => {
  switch (code) {
    case 'INVALID_INPUT':
    case 'INVALID_REQUEST':
    case 'VALIDATION_FAILED':
    case 'PASSWORD_POLICY_VIOLATION':
    case 'PASSWORD_UNCHANGED':
    case 'INVALID_TOKEN':
    case 'TOKEN_INVALID':
    case 'TOKEN_EXPIRED':
    case 'TOKEN_CONSUMED':
    case 'OTP_INVALID':
    case 'OTP_EXPIRED':
    case 'OTP_CONSUMED':
    case 'GRANT_TOKEN_INVALID':
    case 'GRANT_TOKEN_EXPIRED':
      return 400;
    case 'NO_TOKEN':
    case 'INVALID_SESSION':
    case 'INVALID_CREDENTIALS':
    case 'SECURITY_COMPROMISE':
    case 'INVALID_GRANT':
    case 'EMAIL_NOT_VERIFIED':
      return 401;
    case 'ACCOUNT_DISABLED':
    case 'ACCOUNT_BANNED':
    case 'REVOKED_SESSION':
      return 403;
    case 'USER_NOT_FOUND':
      return 404;
    case 'EMAIL_ALREADY_IN_USE':
    case 'STALE_CREDENTIALS':
    case 'DUPLICATE_EMAIL':
    case 'ALREADY_VERIFIED':
      return 409;
    case 'THROTTLED':
    case 'OTP_THROTTLED':
    case 'OTP_MAX_ATTEMPTS_EXCEEDED':
      return 429;
    case 'ACCOUNT_NOT_VERIFIED':
      return 403;
    default:
      return 500;
  }
};

// Set secure HttpOnly cookie utility
const setRefreshTokenCookie = (res, rawToken) => {
  res.cookie('refreshToken', rawToken, {
    httpOnly: true,
    secure: config.app.env !== 'development',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

// Clear secure cookie utility
const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.app.env !== 'development',
    sameSite: 'lax'
  });
};

export const signup = async (req, res, next) => {
  try {
    const { email, password, name, agreed } = req.body;
    const metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'], agreed };

    const result = await AuthenticationService.registerLocal(email, password, { name }, metadata);
    if (!result.success) {
      const status = mapDomainErrorToStatus(result.error.code);
      return sendError(res, result.error, result.error.message, status);
    }

    await logAudit({
      req,
      actorId: result.data.user?.id || null,
      action: 'USER_SIGNUP',
      severity: 'INFO',
      metadata: { email: result.data.user?.email }
    });

    return sendSuccess(res, { user: result.data.user }, 'Registration successful. Please verify your email using the 6-digit OTP sent to your email.', 201);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };

    const result = await AuthenticationService.loginLocal(email, password, metadata);
    if (!result.success) {
      await logAudit({
        req,
        actorId: null,
        action: 'LOGIN_FAILED',
        severity: 'WARNING',
        metadata: { email, reason: result.error?.code }
      });
      const status = mapDomainErrorToStatus(result.error.code);
      return sendError(res, result.error, result.error.message, status);
    }

    await logAudit({
      req,
      actorId: result.data.user?.id || null,
      action: 'USER_LOGIN',
      severity: 'INFO'
    });

    setRefreshTokenCookie(res, result.data.refreshToken);
    return sendSuccess(res, { token: result.data.accessToken, user: result.data.user }, 'Login successful', 200);
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies.refreshToken;
    const metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };

    const result = await AuthenticationService.refreshToken(rawRefreshToken, metadata);
    if (!result.success) {
      clearRefreshTokenCookie(res);
      const status = mapDomainErrorToStatus(result.error.code);
      return sendError(res, result.error, result.error.message, status);
    }

    setRefreshTokenCookie(res, result.data.refreshToken);
    return sendSuccess(res, { accessToken: result.data.accessToken }, 'Token rotated successfully', 200);
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const sessionId = req.user.sessionId || req.user.sid;
    const userId = req.user.id;
    const metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };

    await AuthenticationService.logout(sessionId, metadata);
    clearRefreshTokenCookie(res);

    await logAudit({
      req,
      actorId: userId,
      action: 'LOGOUT',
      severity: 'INFO',
      metadata: { sessionId }
    });

    return sendSuccess(res, null, 'Logged out successfully', 200);
  } catch (err) {
    next(err);
  }
};

export const logoutAll = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };

    await AuthenticationService.logoutAll(userId, metadata);
    clearRefreshTokenCookie(res);

    await logAudit({
      req,
      actorId: userId,
      action: 'LOGOUT_ALL',
      severity: 'WARNING'
    });

    return sendSuccess(res, null, 'Logged out from all devices successfully', 200);
  } catch (err) {
    next(err);
  }
};

export const getSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const sessions = await SessionService.getActiveSessions(userId);
    return sendSuccess(res, sessions, 'Active sessions list retrieved', 200);
  } catch (err) {
    next(err);
  }
};

export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    const metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };

    const result = await AuthenticationService.forgotPassword(email, metadata);
    if (!result.success) {
      const status = mapDomainErrorToStatus(result.error.code);
      return sendError(res, result.error, result.error.message, status);
    }

    await logAudit({
      req,
      actorId: null,
      action: 'PASSWORD_RESET_REQUESTED',
      severity: 'INFO',
      metadata: { email }
    });

    return sendSuccess(res, null, 'If the account exists, a 6-digit password reset OTP has been sent.', 200);
  } catch (err) {
    next(err);
  }
};

export const verifyPasswordResetOtp = async (req, res, next) => {
  try {
    const { email, otpCode } = req.body;
    const metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };

    const result = await AuthenticationService.verifyPasswordResetOtp(email, otpCode, metadata);
    if (!result.success) {
      const status = mapDomainErrorToStatus(result.error.code);
      return sendError(res, result.error, result.error.message, status);
    }

    return sendSuccess(res, { resetGrantToken: result.resetGrantToken, expiresAt: result.expiresAt }, 'Reset OTP verified. Use grant token to set new password.', 200);
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, resetGrantToken, token, newPassword } = req.body;
    const metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };

    let result;
    if (resetGrantToken && email) {
      result = await AuthenticationService.resetPasswordWithGrantToken(email, resetGrantToken, newPassword, metadata);
    } else {
      result = await AuthenticationService.resetPassword(token, newPassword, metadata);
    }

    if (!result.success) {
      const status = mapDomainErrorToStatus(result.error.code);
      return sendError(res, result.error, result.error.message, status);
    }

    await logAudit({
      req,
      actorId: result.user?.id || null,
      action: 'PASSWORD_RESET_COMPLETED',
      severity: 'WARNING'
    });

    return sendSuccess(res, null, 'Password has been successfully reset. All active sessions have been revoked. Please log in.', 200);
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const currentSessionId = req.user.sessionId;
    const { oldPassword, newPassword } = req.body;
    const metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };

    const result = await AuthenticationService.changePassword(userId, currentSessionId, oldPassword, newPassword, metadata);
    if (!result.success) {
      const status = mapDomainErrorToStatus(result.error.code);
      return sendError(res, result.error, result.error.message, status);
    }

    await logAudit({
      req,
      actorId: userId,
      action: 'PASSWORD_CHANGED',
      severity: 'WARNING'
    });

    return sendSuccess(res, null, 'Password successfully changed.', 200);
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token, otpCode, email } = req.body;
    const codeOrToken = otpCode || token;

    if (!codeOrToken) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Verification code or token is required', 400);
    }

    const metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    const result = await AuthenticationService.verifyEmail(codeOrToken, email, metadata);

    if (!result.success) {
      const status = mapDomainErrorToStatus(result.error.code);
      return sendError(res, result.error, result.error.message, status);
    }

    if (result.alreadyVerified) {
      return sendSuccess(res, null, 'Email already verified.', 200);
    }

    await logAudit({
      req,
      actorId: result.user?.id || null,
      action: 'EMAIL_VERIFIED',
      severity: 'INFO'
    });

    return sendSuccess(res, null, 'Email verified successfully. You can now sign in.', 200);
  } catch (err) {
    next(err);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Email address is required', 400);
    }

    const metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    const result = await AuthenticationService.resendVerification(email, metadata);

    if (!result.success) {
      const status = mapDomainErrorToStatus(result.error.code);
      return sendError(res, result.error, result.error.message, status);
    }

    return sendSuccess(res, null, 'If the account exists and is not verified, a new verification OTP has been sent.', 200);
  } catch (err) {
    next(err);
  }
};

// --- OAUTH HELPERS ---

export const googleUpsert = async (req, res, next) => {
  try {
    const { tokenId, code } = req.body;

    if (!tokenId && !code) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Either Google tokenId or authorization code is required', 400);
    }

    const provider = ProviderFactory.get('google');
    // verifyAndNormalize accepts either an ID token or an auth code
    const normalizedProfile = await provider.verifyAndNormalize(tokenId || code, !!code);

    const metadata = {
      ipAddress: req.ip,
      userAgent: (req.headers['user-agent'] || '').substring(0, 255),
      deviceType: req.headers['x-device-type'] || 'Unknown',
      osName: req.headers['x-os-name'] || 'Unknown',
      browserName: req.headers['x-browser-name'] || 'Unknown'
    };

    const result = await AuthenticationService.loginOAuth(normalizedProfile, metadata);

    if (!result.success) {
      await logAudit({
        req,
        actorId: null,
        action: 'LOGIN_FAILED',
        severity: 'WARNING',
        metadata: { provider: 'google', reason: result.error?.code }
      });
      return sendError(res, result.error, result.error.message, 400);
    }

    setRefreshTokenCookie(res, result.data.refreshToken);

    const auditAction = result.data.user?.created_at === result.data.user?.updated_at ? 'GOOGLE_ACCOUNT_LINKED' : 'GOOGLE_LOGIN';

    await logAudit({
      req,
      actorId: result.data.user?.id || null,
      action: auditAction,
      severity: 'INFO',
      metadata: { provider: 'google' }
    });

    return sendSuccess(res, {
      token: result.data.accessToken,
      user: result.data.user
    }, 'OAuth authentication successful', 200);

  } catch (err) {
    next(err);
  }
};

export const unlinkProvider = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { providerName } = req.params;

    if (!providerName) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Provider name is required', 400);
    }

    try {
      const provider = ProviderFactory.get(providerName);
      await provider.revoke(userId);
    } catch (e) {}

    await AuthenticationService.unlinkOAuth(userId, providerName);

    await logAudit({
      req,
      actorId: userId,
      action: 'OAUTH_UNLINKED',
      severity: 'WARNING',
      metadata: { provider: providerName }
    });

    return sendSuccess(res, null, `${providerName} account unlinked`, 200);
  } catch (err) {
    next(err);
  }
};
