import crypto from 'crypto';
import { SessionRepository } from '../repositories/sessionRepository.js';

const createDomainError = (code, message, details = {}) => {
  const error = new Error(message);
  error.name = 'DomainError';
  error.code = code;
  Object.assign(error, details);
  return error;
};

export const SessionService = {
  /**
   * Hashes a plain token string. This is a pure deterministic cryptographic operation
   * with no persistence, validation, orchestration, or repository interaction.
   * @param {string} plainToken 
   * @returns {string}
   */
  hashToken(plainToken) {
    if (!plainToken) throw createDomainError('INVALID_INPUT', 'Token is required for hashing.');
    return crypto.createHash('sha256').update(plainToken).digest('hex');
  },

  /**
   * Creates a new session record.
   * This is the ONLY supported session creation path and MUST be used by rotateSession().
   * Owns Session invariants by performing structural payload validation prior to repository insertion.
   * Note: Required field enforcement (like user_id, refresh_token_hash) is intentionally omitted here 
   * and left to the repository/database constraints.
   * @param {Object} sessionData 
   * @param {Object} executor 
   * @returns {Promise<Object>} The created session entity
   */
  async createSession(sessionData, executor) {
    if (!executor) throw createDomainError('MISSING_EXECUTOR', 'createSession requires an explicit transaction executor.');
    
    // Domain Invariant: Sessions must have a future expiration date
    if (!sessionData.expires_at || new Date(sessionData.expires_at) <= new Date()) {
      throw createDomainError('INVALID_EXPIRATION', 'expires_at must be explicitly set to a future date.');
    }

    // Set session lineage owned by SessionService
    if (!sessionData.session_family_id) {
      sessionData.session_family_id = crypto.randomUUID();
    }

    return await SessionRepository.createSession(sessionData, executor);
  },

  /**
   * Validates an existing session by its hash.
   * @param {string} refreshTokenHash 
   * @param {Object} executor 
   * @returns {Promise<Object>} The validated session entity contract
   */
  async validateSession(refreshTokenHash, executor) {
    if (!executor) throw createDomainError('MISSING_EXECUTOR', 'validateSession requires an explicit transaction executor.');

    const session = await SessionRepository.findByRefreshToken(refreshTokenHash, executor);
    if (!session) {
      throw createDomainError('SESSION_NOT_FOUND', 'Session not found.');
    }

    // Domain Invariant: Expired sessions are invalid
    if (new Date(session.expires_at) <= new Date()) {
      throw createDomainError('SESSION_EXPIRED', 'Session has expired.');
    }

    // Domain Invariant: Revoked sessions are invalid
    if (session.is_revoked) {
      throw createDomainError('SESSION_REVOKED', 'Session has been revoked.');
    }

    // Domain Invariant: Replay Attack Detection
    if (session.is_rotated) {
      // Mitigate immediately
      await SessionRepository.revokeSessionFamily(session.session_family_id, executor);
      throw createDomainError('REPLAY_ATTACK_DETECTED', 'Replay attack detected during validation.', {
        sessionFamilyId: session.session_family_id
      });
    }

    return session;
  },

  /**
   * Rotates a session, generating a successor in the same family.
   * Crucially, this method must execute within an existing database transaction supplied through the executor parameter.
   * @param {string} sessionId 
   * @param {Object} successorSessionData 
   * @param {Object} executor 
   * @returns {Promise<Object>} The newly created successor session entity
   */
  async rotateSession(sessionId, successorSessionData, executor) {
    if (!executor) throw createDomainError('MISSING_EXECUTOR', 'rotateSession requires an explicit transaction executor.');

    // 1. Pessimistic Lock
    const parentSession = await SessionRepository.findByIdForUpdate(sessionId, executor);
    if (!parentSession) {
      throw createDomainError('SESSION_NOT_FOUND', 'Session not found for rotation.');
    }

    // 2. Invariant: Expired sessions cannot rotate
    if (new Date(parentSession.expires_at) <= new Date()) {
      throw createDomainError('SESSION_EXPIRED', 'Expired sessions cannot be rotated.');
    }

    // 3. Invariant: Replay Attack (Rotated sessions cannot rotate twice)
    if (parentSession.is_rotated) {
      // Mitigate immediately
      await SessionRepository.revokeSessionFamily(parentSession.session_family_id, executor);
      throw createDomainError('REPLAY_ATTACK_DETECTED', 'Replay attack detected during rotation.', {
        sessionFamilyId: parentSession.session_family_id
      });
    }

    // 4. State transition: Mark rotated
    await SessionRepository.updateRotationState(sessionId, true, executor);

    // 5. Enforce Lineage Invariants explicitly
    const finalSuccessorData = {
      ...successorSessionData,
      user_id: parentSession.user_id,
      session_family_id: parentSession.session_family_id, // Immutable lineage
    };

    // 6. Generate Successor (Using the only supported creation path)
    return await SessionService.createSession(finalSuccessorData, executor);
  },

  /**
   * Looks up a session by refresh token hash under a pessimistic lock, and validates invariants.
   * Returns a Result<T> instead of throwing, allowing orchestrator to mitigate replays inline.
   * @param {string} hashedToken
   * @param {Object} executor
   * @returns {Promise<{success: boolean, data?: Object, error?: Object}>}
   */
  async lockAndValidateForRotation(hashedToken, executor) {
    if (!executor) throw createDomainError('MISSING_EXECUTOR', 'lockAndValidateForRotation requires an explicit transaction executor.');

    const session = await SessionRepository.findByRefreshTokenForUpdate(hashedToken, executor);
    
    if (!session) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Session not found.' } };
    }

    if (new Date(session.expires_at) <= new Date()) {
      return { success: false, error: { code: 'EXPIRED', message: 'Session has expired.', sessionFamilyId: session.session_family_id } };
    }

    if (session.is_revoked) {
      return { success: false, error: { code: 'REVOKED', message: 'Session has been revoked.', sessionFamilyId: session.session_family_id } };
    }

    if (session.is_rotated) {
      return { success: false, error: { code: 'REPLAY_ATTACK_DETECTED', message: 'Replay attack detected during validation.', sessionFamilyId: session.session_family_id } };
    }

    return { success: true, data: session };
  },

  /**
   * Commits the rotation of a validated, locked session.
   * @param {Object} lockedSession
   * @param {Object} successorSessionData
   * @param {Object} executor
   * @returns {Promise<Object>}
   */
  async commitRotation(lockedSession, successorSessionData, executor) {
    if (!executor) throw createDomainError('MISSING_EXECUTOR', 'commitRotation requires an explicit transaction executor.');

    // 1. State transition: Mark rotated
    await SessionRepository.updateRotationState(lockedSession.id, true, executor);

    // 2. Enforce Lineage Invariants explicitly
    const finalSuccessorData = {
      ...successorSessionData,
      user_id: lockedSession.user_id,
      session_family_id: lockedSession.session_family_id, // Immutable lineage
    };

    // 3. Generate Successor (Using the only supported creation path)
    return await SessionService.createSession(finalSuccessorData, executor);
  },

  /**
   * Looks up and locks a session for logout, validating idempotency.
   * @param {string} sessionId 
   * @param {Object} executor 
   * @returns {Promise<{success: boolean, session?: Object, idempotent?: boolean}>}
   */
  async lockAndValidateForLogout(sessionId, executor) {
    if (!executor) throw createDomainError('MISSING_EXECUTOR', 'lockAndValidateForLogout requires an explicit transaction executor.');
    
    const session = await SessionRepository.findByIdForUpdate(sessionId, executor);
    if (!session || session.is_revoked) {
      return { success: false, idempotent: true };
    }
    
    return { success: true, session };
  },

  /**
   * Revokes an entire token lineage family.
   * @param {string} sessionFamilyId 
   * @param {string} reason
   * @param {Object} executor 
   * @returns {Promise<{rowsAffected: number}>}
   */
  async revokeSessionFamily(sessionFamilyId, reason, executor) {
    if (!executor) throw createDomainError('MISSING_EXECUTOR', 'revokeSessionFamily requires an explicit transaction executor.');
    return await SessionRepository.revokeSessionFamily(sessionFamilyId, reason, executor);
  },

  /**
   * Revokes all sessions belonging to a user.
   * @param {string} userId 
   * @param {Object} executor 
   * @returns {Promise<{rowsAffected: number}>}
   */
  async revokeAllSessionsForUser(userId, executor) {
    if (!executor) throw createDomainError('MISSING_EXECUTOR', 'revokeAllSessionsForUser requires an explicit transaction executor.');
    return await SessionRepository.revokeAllForUser(userId, executor);
  },

  /**
   * Revokes all sessions for a user EXCEPT the specified current session.
   * @param {string} userId 
   * @param {string} currentSessionId 
   * @param {Object} executor 
   * @returns {Promise<number>} Number of rows affected
   */
  async revokeAllSessionsExceptCurrent(userId, currentSessionId, executor) {
    if (!executor) throw createDomainError('MISSING_EXECUTOR', 'revokeAllSessionsExceptCurrent requires an explicit transaction executor.');
    return await SessionRepository.revokeAllExcept(userId, currentSessionId, executor);
  },

  /**
   * Retrieves sanitized list of active sessions for a user dashboard.
   * @param {string} userId 
   * @returns {Promise<Array>}
   */
  async getActiveSessions(userId) {
    if (!userId) throw createDomainError('INVALID_INPUT', 'User ID is required.');
    
    const sessions = await SessionRepository.findActiveSessionsForUser(userId);
    return sessions.map(s => ({
      id: s.id,
      ipAddress: s.ip_address,
      userAgent: s.user_agent,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));
  }
};
