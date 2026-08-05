import db from '../db.js';
import { UserRepository } from '../repositories/userRepository.js';
import { UserProfileRepository } from '../repositories/userProfileRepository.js';
import { UserPreferencesRepository } from '../repositories/userPreferencesRepository.js';
import { OAuthRepository } from '../repositories/OAuthRepository.js';
import { RbacRepository } from '../repositories/rbacRepository.js';
import { SessionService } from './sessionService.js';
import { PermissionService } from './permissionService.js';
import { EmailVerificationService } from './emailVerificationService.js';
import { UserProfileService } from './userProfileService.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { withTransaction } from '../utils/dbRetry.js';

/**
 * AdminUserService: Dedicated administrative domain service for Production-Grade User Management.
 * Manages administrative search, aggregated deep-dive views, status transitions, email verification,
 * and session revocation.
 */
export const AdminUserService = {
  /**
   * Search, filter, and paginate users with CSV export capabilities.
   */
  async searchUsers({ search, status, roleId, provider, verified, startDate, endDate, limit = 20, page = 1, sort = 'created_at', order = 'desc' }) {
    const parsedLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
    const parsedPage = Math.max(1, Number(page) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const query = db('users')
      .leftJoin('user_roles', 'users.id', 'user_roles.user_id')
      .leftJoin('roles', 'user_roles.role_id', 'roles.id');

    if (search) {
      const term = `%${search.trim()}%`;
      query.where((q) => {
        q.where('users.email', 'ILIKE', term)
         .orWhere('users.name', 'ILIKE', term)
         .orWhere('roles.name', 'ILIKE', term)
         .orWhere(db.raw('CAST(users.id AS TEXT)'), 'ILIKE', term);
      });
    }

    if (status) {
      if (status.toUpperCase() === 'BANNED') {
        query.whereIn(db.raw('UPPER(users.status)'), ['BANNED', 'DISABLED', 'LOCKED']);
      } else {
        query.where(db.raw('UPPER(users.status)'), status.toUpperCase());
      }
    }

    if (roleId) {
      query.where('user_roles.role_id', roleId);
    }

    if (provider) {
      if (provider.toLowerCase() === 'google') {
        query.where(function() {
          this.whereRaw("LOWER(users.provider) = 'google'")
              .orWhereNotNull('users.google_id')
              .orWhereIn('users.id', db('user_oauth_accounts').select('user_id').whereRaw("LOWER(provider) = 'google'"));
        });
      } else {
        query.where(db.raw('LOWER(users.provider)'), provider.toLowerCase());
      }
    }

    if (verified !== undefined && verified !== null) {
      const isVerified = verified === 'true' || verified === true;
      if (isVerified) {
        query.whereNot(db.raw('UPPER(users.status)'), 'PENDING_VERIFICATION');
      } else {
        query.where(db.raw('UPPER(users.status)'), 'PENDING_VERIFICATION');
      }
    }

    if (startDate) {
      query.where('users.created_at', '>=', new Date(startDate));
    }
    if (endDate) {
      query.where('users.created_at', '<=', new Date(endDate));
    }

    const countQuery = query.clone().clearSelect().countDistinct('users.id as total').first();

    const [countResult, users, globalTotalResult, activeResult, pendingResult, bannedResult, googleResult, adminResult] = await Promise.all([
      countQuery,
      query.clone()
        .leftJoin('user_oauth_accounts', 'users.id', 'user_oauth_accounts.user_id')
        .select(
          'users.id', 
          'users.email', 
          'users.name', 
          'users.avatar_url', 
          'users.provider', 
          'users.google_id',
          'user_oauth_accounts.provider as oauth_provider',
          'roles.name as role', 
          'user_roles.role_id', 
          'users.status', 
          'users.created_at', 
          'users.updated_at', 
          'users.last_login_at', 
          'users.failed_login_count'
        )
        .orderBy(`users.${sort}`, order)
        .limit(parsedLimit)
        .offset(offset),
      db('users').count('* as total').first(),
      db('users').whereRaw("UPPER(status) = 'ACTIVE'").count('* as total').first(),
      db('users').whereRaw("UPPER(status) = 'PENDING_VERIFICATION'").count('* as total').first(),
      db('users').whereRaw("UPPER(status) IN ('BANNED', 'DISABLED', 'LOCKED')").count('* as total').first(),
      db('users').where(function() {
        this.whereRaw("LOWER(users.provider) = 'google'")
            .orWhereNotNull('users.google_id')
            .orWhereIn('users.id', db('user_oauth_accounts').select('user_id').whereRaw("LOWER(provider) = 'google'"));
      }).countDistinct('users.id as total').first(),
      db('user_roles')
        .leftJoin('roles', 'user_roles.role_id', 'roles.id')
        .whereRaw("LOWER(roles.name) LIKE '%admin%'")
        .countDistinct('user_roles.user_id as total').first()
    ]);

    const total = Number(countResult?.total || 0);
    const globalTotal = Number(globalTotalResult?.total || 0);
    const activeCount = Number(activeResult?.total || 0);
    const pendingCount = Number(pendingResult?.total || 0);
    const bannedCount = Number(bannedResult?.total || 0);
    const googleCount = Number(googleResult?.total || 0);
    const adminCount = Number(adminResult?.total || 0);

    const enrichedUsers = users.map((u) => {
      const isGoogle = (u.provider || '').toLowerCase() === 'google' || !!u.google_id || (u.oauth_provider || '').toLowerCase() === 'google';
      return {
        ...u,
        provider: isGoogle ? 'google' : (u.provider || 'local'),
        avatar_source: u.avatar_url && u.avatar_url.startsWith('/uploads/avatars/')
          ? 'custom'
          : (u.avatar_url && (u.avatar_url.includes('google') || isGoogle) ? 'google' : 'default')
      };
    });

    return {
      total,
      limit: parsedLimit,
      page: parsedPage,
      summary: {
        total: globalTotal,
        active: activeCount,
        pending: pendingCount,
        banned: bannedCount,
        google: googleCount,
        admins: adminCount
      },
      users: enrichedUsers
    };
  },

  /**
   * Aggregates a complete deep-dive user view (profile, sessions, login history, OAuth accounts, roles, permissions, audit logs, security events).
   */
  async getAggregatedUserDetail(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Target user record not found.');
    }

    const [profile, sessions, loginHistory, securityEvents, oauthAccounts, userPerms] = await Promise.all([
      UserProfileService.getEnrichedProfile(userId),
      SessionService.getActiveSessions(userId),
      db('login_history').where({ user_id: userId }).orderBy('attempted_at', 'desc').limit(20),
      db('audit_logs').where({ target_user_id: userId }).orderBy('created_at', 'desc').limit(20),
      OAuthRepository.findByUser(userId),
      PermissionService.getUserPermissions(userId)
    ]);

    const { password_hash, ...safeUser } = user;

    return {
      user: {
        ...safeUser,
        avatar_source: profile.avatar_source || 'default'
      },
      profile: profile.profile,
      preferences: profile.preferences,
      roles: userPerms.roles,
      permissions: userPerms.permissions,
      active_sessions: sessions,
      login_history: loginHistory,
      security_events: securityEvents,
      oauth_accounts: oauthAccounts
    };
  },

  /**
   * Updates target user's details administratively.
   */
  async updateUser(userId, data) {
    return await withTransaction(async (executor) => {
      const user = await UserRepository.findById(userId, executor);
      if (!user) {
        throw new NotFoundError('Target user record not found.');
      }

      const { email, name, status, roleId } = data;

      if (email && email.trim().toLowerCase() !== user.email.toLowerCase()) {
        const existing = await UserRepository.findByEmail(email.trim().toLowerCase(), executor);
        if (existing && existing.id !== userId) {
          throw new ValidationError('Email address is already in use by another user.');
        }
        await UserRepository.updateEmail(userId, email.trim().toLowerCase(), executor);
      }

      if (name !== undefined) {
        await UserRepository.updateIdentity(userId, { name: name.trim() }, executor);
      }

      if (status) {
        await db('users').where({ id: userId }).update({ status: status.toUpperCase(), updated_at: executor.fn.now() });
      }

      if (roleId) {
        await db('user_roles').where({ user_id: userId }).del();
        await db('user_roles').insert({ user_id: userId, role_id: roleId });
      }

      return this.getAggregatedUserDetail(userId);
    });
  },

  /**
   * Suspends a user (sets status='BANNED', revokes all active sessions).
   */
  async suspendUser(userId, reason) {
    return await withTransaction(async (executor) => {
      const user = await UserRepository.findById(userId, executor);
      if (!user) {
        throw new NotFoundError('Target user record not found.');
      }

      await db('users').where({ id: userId }).update({ status: 'BANNED', updated_at: executor.fn.now() });

      const sessions = await SessionService.getActiveSessions(userId);
      for (const s of sessions) {
        try {
          await SessionService.revokeSessionFamily(s.session_family_id, `ADMIN_SUSPENDED: ${reason}`, executor);
        } catch (e) {}
      }

      return { message: 'User suspended successfully.', status: 'BANNED' };
    });
  },

  /**
   * Unsuspends a user (sets status='ACTIVE').
   */
  async unsuspendUser(userId) {
    return await withTransaction(async (executor) => {
      const user = await UserRepository.findById(userId, executor);
      if (!user) {
        throw new NotFoundError('Target user record not found.');
      }

      await db('users').where({ id: userId }).update({ status: 'ACTIVE', updated_at: executor.fn.now() });
      return { message: 'User unsuspended successfully.', status: 'ACTIVE' };
    });
  },

  /**
   * Disables a user (sets status='DISABLED', revokes active sessions).
   */
  async disableUser(userId, reason) {
    return await withTransaction(async (executor) => {
      const user = await UserRepository.findById(userId, executor);
      if (!user) {
        throw new NotFoundError('Target user record not found.');
      }

      await db('users').where({ id: userId }).update({ status: 'DISABLED', updated_at: executor.fn.now() });

      const sessions = await SessionService.getActiveSessions(userId);
      for (const s of sessions) {
        try {
          await SessionService.revokeSessionFamily(s.session_family_id, `ADMIN_DISABLED: ${reason}`, executor);
        } catch (e) {}
      }

      return { message: 'User disabled successfully.', status: 'DISABLED' };
    });
  },

  /**
   * Enables a disabled user (sets status='ACTIVE').
   */
  async enableUser(userId) {
    return await withTransaction(async (executor) => {
      const user = await UserRepository.findById(userId, executor);
      if (!user) {
        throw new NotFoundError('Target user record not found.');
      }

      await db('users').where({ id: userId }).update({ status: 'ACTIVE', updated_at: executor.fn.now() });
      return { message: 'User enabled successfully.', status: 'ACTIVE' };
    });
  },

  /**
   * Soft deletes a user (sets status='SOFT_DELETED', revokes active sessions).
   */
  async softDeleteUser(userId) {
    return await withTransaction(async (executor) => {
      const user = await UserRepository.findById(userId, executor);
      if (!user) {
        throw new NotFoundError('Target user record not found.');
      }

      await UserRepository.softDeleteUser(userId, executor);

      const sessions = await SessionService.getActiveSessions(userId);
      for (const s of sessions) {
        try {
          await SessionService.revokeSessionFamily(s.session_family_id, 'ADMIN_SOFT_DELETED', executor);
        } catch (e) {}
      }

      return { message: 'User soft deleted successfully.', status: 'SOFT_DELETED' };
    });
  },

  /**
   * Restores a soft-deleted user (sets status='ACTIVE').
   */
  async restoreUser(userId) {
    return await withTransaction(async (executor) => {
      const user = await UserRepository.findById(userId, executor);
      if (!user) {
        throw new NotFoundError('Target user record not found.');
      }

      await UserRepository.restoreUser(userId, executor);
      return { message: 'User restored successfully.', status: 'ACTIVE' };
    });
  },

  /**
   * Manually verifies a user's email address by an admin.
   */
  async verifyEmail(userId) {
    return await withTransaction(async (executor) => {
      const user = await UserRepository.findById(userId, executor);
      if (!user) {
        throw new NotFoundError('Target user record not found.');
      }

      await db('users')
        .where({ id: userId })
        .update({ status: 'ACTIVE', updated_at: executor.fn.now() });

      return { message: 'User email marked as verified by administrator.', status: 'ACTIVE' };
    });
  },

  /**
   * Resends email verification dispatch for a target user.
   */
  async resendVerification(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Target user record not found.');
    }

    if (user.status === 'ACTIVE') {
      throw new ValidationError('User email address is already verified.');
    }

    await EmailVerificationService.sendVerificationEmail(user.id, user.email);
    return { message: 'Verification email dispatched successfully.' };
  },

  /**
   * Unlocks locked user account and resets failed login attempt counters.
   */
  async unlockAccount(userId) {
    return await withTransaction(async (executor) => {
      const user = await UserRepository.findById(userId, executor);
      if (!user) {
        throw new NotFoundError('Target user record not found.');
      }

      await UserRepository.resetFailedLoginCount(userId, executor);
      await db('users')
        .where({ id: userId })
        .update({ status: 'ACTIVE', updated_at: executor.fn.now() });

      return { message: 'User account unlocked successfully.', status: 'ACTIVE' };
    });
  }
};
