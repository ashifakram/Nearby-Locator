import { v4 as uuidv4 } from 'uuid';

/**
 * Correlation ID Middleware:
 * Binds a unique correlation ID to every incoming request and attaches it to response headers.
 */
export const correlationIdMiddleware = (req, res, next) => {
  const correlationId = req.headers['x-request-id'] || req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Request-ID', correlationId);
  next();
};
