/**
 * Response Formatter Middleware
 * Ensures every API response follows the strict JSON interface:
 * {
 *   success: true|false,
 *   status: number,
 *   message: string,
 *   data: any,
 *   error: null|{ code: string, details: any }
 * }
 */

export const sendSuccess = (res, data = null, message = 'OK', status = 200) => {
  return res.status(status).json({
    success: true,
    status,
    message,
    data,
    error: null,
  });
};

export const sendError = (res, error = {}, message = 'Error', status = 400) => {
  const { code = 'UNKNOWN', details = null } = error;
  return res.status(status).json({
    success: false,
    status,
    message,
    data: null,
    error: { code, details },
  });
};

// Middleware that attaches helpers to response object for convenience
export const responseFormatter = (req, res, next) => {
  res.success = (data, message = 'OK', status = 200) => sendSuccess(res, data, message, status);
  res.error = (error, message = 'Error', status = 400) => sendError(res, error, message, status);
  next();
};
