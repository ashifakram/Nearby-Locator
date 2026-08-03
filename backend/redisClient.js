import { createClient } from 'redis';
import config from './config/index.js';

let isRedisAvailable = false;
let hasLoggedUnavailable = false;

const client = createClient({
  url: config.redis.url,
  socket: {
    tls: config.redis.tls,
    rejectUnauthorized: false,
    reconnectStrategy: (retries) => {
      return Math.min(retries * 100, 5000);
    }
  },
  disableOfflineQueue: true
});

client.on('error', (err) => {
  isRedisAvailable = false;
  if (!hasLoggedUnavailable) {
    console.warn(`[WARN] Redis is unavailable. Falling back to in-memory mode. Error: ${err.message}`);
    hasLoggedUnavailable = true;
  }
});

client.on('ready', () => {
  isRedisAvailable = true;
  hasLoggedUnavailable = false;
});

client.connect().catch(() => {
  isRedisAvailable = false;
});

export const getIsRedisAvailable = () => isRedisAvailable;
export default client;
