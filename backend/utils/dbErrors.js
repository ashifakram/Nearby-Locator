export class DatabaseError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
    this.code = 'DATABASE_ERROR';
    this.statusCode = 500;
  }
}

export class DuplicateKeyError extends DatabaseError {
  constructor(message, originalError = null) {
    super(message, originalError);
    this.name = 'DuplicateKeyError';
    this.code = 'DUPLICATE_KEY';
    this.statusCode = 409;
  }
}

// Architectural abstraction required by AuthenticationService
export const UniqueConstraintViolation = DuplicateKeyError;

export class ForeignKeyError extends DatabaseError {
  constructor(message, originalError = null) {
    super(message, originalError);
    this.name = 'ForeignKeyError';
    this.code = 'FOREIGN_KEY_VIOLATION';
    this.statusCode = 400;
  }
}

export class DatabaseTimeoutError extends DatabaseError {
  constructor(message, originalError = null) {
    super(message, originalError);
    this.name = 'DatabaseTimeoutError';
    this.code = 'DATABASE_TIMEOUT';
    this.statusCode = 503;
  }
}

export function handleDbError(err) {
  if (err.name === 'DatabaseError' || err.statusCode) {
    return err; // Already normalized
  }

  const pgCode = err.code;
  
  if (pgCode === '23505') {
    return new DuplicateKeyError('Duplicate key violation: record already registered', err);
  }
  if (pgCode === '23503') {
    return new ForeignKeyError('Foreign key violation: referenced record does not exist', err);
  }
  if (pgCode === '57014' || err.message.includes('timeout') || err.message.includes('Timeout')) {
    return new DatabaseTimeoutError('Database query timed out or failed to acquire connection', err);
  }

  return new DatabaseError('A database query execution failure occurred', err);
}
