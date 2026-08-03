import { PermissionRepository } from '../repositories/permissionRepository.js';
import { permissionCache } from './permissionCache.js';
import { logger } from '../utils/logger.js';

export const PermissionService = {
  /**
   * Computes or fetches cached permissions for a user.
   * Fails closed on any exception.
   * 
   * @param {string} userId 
   * @returns {Promise<{ roles: string[], permissions: string[] }>}
   */
  async getUserPermissions(userId) {
    try {
      // 1. Check Cache
      const cached = await permissionCache.get(userId);
      if (cached) {
        return cached;
      }

      // 2. Cache Miss -> Query Repository
      const rawRows = await PermissionRepository.getUserRolesAndPermissions(userId);

      // 3. Flatten and Deduplicate
      const rolesSet = new Set();
      const permsSet = new Set();

      for (const row of rawRows) {
        if (row.role_name) rolesSet.add(row.role_name);
        if (row.permission_name) permsSet.add(row.permission_name);
      }

      const result = {
        roles: Array.from(rolesSet).sort(),
        permissions: Array.from(permsSet).sort(),
      };

      // 4. Update Cache
      await permissionCache.set(userId, result);

      return result;
    } catch (err) {
      logger.error(`[PermissionService] System error computing permissions for user ${userId}`, err);
      // FAIL CLOSED: Return empty arrays to deny access
      throw new Error('AUTHZ_SYSTEM_ERROR');
    }
  },

  /**
   * Invalidates the permission cache for a specific user.
   * @param {string} userId 
   */
  async invalidateUserCache(userId) {
    try {
      await permissionCache.invalidateUser(userId);
    } catch (err) {
      logger.error(`[PermissionService] Error invalidating cache for user ${userId}`, err);
    }
  },

  /**
   * Invalidates the permission cache for all users holding a specific role.
   * @param {string} roleName 
   */
  async invalidateRoleCache(roleName) {
    try {
      await permissionCache.invalidateRole(roleName);
    } catch (err) {
      logger.error(`[PermissionService] Error invalidating cache for role ${roleName}`, err);
    }
  }
};
