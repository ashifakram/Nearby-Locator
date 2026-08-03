import { sendSuccess } from '../middleware/responseFormatter.js';
import searchAnalyticsService from '../services/searchAnalyticsService.js';

export const getZeroResultQueries = async (req, res, next) => {
  try {
    const data = await searchAnalyticsService.getZeroResultQueries(req.query);
    return sendSuccess(res, data, 'Zero result queries retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getSearchQualityAnalytics = async (req, res, next) => {
  try {
    const data = await searchAnalyticsService.getSearchQualityAnalytics();
    return sendSuccess(res, data, 'Search quality analytics retrieved successfully');
  } catch (error) {
    next(error);
  }
};
