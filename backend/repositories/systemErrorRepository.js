import db from '../db.js';

export class SystemErrorRepository {
  /**
   * Retrieves paginated system errors for the Admin Operations Center.
   */
  static async getErrors({ search, severity, statusCode, limit = 50, offset = 0 }) {
    const query = db('system_errors')
      .select('*', 'error_message as message');

    if (severity) query.where({ severity });
    if (statusCode) query.where({ status_code: statusCode });
    
    if (search) {
      query.where(builder => {
        builder.whereRaw('correlation_id = ?', [search])
               .orWhereRaw('request_id = ?', [search])
               .orWhereRaw('url ILIKE ?', [`%${search}%`]);
      });
    }

    const countQuery = query.clone().clearSelect().count('* as total').first();

    const [countResult, errors] = await Promise.all([
      countQuery,
      query.clone().orderBy('occurred_at', 'desc').limit(limit).offset(offset)
    ]);

    return {
      total: Number(countResult?.total || 0),
      errors
    };
  }
}
