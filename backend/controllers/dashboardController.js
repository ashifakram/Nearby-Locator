import { sendSuccess } from '../middleware/responseFormatter.js';
import dashboardService from '../services/dashboardService.js';

export const getDashboardWidgets = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardWidgets();
    return sendSuccess(res, data, 'Dashboard widgets retrieved successfully');
  } catch (error) {
    next(error);
  }
};
