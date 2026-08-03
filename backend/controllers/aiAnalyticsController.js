import { sendSuccess } from '../middleware/responseFormatter.js';
import aiAnalyticsService from '../services/aiAnalyticsService.js';

export const getProviderHealth = async (req, res, next) => {
  try {
    const data = await aiAnalyticsService.getProviderHealth();
    return sendSuccess(res, data, 'AI provider health retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getPromptHistory = async (req, res, next) => {
  try {
    const data = await aiAnalyticsService.getPromptHistory(req.query);
    return sendSuccess(res, data, 'AI prompt history retrieved successfully');
  } catch (error) {
    next(error);
  }
};
