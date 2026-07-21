import db from '../db.js';
import { dbLogger } from './dbLogger.js';

const ALLOWED_METADATA_KEYS = [
  'correlationId',
  'userAgent',
  'impersonated',
  'durationMs',
  'reason',
  'requestedRole',
  'targetSessionId',
  'breakGlass',
  // Phase 9B Enrichments
  'amr',
  'provider',
  'tenantContext',
  'deviceId',
  'forensicContext',
  'status',
  'requestId'
];

import { correlationStore } from './logger.js';

/**
 * Sanitises input metadata against the strict key allowlist to prevent arbitrary body dumps.
 */
export const sanitizeMetadata = (metadata = {}) => {
  const sanitized = {};
  for (const key of ALLOWED_METADATA_KEYS) {
    if (metadata[key] !== undefined) {
      sanitized[key] = metadata[key];
    }
  }
  return sanitized;
};

/**
 * Asynchronously registers an administrative audit log entry to the database.
 * Designed to be completely non-blocking to the request pipeline.
 */
export const logAudit = async ({ req, actorId, targetUserId, action, severity = 'INFO', metadata = {} }) => {
  try {
    const ipAddress = req?.ip || '127.0.0.1';
    
    let finalActorId = actorId;
    let finalSeverity = severity;
    let finalAction = action;

    if (req?.user?.isBreakGlass) {
      finalActorId = null;
      finalSeverity = 'CRITICAL';
      metadata.breakGlass = true;
      finalAction = `[BREAK_GLASS_ACCESS] ${action}`;
    }
    
    // Auto-populate correlation ID and user-agent if available
    const cleanMetadata = sanitizeMetadata(metadata);
    const store = correlationStore.getStore() || {};
    const reqId = store.requestId || (req?.headers ? req.headers['x-request-id'] : null);
    
    if (reqId && !cleanMetadata.correlationId) {
      cleanMetadata.correlationId = reqId;
      cleanMetadata.requestId = reqId;
    }
    if (req?.headers && req.headers['user-agent'] && !cleanMetadata.userAgent) {
      cleanMetadata.userAgent = req.headers['user-agent'];
    }

    // Insert to DB
    await db('audit_logs').insert({
      actor_id: finalActorId || null,
      target_user_id: targetUserId || null,
      action: finalAction,
      severity: finalSeverity,
      ip_address: ipAddress,
      metadata: JSON.stringify(cleanMetadata)
    });
  } catch (err) {
    // Graceful exception capture to prevent critical admin path crash
    dbLogger.error('[SECURITY][AUDIT_LOG_FAILED] Failed to record administrative audit log', {
      action,
      actorId,
      error: err.message
    });
  }
};
