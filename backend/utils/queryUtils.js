/**
 * Common utilities for building standardized repository queries.
 * Enforces the unified sorting, filtering, and pagination contract across all admin endpoints.
 */

export class InvalidSortFieldError extends Error {
  constructor(message, allowedFields = []) {
    super(message);
    this.name = 'InvalidSortFieldError';
    this.statusCode = 400;
    this.allowedFields = allowedFields;
  }
}

/**
 * Builds a standardized sorting clause for Knex.
 * Contract: ?sort=field&order=asc|desc
 * Rejects invalid sort fields with a 400 validation error.
 * @param {Object} queryParams - The request query parameters.
 * @param {string} defaultField - The default field to sort by.
 * @param {string} defaultOrder - The default sort direction ('asc' or 'desc').
 * @param {Array<string>} allowedFields - Strict whitelist of allowed fields to prevent SQL injection.
 * @returns {Object} { column, order }
 * @throws {InvalidSortFieldError} If sort field or order is invalid.
 */
export function buildSortClause(queryParams, defaultField = 'created_at', defaultOrder = 'desc', allowedFields = []) {
  const column = queryParams.sort || defaultField;
  const orderRaw = (queryParams.order || defaultOrder).toLowerCase();

  if (orderRaw !== 'asc' && orderRaw !== 'desc') {
    throw new InvalidSortFieldError(
      `Invalid order direction '${queryParams.order}'. Allowed directions are 'asc' or 'desc'.`,
      allowedFields
    );
  }

  if (queryParams.sort && allowedFields.length > 0 && !allowedFields.includes(column)) {
    throw new InvalidSortFieldError(
      `Invalid sort field '${column}'. Allowed sort fields are: ${allowedFields.join(', ')}.`,
      allowedFields
    );
  }

  return { column, order: orderRaw };
}

/**
 * Builds standardized pagination limit/offset for Knex.
 * @param {Object} queryParams - The request query parameters.
 * @param {number} defaultLimit - The default limit (default: 50).
 * @param {number} maxLimit - The maximum allowed limit (default: 1000).
 * @returns {Object} { limit, offset, page }
 */
export function buildPaginationClause(queryParams, defaultLimit = 50, maxLimit = 1000) {
  const page = Math.max(1, parseInt(queryParams.page) || 1);
  let limit = parseInt(queryParams.limit) || defaultLimit;
  
  if (limit > maxLimit) limit = maxLimit;
  if (limit < 1) limit = defaultLimit;

  const offset = (page - 1) * limit;

  return { limit, offset, page };
}

/**
 * Applies a search term filter using SQL ILIKE across specified columns.
 * @param {import('knex').Knex.QueryBuilder} query - The Knex query builder.
 * @param {Array<string>} columns - Columns to perform ILIKE search against.
 * @param {string} searchTerm - Search term provided in request.
 */
export function applySearchFilter(query, columns = [], searchTerm = '') {
  const term = (searchTerm || '').trim();
  if (!term || columns.length === 0) return;

  query.where((builder) => {
    columns.forEach((col, index) => {
      if (index === 0) {
        builder.where(col, 'ilike', `%${term}%`);
      } else {
        builder.orWhere(col, 'ilike', `%${term}%`);
      }
    });
  });
}

/**
 * Builds a standardized date range filter for Knex.
 * @param {import('knex').Knex.QueryBuilder} query - The Knex query builder.
 * @param {string} column - The date column to filter on.
 * @param {string} startDate - Start date (ISO string).
 * @param {string} endDate - End date (ISO string).
 */
export function applyDateRange(query, column, startDate, endDate) {
  if (startDate) {
    query.where(column, '>=', new Date(startDate).toISOString());
  }
  if (endDate) {
    let end = new Date(endDate);
    if (!endDate.includes('T')) {
      end.setUTCHours(23, 59, 59, 999);
    }
    query.where(column, '<=', end.toISOString());
  }
}
