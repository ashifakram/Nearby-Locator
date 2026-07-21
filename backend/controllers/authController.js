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
      return 429;
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

// Hashing helper (SHA-256 for secure tokens) - kept for legacy google route
const sha256 = (token) => crypto.createHash('sha256').update(token).digest('hex');

// PII-Free Minimal claims Access JWT generator - kept for legacy google route
const generateAccessToken = (user, sessionId) => {
  const payload = { sub: user.id, sid: sessionId };
  return jwt.sign(payload, config.auth.jwtSecret, { expiresIn: '15m' });
};

// --- MIGRATED ROUTES ---

export const signup = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };

    const result = await AuthenticationService.registerLocal(email, password, { name }, metadata);
    if (!result.success) {
      const status = mapDomainErrorToStatus(result.error.code);
      return sendError(res, result.error, result.error.message, status);
    }

    // 201 Created. User is PENDING_VERIFICATION. No tokens issued.
    return sendSuccess(res, { user: result.data.user }, 'Registration successful. Please verify your email.', 201);
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
      const status = mapDomainErrorToStatus(result.error.code);
      return sendError(res, result.error, result.error.message, status);
    }

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
      // If compromised or invalid, we must clear the cookie
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
    const sessionId = req.user.sessionId;
    const metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };

    await AuthenticationService.logout(sessionId, metadata);
    clearRefreshTokenCookie(res);

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

    return sendSuccess(res, null, 'If the email exists, a password reset link has been sent.', 200);
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };

    const result = await AuthenticationService.resetPassword(token, newPassword, metadata);
    if (!result.success) {
      const status = mapDomainErrorToStatus(result.error.code);
      return sendError(res, result.error, result.error.message, status);
    }

    return sendSuccess(res, null, 'Password has been successfully reset. Please log in.', 200);
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

    return sendSuccess(res, null, 'Password successfully changed.', 200);
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Verification token is required', 400);
    }

    const metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    const result = await AuthenticationService.verifyEmail(token, metadata);

    if (!result.success) {
      const status = mapDomainErrorToStatus(result.error.code);
      return sendError(res, result.error, result.error.message, status);
    }

    if (result.alreadyVerified) {
      return sendSuccess(res, null, 'Email already verified.', 200);
    }

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

    return sendSuccess(res, null, 'If the account exists and is not verified, a new verification link has been sent.', 200);
  } catch (err) {
    next(err);
  }
};

// --- LEGACY ROUTES (Deferred to OAuth Phase) ---

// Google OAuth verification – delegates to provider-agnostic AuthenticationService
export const googleUpsert = async (req, res, next) => {
  try {
    const { tokenId } = req.body;
    if (!tokenId) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Google tokenId is required', 400);
    }

    const provider = ProviderFactory.get('google');
    const normalizedProfile = await provider.verifyAndNormalize(tokenId);

    const metadata = {
      ipAddress: req.ip,
      userAgent: (req.headers['user-agent'] || '').substring(0, 255),
      deviceType: req.headers['x-device-type'] || 'Unknown',
      osName: req.headers['x-os-name'] || 'Unknown',
      browserName: req.headers['x-browser-name'] || 'Unknown'
    };

    const result = await AuthenticationService.loginOAuth(normalizedProfile, metadata);

    if (!result.success) {
      return sendError(res, result.error, result.error.message, 400);
    }

    setRefreshTokenCookie(res, result.data.refreshToken);

    return sendSuccess(res, {
      token: result.data.accessToken,
      user: result.data.user
    }, 'OAuth authentication successful', 200);

  } catch (err) {
    next(err);
  }
};

// Provider-agnostic unlinking
export const unlinkProvider = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { providerName } = req.params;

    if (!providerName) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Provider name is required', 400);
    }

    // Attempt remote revocation if the provider supports it
    try {
      const provider = ProviderFactory.get(providerName);
      await provider.revoke(userId); // In a real app, you'd pass the specific account ID or token
    } catch (e) {
      // Ignore unsupported providers or remote revocation failures during unlink
    }

    await AuthenticationService.unlinkOAuth(userId, providerName);
    return sendSuccess(res, null, `${providerName} account unlinked`, 200);
  } catch (err) {
    next(err);
  }
};
