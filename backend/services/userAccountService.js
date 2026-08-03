import fs from 'fs';
import path from 'path';
import db from '../db.js';
import { UserRepository } from '../repositories/userRepository.js';
import { OAuthRepository } from '../repositories/OAuthRepository.js';
import { SessionService } from './sessionService.js';
import { IdentityService } from './identityService.js';
import { OtpService } from './otpService.js';
import { EmailService } from './emailService.js';
import { UserProfileService } from './userProfileService.js';
import { OwnershipService } from './ownershipService.js';
import { enqueue } from '../utils/queue.js';
import { generateAccountExportJob } from '../jobs/accountJobs.js';
import { ValidationError, NotFoundError, ConflictError, UnauthorizedError } from '../utils/errors.js';
import { withTransaction } from '../utils/dbRetry.js';

/**
 * UserAccountService: Handles account lifecycle, email change, security operations,
 * session revocation, login history, OAuth management, data export, and self-deletion.
 */
export const UserAccountService = {
  /**
   * Initiates email change workflow by dispatching verification OTP to the target new email address.
   */
  async requestEmailChange(userId, newEmail) {
    if (!newEmail || typeof newEmail !== 'string') {
      throw new ValidationError('Valid new email address is required.');
    }

    const normalizedNew = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedNew)) {
      throw new ValidationError('Invalid email address format.');
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User account not found.');
    }

    if (user.email.toLowerCase() === normalizedNew) {
      throw new ValidationError('New email address must be different from current email.');
    }

    const existingWithEmail = await UserRepository.findByEmail(normalizedNew);
    if (existingWithEmail) {
      throw new ConflictError('Email address is already registered to another account.');
    }

    // Generate 6-digit OTP for email change verification
    const otpResult = await OtpService.issueOtp(userId, 'EMAIL_CHANGE', { newEmail: normalizedNew });

    // Send verification OTP to new email address
    await EmailService.sendEmail({
      to: normalizedNew,
      subject: 'Verify Your New Email Address',
      text: `Your email change verification code is ${otpResult.otpCode}. It expires in 15 minutes.`
    });

    return { message: 'Verification code sent to your new email address.', expiresAt: otpResult.expiresAt };
  },

  /**
   * Verifies OTP and updates user's primary email address upon success.
   */
  async verifyEmailChange(userId, newEmail, otpCode) {
    const normalizedNew = (newEmail || '').trim().toLowerCase();

    return await withTransaction(async (executor) => {
      const isOtpValid = await OtpService.verifyOtp(userId, 'EMAIL_CHANGE', otpCode, executor);
      if (!isOtpValid) {
        throw new ValidationError('Invalid or expired verification code.');
      }

      const existing = await UserRepository.findByEmail(normalizedNew, executor);
      if (existing && existing.id !== userId) {
        throw new ConflictError('Email address is already in use by another account.');
      }

      await UserRepository.updateEmail(userId, normalizedNew, executor);
      return { message: 'Email address updated successfully.', email: normalizedNew };
    });
  },

  /**
   * Retrieves active sessions for the user.
   */
  async getActiveSessions(userId) {
    return SessionService.getActiveSessions(userId);
  },

  /**
   * Revokes a specific active session family after verifying ownership.
   */
  async revokeSession(userId, sessionId) {
    return await withTransaction(async (executor) => {
      const lockResult = await SessionService.lockAndValidateForLogout(sessionId, executor);
      
      OwnershipService.verifyOwnership({
        actorId: userId,
        ownerId: lockResult.session?.user_id,
        hideExistence: true
      });

      await SessionService.revokeSessionFamily(lockResult.session.session_family_id, 'USER_REVOKED_SESSION', executor);
      return { message: 'Session revoked successfully.' };
    });
  },

  /**
   * Revokes all active session families for the user except the current active session.
   */
  async revokeAllOtherSessions(userId, currentSessionId) {
    return await withTransaction(async (executor) => {
      const sessions = await SessionService.getActiveSessions(userId);
      let count = 0;

      for (const session of sessions) {
        if (session.id !== currentSessionId) {
          try {
            await SessionService.revokeSessionFamily(session.session_family_id, 'USER_REVOKED_OTHER_SESSIONS', executor);
            count++;
          } catch (e) {}
        }
      }
      return { message: `Revoked ${count} other active sessions.`, count };
    });
  },

  /**
   * Retrieves paginated login history for the user.
   */
  async getLoginHistory(userId, { limit = 20, page = 1 } = {}) {
    const parsedLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
    const parsedPage = Math.max(1, Number(page) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const query = db('login_history').where({ user_id: userId });

    const [countResult, records] = await Promise.all([
      query.clone().count('* as total').first(),
      query.clone()
        .select('id', 'login_method', 'device_type', 'os_name', 'browser_name', 'location_city', 'occurred_at')
        .orderBy('occurred_at', 'desc')
        .limit(parsedLimit)
        .offset(offset)
    ]);

    return {
      total: Number(countResult?.total || 0),
      limit: parsedLimit,
      page: parsedPage,
      history: records
    };
  },

  /**
   * Retrieves security audit events for the user.
   */
  async getSecurityEvents(userId, { limit = 20, page = 1 } = {}) {
    const parsedLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
    const parsedPage = Math.max(1, Number(page) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const query = db('audit_logs').where({ target_user_id: userId });

    const [countResult, records] = await Promise.all([
      query.clone().count('* as total').first(),
      query.clone()
        .select('id', 'action', 'severity', 'ip_address', 'occurred_at', 'metadata')
        .orderBy('occurred_at', 'desc')
        .limit(parsedLimit)
        .offset(offset)
    ]);

    return {
      total: Number(countResult?.total || 0),
      limit: parsedLimit,
      page: parsedPage,
      events: records
    };
  },

  /**
   * Retrieves linked OAuth provider accounts for the user.
   */
  async getConnectedOAuthAccounts(userId) {
    const accounts = await OAuthRepository.findByUser(userId);
    return accounts.map((acc) => ({
      provider: acc.provider,
      provider_user_id: acc.provider_user_id,
      email: acc.email,
      is_email_verified: acc.is_email_verified,
      created_at: acc.created_at,
      last_login_at: acc.last_login_at
    }));
  },

  /**
   * Unlinks a specified OAuth provider account.
   */
  async unlinkOAuthAccount(userId, provider) {
    return await withTransaction(async (executor) => {
      const user = await UserRepository.findById(userId, executor);
      if (!user) {
        throw new NotFoundError('User account not found.');
      }

      // Prevent unlinking OAuth if user has no password and this is their only provider
      const linked = await OAuthRepository.findByUser(userId, executor);
      if (linked.length <= 1 && !user.password_hash) {
        throw new ValidationError('Cannot unlink your only authentication method. Please set a password first.');
      }

      await OAuthRepository.unlinkProvider(userId, provider, executor);
      return { message: `${provider} account unlinked successfully.` };
    });
  },

  /**
   * Enqueues an asynchronous account data export job into user_account_exports table.
   * Returns HTTP 202 status metadata with exportId.
   */
  async requestAccountExport(userId) {
    return await withTransaction(async (executor) => {
      const [exportRecord] = await executor('user_account_exports')
        .insert({
          user_id: userId,
          status: 'PENDING'
        })
        .returning('*');

      const exportId = exportRecord.id;

      try {
        await enqueue('GENERATE_ACCOUNT_EXPORT', { exportId, userId });
      } catch (e) {
        // Fallback execution if background queue worker is running in inline mode
        generateAccountExportJob({ exportId, userId }).catch(() => {});
      }

      return {
        exportId,
        status: 'PENDING',
        message: 'Account data export request accepted and processing asynchronously.'
      };
    });
  },

  /**
   * Checks status of an asynchronous account data export.
   */
  async getAccountExportStatus(userId, exportId) {
    const record = await db('user_account_exports').where({ id: exportId, user_id: userId }).first();
    if (!record) {
      throw new NotFoundError('Export request not found.');
    }

    return {
      exportId: record.id,
      status: record.status,
      downloadToken: record.status === 'COMPLETED' ? record.download_token : null,
      expiresAt: record.expires_at,
      created_at: record.created_at
    };
  },

  /**
   * Validates download token and returns local file path for export archive attachment.
   */
  async downloadAccountExport(token) {
    const record = await db('user_account_exports').where({ download_token: token, status: 'COMPLETED' }).first();
    if (!record) {
      throw new NotFoundError('Invalid or expired export download token.');
    }

    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      throw new ValidationError('Export download link has expired. Please request a new export.');
    }

    const fullPath = path.join(process.cwd(), record.file_path);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Export data archive file missing.');
    }

    return { filePath: fullPath, userId: record.user_id, exportId: record.id };
  },

  /**
   * Synchronous fallback export method.
   */
  async exportAccountData(userId) {
    const fullProfile = await UserProfileService.getEnrichedProfile(userId);
    const [sessions, loginHistory, securityEvents, oauthAccounts] = await Promise.all([
      UserAccountService.getActiveSessions(userId),
      UserAccountService.getLoginHistory(userId, { limit: 1000 }),
      UserAccountService.getSecurityEvents(userId, { limit: 1000 }),
      UserAccountService.getConnectedOAuthAccounts(userId)
    ]);

    return {
      exported_at: new Date().toISOString(),
      account: fullProfile,
      active_sessions: sessions,
      login_history: loginHistory.history,
      security_events: securityEvents.events,
      oauth_accounts: oauthAccounts
    };
  },

  /**
   * Deactivates the user account (sets status='DISABLED', revokes sessions).
   */
  async deactivateAccount(userId, reason = 'User requested deactivation') {
    return await withTransaction(async (executor) => {
      const user = await UserRepository.findById(userId, executor);
      if (!user) {
        throw new NotFoundError('User account not found.');
      }

      await db('users')
        .where({ id: userId })
        .update({ status: 'DISABLED', updated_at: executor.fn.now() });

      // Revoke all sessions
      const sessions = await SessionService.getActiveSessions(userId);
      for (const s of sessions) {
        try {
          await SessionService.revokeSessionFamily(s.session_family_id, 'ACCOUNT_DEACTIVATED', executor);
        } catch (e) {}
      }

      return { message: 'Account deactivated successfully.' };
    });
  },

  /**
   * Self-deletes user account (verifies password if local user, soft-deletes record, revokes sessions).
   */
  async selfDeleteAccount(userId, password) {
    return await withTransaction(async (executor) => {
      const user = await UserRepository.findById(userId, executor);
      if (!user) {
        throw new NotFoundError('User account not found.');
      }

      // If user has local password, require password verification
      if (user.password_hash) {
        if (!password) {
          throw new ValidationError('Password is required to confirm account deletion.');
        }
        const isValid = await IdentityService.comparePassword(password, user.password_hash);
        if (!isValid) {
          throw new UnauthorizedError('Invalid password provided.');
        }
      }

      // Soft delete user record
      await UserRepository.softDeleteUser(userId, executor);

      // Revoke all sessions
      const sessions = await SessionService.getActiveSessions(userId);
      for (const s of sessions) {
        try {
          await SessionService.revokeSessionFamily(s.session_family_id, 'ACCOUNT_DELETED', executor);
        } catch (e) {}
      }

      return { message: 'Account deleted successfully.' };
    });
  }
};
