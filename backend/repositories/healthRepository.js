import db from '../db.js';

class HealthRepository {
  async getPostgresStats() {
    const start = Date.now();
    await db.raw('SELECT 1');
    const latencyMs = Date.now() - start;

    let poolStats = { active: 1, idle: 0, total: 1 };
    try {
      if (db.client && db.client.pool) {
        poolStats = {
          active: db.client.pool.numUsed ? db.client.pool.numUsed() : 1,
          idle: db.client.pool.numFree ? db.client.pool.numFree() : 0,
          total: db.client.pool.numPendingAcquires ? db.client.pool.numPendingAcquires() : 1
        };
      }
    } catch {
      // Fallback pool stats
    }

    return {
      status: 'UP',
      latencyMs,
      pool: poolStats
    };
  }
}

export default new HealthRepository();
