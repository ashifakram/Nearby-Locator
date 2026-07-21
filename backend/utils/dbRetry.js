import db from '../db.js';

// Safe, lightweight transient-error retry handler.
// Enforces exponential backoff for safe idempotent operations only.
export async function withTransientRetry(fn, maxRetries = 3, delayMs = 100) {
  const transientErrorCodes = new Set([
    '40P01', // Deadlock detected
    '40001', // Serialization failure
    '57P01', // Admin shutdown
    '57P02', // Crash shutdown
    '57P03', // Cannot connect now
    '08000', // Connection exception
    '08003', // Connection does not exist
    '08006', // Connection failure
  ]);

  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isTransient = err.code && transientErrorCodes.has(err.code);
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
    }
  }
  throw lastErr;
}

export async function withTransaction(fn) {
  return await withTransientRetry(async () => {
    return await db.transaction(async (trx) => {
      return await fn(trx);
    });
  });
}
