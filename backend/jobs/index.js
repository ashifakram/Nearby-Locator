import {
  cleanupExpiredSessions,
  pruneStaleTokens,
  pruneTelemetry,
  pruneLoginAttempts,
  pruneDiscoveryTelemetry
} from './retentionJobs.js';
import {
  ingestAnalyticsEvent,
  runDailyAnalyticsRollup,
} from './analyticsJobs.js';

import {
  exportUserDataJob
} from './adminJobs.js';
import {
  sendNotificationJob,
  sendWebhookJob
} from './notificationJobs.js';
import {
  generateAccountExportJob
} from './accountJobs.js';

/**
 * Registry mapping job types to their execution handler functions.
 * Worker nodes look up handlers dynamically from this registry.
 */
export const jobRegistry = {
  // Retention & session cleanup
  CLEANUP_EXPIRED_SESSIONS:      cleanupExpiredSessions,
  PRUNE_STALE_TOKENS:            pruneStaleTokens,
  PRUNE_TELEMETRY:               pruneTelemetry,
  PRUNE_LOGIN_ATTEMPTS:          pruneLoginAttempts,
  PRUNE_DISCOVERY_TELEMETRY:     pruneDiscoveryTelemetry,
  // Analytics ingestion (high or low priority depending on event type)
  INGEST_ANALYTICS_EVENT:        ingestAnalyticsEvent,
  // Scheduled daily rollup aggregation + 30-day raw event pruning
  CLEANUP_AND_ROLLUP_ANALYTICS:  runDailyAnalyticsRollup,
  // Administrative tasks
  EXPORT_USER_DATA:              exportUserDataJob,
  // Account management async jobs
  GENERATE_ACCOUNT_EXPORT:       generateAccountExportJob,
  // Notification & Webhook delivery channels
  SEND_NOTIFICATION:             sendNotificationJob,
  SEND_WEBHOOK:                  sendWebhookJob,
};
