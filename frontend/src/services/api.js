import axios from 'axios';
import { config } from '../app/config';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { logger } from '../utils/logger';
import { getInMemoryAccessToken, executeTokenRefreshMutex } from './tokenOrchestrator';

export const api = axios.create({
  baseURL: config.apiUrl,
  timeout: 15000,
  withCredentials: true, // Support secure HTTP-only cookies
});

// Request Interceptor: Attach bearer authorization dynamically
api.interceptors.request.use(
  (req) => {
    const token = getInMemoryAccessToken();
    if (token) {
      req.headers['Authorization'] = `Bearer ${token}`;
    }
    return req;
  },
  (err) => Promise.reject(err)
);

// Response Interceptor: Single-Flight Refresh Mutex & Replay Queue
api.interceptors.response.use(
  (res) => {
    // Successful response implies network is online
    useUIStore.getState().setNetworkOffline(false);
    return res;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // 1. Separate Browser Offline Detection from Backend Failures
    if (error.request && !error.response) {
      if (!navigator.onLine) {
        useUIStore.getState().setNetworkOffline(true);
      } else if (error.code === 'ECONNABORTED') {
        // Request timeout
        if (window.location.pathname !== '/504') {
          useAuthStore.getState().triggerNavigation('/504');
        }
      } else {
        // Network error (e.g. DNS failure, connection refused) while browser is online
        if (window.location.pathname !== '/503') {
          useAuthStore.getState().triggerNavigation('/503');
        }
      }
      return Promise.reject(error);
    }
    
    // We reached the backend (even if it's a 5xx), so the client is technically online
    useUIStore.getState().setNetworkOffline(false);
    
    const status = error.response?.status;
    
    // 2. Targeted Retries for Approved Idempotent Infrastructure Endpoints
    const IDEMPOTENT_ENDPOINTS = ['/health', '/config', '/system'];
    const isIdempotent = IDEMPOTENT_ENDPOINTS.some(ep => originalRequest.url?.includes(ep));
    
    if (status >= 500 && originalRequest.method === 'get' && isIdempotent) {
      originalRequest._retryCount = originalRequest._retryCount || 0;
      if (originalRequest._retryCount < 3) {
        originalRequest._retryCount++;
        logger.info(`Retrying idempotent request ${originalRequest.url} (Attempt ${originalRequest._retryCount})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * originalRequest._retryCount));
        return api(originalRequest);
      }
    }
    
    // 3. Operational State Navigation for severe backend outages
    const currentPath = window.location.pathname;
    if (status === 502 || status === 503) {
      if (currentPath !== '/503') {
        useAuthStore.getState().triggerNavigation('/503');
      }
      return Promise.reject(error);
    }
    if (status === 504) {
      if (currentPath !== '/504') {
        useAuthStore.getState().triggerNavigation('/504');
      }
      return Promise.reject(error);
    }

    // 4. Token Refresh Orchestration
    const isAuthEndpoint = originalRequest.url && (
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/signup') ||
      originalRequest.url.includes('/auth/google') ||
      originalRequest.url.includes('/auth/verify-email') ||
      originalRequest.url.includes('/auth/resend-verification')
    );

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const newToken = await executeTokenRefreshMutex();
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }

    // 5. In-Page Authorization Rejection (403 Context)
    if (status === 403) {
      logger.warn('403 ACTION_FORBIDDEN received. Triggering background permission refresh.');
      window.dispatchEvent(new CustomEvent('permission_refresh_required'));
    }

    return Promise.reject(error);
  }
);

export default api;
