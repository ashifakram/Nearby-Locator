import { RbacCache } from '../services/rbacCache.js';
import { logger, correlationStore } from '../utils/logger.js';
import { logAudit } from '../utils/auditLogger.js';
import { rbacAuthorizationFailureTotal } from '../utils/metrics.js';

/**
 * Middleware that strictly enforces permission-based authorization.
 * Relies on `req.user.id` being populated by the preceding `authJwt` middleware.
 * 
 * @param {string} requiredPermission - Standardized resource.action (e.g. 'users.update')
 */
export const requirePermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        logger.warn('requirePermission called without authenticated user context');
        return res.status(401).json({ error: 'Authentication required.' });
      }

      // Hydrate permissions from Redis cache (or lazy load from DB)
      const permissions = await RbacCache.getUserPermissions(req.user.id);

      if (!permissions.includes(requiredPermission)) {
        const metadata = correlationStore.getStore();
        logger.warn({ 
          userId: req.user.id, 
          requiredPermission, 
          correlationId: metadata?.correlationId,
          msg: 'Permission denied' 
        });
        
        rbacAuthorizationFailureTotal.labels(requiredPermission).inc();

        logAudit({
          req,
          actorId: req.user.id,
          action: 'RBAC_PERMISSION_DENIED',
          severity: 'WARN',
          metadata: { requiredPermission }
        }).catch(err => logger.error({ err }, 'Failed to log RBAC audit event'));
        
        return res.status(403).json({ 
          error: 'Forbidden.', 
          message: `This action requires the '${requiredPermission}' permission.`
        });
      }

      // Attach permissions to request for downstream controllers if needed
      req.user.permissions = permissions;
      next();
    } catch (err) {
      logger.error({ err, userId: req?.user?.id }, 'Error during permission verification');
      return res.status(500).json({ error: 'Internal server error during authorization.' });
    }
  };
};
