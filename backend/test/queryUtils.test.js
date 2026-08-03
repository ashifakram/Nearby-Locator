import { describe, it } from 'node.js:test';
import assert from 'node:assert';
import {
  buildSortClause,
  buildPaginationClause,
  applySearchFilter,
  applyDateRange,
  InvalidSortFieldError
} from '../utils/queryUtils.js';

describe('Query Utilities Unit Test Suite', () => {
  describe('buildSortClause', () => {
    const allowed = ['created_at', 'name', 'status', 'email'];

    it('returns default column and order when query params are empty', () => {
      const result = buildSortClause({}, 'created_at', 'desc', allowed);
      assert.strictEqual(result.column, 'created_at');
      assert.strictEqual(result.order, 'desc');
    });

    it('accepts valid sort field and order', () => {
      const result = buildSortClause({ sort: 'name', order: 'asc' }, 'created_at', 'desc', allowed);
      assert.strictEqual(result.column, 'name');
      assert.strictEqual(result.order, 'asc');
    });

    it('rejects invalid sort column with InvalidSortFieldError (400)', () => {
      assert.throws(
        () => buildSortClause({ sort: 'malicious_col' }, 'created_at', 'desc', allowed),
        (err) => {
          assert.strictEqual(err.name, 'InvalidSortFieldError');
          assert.strictEqual(err.statusCode, 400);
          assert.ok(err.message.includes('malicious_col'));
          return true;
        }
      );
    });

    it('rejects invalid order direction with InvalidSortFieldError (400)', () => {
      assert.throws(
        () => buildSortClause({ sort: 'name', order: 'INVALID_DIR' }, 'created_at', 'desc', allowed),
        (err) => {
          assert.strictEqual(err.name, 'InvalidSortFieldError');
          assert.strictEqual(err.statusCode, 400);
          assert.ok(err.message.includes('INVALID_DIR'));
          return true;
        }
      );
    });
  });

  describe('buildPaginationClause', () => {
    it('calculates page 1 limit and offset correctly', () => {
      const result = buildPaginationClause({ page: 1, limit: 20 });
      assert.strictEqual(result.page, 1);
      assert.strictEqual(result.limit, 20);
      assert.strictEqual(result.offset, 0);
    });

    it('calculates page 3 offset correctly', () => {
      const result = buildPaginationClause({ page: 3, limit: 25 });
      assert.strictEqual(result.page, 3);
      assert.strictEqual(result.limit, 25);
      assert.strictEqual(result.offset, 50);
    });

    it('enforces max limit ceiling', () => {
      const result = buildPaginationClause({ limit: 5000 }, 50, 1000);
      assert.strictEqual(result.limit, 1000);
    });
  });
});
