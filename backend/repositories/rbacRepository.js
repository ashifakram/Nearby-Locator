import db from '../db.js';

export const RbacRepository = {
  /**
   * Retrieves all permissions flattened for a given user.
   */
  async getUserPermissions(userId, executor = db) {
    const records = await executor('role_permissions as rp')
      .join('users as u', 'u.role_id', 'rp.role_id')
      .join('permissions as p', 'p.id', 'rp.permission_id')
      .where('u.id', userId)
      .select('p.name');
      
    return records.map(r => r.name);
  },

  /**
   * Retrieves the full role object for a user.
   */
  async getUserRole(userId, executor = db) {
    const record = await executor('users as u')
      .join('roles as r', 'r.id', 'u.role_id')
      .where('u.id', userId)
      .select('r.*')
      .first();
      
    return record || null;
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
    return await executor('users')
      .where('id', userId)
      .update({ role_id: roleId });
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
      .join('roles as r', 'r.id', 'u.role_id')
      .where('r.name', 'Super Admin')
      .whereNotIn('u.status', ['BANNED', 'DISABLED'])
      .count('u.id as count')
      .first();
    return parseInt(result.count, 10);
  }
};
