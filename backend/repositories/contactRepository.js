import db from '../db.js';

const TABLE = 'contact_submissions';

/**
 * Generate a human-readable ticket ID: NL-YYYYMMDD-XXXXX
 */
async function generateTicketId() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const [{ count }] = await db(TABLE).count('id as count');
  const seq = String(parseInt(count, 10) + 1).padStart(5, '0');
  return `NL-${datePart}-${seq}`;
}

export const contactRepository = {
  async create({ name, email, category, subject, message, ip_address, user_agent }) {
    const ticket_id = await generateTicketId();
    const [row] = await db(TABLE)
      .insert({
        ticket_id,
        name,
        email: email.toLowerCase().trim(),
        category,
        subject,
        message,
        status: 'open',
        priority: category === 'billing' || category === 'technical' ? 'high' : 'normal',
        ip_address: ip_address || null,
        user_agent: user_agent ? user_agent.substring(0, 500) : null,
        confirmation_sent: false,
      })
      .returning('*');
    return row;
  },

  async markConfirmationSent(id) {
    return db(TABLE).where({ id }).update({ confirmation_sent: true });
  },

  async findById(id) {
    return db(TABLE).where({ id }).first();
  },

  async findByTicketId(ticket_id) {
    return db(TABLE).where({ ticket_id }).first();
  },

  /**
   * Admin: paginated list with search, filter by status/category
   */
  async list({ page = 1, limit = 20, status, category, search, sortBy = 'created_at', sortDir = 'desc' }) {
    const offset = (page - 1) * limit;
    let query = db(TABLE);
    let countQuery = db(TABLE);

    if (status) { query = query.where({ status }); countQuery = countQuery.where({ status }); }
    if (category) { query = query.where({ category }); countQuery = countQuery.where({ category }); }
    if (search) {
      const like = `%${search.toLowerCase()}%`;
      query = query.where((q) =>
        q.whereRaw('LOWER(name) LIKE ?', [like])
          .orWhereRaw('LOWER(email) LIKE ?', [like])
          .orWhereRaw('LOWER(subject) LIKE ?', [like])
          .orWhereRaw('LOWER(ticket_id) LIKE ?', [like])
      );
      countQuery = countQuery.where((q) =>
        q.whereRaw('LOWER(name) LIKE ?', [like])
          .orWhereRaw('LOWER(email) LIKE ?', [like])
          .orWhereRaw('LOWER(subject) LIKE ?', [like])
          .orWhereRaw('LOWER(ticket_id) LIKE ?', [like])
      );
    }

    const validCols = ['created_at', 'name', 'email', 'status', 'priority', 'category'];
    const col = validCols.includes(sortBy) ? sortBy : 'created_at';
    const dir = sortDir === 'asc' ? 'asc' : 'desc';

    const [{ count }] = await countQuery.count('id as count');
    const rows = await query
      .select('id', 'ticket_id', 'name', 'email', 'category', 'subject', 'status', 'priority', 'assigned_to', 'created_at', 'resolved_at')
      .orderBy(col, dir)
      .limit(limit)
      .offset(offset);

    return {
      data: rows,
      pagination: { total: parseInt(count, 10), page, limit, pages: Math.ceil(count / limit) },
    };
  },

  /**
   * Admin: get single submission with full message + notes
   */
  async getDetail(id) {
    return db(TABLE).where({ id }).first();
  },

  /**
   * Admin: update status, priority, assigned_to, notes
   */
  async update(id, { status, priority, assigned_to, admin_notes }) {
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;
    if (status === 'resolved' || status === 'closed') updates.resolved_at = new Date();
    updates.updated_at = new Date();
    await db(TABLE).where({ id }).update(updates);
    return db(TABLE).where({ id }).first();
  },

  /**
   * Admin: summary stats
   */
  async getStats() {
    const [total, open, in_progress, resolved, thisMonth] = await Promise.all([
      db(TABLE).count('id as count').first(),
      db(TABLE).where({ status: 'open' }).count('id as count').first(),
      db(TABLE).where({ status: 'in_progress' }).count('id as count').first(),
      db(TABLE).where({ status: 'resolved' }).count('id as count').first(),
      db(TABLE).where('created_at', '>=', db.raw("date_trunc('month', now())")).count('id as count').first(),
    ]);

    const byCategory = await db(TABLE)
      .select('category')
      .count('id as count')
      .groupBy('category')
      .orderBy('count', 'desc');

    return {
      total: parseInt(total.count, 10),
      open: parseInt(open.count, 10),
      in_progress: parseInt(in_progress.count, 10),
      resolved: parseInt(resolved.count, 10),
      this_month: parseInt(thisMonth.count, 10),
      by_category: byCategory.map((r) => ({ category: r.category, count: parseInt(r.count, 10) })),
    };
  },

  /**
   * Admin: delete permanently
   */
  async deleteById(id) {
    return db(TABLE).where({ id }).delete();
  },
};
