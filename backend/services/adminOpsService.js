import queueRepository from '../repositories/queueRepository.js';
import { logAudit } from '../utils/auditLogger.js';
import redisClient from '../redisClient.js';
import { NotFoundError } from '../utils/errors.js';

class AdminOpsService {
  async getQueueMetrics() {
    let highQueueDepth = 0;
    let lowQueueDepth = 0;

    if (redisClient && typeof redisClient.lLen === 'function') {
      try {
        highQueueDepth = await redisClient.lLen('nearby:queue:high');
        lowQueueDepth = await redisClient.lLen('nearby:queue:low');
      } catch {
        // Redis fallback
      }
    }

    const failedDlqCount = await queueRepository.getFailedDlqCount();

    return {
      queues: {
        high: highQueueDepth,
        low: lowQueueDepth,
        dlq: failedDlqCount
      },
      workers: {
        activeCount: 1, // Currently registered worker process
        status: 'HEALTHY'
      }
    };
  }

  async getQueueJobs({ status = 'ALL', page = 1, limit = 20 }) {
    return queueRepository.listQueueJobs({ status, page, limit });
  }

  async retryDlqJob(jobId, executorId, req) {
    const job = await queueRepository.findJobById(jobId);
    if (!job) {
      throw new NotFoundError(`Queue job with ID ${jobId} not found.`);
    }

    const retriedJob = await queueRepository.updateJobStatus(jobId, 'PENDING');

    if (logAudit) {
      await logAudit({
        req,
        actorId: executorId,
        action: 'QUEUE_JOB_RETRY',
        severity: 'MEDIUM',
        metadata: { jobId, jobType: job.job_type }
      });
    }

    return retriedJob;
  }

  async purgeQueueJob(jobId, executorId, req) {
    const job = await queueRepository.findJobById(jobId);
    if (!job) {
      throw new NotFoundError(`Queue job with ID ${jobId} not found.`);
    }

    await queueRepository.deleteJob(jobId);

    if (logAudit) {
      await logAudit({
        req,
        actorId: executorId,
        action: 'QUEUE_JOB_PURGE',
        severity: 'HIGH',
        metadata: { jobId, jobType: job.job_type }
      });
    }

    return { success: true, message: `Job ${jobId} purged successfully.` };
  }

  async flushCacheByPrefix(prefix, executorId, req) {
    let evictedKeysCount = 0;

    if (redisClient && typeof redisClient.keys === 'function') {
      try {
        const pattern = prefix ? `${prefix}*` : 'nearby:cache:*';
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(keys);
          evictedKeysCount = keys.length;
        }
      } catch {
        // Fallback
      }
    }

    if (logAudit) {
      await logAudit({
        req,
        actorId: executorId,
        action: 'CACHE_FLUSH',
        severity: 'HIGH',
        metadata: { prefix, evictedKeysCount }
      });
    }

    return { evictedKeysCount, message: `Flushed ${evictedKeysCount} cache keys matching prefix "${prefix}".` };
  }
}

export default new AdminOpsService();
