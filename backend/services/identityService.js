import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/userRepository.js';

const SALT_ROUNDS = 12;

/**
 * IdentityService (Domain Service)
 * Strictly responsible for User state transitions and cryptographic comparisons.
 * Never coordinates cross-domain operations (e.g. Tokens, Sessions, Emails).
 */
export const IdentityService = {
  
  /**
   * Validates and persists a new user with an initial state provided by AuthenticationService.
   * @param {Object} identityData - Orchestrated data (e.g., { email, passwordHash, status })
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<Object>} Created user entity
   */
  async createIdentity(identityData, executor) {
    return UserRepository.createUser({
      email: identityData.email,
      password_hash: identityData.passwordHash,
      status: identityData.status,
      role_id: identityData.roleId
    }, executor);
  },

  /**
   * Retrieves the core user entity by ID.
   * @param {string} userId 
   * @param {Object} executor 
   * @returns {Promise<Object>} 
   */
  async findById(userId, executor) {
    return UserRepository.findById(userId, executor);
  },

  /**
   * Retrieves the core user entity by ID under a SELECT ... FOR UPDATE row lock.
   * Used by forgotPassword to serialize concurrent reset requests for the same user,
   * preventing duplicate token inserts from racing transactions.
   * Encapsulates direct UserRepository access so AuthenticationService never touches
   * a repository layer directly.
   * @param {string} userId
   * @param {Object} executor - Transaction object (MANDATORY)
   * @returns {Promise<Object|undefined>}
   */
  async findByIdForUpdate(userId, executor) {
    return UserRepository.findByIdForUpdate(userId, executor);
  },

  /**
   * Retrieves the core user entity by email.
   * @param {string} email 
   * @param {Object} executor 
   * @returns {Promise<Object>} 
   */
  async findByEmail(email, executor) {
    return UserRepository.findByEmail(email, executor);
  },

  /**
   * Cryptographically hashes a raw password string.
   * Pure CPU-bound domain logic, isolated from persistence.
   * @param {string} rawPassword 
   * @returns {Promise<string>} 
   */
  async hashPassword(rawPassword) {
    return bcrypt.hash(rawPassword, SALT_ROUNDS);
  },

  /**
   * Compares a raw password against a hash string.
   * Pure CPU-bound domain logic, isolated from persistence.
   * @param {string} rawPassword 
   * @param {string} passwordHash 
   * @returns {Promise<boolean>} 
   */
  async comparePassword(rawPassword, passwordHash) {
    if (!passwordHash) return false;
    return bcrypt.compare(rawPassword, passwordHash);
  },

  /**
   * Persists an externally generated password hash.
   * @param {string} userId 
   * @param {string} passwordHash 
   * @param {Object} executor 
   */
  async updatePasswordHash(userId, passwordHash, executor) {
    return UserRepository.updatePasswordHash(userId, passwordHash, executor);
  },

  /**
   * Semantic transition of the user lifecycle state machine.
   * @param {string} userId 
   * @param {string} status - e.g., 'ACTIVE', 'LOCKED'
   * @param {Object} executor 
   */
  async changeStatus(userId, status, executor) {
    return UserRepository.updateStatus(userId, status, executor);
  },

  async updateLastVerificationRequest(userId, executor) {
    return UserRepository.updateLastVerificationRequest(userId, executor);
  },

  /**
   * Domain reflection of a successful email verification.
   * @param {string} userId 
   * @param {boolean} isVerified 
   * @param {Object} executor 
   */
  async updateEmailVerified(userId, isVerified, executor) {
    return UserRepository.updateEmailVerified(userId, isVerified, executor);
  },

  /**
   * Records a failed login attempt, atomically evaluating the lockout policy.
   * Lockout threshold is set at 5 attempts.
   * @param {string} userId 
   * @param {Object} executor 
   * @returns {Promise<{ isLocked: boolean, failedCount: number }>}
   */
  async recordFailedLogin(userId, executor) {
    const LOCKOUT_THRESHOLD = 5;
    return UserRepository.recordFailedLogin(userId, LOCKOUT_THRESHOLD, executor);
  },

  /**
   * Atomic reset operation upon successful login.
   * @param {string} userId 
   * @param {Object} executor 
   */
  async resetFailedLoginCount(userId, executor) {
    return UserRepository.resetFailedLoginCount(userId, executor);
  },

  /**
   * Updates the timestamp of the user's latest active login.
   * @param {string} userId 
   * @param {Object} executor 
   */
  async updateLastLogin(userId, executor) {
    return UserRepository.updateLastLogin(userId, executor);
  },

  /**
   * Updates core user profile attributes.
   * @param {string} userId 
   * @param {Object} profileData - profile fields like name, avatar_url
   * @param {Object} executor 
   */
  async updateIdentity(userId, profileData, executor) {
    const { name, avatar_url } = profileData || {};
    return UserRepository.updateIdentity(userId, { name, avatar_url }, executor);
  }
};
