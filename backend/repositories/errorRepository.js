import db from '../db.js';

class ErrorRepository {
  async getSystemErrors({ status = 'OPEN', severity, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    let query = db('system_errors');

    if (status) {
      query = query.where({ status });
    }
    if (severity) {
      query = query.where({ severity });
    }

    const [totalResult, records] = await Promise.all([
      query.clone().count('* as total').first(),
      query.clone()
        .select('id', 'error_code', 'message', 'stack', 'severity', 'context', 'status', 'resolved_by', 'resolved_at', 'occurred_at')
        .orderBy('occurred_at', 'desc')
        .limit(limit)
        .offset(offset)
    ]);

    const total = parseInt(totalResult?.total || 0, 10);
    return {
      records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateErrorStatus(errorId, status, resolvedBy = null) {
    const updateData = {
      status,
      resolved_by: status === 'RESOLVED' ? resolvedBy : null,
      resolved_at: status === 'RESOLVED' ? new Date() : null
    };

    const [updated] = await db('system_errors')
      .where({ id: errorId })
      .update(updateData)
      .returning('*');
    return updated;
  }

  async getRecentErrorCount(hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const result = await db('system_errors')
      .where('occurred_at', '>=', cutoff)
      .count('* as total')
      .first();
    return parseInt(result?.total || 0, 10);
  }
}

export default new ErrorRepository();
