import db from '../db.js';
import { withTransientRetry } from '../utils/dbRetry.js';
import { handleDbError } from '../utils/dbErrors.js';

const DEFAULT_EVENT_LIMIT = 20;

/**
 * Private helper to prevent the repository from becoming a mini-ORM.
 * Applies generic filters to the authentication events query.
 */
function applyRecentEventFilters(query, criteria) {
  if (criteria.email) query = query.where({ email: criteria.email });
  if (criteria.userId) query = query.where({ user_id: criteria.userId });
  if (criteria.eventCategory) query = query.where({ event_category: criteria.eventCategory });
  if (criteria.eventType) query = query.where({ event_type: criteria.eventType });
  if (criteria.from) query = query.where('created_at', '>=', criteria.from);
  if (criteria.to) query = query.where('created_at', '<=', criteria.to);
  if (criteria.cursor) query = query.where('created_at', '<', criteria.cursor);
  return query;
}

export const AuthenticationRepository = {
  // ==========================================
  // AUDIT DOMAIN
  // ==========================================

  /**
   * Inserts an authentication event for auditing purposes.
   * @param {Object} eventData - The data payload for the event
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<Object>} The created event record
   */
  async logEvent(eventData, executor = db) {
    try {
      return await withTransientRetry(async () => {
        const [event] = await executor('authentication_events')
          .insert(eventData)
          .returning('*');
        return event;
      });
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Retrieves recent authentication events based on strict criteria.
   * @param {Object} criteria - Search criteria (email, userId, eventCategory, eventType, from, to, cursor, limit)
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<Array<Object>>} Array of matching event records
   */
  async getRecentEvents(criteria = {}, executor = db) {
    try {
      return await withTransientRetry(() => {
        const query = executor('authentication_events').select('*');
        applyRecentEventFilters(query, criteria);
        
        const limit = criteria.limit || DEFAULT_EVENT_LIMIT;
        return query.orderBy('created_at', 'desc').limit(limit);
      });
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Retrieves paginated authentication events for the Admin Operations Center.
   */
  async getAdminEvents({ search, eventCategory, eventType, limit = 50, offset = 0 }, executor = db) {
    try {
      return await withTransientRetry(async () => {
        const query = executor('authentication_events')
          .leftJoin('users', 'authentication_events.user_id', 'users.id')
          .select(
            'authentication_events.*',
            'users.email as user_email',
            'users.name as user_name'
          );

        if (eventCategory) query.where('authentication_events.event_category', 'ILIKE', `%${eventCategory}%`);
        if (eventType) query.where('authentication_events.event_type', 'ILIKE', `%${eventType}%`);
        if (search) {
          query.where(builder => {
            builder.where('users.email', 'ILIKE', `%${search}%`)
                   .orWhere('authentication_events.event_type', 'ILIKE', `%${search}%`)
                   .orWhereRaw(`authentication_events.metadata->>'ipAddress' ILIKE ?`, [`%${search}%`]);
          });
        }

        const countQuery = query.clone().clearSelect().count('* as total').first();

        const [countResult, events] = await Promise.all([
          countQuery,
          query.clone().orderBy('authentication_events.created_at', 'desc').limit(limit).offset(offset)
        ]);

        return {
          total: Number(countResult?.total || 0),
          events
        };
      });
    } catch (err) {
      throw handleDbError(err);
    }
  },

  // ==========================================
  // OAUTH DOMAIN
  // ==========================================

  /**
   * Inserts a new OAuth provider identity linkage for a user.
   * @param {Object} identityData - The OAuth identity payload
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<Object>} The created OAuth identity record
   */
  async createOAuthIdentity(identityData, executor = db) {
    try {
      return await withTransientRetry(async () => {
        const [identity] = await executor('user_oauth_identities')
          .insert(identityData)
          .returning('*');
        return identity;
      });
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Looks up an OAuth identity by the local user ID and provider name.
   * @param {string} userId - The local UUID of the user
   * @param {string} provider - The OAuth provider name (e.g., 'google')
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<Object|undefined>} The OAuth identity record, or undefined
   */
  async findOAuthIdentityByProvider(userId, provider, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('user_oauth_identities')
          .where({ user_id: userId, provider })
          .first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Looks up an OAuth identity starting from the remote provider's User ID.
   * Essential for initial resolution during the OAuth login flow.
   * @param {string} provider - The OAuth provider name (e.g., 'google')
   * @param {string} providerUserId - The remote ID supplied by the provider
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<Object|undefined>} The OAuth identity record, or undefined
   */
  async findOAuthIdentityByProviderUserId(provider, providerUserId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('user_oauth_identities')
          .where({ provider, provider_user_id: providerUserId })
          .first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Looks up an active OAuth identity starting from the remote provider's User ID.
   * @param {string} provider - The OAuth provider name (e.g., 'google')
   * @param {string} providerUserId - The remote ID supplied by the provider
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<Object|undefined>} The active OAuth identity record, or undefined
   */
  async findActiveOAuthIdentity(provider, providerUserId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('user_oauth_identities')
          .where({ provider, provider_user_id: providerUserId })
          // If deleted_at/disabled columns are introduced, they will hook in here.
          .first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Removes an OAuth provider linkage for a local user.
   * @param {string} userId - The local UUID of the user
   * @param {string} provider - The OAuth provider name
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<number>} Number of rows deleted
   */
  async deleteOAuthIdentity(userId, provider, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('user_oauth_identities')
          .where({ user_id: userId, provider })
          .del()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  // ==========================================
  // EMAIL VERIFICATION DOMAIN
  // ==========================================

  /**
   * Creates a new email verification token.
   * @param {Object} tokenData - The token payload
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<Object>} The created verification token record
   */
  async createVerificationToken(tokenData, executor = db) {
    try {
      return await withTransientRetry(async () => {
        const [token] = await executor('email_verification_tokens')
          .insert(tokenData)
          .returning('*');
        return token;
      });
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Looks up an email verification token by its hash.
   * @param {string} tokenHash - SHA-256 hash of the token
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<Object|undefined>} The verification token record, or undefined
   */
  async findVerificationToken(tokenHash, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('email_verification_tokens')
          .where({ token_hash: tokenHash })
          .first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Looks up an email verification token by its hash and locks the row for update.
   * @param {string} tokenHash 
   * @param {Object} executor - Transaction object (MANDATORY)
   */
  async findVerificationTokenForUpdate(tokenHash, executor) {
    if (!executor) {
      throw new Error('findVerificationTokenForUpdate requires an explicit transaction object.');
    }
    try {
      return await withTransientRetry(() =>
        executor('email_verification_tokens')
          .where({ token_hash: tokenHash })
          .forUpdate()
          .first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Invalidates all unconsumed verification tokens for a specific user by setting their expiry to the past.
   * @param {string} userId 
   * @param {Object} executor 
   */
  async invalidatePreviousTokens(userId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('email_verification_tokens')
          .where({ user_id: userId })
          .whereNull('consumed_at')
          .update({ expires_at: new Date(Date.now() - 1000) })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Marks an email verification token as consumed. Idempotent.
   * @param {string} tokenId - The UUID of the token
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<number>} Number of rows updated (0 if already consumed or not found)
   */
  async consumeVerificationToken(tokenId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('email_verification_tokens')
          .where({ id: tokenId })
          .whereNull('consumed_at')
          .update({ consumed_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Destroys email verification tokens that have expired AND have already been consumed.
   * Leaves expired but unconsumed tokens intact for security investigations.
   * @param {Date|string} timestamp - The absolute cutoff time for expiration
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<number>} Number of rows deleted
   */
  async purgeExpiredVerificationTokens(timestamp, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('email_verification_tokens')
          .where('expires_at', '<', timestamp)
          .whereNotNull('consumed_at')
          .del()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  // ==========================================
  // PASSWORD RESET DOMAIN
  // ==========================================

  /**
   * Creates a new password reset token.
   * @param {Object} tokenData - The token payload
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<Object>} The created reset token record
   */
  async createResetToken(tokenData, executor = db) {
    try {
      return await withTransientRetry(async () => {
        const [token] = await executor('password_reset_tokens')
          .insert(tokenData)
          .returning('*');
        return token;
      });
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Looks up a password reset token by its hash.
   * @param {string} tokenHash - SHA-256 hash of the token
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<Object|undefined>} The reset token record, or undefined
   */
  async findResetToken(tokenHash, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('password_reset_tokens')
          .where({ token_hash: tokenHash })
          .first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Looks up a password reset token by its hash and locks the row (SELECT ... FOR UPDATE).
   * Ensures two concurrent resetPassword calls with the same token are serialized —
   * only the first to acquire the lock can consume it; the second reads consumed_at and rejects.
   * @param {string} tokenHash - SHA-256 hash of the token
   * @param {Object} executor - Transaction object (MANDATORY)
   * @returns {Promise<Object|undefined>} The locked reset token record, or undefined
   */
  async findResetTokenForUpdate(tokenHash, executor) {
    if (!executor) {
      throw new Error('findResetTokenForUpdate requires an explicit transaction object.');
    }
    try {
      return await withTransientRetry(() =>
        executor('password_reset_tokens')
          .where({ token_hash: tokenHash })
          .forUpdate()
          .first()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Marks a password reset token as consumed. Idempotent.
   * @param {string} tokenId - The UUID of the token
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<number>} Number of rows updated (0 if already consumed or not found)
   */
  async consumeResetToken(tokenId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('password_reset_tokens')
          .where({ id: tokenId })
          .whereNull('consumed_at')
          .update({ consumed_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Invalidates all outstanding password reset tokens for a user.
   * @param {string} userId - The local UUID of the user
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<number>} Number of rows updated
   */
  async invalidateResetTokensForUser(userId, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('password_reset_tokens')
          .where({ user_id: userId, consumed_at: null, invalidated_at: null })
          .update({ invalidated_at: executor.fn.now() })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Destroys password reset tokens that have expired AND have already been consumed.
   * Leaves expired but unconsumed tokens intact for security investigations.
   * @param {Date|string} timestamp - The absolute cutoff time for expiration
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<number>} Number of rows deleted
   */
  async purgeExpiredResetTokens(timestamp, executor = db) {
    try {
      return await withTransientRetry(() =>
        executor('password_reset_tokens')
          .where('expires_at', '<', timestamp)
          .whereNotNull('consumed_at')
          .del()
      );
    } catch (err) {
      throw handleDbError(err);
    }
  }
};
