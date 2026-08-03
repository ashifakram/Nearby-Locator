import { sendSuccess } from '../middleware/responseFormatter.js';
import adminOpsService from '../services/adminOpsService.js';

export const getQueueMetrics = async (req, res, next) => {
  try {
    const data = await adminOpsService.getQueueMetrics();
    return sendSuccess(res, data, 'Queue metrics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getQueueJobs = async (req, res, next) => {
  try {
    const data = await adminOpsService.getJobs(req.query);
    return sendSuccess(res, data, 'Queue jobs retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const retryDlqJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const adminUserId = req.user.id;
    const data = await adminOpsService.retryDlqJob(jobId, adminUserId, req);
    return sendSuccess(res, data, 'Job retry initiated successfully');
  } catch (error) {
    next(error);
  }
};

export const purgeQueueJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const adminUserId = req.user.id;
    const data = await adminOpsService.purgeJob(jobId, adminUserId, req);
    return sendSuccess(res, data, 'Job purged successfully');
  } catch (error) {
    next(error);
  }
};

export const flushCacheByPrefix = async (req, res, next) => {
  try {
    const { prefix } = req.body;
    const adminUserId = req.user.id;
    const data = await adminOpsService.flushCacheByPrefix(prefix, adminUserId, req);
    return sendSuccess(res, data, 'Cache prefix evicted successfully');
  } catch (error) {
    next(error);
  }
};
