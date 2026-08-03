import db from '../db.js';
import { sendSuccess, sendError } from '../middleware/responseFormatter.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * GET /api/admin/settings
 * Retrieves all system settings grouped by categories.
 */
export const getSettings = async (req, res, next) => {
  try {
    const settings = await db('system_settings').select('*').orderBy('category', 'asc');
    
    // Group settings by category
    const grouped = settings.reduce((acc, curr) => {
      if (!acc[curr.category]) {
        acc[curr.category] = [];
      }
      acc[curr.category].push({
        key: curr.key,
        value: curr.value,
        description: curr.description,
        updated_at: curr.updated_at
      });
      return acc;
    }, {});

    return sendSuccess(res, grouped, 'System settings retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/settings
 * Updates system settings (key-value payload).
 * High-risk operation gated by sudo step-up.
 */
export const updateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!settings || !Array.isArray(settings)) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'Payload must contain a settings array', 400);
    }

    await db.transaction(async (trx) => {
      for (const item of settings) {
        if (!item.key || item.value === undefined) continue;
        await trx('system_settings')
          .where({ key: item.key })
          .update({
            value: String(item.value),
            updated_at: db.fn.now()
          });
      }
    });

    // Log the configuration changes
    await logAudit({
      req,
      actorId: req.user.id,
      action: 'SYSTEM_SETTINGS_UPDATE',
      severity: 'CRITICAL',
      metadata: { keys: settings.map(s => s.key) }
    });

    return sendSuccess(res, null, 'System settings updated successfully');
  } catch (err) {
    next(err);
  }
};
