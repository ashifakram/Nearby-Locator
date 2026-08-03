import { sendSuccess } from '../middleware/responseFormatter.js';
import featureFlagService from '../services/featureFlagService.js';

export const getFeatureFlags = async (req, res, next) => {
  try {
    const data = await featureFlagService.getFeatureFlags();
    return sendSuccess(res, data, 'Feature flags retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const updateFeatureFlag = async (req, res, next) => {
  try {
    const { flagKey } = req.params;
    const adminUserId = req.user.id;
    const data = await featureFlagService.updateFeatureFlag(flagKey, req.body, adminUserId, req);
    return sendSuccess(res, data, 'Feature flag updated successfully');
  } catch (error) {
    next(error);
  }
};
