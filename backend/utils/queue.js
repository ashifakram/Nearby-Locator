import { createClient } from 'redis';
import config from '../config/index.js';
import client from '../redisClient.js';
import { logger } from './logger.js';
import crypto from 'crypto';

/**
 * Enqueue a job into the background queue system.
 * 
 * Guarantees First-In, First-Out (FIFO) ordering by using LPUSH for enqueuing 
 * and RPOP (or BRPOP) for dequeuing.
 */
export async function enqueue(type, payload = {}, options = {}) {
  const prefix = config.redis.prefix || 'nearby-locator:';
  const highQueue = `${prefix}queue:high`;
  const lowQueue = `${prefix}queue:low`;

  // 1. Job payload-size discipline (strict cap at 10KB)
  const payloadStr = JSON.stringify(payload);
  if (Buffer.byteLength(payloadStr, 'utf-8') > 10 * 1024) {
    throw new Error('Payload size exceeds 10KB cap');
  }

  // 2. Determine target priority queue (default high, retention/pruning is low priority)
  const isLowPriority = options.priority === 'low' || type.startsWith('PRUNE_') || type.startsWith('CLEANUP_');
  const targetQueue = isLowPriority ? lowQueue : highQueue;

  // 3. Queue backpressure capacity check (strict cap at 10,000 pending items)
  const queueLength = await client.lLen(targetQueue).catch(() => 0);
  if (queueLength >= 10000) {
    logger.warn('QUEUE_BACKPRESSURE', 'Queue capacity cap (10,000) exceeded! Rejecting enqueue.', { queue: targetQueue, type });
    const err = new Error('Queue capacity cap exceeded');
    err.name = 'QueueCapacityExceededError';
    throw err;
  }

  // 4. Redis-backed idempotency guard (NX with 24-hour expiry)
  const jobId = options.id || crypto.randomUUID();
  const idempotencyKey = options.idempotencyKey || null;
  if (idempotencyKey) {
    const key = `${prefix}idempotency:${idempotencyKey}`;
    const acquired = await client.set(key, '1', { NX: true, PX: 24 * 60 * 60 * 1000 });
    if (!acquired) {
      logger.info(`Deduplicated duplicate job enqueue for idempotency key: ${idempotencyKey}`, { type });
      return null; // Silently deduplicated
    }
  }

  // 5. Structure immutable payload schema versioning
  const job = {
    id: jobId,
    type,
    version: options.version || 1, // Lightweight version check for rolling deployments
    payload,
    attempts: options.attempts || 0,
    maxAttempts: options.maxAttempts !== undefined ? options.maxAttempts : 3,
    backoffFactor: options.backoffFactor || 1000,
    executionTimeoutMs: options.executionTimeoutMs || 30000,
    runAt: options.runAt || null
  };

  const jobStr = JSON.stringify(job);

  // 6. Push to target queue (or ZADD if delayed)
  if (options.delayMs && options.delayMs > 0) {
    const runAt = Date.now() + options.delayMs;
    job.runAt = runAt;
    const delayedKey = `${prefix}queue:delayed`;
    await client.zAdd(delayedKey, { score: runAt, value: JSON.stringify(job) });
    logger.info(`Enqueued delayed job ${jobId} of type ${type} to execute in ${options.delayMs}ms`, { type, jobId });
  } else {
    // LPUSH for FIFO head insertion
    await client.lPush(targetQueue, jobStr);
    logger.info(`Enqueued job ${jobId} of type ${type} onto ${isLowPriority ? 'low' : 'high'} queue`, { type, jobId });
  }

  return jobId;
}

/**
 * Worker Pool responsible for consuming jobs from priority queues in a concurrent, non-blocking loop.
 */
export class Worker {
  constructor(jobRegistry, options = {}) {
    this.jobRegistry = jobRegistry;
    this.concurrency = options.concurrency || Number(process.env.WORKER_CONCURRENCY) || 5;
    this.activeJobs = 0;
    this.isShuttingDown = false;
    this.blockingClient = null;
    this.prefix = config.redis.prefix || 'nearby-locator:';
    this.highQueue = `${this.prefix}queue:high`;
    this.lowQueue = `${this.prefix}queue:low`;
    this.processingQueue = `${this.prefix}queue:processing`;
    this.activeHeartbeats = new Map(); // jobId -> intervalId
  }

  async start() {
    logger.info(`Worker starting with concurrency limit: ${this.concurrency}`);
    
    if (process.env.MOCK_REDIS === 'true') {
      this.blockingClient = client;
    } else {
      // Dedicated blocking Redis client connection to keep blocking queries isolated
      this.blockingClient = createClient({
        url: config.redis.url,
        socket: {
          tls: config.redis.tls,
          rejectUnauthorized: false
        }
      });

      this.blockingClient.on('error', (err) => {
        if (err.code === 'ECONNRESET') {
          logger.warn('WORKER_REDIS_RECONNECT', 'Worker dedicated Redis client connection reset, reconnecting...');
        } else {
          logger.error('WORKER_REDIS_ERROR', 'Worker dedicated Redis client error:', err);
        }
      });

      await this.blockingClient.connect();
      logger.info('Worker dedicated Redis client connected successfully.');
    }

    // Start blocking poll loop asynchronously
    this.loop();
  }

  async loop() {
    while (!this.isShuttingDown) {
      try {
        // Concurrency backpressure control
        if (this.activeJobs >= this.concurrency) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        // Weighted Priority Fairness (80% probability high priority first, 20% low priority check fallback)
        const rand = Math.random();
        const queues = rand < 0.8 
          ? [this.highQueue, this.lowQueue] 
          : [this.lowQueue, this.highQueue];

        // Dedicated BRPOP blocks naturally for up to 2 seconds
        const result = await this.blockingClient.brPop(queues, 2);
        
        if (!result) {
          continue; // Timed out waiting for job, try again
        }

        const jobStr = result.element;
        let job;
        try {
          job = JSON.parse(jobStr);
        } catch (parseErr) {
          logger.error('WORKER_PARSE_ERROR', 'Failed to parse popped job payload:', parseErr, { rawPayload: jobStr });
          continue;
        }

        // Increment active task slot
        this.activeJobs++;

        // Process job asynchronously, avoiding worker starvation
        this.processJob(job).catch(err => {
          logger.error('WORKER_UNHANDLED_ERROR', 'Unhandled job execution error:', err, { jobId: job.id, type: job.type });
        }).finally(() => {
          this.activeJobs--;
        });

      } catch (err) {
        if (this.isShuttingDown) break;
        logger.error('WORKER_LOOP_ERROR', 'Error inside worker loop tick:', err);
        // Avoid aggressive tight looping during Redis socket outages
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async processJob(job) {
    const startTime = Date.now();
    const prefix = this.prefix;
    const processingQueue = this.processingQueue;

    logger.info(`Starting job ${job.id} of type ${job.type} (attempt ${job.attempts + 1}/${job.maxAttempts})`);

    // 1. Schema versioning check
    if (job.version && job.version > 1) {
      logger.warn('WORKER_SCHEMA_VERSION_MISMATCH', `Job ${job.id} has future version: ${job.version}. Evicting to DLQ.`, { job });
      await this.moveToDLQ(job, new Error(`Unsupported schema version: ${job.version}`));
      return;
    }

    // 2. Add to processing set with timestamp lease score
    await client.zAdd(processingQueue, { score: Date.now(), value: JSON.stringify(job) });

    // 3. Spawn automatic heartbeat lease refresh (every 10s)
    const heartbeatInterval = setInterval(async () => {
      try {
        if (client.isOpen) {
          await client.zAdd(processingQueue, { score: Date.now(), value: JSON.stringify(job) });
        }
      } catch (hbErr) {
        logger.warn('WORKER_HEARTBEAT_FAILED', 'Failed to refresh active job lease heartbeat:', hbErr, { jobId: job.id });
      }
    }, 10000);

    this.activeHeartbeats.set(job.id, heartbeatInterval);

    try {
      const handler = this.jobRegistry[job.type];
      if (!handler) {
        throw new Error(`No registered handler found for job type: ${job.type}`);
      }

      // 4. Wrap execution inside race timeout guard
      const executionTimeoutMs = job.executionTimeoutMs || 30000;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          const err = new Error('Execution timeout exceeded');
          err.name = 'TimeoutError';
          reject(err);
        }, executionTimeoutMs);
      });

      // Execute handler in race
      await Promise.race([
        handler(job.payload, {
          heartbeat: async () => {
            // Manual heartbeat exposed for long tasks
            await client.zAdd(processingQueue, { score: Date.now(), value: JSON.stringify(job) });
          }
        }),
        timeoutPromise
      ]);

      // Job completed successfully
      logger.info('Background job completed', {
        jobId: job.id,
        durationMs: Date.now() - startTime
      }, 'JOB_WORKER');

      // Clear heartbeat and remove processing lease
      clearInterval(heartbeatInterval);
      this.activeHeartbeats.delete(job.id);
      await client.zRem(processingQueue, JSON.stringify(job));

    } catch (err) {
      // Clear heartbeat and remove processing lease
      clearInterval(heartbeatInterval);
      this.activeHeartbeats.delete(job.id);
      await client.zRem(processingQueue, JSON.stringify(job));
      logger.error('JOB_FAIL', 'Background job failed permanently', err, {
        jobId: job.id,
        attempts: job.attempts,
        payload: job.payload
      });

      // 5. Exponential backoff and retry evaluation
      const attempts = job.attempts + 1;
      const maxAttempts = job.maxAttempts;
      const isTransient = this.classifyError(err, job);

      if (isTransient && attempts < maxAttempts) {
        job.attempts = attempts;
        const delayMs = Math.pow(2, attempts) * job.backoffFactor;
        
        logger.warn('WORKER_JOB_RETRY', `Job ${job.id} of type ${job.type} failed (transient). Rescheduling retry ${attempts}/${maxAttempts} in ${delayMs}ms.`, { error: err.message });
        
        // Re-enqueue as delayed using sorted set ZADD
        const runAt = Date.now() + delayMs;
        job.runAt = runAt;
        const delayedKey = `${prefix}queue:delayed`;
        await client.zAdd(delayedKey, { score: runAt, value: JSON.stringify(job) });
      } else {
        // Poison job or exhausted attempts -> Move to DLQ
        await this.moveToDLQ(job, err);
      }
    }
  }

  classifyError(err, job) {
    if (err.name === 'TimeoutError') return true;
    
    const msg = (err.message || '').toLowerCase();
    const errName = err.name || '';
    
    // Schema mismatch, validation, type issues are permanent (poison)
    if (errName === 'ValidationError' || errName === 'TypeError' || msg.includes('validation') || msg.includes('schema') || msg.includes('not found') || msg.includes('invalid')) {
      return false;
    }

    // Network deadlocks, DB lockouts, Redis connection timeouts are transient
    if (msg.includes('timeout') || msg.includes('deadlock') || msg.includes('network') || msg.includes('connection') || msg.includes('pool') || msg.includes('redis')) {
      return true;
    }

    // Default to false (non-transient) for safety
    return false;
  }

  async moveToDLQ(job, err) {
    const failedKey = `${this.prefix}queue:failed`;
    const failedJob = {
      ...job,
      failedAt: new Date().toISOString(),
      error: {
        name: err.name || 'Error',
        message: err.message || 'Unknown error',
        stack: err.stack
      }
    };

    logger.error('WORKER_JOB_FAILED_PERMANENTLY', `Job ${job.id} of type ${job.type} failed permanently. Moved to DLQ.`, err, { jobId: job.id });

    // LPUSH + LTRIM to strictly cap DLQ to the last 1,000 items (bounds memory footprint)
    await client.lPush(failedKey, JSON.stringify(failedJob));
    await client.lTrim(failedKey, 0, 999);
  }

  async shutdown() {
    logger.info('Worker shutdown initiated. Stopping loop...');
    this.isShuttingDown = true;

    // Clear active heartbeats
    for (const [jobId, intervalId] of this.activeHeartbeats.entries()) {
      clearInterval(intervalId);
    }
    this.activeHeartbeats.clear();

    // 5-second graceful drain timeout for active jobs
    const drainTimeout = 5000;
    const start = Date.now();
    while (this.activeJobs > 0 && Date.now() - start < drainTimeout) {
      logger.info(`Worker draining active jobs. ${this.activeJobs} jobs in-flight...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (this.activeJobs > 0) {
      logger.warn('WORKER_DRAIN_TIMEOUT', `Graceful worker drain timed out! ${this.activeJobs} jobs still in-flight.`);
    } else {
      logger.info('All worker jobs successfully drained.');
    }

    // Close dedicated blocking client
    if (this.blockingClient) {
      logger.info('Closing dedicated worker Redis client...');
      await this.blockingClient.quit();
      logger.info('Dedicated worker Redis client closed.');
    }
  }
}

/**
 * Scheduler responsible for delayed-job promotion and crashed worker stalled-job recovery.
 */
export class Scheduler {
  constructor() {
    this.isShuttingDown = false;
    this.prefix = config.redis.prefix || 'nearby-locator:';
    this.delayedKey = `${this.prefix}queue:delayed`;
    this.processingQueue = `${this.prefix}queue:processing`;
    
    this.delayedTimer = null;
    this.recoveryTimer = null;
  }

  start() {
    logger.info('Scheduler starting periodic cron triggers...');

    // 1. Process delayed ready jobs every 5 seconds
    this.delayedTimer = setInterval(() => {
      this.promoteDelayedJobs().catch(err => {
        logger.error('SCHEDULER_DELAY_PROMOTION_ERROR', 'Error promoting delayed jobs:', err);
      });
    }, 5000);

    // 2. Perform stalled-job crash recovery sweep every 30 seconds
    this.recoveryTimer = setInterval(() => {
      this.recoverStalledJobs().catch(err => {
        logger.error('SCHEDULER_STALLED_RECOVERY_ERROR', 'Error sweeping stalled jobs:', err);
      });
    }, 30000);
  }

  async promoteDelayedJobs() {
    if (this.isShuttingDown) return;

    const now = Date.now();
    // Fetch delayed jobs that are ready to run
    const readyJobs = await client.zRangeByScore(this.delayedKey, '-inf', now, {
      LIMIT: { offset: 0, count: 100 }
    });

    if (readyJobs.length === 0) return;

    logger.info(`Promoting ${readyJobs.length} ready delayed jobs to active queues...`);

    // Move to active queue atomically
    for (const jobStr of readyJobs) {
      let job;
      try {
        job = JSON.parse(jobStr);
      } catch {
        // Remove corrupted payload
        await client.zRem(this.delayedKey, jobStr);
        continue;
      }

      const isLowPriority = job.type.startsWith('PRUNE_') || job.type.startsWith('CLEANUP_');
      const targetQueue = isLowPriority ? `${this.prefix}queue:low` : `${this.prefix}queue:high`;

      // Redis transaction to ensure atomic move
      const multi = client.multi();
      multi.zRem(this.delayedKey, jobStr);
      multi.lPush(targetQueue, jobStr);
      await multi.exec();
    }
  }

  async recoverStalledJobs() {
    if (this.isShuttingDown) return;

    const staleLeaseThreshold = Date.now() - 5 * 60 * 1000; // 5 minutes stale lease limit
    
    // Fetch stalled jobs from processing set
    const stalledJobs = await client.zRangeByScore(this.processingQueue, '-inf', staleLeaseThreshold, {
      LIMIT: { offset: 0, count: 50 } // Strict limit of 50 stalled jobs per recovery sweep (prevents floods)
    });

    if (stalledJobs.length === 0) return;

    logger.warn('SCHEDULER_STALLED_DETECTION', `Detected ${stalledJobs.length} stalled/orphaned jobs. Attempting batched crash recovery...`);

    for (const jobStr of stalledJobs) {
      let job;
      try {
        job = JSON.parse(jobStr);
      } catch {
        // Remove corrupted payload
        await client.zRem(this.processingQueue, jobStr);
        continue;
      }

      logger.warn('SCHEDULER_RECOVER_JOB', `Recovering stalled job ${job.id} of type ${job.type} (was leased by crashed worker). Re-queuing...`);

      const isLowPriority = job.type.startsWith('PRUNE_') || job.type.startsWith('CLEANUP_');
      const targetQueue = isLowPriority ? `${this.prefix}queue:low` : `${this.prefix}queue:high`;

      // Increment attempt counter
      job.attempts = (job.attempts || 0) + 1;

      // Redis transaction to shift stalled lease to retry/active queues atomically
      const multi = client.multi();
      multi.zRem(this.processingQueue, jobStr);

      if (job.attempts >= job.maxAttempts) {
        // Reached maximum attempts -> Evict to DLQ
        const failedKey = `${this.prefix}queue:failed`;
        const failedJob = {
          ...job,
          failedAt: new Date().toISOString(),
          error: {
            name: 'StalledJobError',
            message: `Job stalled and crashed worker repeatedly. Max attempts reached: ${job.attempts}/${job.maxAttempts}`
          }
        };
        multi.lPush(failedKey, JSON.stringify(failedJob));
        multi.lTrim(failedKey, 0, 999);
      } else {
        // Re-enqueue
        multi.lPush(targetQueue, JSON.stringify(job));
      }

      await multi.exec();
    }
  }

  shutdown() {
    logger.info('Scheduler shutdown initiated. Clearing interval timers...');
    this.isShuttingDown = true;
    if (this.delayedTimer) clearInterval(this.delayedTimer);
    if (this.recoveryTimer) clearInterval(this.recoveryTimer);
  }
}
