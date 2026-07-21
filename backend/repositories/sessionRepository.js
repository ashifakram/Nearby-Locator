import db from '../db.js';
import { withTransientRetry } from '../utils/dbRetry.js';
import { handleDbError } from '../utils/dbErrors.js';

const SESSION_BATCH_SIZE = 500;

export const SessionRepository = {
  /**
   * Creates a new session in the lineage family.
   * @param {Object} sessionData - Session properties mapping to the DB schema
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<Object>} The created session object
   */
  async createSession(sessionData, executor = db) {
    try {
      return await withTransientRetry(async () => {
        const [session] = await executor('user_sessions').insert(sessionData).returning('*');
        return session;
      });
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Look up a session by its hashed refresh token.
   * @param {string} hashedToken - SHA-256 hash of the refresh token
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<Object|undefined>} The session object if found
   */
  async findByRefreshToken(hashedToken, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('user_sessions').where({ refresh_token_hash: hashedToken }).first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Looks up a session by refresh token and locks the row for update to ensure pessimistic concurrency control.
   * @param {string} hashedToken - The SHA-256 hash of the refresh token
   * @param {Object} executor - Transaction object (MANDATORY for locks to persist)
   * @returns {Promise<Object|undefined>} The locked session object
   */
  async findByRefreshTokenForUpdate(hashedToken, executor) {
    if (!executor) {
      throw new Error('findByRefreshTokenForUpdate requires an explicit transaction object.');
    }
    try {
      return await withTransientRetry(() =>
        executor('user_sessions')
          .where({ refresh_token_hash: hashedToken })
          .forUpdate()
          .first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Looks up a session and locks the row for update to ensure pessimistic concurrency control.
   * Crucial for preventing race conditions during session rotation.
   * @param {string} sessionId - The UUID of the session to lock
   * @param {Object} executor - Transaction object (MANDATORY for locks to persist)
   * @returns {Promise<Object|undefined>} The locked session object
   */
  async findByIdForUpdate(sessionId, executor) {
    if (!executor) {
      throw new Error('findByIdForUpdate requires an explicit transaction object.');
    }
    try {
      return await withTransientRetry(() =>
        executor('user_sessions')
          .where({ id: sessionId })
          .forUpdate()
          .first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Updates the rotation state of a session. 
   * @param {string} sessionId - The UUID of the session
   * @param {boolean} isRotated - The new rotation state
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<number>} Number of rows affected
   */
  async updateRotationState(sessionId, isRotated, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('user_sessions')
          .where({ id: sessionId })
          .update({ is_rotated: isRotated, updated_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Revoke all sessions within a specific lineage family (Replay Attack Mitigation or Admin Ban).
   * @param {string} sessionFamilyId - The UUID of the session family
   * @param {string} reason - The reason for revocation (e.g. REPLAY_ATTACK, ACCOUNT_BANNED)
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<{rowsAffected: number}>} Number of rows affected
   */
  async revokeSessionFamily(sessionFamilyId, reason, executor = db) {
    // Note: The reason parameter is provided to explicitly document intent for the audit layer, 
    // even though user_sessions does not currently persist it.
    try {
      const rowsAffected = await withTransientRetry(() =>
        executor('user_sessions')
          .where({ session_family_id: sessionFamilyId, is_revoked: false })
          .update({ is_revoked: true, updated_at: executor.fn.now() })
      );
      return { rowsAffected };
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Revoke all sessions for a specific user (Logout All Devices).
   * @param {string} userId - User UUID
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<{rowsAffected: number}>} Number of rows affected
   */
  async revokeAllForUser(userId, executor = db) {
    try {
      const rowsAffected = await withTransientRetry(() =>
        executor('user_sessions')
          .where({ user_id: userId, is_revoked: false })
          .update({ is_revoked: true, updated_at: executor.fn.now() })
      );
      return { rowsAffected };
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Revoke all active sessions for a user EXCEPT the specified session ID.
   * @param {string} userId - User UUID
   * @param {string} currentSessionId - The UUID of the session to exclude
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<number>} Number of rows affected
   */
  async revokeAllExcept(userId, currentSessionId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('user_sessions')
          .where({ user_id: userId, is_revoked: false })
          .whereNot({ id: currentSessionId })
          .update({ is_revoked: true, updated_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Find all unrevoked and unrotated sessions for a user (Device Dashboard).
   * @param {string} userId - User UUID
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<Array>} List of active session objects
   */
  async findActiveSessionsForUser(userId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('user_sessions')
          .where({ user_id: userId, is_revoked: false, is_rotated: false })
          .orderBy('updated_at', 'desc')
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Safe Sequential Batch Loading.
   * Protects the Knex connection pool from starvation.
   * @param {Array<string>} userIds - Array of user UUIDs
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<Array>} List of session objects matching select signatures
   */
  async batchLoadSessionsForUsers(userIds, executor = db) {
    if (!userIds || !userIds.length) return [];
    
    try {
      const results = [];
      
      // Enforce sequential processing to protect the Knex thread pool
      for (let i = 0; i < userIds.length; i += SESSION_BATCH_SIZE) {
        const chunk = userIds.slice(i, i + SESSION_BATCH_SIZE);
        const sessions = await withTransientRetry(() =>
          executor('user_sessions')
            .select('id', 'user_id', 'refresh_token_hash', 'expires_at')
            .whereIn('user_id', chunk)
        );
        results.push(...sessions);
      }
      
      return results;
    } catch (err) {
      throw handleDbError(err);
    }
  }
};
