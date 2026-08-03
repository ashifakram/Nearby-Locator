import systemSettingRepository from '../repositories/systemSettingRepository.js';
import { logAudit } from '../utils/auditLogger.js';
import { NotFoundError } from '../utils/errors.js';

class SystemSettingService {
  async getSettings() {
    const records = await systemSettingRepository.getAll();
    const settingsMap = {};
    for (const record of records) {
      try {
        settingsMap[record.key] = typeof record.value === 'string' ? JSON.parse(record.value) : record.value;
      } catch {
        settingsMap[record.key] = record.value;
      }
    }
    return settingsMap;
  }

  async getSettingByKey(key) {
    const record = await systemSettingRepository.getByKey(key);
    if (!record) {
      throw new NotFoundError(`System setting '${key}' not found.`);
    }
    try {
      return typeof record.value === 'string' ? JSON.parse(record.value) : record.value;
    } catch {
      return record.value;
    }
  }

  async updateSetting(key, value, description, updatedBy, req = null) {
    const updated = await systemSettingRepository.upsertSetting(key, value, description, updatedBy);

    if (logAudit) {
      await logAudit({
        req,
        actorId: updatedBy,
        action: 'SYSTEM_SETTING_UPDATED',
        severity: 'HIGH',
        metadata: { key, value, description }
      });
    }

    return updated;
  }
}

export default new SystemSettingService();
