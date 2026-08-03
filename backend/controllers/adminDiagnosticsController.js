import { sendSuccess } from '../middleware/responseFormatter.js';
import databaseDiagnosticsService from '../services/databaseDiagnosticsService.js';

export const getInfrastructureHealth = async (req, res, next) => {
  try {
    const data = await databaseDiagnosticsService.getInfrastructureHealth();
    return sendSuccess(res, data, 'Infrastructure health metrics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getSlowQueries = async (req, res, next) => {
  try {
    const data = await databaseDiagnosticsService.getSlowQueries(req.query);
    return sendSuccess(res, data, 'Slow query logs retrieved successfully');
  } catch (error) {
    next(error);
  }
};
