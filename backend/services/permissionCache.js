/**
 * Abstract permission cache interface providing an in-memory Map adapter
 * for the first iteration. Built to be replaceable by Redis later.
 */
class PermissionCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Caches permissions for a user
   * @param {string} userId 
   * @param {{ roles: string[], permissions: string[] }} data 
   */
  async set(userId, data) {
    this.cache.set(userId, {
      ...data,
      timestamp: Date.now()
    });
  }

  /**
   * Gets cached permissions for a user
   * @param {string} userId 
   * @returns {{ roles: string[], permissions: string[] } | null}
   */
  async get(userId) {
    return this.cache.get(userId) || null;
  }

  /**
   * Invalidates a specific user's cache
   * @param {string} userId 
   */
  async invalidateUser(userId) {
    this.cache.delete(userId);
  }

  /**
   * Invalidates caches for all users currently holding a specific role.
   * @param {string} roleName 
   */
  async invalidateRole(roleName) {
    // In memory, we iterate to find caches holding this role
    for (const [userId, data] of this.cache.entries()) {
      if (data.roles.includes(roleName)) {
        this.cache.delete(userId);
      }
    }
  }

  /**
   * Flushes the entire cache
   */
  async flushAll() {
    this.cache.clear();
  }
}

export const permissionCache = new PermissionCache();
