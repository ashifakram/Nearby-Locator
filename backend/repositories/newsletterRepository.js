import db from '../db.js';

const TABLE = 'newsletter_subscribers';

export const newsletterRepository = {
  /**
   * Find subscriber by email (case-insensitive)
   */
  async findByEmail(email) {
    return db(TABLE).whereRaw('LOWER(email) = ?', [email.toLowerCase()]).first();
  },

  /**
   * Find subscriber by unsubscribe token
   */
  async findByToken(token) {
    return db(TABLE).where({ unsubscribe_token: token }).first();
  },

  /**
   * Create a new subscriber
   */
  async create({ email, source, ip_address, user_agent, unsubscribe_token }) {
    const [id] = await db(TABLE)
      .insert({
        email: email.toLowerCase().trim(),
        source: source || 'landing_page',
        ip_address: ip_address || null,
        user_agent: user_agent ? user_agent.substring(0, 500) : null,
        unsubscribe_token,
        status: 'active',
        confirmation_sent: false,
      })
      .returning('id');
    return db(TABLE).where({ id: id.id ?? id }).first();
  },

  /**
   * Mark confirmation email as sent
   */
  async markConfirmationSent(id) {
    return db(TABLE)
      .where({ id })
      .update({ confirmation_sent: true, confirmed_at: new Date() });
  },

  /**
   * Unsubscribe by token
   */
  async unsubscribeByToken(token) {
    return db(TABLE)
      .where({ unsubscribe_token: token })
      .update({ status: 'unsubscribed', unsubscribed_at: new Date() });
  },

  /**
   * Admin: list all subscribers with pagination + filters
   */
  async list({ page = 1, limit = 20, status, search, sortBy = 'created_at', sortDir = 'desc' }) {
    const offset = (page - 1) * limit;
    let query = db(TABLE);
    let countQuery = db(TABLE);

    if (status) {
      query = query.where({ status });
      countQuery = countQuery.where({ status });
    }
    if (search) {
      query = query.whereRaw('LOWER(email) LIKE ?', [`%${search.toLowerCase()}%`]);
      countQuery = countQuery.whereRaw('LOWER(email) LIKE ?', [`%${search.toLowerCase()}%`]);
    }

    const validColumns = ['email', 'status', 'source', 'created_at'];
    const col = validColumns.includes(sortBy) ? sortBy : 'created_at';
    const dir = sortDir === 'asc' ? 'asc' : 'desc';

    const [{ count }] = await countQuery.count('id as count');
    const rows = await query
      .select('id', 'email', 'status', 'source', 'confirmation_sent', 'created_at', 'unsubscribed_at')
      .orderBy(col, dir)
      .limit(limit)
      .offset(offset);

    return {
      data: rows,
      pagination: {
        total: parseInt(count, 10),
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    };
  },

  /**
   * Admin: summary stats
   */
  async getStats() {
    const [total, active, unsubscribed] = await Promise.all([
      db(TABLE).count('id as count').first(),
      db(TABLE).where({ status: 'active' }).count('id as count').first(),
      db(TABLE).where({ status: 'unsubscribed' }).count('id as count').first(),
    ]);

    const thisMonth = await db(TABLE)
      .where('created_at', '>=', db.raw("date_trunc('month', now())"))
      .count('id as count')
      .first();

    return {
      total: parseInt(total.count, 10),
      active: parseInt(active.count, 10),
      unsubscribed: parseInt(unsubscribed.count, 10),
      this_month: parseInt(thisMonth.count, 10),
    };
  },

  /**
   * Admin: export all active subscribers
   */
  async exportActive() {
    return db(TABLE)
      .where({ status: 'active' })
      .select('email', 'source', 'created_at')
      .orderBy('created_at', 'desc');
  },

  /**
   * Admin: delete a subscriber hard
   */
  async deleteById(id) {
    return db(TABLE).where({ id }).delete();
  },
};
