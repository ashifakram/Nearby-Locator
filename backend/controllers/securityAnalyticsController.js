import { sendSuccess } from '../middleware/responseFormatter.js';
import securityAnalyticsService from '../services/securityAnalyticsService.js';

export const getThreatTelemetry = async (req, res, next) => {
  try {
    const data = await securityAnalyticsService.getThreatTelemetry();
    return sendSuccess(res, data, 'Threat telemetry retrieved successfully');
  } catch (error) {
    next(error);
  }
};
