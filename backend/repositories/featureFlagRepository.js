import db from '../db.js';

class FeatureFlagRepository {
  async getAll() {
    return await db('feature_flags')
      .select('key', 'is_enabled', 'rollout_percentage', 'environment_overrides', 'updated_by', 'created_at', 'updated_at')
      .orderBy('key', 'asc');
  }

  async getByKey(key) {
    return await db('feature_flags')
      .where({ key })
      .first();
  }

  async upsertFlag(key, data, updatedBy, trx = null) {
    const query = trx ? db('feature_flags').transacting(trx) : db('feature_flags');
    const existing = await query.where({ key }).first();

    const payload = {
      is_enabled: data.isEnabled !== undefined ? Boolean(data.isEnabled) : (existing ? existing.is_enabled : false),
      rollout_percentage: data.rolloutPercentage !== undefined ? Number(data.rolloutPercentage) : (existing ? existing.rollout_percentage : 100),
      environment_overrides: data.environmentOverrides ? JSON.stringify(data.environmentOverrides) : (existing ? existing.environment_overrides : null),
      updated_by: updatedBy,
      updated_at: new Date()
    };

    if (existing) {
      const [updated] = await (trx ? db('feature_flags').transacting(trx) : db('feature_flags'))
        .where({ key })
        .update(payload)
        .returning('*');
      return updated;
    } else {
      const [inserted] = await query
        .insert({
          key,
          created_at: new Date(),
          ...payload
        })
        .returning('*');
      return inserted;
    }
  }
}

export default new FeatureFlagRepository();
