import { sendSuccess } from '../middleware/responseFormatter.js';
import systemSettingService from '../services/systemSettingService.js';

export const getSettings = async (req, res, next) => {
  try {
    const data = await systemSettingService.getSettings();
    return sendSuccess(res, data, 'System settings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    const adminUserId = req.user.id;
    const data = await systemSettingService.updateSetting(key, value, description, adminUserId, req);
    return sendSuccess(res, data, 'System setting updated successfully');
  } catch (error) {
    next(error);
  }
};
