import db from '../db.js';
import { withTransientRetry } from '../utils/dbRetry.js';
import { handleDbError } from '../utils/dbErrors.js';

/**
 * UserPreferencesRepository: Database access layer for user_preferences (preferences, privacy, notification settings).
 */
export const UserPreferencesRepository = {
  /**
   * Retrieves preferences by user ID.
   */
  async findByUserId(userId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('user_preferences').where({ user_id: userId }).first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Upserts preferences record for a user.
   */
  async upsertPreferences(userId, prefsData, executor = db) {
    try {
      return await withTransientRetry(async () => {
        const existing = await executor('user_preferences').where({ user_id: userId }).first();

        const payload = {
          ...prefsData,
          updated_at: executor.fn.now()
        };

        if (existing) {
          const [updated] = await executor('user_preferences')
            .where({ user_id: userId })
            .update(payload)
            .returning('*');
          return updated;
        } else {
          const [created] = await executor('user_preferences')
            .insert({ user_id: userId, ...payload })
            .returning('*');
          return created;
        }
      });
    } catch (err) {
      throw handleDbError(err);
    }
  }
};
