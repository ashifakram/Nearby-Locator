import { RbacRepository } from '../repositories/rbacRepository.js';
import { IdentityService } from './identityService.js';
import { withTransaction } from '../utils/dbRetry.js';

export const RbacService = {
  /**
   * Enforces that dependent permissions (e.g., .update) are always accompanied by their parent (.read).
   */
  _validatePermissionDependencies(permissionNames) {
    const permSet = new Set(permissionNames);
    for (const perm of permSet) {
      const [resource, action] = perm.split('.');
      if (['update', 'create', 'delete', 'export'].includes(action)) {
        const readPerm = `${resource}.read`;
        if (!permSet.has(readPerm)) {
          throw new Error(`Permission dependency failed: '${perm}' requires '${readPerm}'.`);
        }
      }
    }
  },

  /**
   * Evaluates if the actor has sufficient priority to perform an action on the target role.
   * Actors can only manage roles with a priority STRICTLY LOWER than their own.
   * Super Admins (priority 100) are the exception: they can manage other Super Admins.
   */
  _validatePriorityBoundary(actorRole, targetRole) {
    if (actorRole.priority === 100 && targetRole.priority === 100) return true; // Super Admins can manage Super Admins
    if (actorRole.priority <= targetRole.priority) {
      throw new Error('Privilege Boundary Violation: Cannot perform actions on a user with equal or higher role priority.');
    }
    return true;
  },

  /**
   * Retrieves full permission array for user to be cached.
   */
  async getUserPermissions(userId) {
    return RbacRepository.getUserPermissions(userId);
  },

  /**
   * Check if action is safe regarding the Last Super Admin rule.
   * Throws if it would leave 0 Super Admins.
   */
  async _protectLastSuperAdmin(targetUserId, executor) {
    const targetRole = await RbacRepository.getUserRole(targetUserId, executor);
    if (targetRole && targetRole.name === 'Super Admin') {
      const activeCount = await RbacRepository.getActiveSuperAdminCount(executor);
      if (activeCount <= 1) {
        throw new Error('Last Super Admin Protection: Cannot remove or demote the final active Super Admin.');
      }
    }
  },

  /**
   * Get all roles.
   */
  async getRoles() {
    return RbacRepository.getRoles();
  },

  /**
   * Get all permissions.
   */
  async getPermissions() {
    return RbacRepository.getPermissions();
  },

  /**
   * Safely updates a user's role.
   */
  async assignUserRole(actorId, targetUserId, newRoleId) {
    return withTransaction(async (executor) => {
      const actorRole = await RbacRepository.getUserRole(actorId, executor);
      const targetUserRole = await RbacRepository.getUserRole(targetUserId, executor);
      const newRole = await RbacRepository.getRoleById(newRoleId, executor);

      if (!actorRole) throw new Error('Actor role not found');
      if (!targetUserRole) throw new Error('Target user role not found');
      if (!newRole) throw new Error('New role not found');

      // Super Admin protection logic
      if (targetUserId === actorId) {
        // You cannot demote yourself if you are a Super Admin
        if (actorRole.name === 'Super Admin' && newRole.name !== 'Super Admin') {
          throw new Error('Self-Lockout Protection: You cannot demote yourself from Super Admin.');
        }
      }

      // Actor must outrank the target's CURRENT role
      this._validatePriorityBoundary(actorRole, targetUserRole);
      
      // Actor must also outrank the target's NEW role (no escalating someone above yourself)
      this._validatePriorityBoundary(actorRole, newRole);

      if (targetUserRole.name === 'Super Admin' && newRole.name !== 'Super Admin') {
        await this._protectLastSuperAdmin(targetUserId, executor);
      }

      await RbacRepository.assignUserRole(targetUserId, newRoleId, executor);
    });
  },

  /**
   * Update permissions for a custom role.
   */
  async updateRolePermissions(actorId, targetRoleId, permissionNames) {
    return withTransaction(async (executor) => {
      const actorRole = await RbacRepository.getUserRole(actorId, executor);
      const targetRole = await RbacRepository.getRoleById(targetRoleId, executor);

      if (!targetRole) throw new Error('Target role not found');
      if (targetRole.is_system) {
        throw new Error('System Role Protection: Cannot modify permissions of a system role.');
      }

      this._validatePriorityBoundary(actorRole, targetRole);
      this._validatePermissionDependencies(permissionNames);

      const allPerms = await RbacRepository.getPermissions(executor);
      const nameToIdMap = allPerms.reduce((acc, p) => { acc[p.name] = p.id; return acc; }, {});
      
      const permissionIds = permissionNames.map(name => {
        const id = nameToIdMap[name];
        if (!id) throw new Error(`Unknown permission: ${name}`);
        return id;
      });

      await RbacRepository.updateRolePermissions(targetRoleId, permissionIds, executor);
    });
  },

  /**
   * Safely suspend a user checking all boundaries.
   */
  async suspendUser(actorId, targetUserId) {
    return withTransaction(async (executor) => {
      if (actorId === targetUserId) {
        throw new Error('Self-Lockout Protection: You cannot suspend yourself.');
      }

      const actorRole = await RbacRepository.getUserRole(actorId, executor);
      const targetRole = await RbacRepository.getUserRole(targetUserId, executor);

      this._validatePriorityBoundary(actorRole, targetRole);
      await this._protectLastSuperAdmin(targetUserId, executor);

      await IdentityService.changeStatus(targetUserId, 'BANNED', executor);
    });
  }
};
