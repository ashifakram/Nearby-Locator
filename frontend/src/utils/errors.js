import { logger } from './logger';

export function normalizeError(error) {
  logger.debug('Normalizing error:', error);

  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Handle Axios response errors
  if (error.response) {
    const data = error.response.data;
    if (data) {
      if (data.message) {
        return data.message;
      }
      if (data.error) {
        if (typeof data.error === 'object' && data.error.message) {
          return data.error.message;
        }
        return data.error;
      }
    }
    if (error.response.status === 401) {
      return 'Session expired. Please log in again.';
    }
    if (error.response.status === 403) {
      return 'You are not authorized to perform this action.';
    }
    if (error.response.status === 404) {
      return 'Requested resource not found.';
    }
    return `Server error (${error.response.status}). Please try again later.`;
  }

  // Handle request network failures
  if (error.request) {
    return 'Network connection failure. Please check your internet connection.';
  }

  return error.message || 'An unexpected error occurred. Please try again.';
}
