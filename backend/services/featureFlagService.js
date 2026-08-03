import featureFlagRepository from '../repositories/featureFlagRepository.js';
import { logAudit } from '../utils/auditLogger.js';
import { NotFoundError } from '../utils/errors.js';

class FeatureFlagService {
  async getFeatureFlags() {
    const flags = await featureFlagRepository.getAll();
    return flags.map(flag => ({
      key: flag.key,
      isEnabled: flag.is_enabled,
      rolloutPercentage: flag.rollout_percentage,
      environmentOverrides: typeof flag.environment_overrides === 'string' ? JSON.parse(flag.environment_overrides) : flag.environment_overrides,
      updatedBy: flag.updated_by,
      updatedAt: flag.updated_at
    }));
  }

  async getFlagByKey(key) {
    const flag = await featureFlagRepository.getByKey(key);
    if (!flag) {
      throw new NotFoundError(`Feature flag '${key}' not found.`);
    }
    return {
      key: flag.key,
      isEnabled: flag.is_enabled,
      rolloutPercentage: flag.rollout_percentage,
      environmentOverrides: typeof flag.environment_overrides === 'string' ? JSON.parse(flag.environment_overrides) : flag.environment_overrides,
      updatedBy: flag.updated_by,
      updatedAt: flag.updated_at
    };
  }

  async updateFeatureFlag(key, data, updatedBy, req = null) {
    const updated = await featureFlagRepository.upsertFlag(key, data, updatedBy);

    if (logAudit) {
      await logAudit({
        req,
        actorId: updatedBy,
        action: 'FEATURE_FLAG_TOGGLED',
        severity: 'HIGH',
        metadata: { key, isEnabled: data.isEnabled, rolloutPercentage: data.rolloutPercentage }
      });
    }

    return updated;
  }
}

export default new FeatureFlagService();
