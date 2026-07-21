import db from '../db.js';
import { IdentityService } from './identityService.js';
import { SessionService } from './sessionService.js';
import { EmailVerificationService } from './emailVerificationService.js';
import { EmailService } from './emailService.js';
import { PasswordPolicy } from './passwordPolicy.js';
import { AuthenticationRepository } from '../repositories/authenticationRepository.js';
import OAuthRepository from '../repositories/oauthRepository.js';
import { RbacRepository } from '../repositories/rbacRepository.js';
import { withTransaction } from '../utils/dbRetry.js';
import { UniqueConstraintViolation } from '../utils/dbErrors.js';
import { USER_STATUS } from '../constants/userStatus.js';
import config from '../config/index.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// ==========================================
// Internal Helpers
// ==========================================



// ==========================================
// Frozen Public API
// ==========================================

import { 
  authLoginSuccessTotal, authSignupTotal, authAccountLinkedTotal, 
  authAccountUnlinkedTotal, authLoginFailureTotal,
  authRefreshTokenTotal, authLogoutTotal, authPasswordResetRequestTotal,
  authPasswordChangeTotal, authTokenReplayDetectedTotal, authPasswordResetTotal
} from '../utils/metrics.js';

export const AuthenticationService = {
  /**
   * Orchestrates the local user registration workflow.
   * @param {string} email 
   * @param {string} rawPassword 
   * @param {Object} profileData 
   * @param {Object} metadata 
   * @returns {Promise<Object>} Result<T> payload
   */
  async registerLocal(email, rawPassword, profileData, metadata) {
    // 1. Normalize and structurally validate
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !rawPassword || typeof rawPassword !== 'string' || rawPassword.length < 8) {
      return { success: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid email or password.' } };
    }

    const sanitizedProfileData = { ...profileData };
    delete sanitizedProfileData.id;
    delete sanitizedProfileData.status;
    delete sanitizedProfileData.role;

    // 2. Pre-check email existence outside transaction
    const existingIdentity = await IdentityService.findByEmail(normalizedEmail);
    if (existingIdentity) {
      return { success: false, error: { code: 'EMAIL_ALREADY_IN_USE', message: 'Email is already registered.' } };
    }

    // 3. Hash password outside transaction
    const passwordHash = await IdentityService.hashPassword(rawPassword);

    let identity;
    let rawToken;

    try {
      // 4. Execute database mutations within transaction boundary
      await withTransaction(async (executor) => {
        const defaultRole = await RbacRepository.getRoleByName('User', executor);
        if (!defaultRole) throw new Error("Default system role 'User' not found");

        const identityDto = {
          email: normalizedEmail,
          passwordHash: passwordHash,
          status: USER_STATUS.PENDING_VERIFICATION,
          roleId: defaultRole.id,
          ...sanitizedProfileData
        };

        identity = await IdentityService.createIdentity(identityDto, executor);

        rawToken = await EmailVerificationService.generateVerificationToken(identity.id, executor);

        const auditMetadata = {
          userId: identity.id,
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent
        };

        await AuthenticationRepository.logEvent({
          event_type: 'USER_REGISTERED',
          event_category: 'AUTHENTICATION',
          user_id: identity.id,
          metadata: JSON.stringify(auditMetadata)
        }, executor);
      });
    } catch (err) {
      if (err instanceof UniqueConstraintViolation) {
        return { success: false, error: { code: 'EMAIL_ALREADY_IN_USE', message: 'Email is already registered.' } };
      }
      throw err;
    }

    // 5. Post-commit email dispatch
    let warnings = [];
    try {
      await EmailService.sendVerificationEmail(normalizedEmail, rawToken);
    } catch (emailErr) {
      console.error('[AuthenticationService] Email dispatch failed for registerLocal:', emailErr);
      warnings.push('VERIFICATION_EMAIL_FAILED');
    }

    // 6. Return standard business outcome
    return {
      success: true,
      data: {
        user: {
          id: identity.id,
          email: identity.email,
          status: identity.status,
          createdAt: identity.created_at
        }
      },
      meta: { warnings }
    };
  },

  /**
   * Orchestrates the email verification workflow.
   * @param {string} token 
   * @param {Object} metadata 
   * @returns {Promise<Object>}
   */
  async verifyEmail(token, metadata = {}) {
    return await withTransaction(async (executor) => {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // 1. Lock verification token record (pessimistic lock)
      const tokenEntity = await AuthenticationRepository.findVerificationTokenForUpdate(tokenHash, executor);
      
      if (!tokenEntity) {
        // Return INVALID status
        return { success: false, error: { code: 'TOKEN_INVALID', message: 'Verification token is invalid or does not exist.' } };
      }
      
      // 2. Lock user record
      const user = await IdentityService.findByIdForUpdate(tokenEntity.user_id, executor);
      if (!user) {
        return { success: false, error: { code: 'USER_NOT_FOUND', message: 'User associated with token not found.' } };
      }
      
      // 3. Replay Protection / Idempotency Check
      if (user.status === USER_STATUS.ACTIVE) {
        return { success: true, alreadyVerified: true };
      }
      
      // 4. Verify not consumed
      if (tokenEntity.consumed_at) {
        await AuthenticationRepository.logEvent({
          event_category: 'email_verification',
          event_type: 'verification_failed',
          metadata: {
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            reason: 'TOKEN_CONSUMED'
          },
          user_id: user.id
        }, executor);
        return { success: false, error: { code: 'TOKEN_CONSUMED', message: 'Verification token has already been used.' } };
      }
      
      // 5. Verify not expired
      if (new Date(tokenEntity.expires_at) < new Date()) {
        await AuthenticationRepository.logEvent({
          event_category: 'email_verification',
          event_type: 'verification_expired',
          metadata: {
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            reason: 'TOKEN_EXPIRED'
          },
          user_id: user.id
        }, executor);
        return { success: false, error: { code: 'TOKEN_EXPIRED', message: 'Verification token has expired.' } };
      }
      
      // 6. Consume token
      await AuthenticationRepository.consumeVerificationToken(tokenEntity.id, executor);
      
      // 7. Activate user
      await IdentityService.changeStatus(user.id, USER_STATUS.ACTIVE, executor);
      
      // 8. Write audit event
      await AuthenticationRepository.logEvent({
        event_category: 'email_verification',
        event_type: 'verification_success',
        metadata: {
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          tokenId: tokenEntity.id
        },
        user_id: user.id
      }, executor);
      
      return { success: true };
    });
  },

  /**
   * Generates a new verification token and triggers email dispatch, invalidating older tokens.
   * @param {string} email 
   * @param {Object} metadata 
   * @returns {Promise<Object>}
   */
  async resendVerification(email, metadata = {}) {
    return await withTransaction(async (executor) => {
      const normalizedEmail = (email || '').toLowerCase().trim();
      const user = await IdentityService.findByEmail(normalizedEmail, executor);
      
      // Defense against user enumeration: return generic success
      if (!user) {
        return { success: true };
      }
      
      // If already active, return ALREADY_VERIFIED error
      if (user.status === USER_STATUS.ACTIVE) {
        return { success: false, error: { code: 'ALREADY_VERIFIED', message: 'Account is already verified.' } };
      }
      
      // Resend Protection: 60-second cooldown
      if (user.last_verification_request_at) {
        const lastRequestTime = new Date(user.last_verification_request_at).getTime();
        const diffMs = Date.now() - lastRequestTime;
        if (diffMs < 60000) {
          const waitSeconds = Math.ceil((60000 - diffMs) / 1000);
          return {
            success: false,
            error: {
              code: 'THROTTLED',
              message: `Please wait ${waitSeconds} seconds before requesting another verification email.`
            }
          };
        }
      }
      
      // Invalidate all previous unconsumed tokens for this user
      await AuthenticationRepository.invalidatePreviousTokens(user.id, executor);
      
      // Update cooldown timestamp
      await IdentityService.updateLastVerificationRequest(user.id, executor);
      
      // Generate new token
      const token = await EmailVerificationService.generateVerificationToken(user.id, executor);
      
      // Dispatch email link
      await EmailService.sendVerificationEmail(user.email, token);
      
      // Log audit event
      await AuthenticationRepository.logEvent({
        event_category: 'email_verification',
        event_type: 'verification_resent',
        metadata: {
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent
        },
        user_id: user.id
      }, executor);
      
      return { success: true };
    });
  },

  /**
   * Orchestrates the local login workflow, enforcing status limits and provisioning sessions.
   * @param {string} email 
   * @param {string} rawPassword 
   * @param {Object} metadata 
   * @returns {Promise<{ user: Object, session: Object, accessToken: string }>}
   */
  async loginLocal(email, rawPassword, metadata = {}) {
    // 1. Normalize input
    const normalizedEmail = (email || '').toLowerCase().trim();

    // 2. Lookup user
    const user = await IdentityService.findByEmail(normalizedEmail);

    // 3. Evaluate account status
    if (!user) {
      await withTransaction(async (executor) => {
        await AuthenticationRepository.logEvent({
          event_category: 'login',
          event_type: 'failure',
          metadata: {
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            reason: 'UNKNOWN_USER'
          },
          user_id: null
        }, executor);
      });
      return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' } };
    }
    
    switch (user.status) {
      case USER_STATUS.PENDING_VERIFICATION:
        // Audit log generic failure outside tx, no DB mutations for verification block
        await withTransaction(async (executor) => {
          await AuthenticationRepository.logEvent({
            event_category: 'login',
            event_type: 'failure',
            metadata: {
              ipAddress: metadata.ipAddress,
              userAgent: metadata.userAgent,
              reason: 'EMAIL_NOT_VERIFIED'
            },
            user_id: user.id
          }, executor);
        });
        return { success: false, error: { code: 'EMAIL_NOT_VERIFIED', message: 'Email address not verified.' } };
      case USER_STATUS.DISABLED:
        return { success: false, error: { code: 'ACCOUNT_DISABLED', message: 'Account is disabled.' } };
      case USER_STATUS.BANNED:
        return { success: false, error: { code: 'ACCOUNT_BANNED', message: 'Account is banned.' } };
      case USER_STATUS.LOCKED:
        return { success: false, error: { code: 'ACCOUNT_LOCKED', message: 'Account is locked.' } };
      case USER_STATUS.SOFT_DELETED:
        return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' } };
    }

    // 4. Compare password (outside transaction)
    const isValid = await IdentityService.comparePassword(rawPassword, user.password_hash);

    // 5. Wrong Password Flow
    if (!isValid) {
      await withTransaction(async (executor) => {
        await IdentityService.recordFailedLogin(user.id, executor);
        await AuthenticationRepository.logEvent({
          event_category: 'login',
          event_type: 'failure',
          metadata: {
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent
          },
          user_id: user.id
        }, executor);
      });
      authLoginFailureTotal.labels('invalid_credentials', 'local').inc();
      return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' } };
    }
    // 6. Correct Password Flow
    let sessionResult;
    try {
      await withTransaction(async (executor) => {
        await IdentityService.resetFailedLoginCount(user.id, executor);
        await IdentityService.updateLastLogin(user.id, executor);
        sessionResult = await AuthenticationService._establishSession(user, ['pwd'], metadata, executor);
      });
      authLoginSuccessTotal.labels('local', 'pwd').inc();
    } catch (e) {
      if (e.message.includes('Invalid') || e.message.includes('expired')) {
        authLoginFailureTotal.labels('invalid_credentials', 'local').inc();
      }
      throw e;
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      authLoginFailureTotal.labels('inactive_account', 'local').inc();
      throw new Error('Account is not active.');
    }

    return { success: true, data: sessionResult };
  },

  /**
   * Internal method to provision tokens and sessions uniformly.
   */
  async _establishSession(user, amrArray, metadata, executor) {
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await SessionService.createSession({
      user_id: user.id,
      refresh_token_hash: refreshTokenHash,
      expires_at: expiresAt,
      ip_address: metadata.ipAddress,
      user_agent: metadata.userAgent,
      metadata: {
        amr: amrArray,
        device_type: metadata.deviceType || 'Unknown',
        os_name: metadata.osName || 'Unknown',
        browser_name: metadata.browserName || 'Unknown'
      }
    }, executor);

    // Save login history (Success only)
    await executor('login_history').insert({
      user_id: user.id,
      session_family_id: session.session_family_id,
      login_method: amrArray.includes('google') ? 'google' : (amrArray.includes('apple') ? 'apple' : 'local'),
      device_type: metadata.deviceType || 'Unknown',
      os_name: metadata.osName || 'Unknown',
      browser_name: metadata.browserName || 'Unknown'
    });

    await AuthenticationRepository.logEvent({
      event_category: 'login',
      event_type: 'success',
      metadata: {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        amr: amrArray
      },
      user_id: user.id
    }, executor);

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret';
    const accessToken = jwt.sign(
      { sub: user.id, sid: session.id, amr: amrArray },
      jwtSecret,
      { expiresIn: '15m' }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        createdAt: user.created_at
      },
      accessToken,
      refreshToken: rawRefreshToken,
      expiresAt: session.expires_at
    };
  },

  /**
   * Orchestrates the Provider-Agnostic OAuth login workflow.
   */
  async loginOAuth(normalizedProfile, metadata) {
    let sessionResult;

    await withTransaction(async (executor) => {
      // 1. Resolve Identity
      let oauthAccount = await OAuthRepository.findByProvider(normalizedProfile.provider, normalizedProfile.providerUserId, executor);
      let user;

      if (oauthAccount) {
        user = await IdentityService.findByIdForUpdate(oauthAccount.user_id, executor);
        await OAuthRepository.touchLastLogin(oauthAccount.id, executor);
      } else {
        // Auto-link or create
        if (normalizedProfile.emailVerified) {
          const existingUser = await IdentityService.findByEmail(normalizedProfile.email, executor);
          if (existingUser) {
            user = await IdentityService.findByIdForUpdate(existingUser.id, executor);
            await OAuthRepository.linkProvider(user.id, normalizedProfile, executor);
            authAccountLinkedTotal.labels(normalizedProfile.provider).inc();
          }
        }
        
        if (!user) {
          const defaultRole = await RbacRepository.getRoleByName('User', executor);
          if (!defaultRole) throw new Error("Default system role 'User' not found");

          user = await IdentityService.createIdentity({
            email: normalizedProfile.email,
            status: USER_STATUS.ACTIVE,
            roleId: defaultRole.id,
            name: normalizedProfile.name || 'OAuth User'
          }, executor);
          await OAuthRepository.linkProvider(user.id, normalizedProfile, executor);
          authSignupTotal.labels(normalizedProfile.provider).inc();
        }
      }

      // 2. Validate Status
      if (user.status !== USER_STATUS.ACTIVE) {
        authLoginFailureTotal.labels('inactive_account', normalizedProfile.provider).inc();
        throw new Error('Account is not active.');
      }

      // 3. Establish Session
      sessionResult = await AuthenticationService._establishSession(user, [normalizedProfile.provider], metadata, executor);
      authLoginSuccessTotal.labels(normalizedProfile.provider, 'oauth').inc();
    });

    return { success: true, data: sessionResult };
  },

  /**
   * Provider-agnostic OAuth unlinking.
   */
  async unlinkOAuth(userId, providerName) {
    await withTransaction(async (executor) => {
      const oauthAccounts = await OAuthRepository.findByUser(userId, executor);
      const user = await IdentityService.findByIdForUpdate(userId, executor);
      
      const hasPassword = !!user.password_hash;
      const totalMethods = oauthAccounts.length + (hasPassword ? 1 : 0);
      
      if (totalMethods < 2) {
        throw new Error('Cannot unlink the only active authentication identity.');
      }
      
      await OAuthRepository.unlinkProvider(user.id, providerName, executor);
      authAccountUnlinkedTotal.labels(providerName).inc();
    });
    return { success: true };
  },

  /**
   * Orchestrates the token refresh workflow, enforcing strict replay mitigation.
   * @param {string} rawRefreshToken 
   * @param {Object} metadata 
   * @returns {Promise<{ success: boolean, data?: Object, error?: Object }>}
   */
  async refreshToken(rawRefreshToken, metadata = {}) {
    // 1. Normalize & Hash Input (Outside Tx)
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      return { success: false, error: { code: 'INVALID_REQUEST', message: 'Malformed refresh token.' } };
    }
    const refreshTokenHash = SessionService.hashToken(rawRefreshToken);

    let finalSession;
    let finalUser;

    // 2. Transaction Start
    const txResult = await withTransaction(async (executor) => {
      // 3. Pessimistic Lock & Validate
      const validationResult = await SessionService.lockAndValidateForRotation(refreshTokenHash, executor);

      // 4. Evaluate Session Outcome
      if (!validationResult.success) {
        const errCode = validationResult.error.code;
        if (errCode === 'REPLAY_ATTACK_DETECTED') {
          authTokenReplayDetectedTotal.inc();
          await SessionService.revokeSessionFamily(validationResult.error.sessionFamilyId, 'REPLAY_ATTACK', executor);
          await AuthenticationRepository.logEvent({
            event_category: 'refresh',
            event_type: 'REPLAY_ATTACK_MITIGATED',
            metadata: { ipAddress: metadata.ipAddress, userAgent: metadata.userAgent },
            user_id: null // Don't have user_id reliably here without loading session, but family is revoked
          }, executor);
        } else {
          await AuthenticationRepository.logEvent({
            event_category: 'refresh',
            event_type: 'SESSION_REFRESH_REJECTED',
            metadata: { reason: errCode, ipAddress: metadata.ipAddress, userAgent: metadata.userAgent },
            user_id: null
          }, executor);
        }
        authRefreshTokenTotal.labels('failure').inc();
        return { success: false, error: { code: 'INVALID_GRANT', message: 'Invalid refresh token.' } };
      }

      const lockedSession = validationResult.data;

      // 5. User Validation
      const user = await IdentityService.findById(lockedSession.user_id, executor);
      let rejectReason = null;
      if (!user) rejectReason = 'USER_NOT_FOUND';
      else if (user.status === USER_STATUS.BANNED) rejectReason = 'ACCOUNT_BANNED';
      else if (user.status === USER_STATUS.DISABLED) rejectReason = 'ACCOUNT_DISABLED';
      
      // PENDING_VERIFICATION and LOCKED users are technically allowed to refresh? 
      // The blueprint said: "If the user is banned, disabled, or missing".
      // Wait, let's explicitly block PENDING_VERIFICATION and LOCKED for safety? The blueprint specifically mentioned BANNED, DISABLED, MISSING.
      // A locked user shouldn't be able to refresh? A locked user is temporarily locked from login, but their existing sessions might be valid. Banned/Disabled definitely kill sessions. Let's stick to the blueprint.

      if (rejectReason) {
        await SessionService.revokeSessionFamily(lockedSession.session_family_id, rejectReason, executor);
        await AuthenticationRepository.logEvent({
          event_category: 'refresh',
          event_type: 'SESSION_REFRESH_REJECTED',
          metadata: { reason: rejectReason, ipAddress: metadata.ipAddress, userAgent: metadata.userAgent },
          user_id: lockedSession.user_id
        }, executor);
        authRefreshTokenTotal.labels('failure').inc();
        return { success: false, error: { code: 'INVALID_GRANT', message: 'Invalid refresh token.' } };
      }

      // 6. Execute Rotation
      const newRawRefreshToken = crypto.randomBytes(32).toString('hex');
      const newRefreshTokenHash = SessionService.hashToken(newRawRefreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const successorSession = await SessionService.commitRotation(lockedSession, {
        refresh_token_hash: newRefreshTokenHash,
        expires_at: expiresAt,
        ip_address: metadata.ipAddress,
        user_agent: metadata.userAgent
      }, executor);

      // 7. Audit Logging
      await AuthenticationRepository.logEvent({
        event_category: 'refresh',
        event_type: 'TOKEN_REFRESHED',
        metadata: { ipAddress: metadata.ipAddress, userAgent: metadata.userAgent },
        user_id: user.id
      }, executor);

      // We pass the new raw token out
      return { success: true, finalSession: successorSession, finalUser: user, newRawRefreshToken };
    });

    if (!txResult.success) {
      return txResult; // INVALID_GRANT
    }

    authRefreshTokenTotal.labels('success').inc();

    // 9. Token Generation (Post-Commit)
    const jwtSecret = process.env.JWT_SECRET || 'dev_secret';
    const accessToken = jwt.sign(
      { sub: txResult.finalUser.id, sid: txResult.finalSession.id },
      jwtSecret,
      { expiresIn: '15m' }
    );

    // 10. Return
    return {
      success: true,
      data: {
        user: {
          id: txResult.finalUser.id,
          email: txResult.finalUser.email,
          status: txResult.finalUser.status,
          createdAt: txResult.finalUser.created_at
        },
        accessToken,
        refreshToken: txResult.newRawRefreshToken,
        expiresAt: txResult.finalSession.expires_at
      }
    };
  },

  /**
   * Orchestrates logging out a specific device (revoking its entire token lineage).
   * @param {string} sessionId 
   * @param {Object} metadata 
   * @returns {Promise<Object>} Result<T> contract
   */
  async logout(sessionId, metadata = {}) {
    const result = await withTransaction(async (executor) => {
      // 1. Lock and validate session idempotently
      const validation = await SessionService.lockAndValidateForLogout(sessionId, executor);
      if (validation.idempotent) {
        return { success: true };
      }

      // 2. Revoke entire session family for this device
      await SessionService.revokeSessionFamily(validation.session.session_family_id, 'LOGOUT', executor);

      // 3. Log Audit Event
      await AuthenticationRepository.logEvent({
        user_id: validation.session.user_id,
        event_category: 'logout',
        event_type: 'LOGOUT_SUCCESS',
        metadata: { 
          sessionId,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent
        }
      }, executor);

      return { success: true };
    });
    authLogoutTotal.labels('single').inc();
    return result;
  },

  /**
   * Orchestrates logging out all devices for a user.
   * @param {string} userId 
   * @param {Object} metadata 
   * @returns {Promise<Object>} Result<T> contract
   */
  async logoutAll(userId, metadata = {}) {
    const result = await withTransaction(async (executor) => {
      // 1. Revoke all sessions
      const { rowsAffected } = await SessionService.revokeAllSessionsForUser(userId, executor);

      // 2. Idempotent short-circuit
      if (rowsAffected === 0) {
        return { success: true };
      }

      // 3. Log Audit Event
      await AuthenticationRepository.logEvent({
        user_id: userId,
        event_category: 'logout',
        event_type: 'LOGOUT_ALL_SUCCESS',
        metadata: { 
          rowsAffected,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent
        }
      }, executor);

      return { success: true };
    });
    authLogoutTotal.labels('all').inc();
    return result;
  },

  /**
   * Orchestrates the dispatch of a secure password recovery token.
   * Always returns { success: true } regardless of whether the email exists
   * to prevent user enumeration.
   * @param {string} email
   * @param {Object} metadata
   * @returns {Promise<{ success: true }>}
   */
  async forgotPassword(email, metadata = {}) {
    // 1. Normalize
    const normalizedEmail = (email || '').toLowerCase().trim();

    // 2. Hash computation outside transaction — no DB locks held during crypto
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + config.auth.passwordResetExpiryMs);

    // 3. User lookup outside transaction
    const user = await IdentityService.findByEmail(normalizedEmail);

    // 4a. Unknown email — audit for operational consistency, return identically
    if (!user) {
      await withTransaction(async (executor) => {
        await AuthenticationRepository.logEvent({
          user_id: null,
          event_category: 'password_reset',
          event_type: 'PASSWORD_RESET_REQUESTED',
          metadata: { reason: 'UNKNOWN_EMAIL', ipAddress: metadata.ipAddress, userAgent: metadata.userAgent }
        }, executor);
      });
      authPasswordResetRequestTotal.labels('unknown_email').inc();
      return { success: true };
    }

    // 4b. Disabled/banned account — audit internally, return identically
    if (user.status === USER_STATUS.BANNED || user.status === USER_STATUS.DISABLED) {
      await withTransaction(async (executor) => {
        await AuthenticationRepository.logEvent({
          user_id: user.id,
          event_category: 'password_reset',
          event_type: 'PASSWORD_RESET_REJECTED',
          metadata: { reason: 'ACCOUNT_DISABLED', ipAddress: metadata.ipAddress, userAgent: metadata.userAgent }
        }, executor);
      });
      authPasswordResetRequestTotal.labels('account_disabled').inc();
      return { success: true };
    }

    // 4c. Resend Protection: 60-second cooldown
    if (user.last_reset_request_at) {
      const lastRequestTime = new Date(user.last_reset_request_at).getTime();
      const diffMs = Date.now() - lastRequestTime;
      if (diffMs < 60000) {
        const waitSeconds = Math.ceil((60000 - diffMs) / 1000);
        return {
          success: false,
          error: {
            code: 'THROTTLED',
            message: `Please wait ${waitSeconds} seconds before requesting another reset link.`
          }
        };
      }
    }

    // 5-10. Active user — begin transaction
    await withTransaction(async (executor) => {
      // 6. Lock user row to serialize concurrent requests
      await IdentityService.findByIdForUpdate(user.id, executor);

      // 7. Invalidate all outstanding reset tokens for this user
      await AuthenticationRepository.invalidateResetTokensForUser(user.id, executor);

      // 8. Persist new token
      await AuthenticationRepository.createResetToken({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt
      }, executor);

      // 9. Update last_reset_request_at
      await executor('users')
        .where({ id: user.id })
        .update({ last_reset_request_at: executor.fn.now() });

      // 10. Audit
      await AuthenticationRepository.logEvent({
        user_id: user.id,
        event_category: 'password_reset',
        event_type: 'PASSWORD_RESET_REQUESTED',
        metadata: { ipAddress: metadata.ipAddress, userAgent: metadata.userAgent }
      }, executor);
    });

    // 11. Post-commit email dispatch — failure does not affect caller
    try {
      await EmailService.sendPasswordResetConfirmation(normalizedEmail, rawToken);
    } catch (emailErr) {
      console.error('[AuthenticationService] Password reset email dispatch failed:', emailErr);
      try {
        await withTransaction(async (executor) => {
          await AuthenticationRepository.logEvent({
            user_id: user.id,
            event_category: 'password_reset',
            event_type: 'PASSWORD_RESET_EMAIL_FAILED',
            metadata: { error: emailErr.message, ipAddress: metadata.ipAddress }
          }, executor);
        });
      } catch (auditErr) {
        console.error('[AuthenticationService] Failed to write PASSWORD_RESET_EMAIL_FAILED audit event:', auditErr);
      }
    }

    authPasswordResetRequestTotal.labels('success').inc();
    return { success: true };
  },

  /**
   * Orchestrates the secure credential update triggered by a valid reset token.
   * Validates the token, enforces the password policy, hashes the new password,
   * consumes the token, revokes all sessions, and commits atomically.
   * @param {string} rawToken
   * @param {string} newPassword
   * @param {Object} metadata
   * @returns {Promise<{ success: boolean, error?: Object }>}
   */
  async resetPassword(rawToken, newPassword, metadata = {}) {
    // 1. Format validation — no DB access
    if (!rawToken || !newPassword) {
      return { success: false, error: { code: 'INVALID_REQUEST', message: 'Token and new password are required.' } };
    }

    // 2. Password policy enforcement — pure, synchronous, no IO
    const policyResult = PasswordPolicy.validate(newPassword);
    if (!policyResult.valid) {
      return { success: false, error: { code: 'PASSWORD_POLICY_VIOLATION', message: policyResult.message } };
    }

    // 3. Hash computation outside transaction — bcrypt must not hold DB locks
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const newPasswordHash = await bcrypt.hash(newPassword, config.auth.bcryptCost);

    // 4-13. All mutations inside one atomic transaction
    return await withTransaction(async (executor) => {
      // 5. Token lookup under row lock
      const tokenRecord = await AuthenticationRepository.findResetTokenForUpdate(tokenHash, executor);

      const auditReject = async (reason) => {
        await AuthenticationRepository.logEvent({
          user_id: tokenRecord?.user_id ?? null,
          event_category: 'password_reset',
          event_type: 'PASSWORD_RESET_REJECTED',
          metadata: { reason, ipAddress: metadata.ipAddress, userAgent: metadata.userAgent }
        }, executor);
        authPasswordResetTotal.labels('invalid_token').inc();
        return { success: false, error: { code: 'INVALID_TOKEN', message: 'The reset token is invalid, expired, or has already been used.' } };
      };

      if (!tokenRecord) return auditReject('TOKEN_NOT_FOUND');

      // 6. Token validation
      if (tokenRecord.consumed_at) return auditReject('TOKEN_CONSUMED');
      if (tokenRecord.invalidated_at) return auditReject('TOKEN_INVALIDATED');
      if (new Date(tokenRecord.expires_at) < new Date()) return auditReject('TOKEN_EXPIRED');

      // 7. User state check — inside transaction, same snapshot
      const user = await IdentityService.findById(tokenRecord.user_id, executor);

      if (!user) return auditReject('USER_NOT_FOUND');

      if (user.status === USER_STATUS.BANNED || user.status === USER_STATUS.DISABLED) {
        await AuthenticationRepository.logEvent({
          user_id: user.id,
          event_category: 'password_reset',
          event_type: 'PASSWORD_RESET_REJECTED',
          metadata: { reason: 'ACCOUNT_DISABLED', ipAddress: metadata.ipAddress, userAgent: metadata.userAgent }
        }, executor);
        authPasswordResetTotal.labels('account_disabled').inc();
        return { success: false, error: { code: 'ACCOUNT_DISABLED', message: 'This account is not eligible for password reset.' } };
      }

      // 8. Consume token atomically under the held row lock
      await AuthenticationRepository.consumeResetToken(tokenRecord.id, executor);

      // 9. Invalidate any other outstanding tokens for this user
      await AuthenticationRepository.invalidateResetTokensForUser(user.id, executor);

      // 10. Update password
      await IdentityService.updatePasswordHash(user.id, newPasswordHash, executor);

      // 11. Revoke all sessions — mandatory; failure rolls back the entire transaction
      await SessionService.revokeAllSessionsForUser(user.id, executor);

      // 12. Audit — written last; failure rolls back all preceding changes
      await AuthenticationRepository.logEvent({
        user_id: user.id,
        event_category: 'password_reset',
        event_type: 'PASSWORD_RESET_COMPLETED',
        metadata: { ipAddress: metadata.ipAddress, userAgent: metadata.userAgent }
      }, executor);

      return { success: true };
    });
    
    if (result.success) {
      authPasswordResetTotal.labels('success').inc();
    }
    return result;
  },

  /**
   * Orchestrates authenticated password changes.
   * @param {string} userId
   * @param {string} currentSessionId
   * @param {string} oldPassword
   * @param {string} newPassword
   * @param {Object} metadata
   * @returns {Promise<{ success: boolean, error?: Object }>}
   */
  async changePassword(userId, currentSessionId, oldPassword, newPassword, metadata = {}) {
    // 1. Format validation
    if (!userId || !currentSessionId || !oldPassword || !newPassword) {
      return { success: false, error: { code: 'INVALID_REQUEST', message: 'Missing required fields.' } };
    }
    if (oldPassword === newPassword) {
      return { success: false, error: { code: 'PASSWORD_UNCHANGED', message: 'New password must be different from the old password.' } };
    }

    // 2. Password policy enforcement
    const policyResult = PasswordPolicy.validate(newPassword);
    if (!policyResult.valid) {
      return { success: false, error: { code: 'PASSWORD_POLICY_VIOLATION', message: policyResult.message } };
    }

    // 3. User Lookup (Read-Only snapshot)
    const snapshotUser = await IdentityService.findById(userId);

    const auditRejectOutside = async (reason) => {
      await withTransaction(async (executor) => {
        await AuthenticationRepository.logEvent({
          user_id: userId,
          event_category: 'password_change',
          event_type: 'PASSWORD_CHANGE_REJECTED',
          metadata: { reason, ipAddress: metadata.ipAddress, userAgent: metadata.userAgent }
        }, executor);
      });
    };

    if (!snapshotUser) {
      await auditRejectOutside('USER_NOT_FOUND');
      authPasswordChangeTotal.labels('user_not_found').inc();
      return { success: false, error: { code: 'INVALID_REQUEST', message: 'User not found.' } };
    }

    if (snapshotUser.status === USER_STATUS.BANNED || snapshotUser.status === USER_STATUS.DISABLED) {
      await auditRejectOutside('ACCOUNT_DISABLED');
      authPasswordChangeTotal.labels('account_disabled').inc();
      return { success: false, error: { code: 'ACCOUNT_DISABLED', message: 'This account is not eligible for password change.' } };
    }

    // 4. Credential Verification
    const isOldPasswordValid = await IdentityService.comparePassword(oldPassword, snapshotUser.password_hash);
    if (!isOldPasswordValid) {
      await auditRejectOutside('INVALID_CREDENTIALS');
      authPasswordChangeTotal.labels('invalid_credentials').inc();
      return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect current password.' } };
    }

    // 5. Hash Computation
    const newPasswordHash = await bcrypt.hash(newPassword, config.auth.bcryptCost);

    // 6-12. Transaction
    return await withTransaction(async (executor) => {
      // 7. Lock user row
      const lockedUser = await IdentityService.findByIdForUpdate(userId, executor);

      const auditRejectInside = async (reason) => {
        await AuthenticationRepository.logEvent({
          user_id: userId,
          event_category: 'password_change',
          event_type: 'PASSWORD_CHANGE_REJECTED',
          metadata: { reason, ipAddress: metadata.ipAddress, userAgent: metadata.userAgent }
        }, executor);
      };

      // 8. Lock-time Re-validation
      if (lockedUser.status === USER_STATUS.BANNED || lockedUser.status === USER_STATUS.DISABLED) {
        await auditRejectInside('ACCOUNT_DISABLED');
        return { success: false, error: { code: 'ACCOUNT_DISABLED', message: 'This account is not eligible for password change.' } };
      }

      if (lockedUser.password_hash !== snapshotUser.password_hash) {
        await auditRejectInside('STALE_CREDENTIALS');
        return { success: false, error: { code: 'STALE_CREDENTIALS', message: 'Password was already changed concurrently.' } };
      }

      // 9. Update password
      await IdentityService.updatePasswordHash(userId, newPasswordHash, executor);

      // 10. Session Policy Execution
      await SessionService.revokeAllSessionsExceptCurrent(userId, currentSessionId, executor);

      // 11. Audit Log
      await AuthenticationRepository.logEvent({
        user_id: userId,
        event_category: 'password_change',
        event_type: 'PASSWORD_CHANGE_COMPLETED',
        metadata: { ipAddress: metadata.ipAddress, userAgent: metadata.userAgent }
      }, executor);

      return { success: true };
    });

    if (result.success) {
      authPasswordChangeTotal.labels('success').inc();
    }
    return result;
  }
};
