import db from '../db.js';

class DashboardRepository {
  async getUserCounts() {
    const [total, verified, suspended, disabled] = await Promise.all([
      db('users').count('* as count').first(),
      db('users').where({ is_email_verified: true }).count('* as count').first(),
      db('users').where({ status: 'SUSPENDED' }).count('* as count').first(),
      db('users').whereIn('status', ['DISABLED', 'SOFT_DELETED']).count('* as count').first()
    ]);

    return {
      total: parseInt(total?.count || 0, 10),
      verified: parseInt(verified?.count || 0, 10),
      suspended: parseInt(suspended?.count || 0, 10),
      disabled: parseInt(disabled?.count || 0, 10)
    };
  }

  async getPlaceCounts() {
    const [totalSpots, totalSaved, totalCollections] = await Promise.all([
      db.schema.hasTable('spots') ? db('spots').count('* as count').first() : Promise.resolve({ count: 0 }),
      db.schema.hasTable('saved_places') ? db('saved_places').count('* as count').first() : Promise.resolve({ count: 0 }),
      db.schema.hasTable('collections') ? db('collections').count('* as count').first() : Promise.resolve({ count: 0 })
    ]);

    return {
      totalSpots: parseInt(totalSpots?.count || 0, 10),
      totalSaved: parseInt(totalSaved?.count || 0, 10),
      totalCollections: parseInt(totalCollections?.count || 0, 10)
    };
  }
}

export default new DashboardRepository();
