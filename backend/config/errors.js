export class ConfigValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ConfigValidationError';
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
