import db from '../db.js';
import { IdentityService } from './identityService.js';
import { SessionService } from './sessionService.js';
import { EmailVerificationService } from './emailVerificationService.js';
import { EmailService } from './emailService.js';
import { NotificationService } from './notificationService.js';
import { OtpService } from './otpService.js';
import { PasswordPolicy } from './passwordPolicy.js';
import { UserPreferencesService } from './userPreferencesService.js';
import { AuthenticationRepository } from '../repositories/authenticationRepository.js';
import OAuthRepository from '../repositories/oauthRepository.js';
import { RbacRepository } from '../repositories/rbacRepository.js';
import { withTransaction } from '../utils/dbRetry.js';
import { UniqueConstraintViolation } from '../utils/dbErrors.js';
import { USER_STATUS } from '../constants/userStatus.js';
import redisClient from '../redisClient.js';
import config from '../config/index.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

import { 
  authLoginSuccessTotal, authSignupTotal, authAccountLinkedTotal, 
  authAccountUnlinkedTotal, authLoginFailureTotal,
  authRefreshTokenTotal, authLogoutTotal, authPasswordResetRequestTotal,
  authPasswordChangeTotal, authTokenReplayDetectedTotal, authPasswordResetTotal
} from '../utils/metrics.js';

export const AuthenticationService = {
  /**
   * Orchestrates the local user registration workflow.
   * Issues 6-digit Verification OTP via OtpService within the transaction boundary,
   * and dispatches the verification email via NotificationService post-commit outside transaction.
   */
  async registerLocal(email, rawPassword, profileData = {}, metadata = {}) {
    // 1. Normalize and structurally validate
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !rawPassword || typeof rawPassword !== 'string' || rawPassword.length < 8) {
      return { success: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid email or password.' } };
    }

    if (metadata.agreed === false) {
      return { success: false, error: { code: 'TERMS_AGREEMENT_REQUIRED', message: 'You must agree to the Terms of Service and Privacy Policy to register.' } };
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
    let rawOtp;
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
          agreed_to_terms: true,
          agreed_to_terms_at: new Date(),
          ...sanitizedProfileData
        };

        identity = await IdentityService.createIdentity(identityDto, executor);

        // Issue 6-digit Verification OTP via OtpService within the active transaction
        const otpResult = await OtpService.issueVerificationOtp(identity.id, metadata, executor);
        if (otpResult.success) {
          rawOtp = otpResult.rawOtp;
        }

        // Backward compatible token generation for legacy link support
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

    // 5. Post-commit email dispatch OUTSIDE transaction
    let warnings = [];
    if (rawOtp) {
      try {
        await NotificationService.notifyUser(normalizedEmail, 'VERIFY_EMAIL', {
          userName: identity.name || normalizedEmail.split('@')[0],
          otpCode: rawOtp,
          token: rawToken
        });
      } catch (emailErr) {
        logger.error('[AuthenticationService] Email verification dispatch failed for registerLocal:', emailErr);
        warnings.push('VERIFICATION_EMAIL_FAILED');
      }
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
   * Orchestrates email verification via 6-digit OTP or legacy token string.
   */
  async verifyEmail(inputTokenOrOtp, arg2 = {}, arg3 = null) {
    if (!inputTokenOrOtp || typeof inputTokenOrOtp !== 'string') {
      return { success: false, error: { code: 'INVALID_INPUT', message: 'Verification token or OTP code is required.' } };
    }

    // Dynamic argument resolution: supports (code, email, metadata) and (code, metadata, email)
    let metadata = {};
    let email = null;

    if (typeof arg2 === 'string') {
      email = arg2;
      metadata = typeof arg3 === 'object' && arg3 !== null ? arg3 : {};
    } else {
      metadata = typeof arg2 === 'object' && arg2 !== null ? arg2 : {};
      email = typeof arg3 === 'string' ? arg3 : (metadata.email || null);
    }

    const trimmedInput = inputTokenOrOtp.trim();
    let userToWelcome = null;

    // Route A: 6-digit OTP Verification
    if (/^\d{6}$/.test(trimmedInput)) {
      if (!email) {
        return { success: false, error: { code: 'INVALID_INPUT', message: 'Email address is required for OTP verification.' } };
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = await IdentityService.findByEmail(normalizedEmail);
      if (!user) {
        return { success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found.' } };
      }

      if (user.status === USER_STATUS.ACTIVE) {
        return { success: true, alreadyVerified: true };
      }

      const otpResult = await OtpService.verifyVerificationOtp(user.id, trimmedInput);
      if (!otpResult.success) {
        return otpResult;
      }

      // Activate user upon successful OTP verification
      await withTransaction(async (executor) => {
        await IdentityService.changeStatus(user.id, USER_STATUS.ACTIVE, executor);
        await AuthenticationRepository.logEvent({
          event_category: 'email_verification',
          event_type: 'verification_success',
          metadata: { ipAddress: metadata.ipAddress, userAgent: metadata.userAgent, method: 'OTP' },
          user_id: user.id
        }, executor);
      });

      userToWelcome = user;
    } else {
      // Route B: Legacy Token String Verification
      const result = await withTransaction(async (executor) => {
        const tokenHash = crypto.createHash('sha256').update(trimmedInput).digest('hex');
        const tokenEntity = await AuthenticationRepository.findVerificationTokenForUpdate(tokenHash, executor);

        if (!tokenEntity) {
          return { success: false, error: { code: 'TOKEN_INVALID', message: 'Verification token is invalid or does not exist.' } };
        }

        const user = await IdentityService.findByIdForUpdate(tokenEntity.user_id, executor);
        if (!user) {
          return { success: false, error: { code: 'USER_NOT_FOUND', message: 'User associated with token not found.' } };
        }

        if (user.status === USER_STATUS.ACTIVE) {
          return { success: true, alreadyVerified: true };
        }

        if (tokenEntity.consumed_at) {
          return { success: false, error: { code: 'TOKEN_CONSUMED', message: 'Verification token has already been used.' } };
        }

        if (new Date(tokenEntity.expires_at) < new Date()) {
          return { success: false, error: { code: 'TOKEN_EXPIRED', message: 'Verification token has expired.' } };
        }

        await AuthenticationRepository.consumeVerificationToken(tokenEntity.id, executor);
        await IdentityService.changeStatus(user.id, USER_STATUS.ACTIVE, executor);

        await AuthenticationRepository.logEvent({
          event_category: 'email_verification',
          event_type: 'verification_success',
          metadata: { ipAddress: metadata.ipAddress, userAgent: metadata.userAgent, method: 'LINK' },
          user_id: user.id
        }, executor);

        return { success: true, user };
      });

      if (!result.success) {
        return result;
      }
      if (result.alreadyVerified) {
        return { success: true, alreadyVerified: true };
      }
      userToWelcome = result.user;
    }

    if (userToWelcome) {
      NotificationService.notifyUser(userToWelcome.email, 'WELCOME', {
        userName: userToWelcome.name || userToWelcome.email.split('@')[0],
        dashboardUrl: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard`
      }).catch(err => logger.error('[AuthenticationService] Failed to send welcome email:', err));
    }

    return { success: true };
  },

  /**
   * Resends a verification OTP code and dispatches verification email outside transaction.
   */
  async resendVerification(email, metadata = {}) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const user = await IdentityService.findByEmail(normalizedEmail);

    if (!user) {
      return { success: true }; // Enumeration defense
    }

    if (user.status === USER_STATUS.ACTIVE) {
      return { success: false, error: { code: 'ALREADY_VERIFIED', message: 'Account is already verified.' } };
    }

    // Issue OTP via OtpService (enforces 60s cooldown)
    const issueResult = await OtpService.issueVerificationOtp(user.id, metadata);
    if (!issueResult.success) {
      return issueResult;
    }

    // Dispatch email OUTSIDE transaction
    try {
      await NotificationService.notifyUser(normalizedEmail, 'VERIFY_EMAIL', {
        userName: user.name || normalizedEmail.split('@')[0],
        otpCode: issueResult.rawOtp
      });
    } catch (emailErr) {
      logger.error('[AuthenticationService] Failed to send resend verification email:', emailErr);
    }

    return { success: true };
  },

  /**
   * Orchestrates the local login workflow, enforcing status limits and provisioning sessions.
   */
  async loginLocal(email, rawPassword, metadata = {}) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const user = await IdentityService.findByEmail(normalizedEmail);

    if (!user) {
      await withTransaction(async (executor) => {
        await AuthenticationRepository.logEvent({
          event_category: 'login',
          event_type: 'failure',
          metadata: { ipAddress: metadata.ipAddress, userAgent: metadata.userAgent, reason: 'UNKNOWN_USER' },
          user_id: null
        }, executor);
      });
      return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' } };
    }

    switch (user.status) {
      case USER_STATUS.PENDING_VERIFICATION:
        await withTransaction(async (executor) => {
          await AuthenticationRepository.logEvent({
            event_category: 'login',
            event_type: 'failure',
            metadata: { ipAddress: metadata.ipAddress, userAgent: metadata.userAgent, reason: 'EMAIL_NOT_VERIFIED' },
            user_id: user.id
          }, executor);
        });
        return { success: false, error: { code: 'EMAIL_NOT_VERIFIED', message: 'Email address is pending verification.' } };
      case USER_STATUS.DISABLED:
        return { success: false, error: { code: 'ACCOUNT_DISABLED', message: 'Account is disabled.' } };
      case USER_STATUS.BANNED:
        return { success: false, error: { code: 'ACCOUNT_BANNED', message: 'Account is banned.' } };
      case USER_STATUS.LOCKED:
        return { success: false, error: { code: 'ACCOUNT_LOCKED', message: 'Account is locked.' } };
      case USER_STATUS.SOFT_DELETED:
        return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' } };
    }

    const isValid = await IdentityService.comparePassword(rawPassword, user.password_hash);

    if (!isValid) {
      await withTransaction(async (executor) => {
        await IdentityService.recordFailedLogin(user.id, executor);
        await AuthenticationRepository.logEvent({
          event_category: 'login',
          event_type: 'failure',
          metadata: { ipAddress: metadata.ipAddress, userAgent: metadata.userAgent },
          user_id: user.id
        }, executor);
      });
      authLoginFailureTotal.labels('invalid_credentials', 'local').inc();
      return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' } };
    }

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

    // Trigger security login alert asynchronously (checks user preferences first)
    this._triggerLoginAlert(user, metadata).catch(err => 
      logger.error('[AuthenticationService] Failed to send login alert for loginLocal:', err)
    );

    return { success: true, data: sessionResult };
  },
  
  async loginOAuth(normalizedProfile, metadata = {}) {
    const { provider, providerUserId, email, name } = normalizedProfile;
    
    try {
      let sessionResult;
      let user;

      const linkedAccount = await OAuthRepository.findByProvider(provider, providerUserId);
      if (linkedAccount) {
        user = await IdentityService.findById(linkedAccount.user_id);
        if (!user) {
          return { success: false, error: { code: 'USER_NOT_FOUND', message: 'Linked user account no longer exists.' } };
        }
        if (user.status === USER_STATUS.BANNED || user.status === USER_STATUS.DISABLED) {
          return { success: false, error: { code: 'ACCOUNT_DISABLED', message: 'Account is disabled or banned.' } };
        }
        
        await OAuthRepository.touchLastLogin(linkedAccount.id);
        
        sessionResult = await withTransaction(async (executor) => {
          if (!user.avatar_url && normalizedProfile.metadata?.picture) {
            await IdentityService.updateIdentity(user.id, { avatar_url: normalizedProfile.metadata.picture }, executor);
            user.avatar_url = normalizedProfile.metadata.picture;
          }
          await IdentityService.updateLastLogin(user.id, executor);
          return await AuthenticationService._establishSession(user, [provider], metadata, executor);
        });
        
        authLoginSuccessTotal.labels(provider, provider).inc();
        
        this._triggerLoginAlert(user, metadata).catch(err => 
          logger.error('[AuthenticationService] Failed to send login alert for loginOAuth (linked):', err)
        );

        return { success: true, data: sessionResult };
      }

      const normalizedEmail = email.trim().toLowerCase();
      user = await IdentityService.findByEmail(normalizedEmail);

      await withTransaction(async (executor) => {
        if (user) {
          if (user.status === USER_STATUS.BANNED || user.status === USER_STATUS.DISABLED) {
            const err = new Error('ACCOUNT_DISABLED');
            err.code = 'ACCOUNT_DISABLED';
            throw err;
          }
          await OAuthRepository.linkProvider(user.id, normalizedProfile, executor);
          authAccountLinkedTotal.labels(provider).inc();
          
          if (!user.avatar_url && normalizedProfile.metadata?.picture) {
            await IdentityService.updateIdentity(user.id, { avatar_url: normalizedProfile.metadata.picture }, executor);
            user.avatar_url = normalizedProfile.metadata.picture;
          }

          if (normalizedProfile.emailVerified && user.status === USER_STATUS.PENDING_VERIFICATION) {
            await IdentityService.changeStatus(user.id, USER_STATUS.ACTIVE, executor);
            user.status = USER_STATUS.ACTIVE;
          }
        } else {
          const defaultRole = await RbacRepository.getRoleByName('User', executor);
          const identityDto = {
            email: normalizedEmail,
            passwordHash: null,
            status: normalizedProfile.emailVerified ? USER_STATUS.ACTIVE : USER_STATUS.PENDING_VERIFICATION,
            roleId: defaultRole.id,
            name: name,
            avatar_url: normalizedProfile.metadata?.picture || null
          };
          user = await IdentityService.createIdentity(identityDto, executor);
          await OAuthRepository.linkProvider(user.id, normalizedProfile, executor);
          
          await AuthenticationRepository.logEvent({
            event_type: 'USER_REGISTERED',
            event_category: 'AUTHENTICATION',
            user_id: user.id,
            metadata: JSON.stringify({ provider, ipAddress: metadata.ipAddress })
          }, executor);
          authSignupTotal.labels(provider).inc();
        }
      });

      sessionResult = await withTransaction(async (executor) => {
        await IdentityService.updateLastLogin(user.id, executor);
        return await AuthenticationService._establishSession(user, [provider], metadata, executor);
      });

      authLoginSuccessTotal.labels(provider, provider).inc();
      
      this._triggerLoginAlert(user, metadata).catch(err => 
        logger.error('[AuthenticationService] Failed to send login alert for loginOAuth (new/link):', err)
      );

      return { success: true, data: sessionResult };

    } catch (e) {
      if (e.code === 'ACCOUNT_DISABLED') {
        return { success: false, error: { code: 'ACCOUNT_DISABLED', message: 'Account is disabled or banned.' } };
      }
      throw e;
    }
  },

  /**
   * Request password reset code (issues 6-digit OTP and dispatches email outside transaction).
   */
  async forgotPassword(email, metadata = {}) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const user = await IdentityService.findByEmail(normalizedEmail);

    if (!user || user.status === USER_STATUS.BANNED || user.status === USER_STATUS.DISABLED) {
      return { success: true }; // Enumeration defense
    }

    // ── Unverified account: redirect user to email verification instead ──
    // Resetting password on an unverified account is meaningless because they
    // still cannot log in until they verify. Resend their verification OTP
    // and tell the frontend to redirect to /verify-email.
    if (user.status === USER_STATUS.PENDING_VERIFICATION) {
      const verifyResult = await OtpService.issueVerificationOtp(user.id, metadata);
      if (verifyResult.success) {
        try {
          await NotificationService.notifyUser(normalizedEmail, 'VERIFY_EMAIL', {
            userName: user.name || normalizedEmail.split('@')[0],
            otpCode: verifyResult.rawOtp
          });
        } catch (emailErr) {
          logger.error('[AuthenticationService] Failed to send verification email during forgotPassword redirect:', emailErr);
        }
      }
      // Return a specific error code — frontend navigates to /verify-email
      return {
        success: false,
        error: {
          code: 'ACCOUNT_NOT_VERIFIED',
          message: 'Your account email is not verified. A new verification code has been sent to your inbox.'
        }
      };
    }

    const issueResult = await OtpService.issuePasswordResetOtp(user.id, metadata);
    if (!issueResult.success) {
      return issueResult;
    }

    // Post-commit email dispatch OUTSIDE transaction
    try {
      await NotificationService.notifyUser(normalizedEmail, 'FORGOT_PASSWORD', {
        userName: user.name || normalizedEmail.split('@')[0],
        otpCode: issueResult.rawOtp
      });
    } catch (emailErr) {
      logger.error('[AuthenticationService] Failed to dispatch password reset email:', emailErr);
    }

    authPasswordResetRequestTotal.labels('success').inc();
    return { success: true };
  },

  /**
   * Verifies a 6-digit Password Reset OTP code and issues a 5-minute Reset Grant Token.
   */
  async verifyPasswordResetOtp(email, rawOtp, metadata = {}) {
    if (!email || !rawOtp) {
      return { success: false, error: { code: 'INVALID_INPUT', message: 'Email and OTP code are required.' } };
    }

    const user = await IdentityService.findByEmail(email.trim().toLowerCase());
    if (!user) {
      return { success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found.' } };
    }

    return await OtpService.verifyPasswordResetOtp(user.id, rawOtp);
  },

  /**
   * Completes password reset using a 5-minute Reset Grant Token.
   * Validates grant token, updates password hash, and revokes all active sessions.
   */
  async resetPasswordWithGrantToken(email, resetGrantToken, newPassword, metadata = {}) {
    if (!email || !resetGrantToken || !newPassword) {
      return { success: false, error: { code: 'INVALID_INPUT', message: 'Missing required parameters.' } };
    }

    const policyResult = PasswordPolicy.validate(newPassword);
    if (!policyResult.valid) {
      return { success: false, error: { code: 'PASSWORD_POLICY_VIOLATION', message: policyResult.message } };
    }

    const user = await IdentityService.findByEmail(email.trim().toLowerCase());
    if (!user) {
      return { success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found.' } };
    }

    const grantResult = await OtpService.verifyResetGrantToken(user.id, resetGrantToken);
    if (!grantResult.success) {
      return grantResult;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, config.auth.bcryptCost);

    return await withTransaction(async (executor) => {
      await IdentityService.updatePasswordHash(user.id, newPasswordHash, executor);
      await SessionService.revokeAllSessionsForUser(user.id, executor);

      // Auto-activate unverified accounts — the reset OTP proves email ownership.
      // Without this, the user resets their password but still cannot log in.
      if (user.status === USER_STATUS.PENDING_VERIFICATION) {
        await IdentityService.changeStatus(user.id, USER_STATUS.ACTIVE, executor);
        logger.info(`[AuthenticationService] Auto-activated PENDING_VERIFICATION account '${user.id}' via password reset grant token.`);
      }

      await AuthenticationRepository.logEvent({
        user_id: user.id,
        event_category: 'password_reset',
        event_type: 'PASSWORD_RESET_COMPLETED',
        metadata: { ipAddress: metadata.ipAddress, userAgent: metadata.userAgent }
      }, executor);

      return { success: true };
    });
  },

  /**
   * Preserves legacy token-based password reset for backward compatibility.
   */
  async resetPassword(rawToken, newPassword, metadata = {}) {
    if (!rawToken || !newPassword) {
      return { success: false, error: { code: 'INVALID_REQUEST', message: 'Token and new password are required.' } };
    }

    const policyResult = PasswordPolicy.validate(newPassword);
    if (!policyResult.valid) {
      return { success: false, error: { code: 'PASSWORD_POLICY_VIOLATION', message: policyResult.message } };
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const newPasswordHash = await bcrypt.hash(newPassword, config.auth.bcryptCost);

    return await withTransaction(async (executor) => {
      const tokenRecord = await AuthenticationRepository.findResetTokenForUpdate(tokenHash, executor);
      if (!tokenRecord || tokenRecord.consumed_at || new Date(tokenRecord.expires_at) < new Date()) {
        return { success: false, error: { code: 'INVALID_TOKEN', message: 'Reset token is invalid or expired.' } };
      }

      const user = await IdentityService.findById(tokenRecord.user_id, executor);
      if (!user) return { success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found.' } };

      await AuthenticationRepository.consumeResetToken(tokenRecord.id, executor);
      await IdentityService.updatePasswordHash(user.id, newPasswordHash, executor);
      await SessionService.revokeAllSessionsForUser(user.id, executor);

      await AuthenticationRepository.logEvent({
        user_id: user.id,
        event_category: 'password_reset',
        event_type: 'PASSWORD_RESET_COMPLETED',
        metadata: { ipAddress: metadata.ipAddress, userAgent: metadata.userAgent }
      }, executor);

      return { success: true };
    });
  },

  /**
   * Internal session provisioning helper.
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

    await executor('login_history').insert({
      user_id: user.id,
      session_family_id: session.session_family_id,
      login_method: amrArray.includes('google') ? 'google' : 'local',
      device_type: metadata.deviceType || 'Unknown',
      os_name: metadata.osName || 'Unknown',
      browser_name: metadata.browserName || 'Unknown'
    });

    await AuthenticationRepository.logEvent({
      event_category: 'login',
      event_type: 'success',
      metadata: { ipAddress: metadata.ipAddress, userAgent: metadata.userAgent, amr: amrArray },
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

  async refreshToken(rawRefreshToken, metadata = {}) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      return { success: false, error: { code: 'INVALID_REQUEST', message: 'Malformed refresh token.' } };
    }
    const refreshTokenHash = SessionService.hashToken(rawRefreshToken);

    const txResult = await withTransaction(async (executor) => {
      const validationResult = await SessionService.lockAndValidateForRotation(refreshTokenHash, executor);

      if (!validationResult.success) {
        const errCode = validationResult.error.code;
        if (errCode === 'REPLAY_ATTACK_DETECTED') {
          authTokenReplayDetectedTotal.inc();
          await SessionService.revokeSessionFamily(validationResult.error.sessionFamilyId, 'REPLAY_ATTACK', executor);
        }
        return { success: false, error: { code: 'INVALID_GRANT', message: 'Invalid refresh token.' } };
      }

      const lockedSession = validationResult.data;
      const user = await IdentityService.findById(lockedSession.user_id, executor);

      if (!user || user.status === USER_STATUS.BANNED || user.status === USER_STATUS.DISABLED) {
        await SessionService.revokeSessionFamily(lockedSession.session_family_id, 'ACCOUNT_INACTIVE', executor);
        return { success: false, error: { code: 'INVALID_GRANT', message: 'Invalid refresh token.' } };
      }

      const newRawRefreshToken = crypto.randomBytes(32).toString('hex');
      const newRefreshTokenHash = SessionService.hashToken(newRawRefreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const successorSession = await SessionService.commitRotation(lockedSession, {
        refresh_token_hash: newRefreshTokenHash,
        expires_at: expiresAt,
        ip_address: metadata.ipAddress,
        user_agent: metadata.userAgent
      }, executor);

      return { success: true, finalSession: successorSession, finalUser: user, newRawRefreshToken };
    });

    if (!txResult.success) return txResult;

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret';
    const accessToken = jwt.sign(
      { sub: txResult.finalUser.id, sid: txResult.finalSession.id },
      jwtSecret,
      { expiresIn: '15m' }
    );

    return {
      success: true,
      data: {
        user: { id: txResult.finalUser.id, email: txResult.finalUser.email, status: txResult.finalUser.status, createdAt: txResult.finalUser.created_at },
        accessToken,
        refreshToken: txResult.newRawRefreshToken,
        expiresAt: txResult.finalSession.expires_at
      }
    };
  },

  async logout(sessionId, metadata = {}) {
    return await withTransaction(async (executor) => {
      const validation = await SessionService.lockAndValidateForLogout(sessionId, executor);
      if (validation.idempotent) return { success: true };
      await SessionService.revokeSessionFamily(validation.session.session_family_id, 'LOGOUT', executor);
      return { success: true };
    });
  },

  async logoutAll(userId, metadata = {}) {
    return await withTransaction(async (executor) => {
      const { rowsAffected } = await SessionService.revokeAllSessionsForUser(userId, executor);
      return { success: true };
    });
  },

  async changePassword(userId, currentSessionId, oldPassword, newPassword, metadata = {}) {
    if (!userId || !currentSessionId || !oldPassword || !newPassword) {
      return { success: false, error: { code: 'INVALID_REQUEST', message: 'Missing required fields.' } };
    }

    const policyResult = PasswordPolicy.validate(newPassword);
    if (!policyResult.valid) {
      return { success: false, error: { code: 'PASSWORD_POLICY_VIOLATION', message: policyResult.message } };
    }

    const snapshotUser = await IdentityService.findById(userId);
    if (!snapshotUser) {
      return { success: false, error: { code: 'INVALID_REQUEST', message: 'User not found.' } };
    }

    const isOldPasswordValid = await IdentityService.comparePassword(oldPassword, snapshotUser.password_hash);
    if (!isOldPasswordValid) {
      return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect current password.' } };
    }

    const newPasswordHash = await bcrypt.hash(newPassword, config.auth.bcryptCost);

    return await withTransaction(async (executor) => {
      await IdentityService.updatePasswordHash(userId, newPasswordHash, executor);
      await SessionService.revokeAllSessionsExceptCurrent(userId, currentSessionId, executor);
      return { success: true };
    });
  },

  async _triggerLoginAlert(user, metadata = {}) {
    try {
      const prefs = await UserPreferencesService.getPreferences(user.id);
      if (prefs.notification_settings?.security_alerts !== false) {
        const browser = metadata.browserName || metadata.userAgent || 'Unknown Browser';
        const os = metadata.osName || 'Unknown OS';
        
        await NotificationService.notifyUser(user.email, 'LOGIN_ALERT', {
          userName: user.name || user.email.split('@')[0],
          ipAddress: metadata.ipAddress || '127.0.0.1',
          userAgent: metadata.userAgent || 'Unknown User Agent',
          browser,
          os,
          location: metadata.location || 'Unknown Location'
        });
      }
    } catch (err) {
      logger.error(`[AuthenticationService] Failed to trigger login alert for user ${user.id}:`, err);
    }
  }
};
