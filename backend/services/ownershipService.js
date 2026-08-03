export class OwnershipService {
  /**
   * Verifies if an actor owns a resource or possesses an administrative override.
   *
   * @param {Object} options
   * @param {string} options.actorId - The user ID making the request (`req.user.id`).
   * @param {string} options.ownerId - The user ID that owns the resource.
   * @param {boolean} [options.hideExistence=false] - If true, throws 404 instead of 403 on failure.
   * @param {string} [options.adminPermission] - Optional permission string that grants bypass (e.g. 'spots.delete').
   * @param {string[]} [options.permissions=[]] - The actor's current permissions array.
   * @throws {Error} Throws an error conforming to the standard Error Handler if verification fails.
   */
  static verifyOwnership({ actorId, ownerId, hideExistence = false, adminPermission = null, permissions = [] }) {
    if (!actorId || !ownerId) {
      throw this._createError(hideExistence);
    }

    // 1. Direct Ownership
    if (actorId === ownerId) {
      return true; // Success
    }

    // 2. Admin Override
    if (adminPermission && permissions.includes(adminPermission)) {
      return true; // Success via Admin Bypass
    }

    // 3. Ownership Failure
    throw this._createError(hideExistence);
  }

  static _createError(hideExistence) {
    const error = new Error(hideExistence ? 'Resource not found' : 'You do not have permission to modify this resource');
    error.status = hideExistence ? 404 : 403;
    error.code = hideExistence ? 'NOT_FOUND' : 'ACTION_FORBIDDEN';
    return error;
  }
}
