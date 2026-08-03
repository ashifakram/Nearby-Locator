import db from '../db.js';

class GlobalSearchService {
  async search(query, type = 'all', limit = 10) {
    const q = `%${query.trim()}%`;
    const results = {
      users: [],
      places: [],
      auditLogs: []
    };

    if (type === 'all' || type === 'users') {
      results.users = await db('users')
        .select('id', 'email', 'status', 'created_at')
        .where('email', 'ILIKE', q)
        .limit(limit);
    }

    if ((type === 'all' || type === 'places') && await db.schema.hasTable('spots')) {
      results.places = await db('spots')
        .select('id', 'title', 'category', 'created_at')
        .where('title', 'ILIKE', q)
        .limit(limit);
    }

    if (type === 'all' || type === 'auditLogs') {
      results.auditLogs = await db('audit_logs')
        .select('id', 'action', 'resource', 'performed_at')
        .where('action', 'ILIKE', q)
        .orWhere('resource', 'ILIKE', q)
        .limit(limit);
    }

    return results;
  }
}

export default new GlobalSearchService();
