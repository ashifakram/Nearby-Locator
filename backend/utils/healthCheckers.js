import { performance } from 'perf_hooks';
import db from '../db.js';
import client from '../redisClient.js';
import config from '../config/index.js';

// Promise Timeout Wrapper to guarantee Event Loop safety under high load
const withTimeout = (promise, ms, label) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} check timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

// Database connectivity check (SELECT 1)
export async function checkDatabase() {
  const timeoutMs = config.telemetry.healthTimeoutMs;
  const start = performance.now();
  try {
    await withTimeout(db.raw('SELECT 1'), timeoutMs, 'Database');
    return {
      status: 'UP',
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    // Silent execution: no console.error to avoid log spam during high polling frequency
    return {
      status: 'DOWN',
      error: 'Database connection failed or timed out',
      latencyMs: Math.round(performance.now() - start),
    };
  }
}

// Redis connectivity check (PING & dynamic state derivation)
export async function checkRedis() {
  const timeoutMs = config.telemetry.healthTimeoutMs;
  const start = performance.now();
  try {
    if (!client) {
      throw new Error('Redis client is not initialized');
    }
    
    // Ping Redis wrapped in strict timeout protection
    await withTimeout(client.ping(), timeoutMs, 'Redis');
    const latencyMs = Math.round(performance.now() - start);

    // Derive connection state dynamically from node-redis properties
    const connectionState = client.isOpen 
      ? (client.isReady ? 'ready' : 'connecting') 
      : 'closed';

    return {
      status: 'UP',
      connectionState,
      latencyMs,
    };
  } catch (err) {
    // Silent execution: no console.error to avoid log spam during high polling frequency
    return {
      status: 'DOWN',
      error: 'Redis connection failed or timed out',
      latencyMs: Math.round(performance.now() - start),
    };
  }
}
