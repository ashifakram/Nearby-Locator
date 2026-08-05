import { api } from './api';
import { setInMemoryAccessToken, getInMemoryAccessToken, executeTokenRefreshMutex } from './tokenOrchestrator';
import { useAuthStore } from '../store/useAuthStore';
import { logger } from '../utils/logger';

export class AuthError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'AuthError';
    this.code = code || 'UNKNOWN_AUTH_ERROR';
    this.status = status || 500;
  }
}

function handleAuthError(err) {
  if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
    throw err;
  }
  const status = err.response?.status;
  const errorData = err.response?.data?.error || {};
  const message = errorData.message || err.message || 'Authentication failed';
  const code = errorData.code || 'UNKNOWN_AUTH_ERROR';
  throw new AuthError(message, code, status);
}

export const authService = {
  login: async (email, password, signal) => {
    logger.info('Executing login API request...');
    try {
      const response = await api.post('/auth/login', { email, password }, { signal });
      const payload = response.data.data;
      
      if (payload?.token) {
        setInMemoryAccessToken(payload.token);
      }
      
      useAuthStore.getState().setSession(payload.user);
      await authService.fetchUserPermissions(signal);
      return payload;
    } catch (err) {
      handleAuthError(err);
    }
  },

  loginGoogle: async (tokenId, signal) => {
    logger.info('Executing Google login API request...');
    try {
      const response = await api.post('/auth/google', { tokenId }, { signal });
      const payload = response.data.data;
      
      if (payload?.token) {
        setInMemoryAccessToken(payload.token);
      }
      
      useAuthStore.getState().setSession(payload.user);
      await authService.fetchUserPermissions(signal);
      return payload;
    } catch (err) {
      handleAuthError(err);
    }
  },

  signup: async (name, email, password, agreed, signal) => {
    logger.info('Executing signup API request...');
    try {
      const response = await api.post('/auth/signup', { name, email, password, agreed }, { signal });
      return response.data.data;
    } catch (err) {
      handleAuthError(err);
    }
  },

  getProfile: async () => {
    logger.info('Executing getProfile session restoration request...');
    if (!getInMemoryAccessToken()) {
      try {
        await executeTokenRefreshMutex();
      } catch (_) {
        // Silent catch: if refresh token cookie is missing/invalid, api.get will handle 401
      }
    }
    const response = await api.get('/users/profile');
    const payload = response.data.data;
    const userObj = payload?.user || payload;
    
    useAuthStore.getState().setSession(userObj);
    await authService.fetchUserPermissions();
    return payload;
  },

  fetchUserPermissions: async (signal) => {
    const currentState = useAuthStore.getState().permissionState;
    if (currentState !== 'READY') {
      useAuthStore.getState().setPermissionLoading();
    }
    try {
      const permRes = await api.get('/users/me/permissions', { signal });
      const { roles, permissions, permissionVersion } = permRes.data?.data || {};
      useAuthStore.getState().setPermissions(roles, permissions, permissionVersion);
    } catch (e) {
      if (currentState !== 'READY') {
        useAuthStore.getState().setPermissionFailed();
      }
      logger.error('Failed to sync permissions from backend', e);
    }
  },

  updateProfile: async (data) => {
    logger.info('Executing updateProfile API request...');
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  logout: async () => {
    logger.info('Executing logout API session revocation...');
    try {
      await api.post('/auth/logout');
    } catch (err) {
      logger.warn('Logout backend call failed/expired. Forcing local teardown anyway.');
    } finally {
      setInMemoryAccessToken(null);
      useAuthStore.getState().logout();
    }
  },

  verifyEmail: async (tokenOrOtp, email = null, signal) => {
    logger.info('Executing verifyEmail API request...');
    const cleanedCode = String(tokenOrOtp || '').trim();
    const isOtp = /^\d{6}$/.test(cleanedCode);
    const payload = {
      token: cleanedCode,
      otpCode: isOtp ? cleanedCode : undefined,
      email: email ? String(email).trim() : undefined,
    };
    try {
      const response = await api.post('/auth/verify-email', payload, { signal });
      return response.data;
    } catch (err) {
      handleAuthError(err);
    }
  },

  resendVerification: async (email, signal) => {
    logger.info('Executing resendVerification API request...');
    try {
      const response = await api.post('/auth/resend-verification', { email }, { signal });
      return response.data;
    } catch (err) {
      handleAuthError(err);
    }
  },

  requestPasswordReset: async (email, signal) => {
    logger.info('Executing requestPasswordReset API request...');
    try {
      const response = await api.post('/auth/password/reset-request', { email }, { signal });
      return response.data;
    } catch (err) {
      handleAuthError(err);
    }
  },

  resetPassword: async (token, newPassword, signal) => {
    logger.info('Executing resetPassword API request...');
    try {
      const response = await api.post('/auth/password/reset', { token, newPassword }, { signal });
      return response.data;
    } catch (err) {
      handleAuthError(err);
    }
  },

  /**
   * Step 2 of password reset: verify the 6-digit OTP code.
   * Returns { resetGrantToken } on success.
   * API: POST /auth/password/verify-otp  { email, otpCode }
   */
  verifyPasswordResetOtp: async (email, otpCode, signal) => {
    logger.info('Executing verifyPasswordResetOtp API request...');
    try {
      const response = await api.post('/auth/password/verify-otp', { email, otpCode }, { signal });
      return response.data?.data || response.data;
    } catch (err) {
      handleAuthError(err);
    }
  },

  /**
   * Step 3 of password reset: set a new password using the grant token.
   * API: POST /auth/password/reset  { email, resetGrantToken, newPassword }
   */
  resetPasswordWithGrantToken: async (email, resetGrantToken, newPassword, signal) => {
    logger.info('Executing resetPasswordWithGrantToken API request...');
    try {
      const response = await api.post('/auth/password/reset', { email, resetGrantToken, newPassword }, { signal });
      return response.data;
    } catch (err) {
      handleAuthError(err);
    }
  }
};
