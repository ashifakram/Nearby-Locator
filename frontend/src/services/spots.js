import { api } from './api';
import { logger } from '../utils/logger';

export const spotsService = {
  search: async ({ lat, lng, radius, q, category }) => {
    logger.info('Executing spot FTS composite search API call...');
    const { data } = await api.get('/discovery/search', {
      params: {
        lat,
        lng,
        radius, // in meters
        q: q || undefined,
        category: category || undefined,
      },
    });
    return data;
  },

  autocomplete: async ({ q, category }) => {
    if (!q || q.trim().length < 2) return [];
    logger.info('Executing autocomplete API call...');
    const { data } = await api.get('/discovery/autocomplete', {
      params: {
        q,
        category: category || undefined,
      },
    });
    return data;
  },

  logClick: async (spotId, searchId) => {
    logger.info('Logging spot CTR engagement telemetry...');
    try {
      const { data } = await api.post('/discovery/click', { spotId, searchId });
      return data;
    } catch (err) {
      logger.warn('Failed logging spot click telemetry:', err.message);
    }
  },

  saveLocation: async (spotId, listName = 'Favorites') => {
    logger.info('Saving spot to private member list...');
    const { data } = await api.post('/discovery/save', { spotId, listName });
    return data;
  }
};
