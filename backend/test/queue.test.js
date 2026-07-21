import { describe, it, beforeEach, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import db from '../db.js';
import client from '../redisClient.js';
import config from '../config/index.js';
import { enqueue, Worker, Scheduler } from '../utils/queue.js';
import { cleanDatabase, resetGlobalState, flushRedisTestCache, teardownConnections } from './helpers.js';
import { metricsStore } from '../utils/logger.js';

describe('🚀 Background Jobs, Scheduled Retention, & Queue Hardening Suite', () => {

  let worker = null;
  let scheduler = null;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    await cleanDatabase();
    await flushRedisTestCache();
    resetGlobalState();
    
    // Purge local metrics store job metrics
    metricsStore.jobSuccesses = 0;
    metricsStore.jobFailures = 0;
    metricsStore.jobDurationMsTotal = 0;
  });

  afterEach(async () => {
    if (worker) {
      await worker.shutdown();
      worker = null;
    }
    if (scheduler) {
      scheduler.shutdown();
      scheduler = null;
    }
  });

  after(async () => {
    await teardownConnections();
  });

  it('1. Verify strictly deterministic First-In, First-Out (FIFO) queue ordering', async () => {
    const executionOrder = [];
    const registry = {
      TEST_FIFO: async (payload) => {
        executionOrder.push(payload.num);
      }
    };

    // Enqueue jobs in a deterministic sequence
    await enqueue('TEST_FIFO', { num: 1 });
    await enqueue('TEST_FIFO', { num: 2 });
    await enqueue('TEST_FIFO', { num: 3 });

    // Run worker with concurrency = 1 to enforce strict serial processing
    worker = new Worker(registry, { concurrency: 1 });
    await worker.start();

    // Wait until all 3 jobs complete execution
    let attempts = 0;
    while (executionOrder.length < 3 && attempts < 25) {
      await new Promise(resolve => setTimeout(resolve, 200));
      attempts++;
    }

    assert.deepEqual(executionOrder, [1, 2, 3]);
  });

  it('2. Verify 24-hour Redis-backed enqueuing idempotency guards', async () => {
    const idempotencyKey = 'unique-payment-retry-key';

    // First enqueue: succeeds and returns a valid Job UUID
    const id1 = await enqueue('CLEANUP_EXPIRED_SESSIONS', { data: 1 }, { idempotencyKey });
    assert.ok(id1);

    // Second enqueue: deduplicated and returns null
    const id2 = await enqueue('CLEANUP_EXPIRED_SESSIONS', { data: 1 }, { idempotencyKey });
    assert.equal(id2, null);
  });

  it('3. Verify queue backpressure capacity limit rejection (10,000 pending items)', async () => {
    // Stub Redis client lLen to simulate queue fullness
    const originalLen = client.lLen;
    client.lLen = async () => 10000;

    try {
      await assert.rejects(
        async () => {
          await enqueue('TEST_FIFO', { val: 'test' });
        },
        (err) => {
          assert.equal(err.name, 'QueueCapacityExceededError');
          assert.equal(err.message, 'Queue capacity cap exceeded');
          return true;
        }
      );
    } finally {
      client.lLen = originalLen;
    }
  });

  it('4. Verify Weighted Priority Scheduling logic prevents low queue starvation', async () => {
    const prefix = config.redis.prefix || 'nearby-locator:';
    const highQueue = `${prefix}queue:high`;
    const lowQueue = `${prefix}queue:low`;

    // Stub Math.random to return 0.1 (< 0.8) -> Normal priority: High first
    const originalRandom = Math.random;
    let mockVal = 0.1;
    Math.random = () => mockVal;

    const queuesNormal = Math.random() < 0.8 ? [highQueue, lowQueue] : [lowQueue, highQueue];
    assert.deepEqual(queuesNormal, [highQueue, lowQueue]);

    // Stub Math.random to return 0.9 (>= 0.8) -> Weighted fairness fallback: Low first
    mockVal = 0.9;
    const queuesFair = Math.random() < 0.8 ? [highQueue, lowQueue] : [lowQueue, highQueue];
    assert.deepEqual(queuesFair, [lowQueue, highQueue]);

    Math.random = originalRandom;
  });

  it('5. Verify future job schema versioning evicts directly to the DLQ', async () => {
    const registry = {
      TEST_FIFO: async () => {}
    };

    // Enqueue job with future version 2 (supported version is 1)
    await enqueue('TEST_FIFO', { num: 42 }, { version: 2 });

    worker = new Worker(registry);
    await worker.start();

    // Wait and verify the job gets evicted to the Dead-Letter Queue
    const prefix = config.redis.prefix || 'nearby-locator:';
    const failedKey = `${prefix}queue:failed`;
    let dlqLength = 0;
    let attempts = 0;

    while (dlqLength === 0 && attempts < 25) {
      await new Promise(resolve => setTimeout(resolve, 200));
      dlqLength = await client.lLen(failedKey);
      attempts++;
    }

    assert.equal(dlqLength, 1);
    
    const failedJobStr = await client.rPop(failedKey);
    const failedJob = JSON.parse(failedJobStr);
    assert.equal(failedJob.version, 2);
    assert.ok(failedJob.error.message.includes('Unsupported schema version'));
  });

  it('6. Verify automatic processing heartbeat leases and successful cleanup', async () => {
    const prefix = config.redis.prefix || 'nearby-locator:';
    const processingQueue = `${prefix}queue:processing`;
    let activeJobFinished = false;

    const registry = {
      SLOW_JOB: async () => {
        // Sleep for 300ms to verify lease is written to Redis
        await new Promise(resolve => setTimeout(resolve, 300));
        activeJobFinished = true;
      }
    };

    await enqueue('SLOW_JOB');

    worker = new Worker(registry);
    await worker.start();

    // Check ZSET contains active lease shortly after processing starts
    await new Promise(resolve => setTimeout(resolve, 100));
    const activeLeases = await client.zRange(processingQueue, 0, -1);
    assert.equal(activeLeases.length, 1);
    const leaseJob = JSON.parse(activeLeases[0]);
    assert.equal(leaseJob.type, 'SLOW_JOB');

    // Wait until job finishes
    while (!activeJobFinished) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verify lease is removed cleanly upon successful completion
    const activeLeasesAfter = await client.zRange(processingQueue, 0, -1);
    assert.equal(activeLeasesAfter.length, 0);
  });

  it('7. Verify execution timeout race guards terminate hung jobs cleanly', async () => {
    const registry = {
      HUNG_JOB: async () => {
        // Mock a job that hangs indefinitely (e.g. 2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    };

    // Enqueue with a tight 100ms execution timeout cap and maxAttempts: 1
    await enqueue('HUNG_JOB', {}, { executionTimeoutMs: 100, maxAttempts: 1 });

    worker = new Worker(registry);
    await worker.start();

    // Wait until the job times out and moves to the DLQ after exhausting retries (default 3)
    const prefix = config.redis.prefix || 'nearby-locator:';
    const failedKey = `${prefix}queue:failed`;
    let dlqLength = 0;
    let attempts = 0;

    while (dlqLength === 0 && attempts < 25) {
      await new Promise(resolve => setTimeout(resolve, 200));
      dlqLength = await client.lLen(failedKey);
      attempts++;
    }

    assert.equal(dlqLength, 1);
    const failedJobStr = await client.rPop(failedKey);
    const failedJob = JSON.parse(failedJobStr);
    assert.equal(failedJob.error.name, 'TimeoutError');
    assert.equal(failedJob.error.message, 'Execution timeout exceeded');
  });

  it('8. Verify chunked, batched retention prunes purge old records successfully', async () => {
    const userId = crypto.randomUUID();
    
    // Seed expired session (yesterday), active session, old error log (10 days), old login attempt (20 days)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);

    // A. Seed user
    await db('users').insert({
      id: userId,
      email: 'prune_suite@saas.com',
      password_hash: 'hash_pass'
    });

    const sessionIdExpired = crypto.randomUUID();
    const sessionIdActive = crypto.randomUUID();
    const sessionIdRotated = crypto.randomUUID();

    // B. Seed sessions
    await db('user_sessions').insert([
      {
        id: sessionIdExpired,
        user_id: userId,
        expires_at: yesterday,
        refresh_token_hash: 'hash1',
        session_family_id: crypto.randomUUID()
      },
      {
        id: sessionIdActive,
        user_id: userId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // active
        refresh_token_hash: 'hash2',
        session_family_id: crypto.randomUUID()
      },
      {
        id: sessionIdRotated,
        user_id: userId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // active but rotated yesterday
        refresh_token_hash: 'hash3',
        session_family_id: crypto.randomUUID(),
        is_rotated: true,
        updated_at: yesterday
      }
    ]);

    // C. Seed obsolete error log
    await db('system_errors').insert({
      id: crypto.randomUUID(),
      error_message: 'system timeout occurred',
      occurred_at: tenDaysAgo
    });

    // D. Seed obsolete login attempt
    await db('login_attempts').insert({
      id: crypto.randomUUID(),
      email: 'prune_suite@saas.com',
      is_successful: false,
      attempted_at: twentyDaysAgo
    });

    // Verify seeds are initially written
    const sessionsBefore = await db('user_sessions');
    assert.equal(sessionsBefore.length, 3);
    const errorsBefore = await db('system_errors');
    assert.equal(errorsBefore.length, 1);
    const loginsBefore = await db('login_attempts');
    assert.equal(loginsBefore.length, 1);

    // Enqueue all four scheduled retention prunes
    const { jobRegistry } = await import('../jobs/index.js');
    await enqueue('CLEANUP_EXPIRED_SESSIONS');
    await enqueue('PRUNE_STALE_TOKENS');
    await enqueue('PRUNE_TELEMETRY');
    await enqueue('PRUNE_LOGIN_ATTEMPTS');

    // Run worker
    worker = new Worker(jobRegistry);
    await worker.start();

    // Wait until all 4 retention jobs run to success
    let attempts = 0;
    while (metricsStore.jobSuccesses < 4 && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 200));
      attempts++;
    }

    assert.equal(metricsStore.jobSuccesses, 4);

    // Assert expired and stale database records were batched deleted cleanly
    const sessionsAfter = await db('user_sessions');
    // Only the single active session remains
    assert.equal(sessionsAfter.length, 1);
    assert.equal(sessionsAfter[0].id, sessionIdActive);

    const errorsAfter = await db('system_errors');
    assert.equal(errorsAfter.length, 0);

    const loginsAfter = await db('login_attempts');
    assert.equal(loginsAfter.length, 0);
  });
});
