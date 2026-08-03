import { sendSuccess } from '../middleware/responseFormatter.js';
import globalSearchService from '../services/globalSearchService.js';
import { ValidationError } from '../utils/errors.js';

export const globalSearch = async (req, res, next) => {
  try {
    const { q, type } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      throw new ValidationError('Search query parameter "q" must be at least 2 characters.');
    }
    const data = await globalSearchService.search(q, type || 'all');
    return sendSuccess(res, data, 'Global search results retrieved successfully');
  } catch (error) {
    next(error);
  }
};
