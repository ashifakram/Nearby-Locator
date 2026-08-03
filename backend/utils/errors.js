// Base Custom Operational Error Class
export class AppError extends Error {
  constructor(category, message, status = 500, details = {}) {
    super(message);
    this.category = category; // Standard operational telemetry category
    this.status = status;     // Standard HTTP status code response
    this.details = details;   // Extra debugging metadata context
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 401 Authentication & Credentials Errors
export class AuthError extends AppError {
  constructor(message = 'Authentication failed', details = {}) {
    super('AUTH_ERROR', message, 401, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', details = {}) {
    super('UNAUTHORIZED', message, 401, details);
  }
}

// 400 Client Request Schema & Input Parameter Errors
export class ValidationError extends AppError {
  constructor(message = 'Validation mismatch', details = {}) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

// 404 Resource Not Found
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = {}) {
    super('NOT_FOUND', message, 404, details);
  }
}

// 409 Conflict Error
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details = {}) {
    super('CONFLICT', message, 409, details);
  }
}

// 500 PostgreSQL or Database Persistence Failures
export class DbError extends AppError {
  constructor(message = 'Database operation failed', details = {}) {
    super('DB_ERROR', message, 500, details);
  }
}

// 429 Sliding-window IP Throttles & Lockout Blocker Errors
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', details = {}) {
    super('RATE_LIMIT_ERROR', message, 429, details);
  }
}

// 403 Session Replay Attacks & CSRF Header Blockers
export class SecurityError extends AppError {
  constructor(message = 'Security violation detected', details = {}) {
    super('SECURITY_EVENT', message, 403, details);
  }
}
