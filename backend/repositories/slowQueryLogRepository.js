import db from '../db.js';

class SlowQueryLogRepository {
  async logQuery(queryText, durationMs, sourceComponent = 'backend') {
    const [record] = await db('slow_query_logs')
      .insert({
        query_text: queryText,
        duration_ms: durationMs,
        source_component: sourceComponent,
        executed_at: new Date()
      })
      .returning('*');
    return record;
  }

  async getSlowQueries({ page = 1, limit = 20, minDurationMs = 100 }) {
    const offset = (page - 1) * limit;

    const baseQuery = db('slow_query_logs')
      .where('duration_ms', '>=', minDurationMs);

    const [totalResult, records] = await Promise.all([
      baseQuery.clone().count('* as total').first(),
      baseQuery.clone()
        .select('id', 'query_text', 'duration_ms', 'source_component', 'executed_at')
        .orderBy('executed_at', 'desc')
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

  async pruneOlderThanDays(days = 14) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    return await db('slow_query_logs')
      .where('executed_at', '<', cutoff)
      .del();
  }
}

export default new SlowQueryLogRepository();
