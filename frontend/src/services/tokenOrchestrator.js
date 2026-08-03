import axios from 'axios';
import { config } from '../app/config';
import { useAuthStore } from '../store/useAuthStore';
import { logger } from '../utils/logger';

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

/**
 * Executes a single-flight request to refresh the token.
 * Multiple concurrent calls will queue behind the first promise.
 */
export function executeTokenRefreshMutex() {
  if (isRefreshing) {
    logger.info('Refresh already in flight. Queuing current request...');
    return new Promise((resolve, reject) => {
      subscribeTokenRefresh((token, error) => {
        if (error) reject(error);
        else resolve(token);
      });
    });
  }

  isRefreshing = true;

  const abortController = new AbortController();
  
  // Defensive watchdog to ensure mutex never locks indefinitely
  const watchdog = setTimeout(() => {
    if (isRefreshing) {
      abortController.abort();
      logger.error('Refresh mutex watchdog timeout triggered. Force aborting...');
    }
  }, 15000);

  return new Promise((resolve, reject) => {
    logger.info('Executing single-flight POST /auth/refresh token request...');
    axios.post(`${config.apiUrl}/auth/refresh`, {}, {
      withCredentials: true,
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      timeout: 10000,
      signal: abortController.signal
    })
      .then((response) => {
        const payload = response.data?.data;
        if (payload?.accessToken) {
          logger.info('Token refresh successful. Dispatching new in-memory credentials...');
          inMemoryAccessToken = payload.accessToken;
          resolve(payload.accessToken);
          refreshSubscribers.forEach((cb) => cb(payload.accessToken, null));
        } else {
          throw new Error('Refresh response missing accessToken');
        }
      })
      .catch((err) => {
        const status = err?.response?.status;
        const code = err?.response?.data?.error?.code;

        if (status === 400 || status === 401) {
          logger.info('No active session cookie. User is unauthenticated (guest mode).');
        } else {
          logger.error('Token refresh mutex failed. Performing hard logout session eviction...', err);
        }
        
        inMemoryAccessToken = null;
        useAuthStore.getState().logout();
        
        const currentPath = window.location.pathname;
        if (code === 'TOKEN_REUSED' || code === 'SESSION_REVOKED') {
          useAuthStore.getState().triggerNavigation('/login?reason=concurrent_login');
        } else if (status === 401 && currentPath !== '/session-expired') {
          useAuthStore.getState().triggerNavigation('/session-expired');
        }

        reject(err);
        refreshSubscribers.forEach((cb) => cb(null, err));
      })
      .finally(() => {
        clearTimeout(watchdog);
        refreshSubscribers = [];
        isRefreshing = false;
      });
  });
}
