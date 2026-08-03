import db from '../db.js';

export const RbacRepository = {
  /**
   * Retrieves all roles for a user.
   */
  async getUserRoles(userId, executor = db) {
    const records = await executor('user_roles as ur')
      .join('roles as r', 'r.id', 'ur.role_id')
      .where('ur.user_id', userId)
      .select('r.*');
      
    return records;
  },

  /**
   * Retrieves primary role for a user.
   */
  async getUserRole(userId, executor = db) {
    const roles = await this.getUserRoles(userId, executor);
    return roles && roles.length > 0 ? roles[0] : null;
  },

  /**
   * List all roles.
   */
  async getRoles(executor = db) {
    return await executor('roles').select('*').orderBy('priority', 'desc');
  },

  /**
   * Retrieves a role by id.
   */
  async getRoleById(roleId, executor = db) {
    return await executor('roles').where('id', roleId).first();
  },

  /**
   * Retrieves a role by name.
   */
  async getRoleByName(roleName, executor = db) {
    return await executor('roles').where('name', roleName).first();
  },

  /**
   * List all permissions.
   */
  async getPermissions(executor = db) {
    return await executor('permissions').select('*').orderBy('name', 'asc');
  },

  /**
   * Assign a role to a user.
   */
  async assignUserRole(userId, roleId, executor = db) {
    return await executor('user_roles')
      .insert({ user_id: userId, role_id: roleId })
      .onConflict(['user_id', 'role_id'])
      .ignore();
  },

  /**
   * Remove a role from a user.
   */
  async removeUserRole(userId, roleId, executor = db) {
    return await executor('user_roles')
      .where({ user_id: userId, role_id: roleId })
      .delete();
  },

  /**
   * Retrieves permissions for a specific role.
   */
  async getRolePermissions(roleId, executor = db) {
    const records = await executor('role_permissions as rp')
      .join('permissions as p', 'p.id', 'rp.permission_id')
      .where('rp.role_id', roleId)
      .select('p.*');
    return records;
  },

  /**
   * Updates permissions for a role safely inside a transaction.
   */
  async updateRolePermissions(roleId, permissionIds, executor = db) {
    await executor('role_permissions').where('role_id', roleId).delete();
    if (permissionIds && permissionIds.length > 0) {
      const inserts = permissionIds.map(pid => ({ role_id: roleId, permission_id: pid }));
      await executor('role_permissions').insert(inserts);
    }
  },

  /**
   * Count active Super Admins to protect against zeroing out the last one.
   */
  async getActiveSuperAdminCount(executor = db) {
    const result = await executor('users as u')
      .join('user_roles as ur', 'ur.user_id', 'u.id')
      .join('roles as r', 'r.id', 'ur.role_id')
      .where('r.name', 'Super Admin')
      .whereNotIn('u.status', ['BANNED', 'DISABLED'])
      .count('u.id as count')
      .first();
    return parseInt(result.count, 10);
  }
};
