import { api } from './api';

// ─── Users ────────────────────────────────────────────────────────────────────
export const getAdminUsers = async ({ page = 1, limit = 20, search = '', sort = 'created_at', order = 'desc' } = {}) => {
  const params = new URLSearchParams({ page, limit, ...(search && { search }), sort, order });
  const { data } = await api.get(`/admin/users?${params}`);
  return data.data;
};

export const suspendUser = async (userId, reason) => {
  const { data } = await api.post(`/admin/users/${userId}/suspend`, { reason });
  return data;
};

export const unlockUser = async (userId, reason) => {
  const { data } = await api.post(`/admin/users/${userId}/unlock`, { reason });
  return data;
};

export const forceLogoutUser = async (userId) => {
  const { data } = await api.post(`/admin/users/${userId}/logout`);
  return data;
};

export const updateUserRole = async (userId, roleId) => {
  const { data } = await api.put(`/admin/users/${userId}/role`, { roleId });
  return data;
};

// ─── Roles & Permissions ──────────────────────────────────────────────────────
export const listRoles = async () => {
  const { data } = await api.get('/admin/roles');
  return data.data;
};

export const listPermissions = async () => {
  const { data } = await api.get('/admin/permissions');
  return data.data;
};

export const updateRolePermissions = async (roleId, permissionIds) => {
  const { data } = await api.put(`/admin/roles/${roleId}/permissions`, { permissionIds });
  return data;
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const getAuditLogs = async ({ page = 1, limit = 50, search = '', severity = '', action = '' } = {}) => {
  const params = new URLSearchParams({
    page, limit,
    ...(search && { search }),
    ...(severity && { severity }),
    ...(action && { action }),
  });
  const { data } = await api.get(`/admin/audit-logs?${params}`);
  return data.data;
};

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const getSessions = async ({ page = 1, limit = 50, search = '' } = {}) => {
  const params = new URLSearchParams({ page, limit, ...(search && { search }) });
  const { data } = await api.get(`/admin/sessions?${params}`);
  return data.data;
};

export const revokeSession = async (sessionId) => {
  const { data } = await api.delete(`/admin/sessions/${sessionId}`);
  return data;
};

export const revokeAllUserSessions = async (userId) => {
  const { data } = await api.delete(`/admin/sessions/user/${userId}`);
  return data;
};

// ─── Auth Events ──────────────────────────────────────────────────────────────
export const getAuthEvents = async ({ page = 1, limit = 50, search = '', eventCategory = '', eventType = '' } = {}) => {
  const params = new URLSearchParams({
    page, limit,
    ...(search && { search }),
    ...(eventCategory && { eventCategory }),
    ...(eventType && { eventType }),
  });
  const { data } = await api.get(`/admin/auth-events?${params}`);
  return data.data;
};

// ─── System Errors ────────────────────────────────────────────────────────────
export const getSystemErrors = async ({ page = 1, limit = 50, search = '', severity = '', statusCode = '' } = {}) => {
  const params = new URLSearchParams({
    page, limit,
    ...(search && { search }),
    ...(severity && { severity }),
    ...(statusCode && { statusCode }),
  });
  const { data } = await api.get(`/admin/system-errors?${params}`);
  return data.data;
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const getDashboardAnalytics = async () => {
  const { data } = await api.get('/admin/analytics/dashboard');
  return data.data;
};

export const getAuthEventsAnalytics = async (params = {}) => {
  const qs = new URLSearchParams(params);
  const { data } = await api.get(`/admin/analytics/auth-events?${qs}`);
  return data.data;
};

export const getSystemErrorsAnalytics = async (params = {}) => {
  const qs = new URLSearchParams(params);
  const { data } = await api.get(`/admin/analytics/system-errors?${qs}`);
  return data.data;
};

export const getAuditLogsAnalytics = async (params = {}) => {
  const qs = new URLSearchParams(params);
  const { data } = await api.get(`/admin/analytics/audit-logs?${qs}`);
  return data.data;
};

// ─── Control Plane ────────────────────────────────────────────────────────────
export const getControlPlaneMetrics = async () => {
  const { data } = await api.get('/admin/control-plane-metrics');
  return data.data;
};

// ─── Impersonation ────────────────────────────────────────────────────────────
export const initiateImpersonation = async (targetUserId) => {
  const { data } = await api.post('/admin/impersonate', { targetUserId });
  return data;
};

// ─── Sudo Step-Up ─────────────────────────────────────────────────────────────
export const sudoConfirm = async (password) => {
  const { data } = await api.post('/admin/sudo-confirm', { password });
  return data;
};

// ─── Export ───────────────────────────────────────────────────────────────────
export const exportUserData = async (payload) => {
  const { data } = await api.post('/admin/export-data', payload);
  return data;
};

export const getExportStatus = async (exportId) => {
  const { data } = await api.get(`/admin/export-status/${exportId}`);
  return data;
};

export const downloadExportedData = async (token) => {
  const { data } = await api.get(`/admin/downloads/${token}`);
  return data;
};

// ─── Retention Override ───────────────────────────────────────────────────────
export const retentionOverride = async ({ durationDays, reason }) => {
  const { data } = await api.post('/admin/retention-override', { durationDays, reason });
  return data;
};

// ─── Data Exports ─────────────────────────────────────────────────────────────
export const exportPlatformData = async (type) => {
  const { data } = await api.post('/admin/export-data', { type });
  return data;
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export const getSystemSettings = async () => {
  const { data } = await api.get('/admin/settings');
  return data.data;
};

export const updateSystemSettings = async (settings) => {
  const { data } = await api.put('/admin/settings', { settings });
  return data;
};

// ─── System Info ──────────────────────────────────────────────────────────────
export const getSystemDiagnostics = async () => {
  const { data } = await api.get('/admin/system/info');
  return data.data;
};

// ─── CSV Download Helper ──────────────────────────────────────────────────────
export const downloadCSV = async (endpoint, filename, extraParams = {}) => {
  const params = new URLSearchParams({ export: 'csv', ...extraParams });
  const response = await api.get(`${endpoint}?${params}`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};

