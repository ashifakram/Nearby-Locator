import db from '../db.js';

class SystemSettingRepository {
  async getAll() {
    return await db('system_settings')
      .select('key', 'value', 'description', 'updated_by', 'updated_at')
      .orderBy('key', 'asc');
  }

  async getByKey(key) {
    return await db('system_settings')
      .where({ key })
      .first();
  }

  async upsertSetting(key, value, description, updatedBy, trx = null) {
    const query = trx ? db('system_settings').transacting(trx) : db('system_settings');
    const existing = await query.where({ key }).first();

    if (existing) {
      const updateData = {
        value: typeof value === 'string' ? value : JSON.stringify(value),
        updated_by: updatedBy,
        updated_at: new Date()
      };
      if (description !== undefined) {
        updateData.description = description;
      }
      const [updated] = await (trx ? db('system_settings').transacting(trx) : db('system_settings'))
        .where({ key })
        .update(updateData)
        .returning('*');
      return updated;
    } else {
      const [inserted] = await query
        .insert({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          description: description || null,
          updated_by: updatedBy,
          updated_at: new Date()
        })
        .returning('*');
      return inserted;
    }
  }
}

export default new SystemSettingRepository();
