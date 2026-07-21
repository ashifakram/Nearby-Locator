import axios from 'axios';
import { config } from '../app/config';
import { useAuthStore } from '../store/useAuthStore';
import { logger } from '../utils/logger';

// 1. Volatile strictly in-memory access token closure (Problem 1 Security)
let inMemoryAccessToken = null;
let isRefreshing = false;
let refreshSubscribers = [];

export function setInMemoryAccessToken(token) {
  inMemoryAccessToken = token;
}

export function getInMemoryAccessToken() {
  return inMemoryAccessToken;
}

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export const api = axios.create({
  baseURL: config.apiUrl,
  timeout: 15000,
  withCredentials: true, // Support secure HTTP-only cookies
});

// 2. Request Interceptor: Attach bearer authorization dynamically
api.interceptors.request.use(
  (req) => {
    if (inMemoryAccessToken) {
      req.headers['Authorization'] = `Bearer ${inMemoryAccessToken}`;
    }
    return req;
  },
  (err) => Promise.reject(err)
);

// 3. Response Interceptor: Single-Flight Refresh Mutex & Replay Queue (Problem 2 Resiliency)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is unauthorized and has not already been retried
    const isAuthEndpoint = originalRequest.url && (
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/signup') ||
      originalRequest.url.includes('/auth/google') ||
      originalRequest.url.includes('/auth/verify-email') ||
      originalRequest.url.includes('/auth/resend-verification')
    );

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      logger.info('Unauthorized API response detected. Initiating secure refresh mutex...');
      
      // If a refresh is already in-flight, subscribe this request to resolved promise
      if (isRefreshing) {
        logger.info('Refresh already in flight. Queuing current request...');
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            if (token) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              resolve(api(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Lock single-flight token refresh promise
      return new Promise((resolve, reject) => {
        logger.info('Executing single-flight POST /auth/refresh token request...');
        axios.post(`${config.apiUrl}/auth/refresh`, {}, { 
          withCredentials: true,
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
          .then((response) => {
            const payload = response.data.data;
            if (payload?.accessToken) {
              logger.info('Token refresh successful. Dispatching new in-memory credentials...');
              inMemoryAccessToken = payload.accessToken;
              
              // Flush wait subscribers with new token
              onTokenRefreshed(payload.accessToken);
              
              // Set headers and retry original request
              originalRequest.headers['Authorization'] = `Bearer ${payload.accessToken}`;
              resolve(api(originalRequest));
            } else {
              throw new Error('Refresh response missing accessToken');
            }
          })
          .catch((err) => {
            const status = err?.response?.status;
            // 400 = no refresh cookie (guest/unauthenticated) — expected, not an error
            // 401 = invalid/expired token — expected after logout
            if (status === 400 || status === 401) {
              logger.info('No active session cookie. User is unauthenticated (guest mode).');
            } else {
              logger.error('Token refresh mutex failed. Performing hard logout session eviction...', err);
            }
            
            // Terminate wait queue
            onTokenRefreshed(null);
            
            // Clear credentials
            inMemoryAccessToken = null;
            useAuthStore.getState().logout();
            
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);
