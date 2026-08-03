import db from '../db.js';
import { withTransientRetry } from '../utils/dbRetry.js';
import { handleDbError } from '../utils/dbErrors.js';

/**
 * UserProfileRepository: Database access layer for user profile personal information.
 * Uses Knex transaction support (`executor = db`).
 */
export const UserProfileRepository = {
  /**
   * Retrieves profile by user ID.
   */
  async findByUserId(userId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('user_profiles').where({ user_id: userId }).first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Retrieves profile by username.
   */
  async findByUsername(username, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('user_profiles').where({ username }).first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Upserts profile record for a user.
   */
  async upsertProfile(userId, profileData, executor = db) {
    try {
      return await withTransientRetry(async () => {
        const existing = await executor('user_profiles').where({ user_id: userId }).first();

        const payload = {
          ...profileData,
          updated_at: executor.fn.now()
        };

        if (existing) {
          const [updated] = await executor('user_profiles')
            .where({ user_id: userId })
            .update(payload)
            .returning('*');
          return updated;
        } else {
          const [created] = await executor('user_profiles')
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
