import { PermissionService } from '../services/permissionService.js';
import { logger } from '../utils/logger.js';

/**
 * Express middleware to enforce RBAC permissions.
 * Fails closed on any errors.
 * 
 * @param {string} requiredAction - The permission required (e.g. 'places.delete')
 */
export const requirePermission = (requiredAction) => {
  return async (req, res, next) => {
    try {
      // 1. Ensure user exists (must be placed after requireAuth)
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }

      const userId = req.user.id;

      // 2. Resolve Permissions
      const { permissions } = await PermissionService.getUserPermissions(userId);

      // 3. Evaluate Access
      if (permissions.includes(requiredAction)) {
        return next();
      }

      // 4. Deny Access
      logger.warn(`[AUTHZ] Permission Denied: User ${userId} lacks ${requiredAction}`);
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACTION_FORBIDDEN',
          message: 'You do not have permission to perform this action.'
        }
      });
      
    } catch (err) {
      // 5. Fail Closed on exceptions
      logger.error(`[AUTHZ] System Error during permission evaluation for user ${req.user?.id}`, err);
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACTION_FORBIDDEN', // Return standard 403 to frontend to obscure system failure
          message: 'An error occurred while verifying your permissions. Access denied.'
        }
      });
    }
  };
};
