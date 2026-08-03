import db from '../db.js';
import config from '../config/index.js';
import { withTransientRetry } from '../utils/dbRetry.js';
import { handleDbError } from '../utils/dbErrors.js';

// User repository supporting transaction context composition (trx || db)
export const UserRepository = {
  async findByEmail(email, executor = db) {
    try {
      return await withTransientRetry(() => executor('users').where({ email }).first());
    } catch (err) {
      throw handleDbError(err);
    }
  },

  async findById(id, executor = db) {
    try {
      return await withTransientRetry(() => executor('users').where({ id }).first());
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Looks up a user by ID and locks the row for update (SELECT ... FOR UPDATE).
   * Used to serialize concurrent forgotPassword requests for the same account,
   * preventing duplicate token inserts from racing transactions.
   * @param {string} id - User UUID
   * @param {Object} executor - Transaction object (MANDATORY)
   * @returns {Promise<Object|undefined>} The locked user row
   */
  async findByIdForUpdate(id, executor) {
    if (!executor) {
      throw new Error('findByIdForUpdate requires an explicit transaction object.');
    }
    try {
      return await withTransientRetry(() =>
        executor('users').where({ id }).forUpdate().first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  async createLocalUser({ email, password_hash, name, role_id }, executor = db) {
    try {
      return await withTransientRetry(() => 
        executor.transaction(async (innerTrx) => {
          const [newUser] = await innerTrx('users')
            .insert({ email, password_hash, name, provider: 'local' })
            .returning(['id', 'email', 'name', 'provider']);
          
          if (role_id) {
            await innerTrx('user_roles').insert({ user_id: newUser.id, role_id });
            newUser.role_id = role_id; // For legacy compatibility with returns
          }
          
          return newUser;
        })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  async updateProfile(id, { name, avatar_url, timezone }, executor = db) {
    try {
      return await withTransientRetry(async () => {
        const payload = { updated_at: executor.fn.now(), updated_by: id };
        
        if (name !== undefined) payload.name = name;
        if (avatar_url !== undefined) payload.avatar_url = avatar_url;
        if (timezone !== undefined) payload.timezone = timezone;

        const [updatedUser] = await executor('users')
          .where({ id })
          .update(payload)
          .returning('*');
          
        return updatedUser;
      });
    } catch (err) {
      throw handleDbError(err);
    }
  },




  async hardDeleteUser(userId, email, executor = db) {
    try {
      await withTransientRetry(() =>
        executor.transaction(async (innerTrx) => {
          // Atomically delete dependent tables (SELECTIVE cascade cleanup)
          await innerTrx('user_sessions').where({ user_id: userId }).del();
          await innerTrx('login_attempts').where({ email }).del();
          const rowsDeleted = await innerTrx('users').where({ id: userId }).del();
          if (rowsDeleted === 0) {
            throw new Error('User not found');
          }
        })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  // HARDENED CURSOR-BASED PAGINATION: Aligns with Partial Indexing
  // Silent degradation on malformed cursor logs to prevent public DDOS warnings spam.
  async getFailedLoginAttemptsPaged({ email, limit = 20, cursor = null }, executor = db) {
    try {
      const maxLimit = 100;
      const safeLimit = Math.min(Math.max(1, limit), maxLimit);

      let query = executor('login_attempts')
        .select('id', 'email', 'ip_address', 'is_successful', 'attempted_at')
        // Strict Partial Index Predicate Alignment Rule: triggers idx_login_attempts_email_failures
        .where({ email, is_successful: false })
        .orderBy('attempted_at', 'desc')
        .orderBy('id', 'desc')
        .limit(safeLimit + 1);

      if (cursor) {
        try {
          // Safe malformed Base64 cursor decoder shield (Quiet fallback)
          const decoded = Buffer.from(cursor, 'base64').toString('utf8');
          const parts = decoded.split('|');
          
          if (parts.length === 2) {
            const [cursorTime, cursorId] = parts;
            if (!isNaN(Date.parse(cursorTime))) {
              query = query.where((builder) => {
                builder.where('attempted_at', '<', cursorTime)
                  .orWhere((inner) => {
                    inner.where('attempted_at', '=', cursorTime)
                         .andWhere('id', '<', cursorId);
                  });
              });
            }
          }
        } catch (err) {
          // Quiet degradation: Log only at development/test layers to prevent public warning floods
          if (config.app.env === 'development') {
            console.log('Quietly ignored malformed pagination cursor payload');
          }
        }
      }

      const results = await withTransientRetry(() => query);
      const hasMore = results.length > safeLimit;
      const pagedResults = hasMore ? results.slice(0, safeLimit) : results;

      let nextCursor = null;
      if (hasMore && pagedResults.length > 0) {
        const lastItem = pagedResults[pagedResults.length - 1];
        nextCursor = Buffer.from(`${lastItem.attempted_at.toISOString()}|${lastItem.id}`).toString('base64');
      }

      return {
        data: pagedResults,
        nextCursor
      };
    } catch (err) {
      throw handleDbError(err);
    }
  },

  // SAFE SEQUENTIAL BATCH LOADING: Protects Knex Connection Pool
  async batchLoadSessionsForUsers(userIds, executor = db) {
    try {
      const chunkSize = 500;
      const results = [];
      
      // Enforce sequential processing to protect the Knex thread pool from starvation/starve timeouts
      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        const sessions = await withTransientRetry(() =>
          executor('user_sessions')
            .select('id', 'user_id', 'session_token', 'expires_at')
            .whereIn('user_id', chunk)
        );
        results.push(...sessions);
      }
      
      return results;
    } catch (err) {
      throw handleDbError(err);
    }
  },

  // ==========================================
  // TARGET SCHEMA METHODS (PHASE 2+)
  // ==========================================

  /**
   * Persists a new target user with normalized status fields.
   */
  async createUser(userData, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor.transaction(async (innerTrx) => {
          // Extract role_id to prevent it from going into 'users' insert
          const { role_id, ...userFields } = userData;

          const [user] = await innerTrx('users')
            .insert(userFields)
            .returning('*');

          if (role_id) {
            await innerTrx('user_roles').insert({ user_id: user.id, role_id });
            user.role_id = role_id; // For legacy compatibility with returns
          }
          return user;
        })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Updates the password hash.
   */
  async updatePasswordHash(userId, passwordHash, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('users')
          .where({ id: userId })
          .update({ password_hash: passwordHash, updated_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Updates the lifecycle status of a user (e.g. LOCKED).
   */
  async updateStatus(userId, status, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('users')
          .where({ id: userId })
          .update({ status, updated_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Updates the last_verification_request_at timestamp.
   */
  async updateLastVerificationRequest(userId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('users')
          .where({ id: userId })
          .update({ last_verification_request_at: executor.fn.now(), updated_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Toggles the email_verified flag.
   */
  async updateEmailVerified(userId, isVerified, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('users')
          .where({ id: userId })
          .update({ email_verified: isVerified, updated_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Atomically increments the failed login count and conditionally locks the account
   * if the threshold is reached, returning the outcome.
   * @param {string} userId
   * @param {number} threshold - The number of failed attempts required to trigger a lock.
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<{ isLocked: boolean, failedCount: number }>}
   */
  async recordFailedLogin(userId, threshold, executor = db) {
    try {
      return await withTransientRetry(async () => {
        // We use knex.raw for a conditional UPDATE returning the new values
        const query = `
          UPDATE users 
          SET 
            failed_login_count = failed_login_count + 1,
            status = CASE 
                       WHEN failed_login_count + 1 >= ? THEN 'LOCKED' 
                       ELSE status 
                     END,
            updated_at = NOW()
          WHERE id = ?
          RETURNING failed_login_count, status
        `;
        const result = await executor.raw(query, [threshold, userId]);
        if (!result.rows.length) {
          throw new Error(`User ${userId} not found for failed login update.`);
        }
        const row = result.rows[0];
        return {
          isLocked: row.status === 'LOCKED',
          failedCount: row.failed_login_count
        };
      });
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Atomically resets the failed login count to zero.
   */
  async resetFailedLoginCount(userId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('users')
          .where({ id: userId })
          .update({ failed_login_count: 0, updated_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Updates the last login timestamp.
   */
  async updateLastLogin(userId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('users')
          .where({ id: userId })
          .update({ last_login_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Updates core user profile attributes.
   */
  async updateIdentity(userId, { name, avatar_url }, executor = db) {
    try {
      const updatePayload = { updated_at: executor.fn.now() };
      
      if (name !== undefined) {
        updatePayload.name = name;
      }
      if (avatar_url !== undefined) {
        updatePayload.avatar_url = avatar_url;
      }

      return await withTransientRetry(() =>
        executor('users')
          .where({ id: userId })
          .update(updatePayload)
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Soft deletes a user account by setting status to SOFT_DELETED.
   */
  async softDeleteUser(userId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('users')
          .where({ id: userId })
          .update({ status: 'SOFT_DELETED', updated_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Restores a soft-deleted user account by setting status to ACTIVE.
   */
  async restoreUser(userId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('users')
          .where({ id: userId })
          .update({ status: 'ACTIVE', updated_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Updates user email address.
   */
  async updateEmail(userId, newEmail, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('users')
          .where({ id: userId })
          .update({ email: newEmail.toLowerCase().trim(), updated_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  }
};

