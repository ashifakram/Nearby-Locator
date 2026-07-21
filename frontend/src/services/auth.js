import { api, setInMemoryAccessToken } from './api';
import { useAuthStore } from '../store/useAuthStore';
import { logger } from '../utils/logger';

export const authService = {
  login: async (email, password) => {
    logger.info('Executing login API request...');
    const response = await api.post('/auth/login', { email, password });
    const payload = response.data.data; // Extracts inner data: { token, user }
    
    if (payload?.token) {
      setInMemoryAccessToken(payload.token);
    }
    
    // Fetch permissions to hydrate UI capability flags
    try {
      const permRes = await api.get('/users/me/permissions');
      payload.user.permissions = permRes.data?.data?.permissions || [];
    } catch (e) {
      if (payload.user) payload.user.permissions = [];
    }

    useAuthStore.getState().setSession(payload.user);
    return payload;
  },

  loginGoogle: async (tokenId) => {
    logger.info('Executing Google login API request...');
    const response = await api.post('/auth/google', { tokenId });
    const payload = response.data.data; // Extracts inner data: { token, user }
    
    if (payload?.token) {
      setInMemoryAccessToken(payload.token);
    }
    
    try {
      const permRes = await api.get('/users/me/permissions');
      payload.user.permissions = permRes.data?.data?.permissions || [];
    } catch (e) {
      if (payload.user) payload.user.permissions = [];
    }

    useAuthStore.getState().setSession(payload.user);
    return payload;
  },

  signup: async (name, email, password) => {
    logger.info('Executing signup API request...');
    const response = await api.post('/auth/signup', { name, email, password });
    // Backend returns 201 with user data but NO token (PENDING_VERIFICATION).
    // Do not set session or access token — user must verify email first.
    return response.data.data;
  },

  getProfile: async () => {
    logger.info('Executing getProfile session restoration request...');
    const response = await api.get('/users/profile');
    const payload = response.data.data;
    const userObj = payload?.user || payload;
    
    // Fetch permissions
    try {
      const permRes = await api.get('/users/me/permissions');
      userObj.permissions = permRes.data?.data?.permissions || [];
    } catch (e) {
      userObj.permissions = [];
    }

    useAuthStore.getState().setSession(userObj);
    return payload;
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

  verifyEmail: async (token) => {
    logger.info('Executing verifyEmail API request...');
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },

  resendVerification: async (email) => {
    logger.info('Executing resendVerification API request...');
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  requestPasswordReset: async (email) => {
    logger.info('Executing requestPasswordReset API request...');
    const response = await api.post('/auth/password/reset-request', { email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    logger.info('Executing resetPassword API request...');
    const response = await api.post('/auth/password/reset', { token, newPassword });
    return response.data;
  }
};
