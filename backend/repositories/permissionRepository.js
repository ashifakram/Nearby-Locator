import db from '../db.js';

export const PermissionRepository = {
  /**
   * Retrieves all roles and permissions assigned to a given user.
   * Executes a single efficient JOIN query to prevent N+1 issues.
   * 
   * @param {string} userId - UUID of the user
   * @param {Object} executor - Knex instance or transaction object
   * @returns {Promise<Array<{ role_name: string, permission_name: string }>>}
   */
  async getUserRolesAndPermissions(userId, executor = db) {
    return await executor('user_roles as ur')
      .join('roles as r', 'r.id', 'ur.role_id')
      .leftJoin('role_permissions as rp', 'rp.role_id', 'r.id')
      .leftJoin('permissions as p', 'p.id', 'rp.permission_id')
      .where('ur.user_id', userId)
      .andWhere('r.status', 'ACTIVE')
      .select('r.name as role_name', 'p.name as permission_name');
  }
};
