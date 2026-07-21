import { createClient } from 'redis';
import config from './config/index.js';

// Create a Redis client using the connection string from the configuration singleton.
let client;

if (process.env.MOCK_REDIS === 'true') {
  console.log('--- Mocking Redis Client for E2E Tests ---');
  client = {
    connect: async () => {},
    on: () => {},
    multi: function() {
      const p = {
        zAdd: function() { return this; },
        zRemRangeByScore: function() { return this; },
        zCard: function() { return this; },
        expire: function() { return this; },
        set: function() { return this; },
        del: function() { return this; },
        exec: async () => [null, null, 0]
      };
      return p;
    },
    set: async () => {},
    get: async () => null,
    del: async () => {},
    incr: async () => 1,
    expire: async () => {}
  };
} else {
  client = createClient({
    url: config.redis.url,
    socket: {
      tls: config.redis.tls,
      rejectUnauthorized: false,
    },
    disableOfflineQueue: true
  });

  client.on('error', (err) => {
    if (err.code === 'ECONNRESET') {
      console.warn('Redis connection reset (ECONNRESET), automatically reconnecting...');
    } else {
      console.error('Redis client error:', err);
    }
  });

  // Connect immediately (fire‑and‑forget). Errors are logged above.
  client.connect().catch((e) => console.error('Failed to connect to Redis:', e));
}

export default client;

