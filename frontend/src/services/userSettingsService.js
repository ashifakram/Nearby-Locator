import { api } from './api';
import { useAuthStore } from '../store/useAuthStore';

export const userSettingsService = {
  // 1. Profile Management
  getProfile: async () => {
    const res = await api.get('/users/profile');
    return res.data?.data?.user || res.data?.user || res.data;
  },

  updateProfile: async (payload) => {
    const res = await api.patch('/users/profile', payload);
    const updatedUser = res.data?.data?.user || res.data?.user || res.data;
    if (updatedUser) {
      const current = useAuthStore.getState().user;
      useAuthStore.getState().setUser({ ...current, ...updatedUser });
    }
    return updatedUser;
  },

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.post('/users/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data?.data || res.data;
  },

  deleteAvatar: async () => {
    const res = await api.delete('/users/profile/avatar');
    return res.data;
  },

  // 2. Account & Security
  changeEmail: async (newEmail) => {
    const res = await api.post('/users/account/change-email', { newEmail });
    return res.data;
  },

  verifyEmailChange: async (newEmail, otpCode) => {
    const res = await api.post('/users/account/verify-email-change', { newEmail, otpCode });
    return res.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const res = await api.post('/users/account/change-password', { currentPassword, newPassword });
    return res.data;
  },

  // 3. Notifications, Preferences, Privacy
  getNotificationSettings: async () => {
    const res = await api.get('/users/notifications/settings');
    return res.data?.data?.notifications || res.data?.notifications || res.data;
  },

  updateNotificationSettings: async (settings) => {
    const res = await api.patch('/users/notifications/settings', settings);
    return res.data?.data?.notifications || res.data?.notifications || res.data;
  },

  getPreferences: async () => {
    const res = await api.get('/users/preferences');
    return res.data?.data?.preferences || res.data?.preferences || res.data;
  },

  updatePreferences: async (preferences) => {
    const res = await api.patch('/users/preferences', preferences);
    return res.data?.data?.preferences || res.data?.preferences || res.data;
  },

  getPrivacy: async () => {
    const res = await api.get('/users/privacy');
    return res.data?.data?.privacy || res.data?.privacy || res.data;
  },

  updatePrivacy: async (privacy) => {
    const res = await api.patch('/users/privacy', privacy);
    return res.data?.data?.privacy || res.data?.privacy || res.data;
  },

  // 4. Active Sessions
  getSessions: async () => {
    const res = await api.get('/users/account/security/sessions');
    return res.data?.data?.devices || res.data?.devices || res.data || [];
  },

  revokeSession: async (sessionId) => {
    const res = await api.delete(`/users/account/security/sessions/${sessionId}`);
    return res.data;
  },

  revokeAllOtherSessions: async () => {
    const res = await api.delete('/users/account/security/sessions/others');
    return res.data;
  },

  // 5. Data Export & Account Purge
  requestDataExport: async () => {
    const res = await api.post('/users/account/export');
    return res.data;
  },

  deleteAccount: async (password) => {
    const res = await api.delete('/users/account', { data: { password } });
    useAuthStore.getState().logout();
    return res.data;
  }
};
