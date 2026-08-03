import crypto from 'crypto';
import db from '../db.js';
import client from '../redisClient.js';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';
import { enqueue } from '../utils/queue.js';

// ---------------------------------------------------------------------------
// Allowlisted event names — prevents unstructured analytics sprawl.
// Only meaningful, high-signal events qualify. Do NOT add low-value signals
// (button hovers, scroll position, cursor movement, etc.).
// ---------------------------------------------------------------------------
export const ALLOWED_EVENTS = new Set([
  // PRODUCT events
  'user_registered',
  'search_executed',
  'search_started',
  'search_completed',
  'search_zero_results',
  'search_failed',
  'ai_search',
  'ai_provider_fallback',
  'ai_timeout',
  'ai_provider_error',
  'cache_hit',
  'cache_miss',
  'place_opened',
  'place_saved',
  'place_details_viewed',
  'favorites_toggled',
  'collection_created',
  'collection_updated',
  'collection_shared',
  // SECURITY events
  'replay_attack_intercepted',
  'rate_limit_tripped',
  'suspicious_login_blocked',
  'automation_pattern_flagged',
]);

// Sampling rates for high-volume events (prevents Redis/Postgres queue pressure).
const SAMPLING_RATES = {
  search_executed: 0.10,
  place_details_viewed: 0.50,
};

// Payload key allowlist for each event (data minimisation).
const PAYLOAD_ALLOWLIST = {
  user_registered:             ['method'],
  search_executed:             ['category', 'query', 'result_count', 'latency_ms', 'cache_status'],
  search_started:              ['query', 'category', 'provider'],
  search_completed:            ['query', 'category', 'result_count', 'latency_ms'],
  search_zero_results:         ['query', 'category'],
  search_failed:               ['query', 'reason'],
  ai_search:                   ['query', 'model', 'provider', 'latency_ms', 'result_count'],
  ai_provider_fallback:        ['from_provider', 'to_provider', 'reason'],
  ai_timeout:                  ['provider', 'model', 'timeout_ms'],
  ai_provider_error:           ['provider', 'error_code'],
  cache_hit:                   ['cache_key', 'ttl'],
  cache_miss:                  ['cache_key'],
  place_opened:                ['place_id', 'category'],
  place_saved:                 ['place_id', 'action'],
  place_details_viewed:        ['category', 'place_id'],
  favorites_toggled:           ['action', 'place_id'],
  collection_created:          ['collection_id', 'title'],
  collection_updated:          ['collection_id', 'item_count'],
  collection_shared:           ['collection_id', 'platform'],
  replay_attack_intercepted:   ['session_family_id'],
  rate_limit_tripped:          ['endpoint', 'bucket'],
  suspicious_login_blocked:    ['failure_count'],
  automation_pattern_flagged:  ['signal'],
};

// Sensitive key names that must never survive into analytics storage
const REDACT_KEYS = new Set([
  'password', 'password_hash', 'token', 'refreshtoken', 'refresh_token',
  'accesstoken', 'access_token', 'authorization', 'cookie', 'secret',
  'email', 'name', 'phone', 'card', 'cvv', 'ip', 'ip_address',
]);

// ---------------------------------------------------------------------------
// IP anonymisation: zero out last octet (IPv4) or drop last 2 groups (IPv6)
// Returns a short, non-PII string safe to store.
// ---------------------------------------------------------------------------
export function anonymiseIp(rawIp) {
  if (!rawIp || typeof rawIp !== 'string') return null;
  const v4 = rawIp.trim().replace(/^::ffff:/, '');
  const v4parts = v4.split('.');
  if (v4parts.length === 4) {
    return `${v4parts[0]}.${v4parts[1]}.${v4parts[2]}.XXX`;
  }
  // IPv6: keep first 4 groups only
  const v6groups = rawIp.split(':');
  return v6groups.slice(0, 4).join(':') + ':XXXX';
}

// ---------------------------------------------------------------------------
// Payload redaction: strip disallowed keys, enforce per-event key allowlist,
// cap payload at 5 KB to prevent JSONB bloat.
// ---------------------------------------------------------------------------
export function redactPayload(eventName, rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'object') return {};

  const allowed = PAYLOAD_ALLOWLIST[eventName] || [];
  const clean = {};

  for (const [k, v] of Object.entries(rawPayload)) {
    const lower = k.toLowerCase();
    if (REDACT_KEYS.has(lower)) continue;          // Strip PII / sensitive keys
    if (!allowed.includes(k)) continue;            // Strip keys not in allowlist
    // Enforce primitive-only values (no nested objects to prevent JSONB sprawl)
    if (typeof v === 'object' && v !== null) continue;
    clean[k] = String(v).slice(0, 200);            // Cap individual string values
  }

  // 5 KB hard cap on the final payload string
  const payloadStr = JSON.stringify(clean);
  if (Buffer.byteLength(payloadStr, 'utf-8') > 5 * 1024) {
    logger.warn('ANALYTICS_PAYLOAD_TOO_LARGE', `Payload for ${eventName} exceeds 5KB, truncating.`, { eventName });
    return {};
  }

  return clean;
}

// ---------------------------------------------------------------------------
// trackEvent() — the single public gateway for emitting analytics events.
//
// Priority routing:
//   SECURITY events  → queue:high  (never delayed behind product traffic)
//   PRODUCT events   → queue:low   (dropped gracefully under backpressure)
//
// Safe degradation:
//   Low-priority queue > 5,000 items → drop product event rather than risk
//   overwhelming Redis / Postgres. Security events are exempt from this drop.
//
// Sampling:
//   High-volume events (e.g. search_executed) are sampled before enqueuing
//   to prevent queue flooding during traffic spikes.
// ---------------------------------------------------------------------------
export async function trackEvent({
  eventType,   // 'PRODUCT' | 'SECURITY'
  eventName,   // must exist in ALLOWED_EVENTS
  userId = null,
  requestId = null,
  rawIp = null,
  payload = {},
  schemaVersion = 1,
}) {
  // 1. Guard: unknown events are silently dropped (prevents sprawl)
  if (!ALLOWED_EVENTS.has(eventName)) {
    logger.warn('ANALYTICS_UNKNOWN_EVENT', `Dropping unknown analytics event: ${eventName}`, { eventName });
    return null;
  }

  // 2. Sampling gate for high-volume low-priority events
  const sampleRate = SAMPLING_RATES[eventName];
  if (sampleRate !== undefined && Math.random() > sampleRate) {
    return null; // Silently sampled out
  }

  // 3. Redact and data-minimise payload
  const cleanPayload = redactPayload(eventName, payload);

  // 4. Anonymise IP
  const ipHash = anonymiseIp(rawIp);

  const eventObj = {
    eventType,
    eventName,
    userId:        userId || null,
    requestId:     requestId || null,
    ipHash,
    payload:       cleanPayload,
    schemaVersion,
    occurredAt:    new Date().toISOString(),
  };

  const isSecurityEvent = eventType === 'SECURITY';
  const prefix = config.redis.prefix || 'nearby-locator:';

  // 5. Backpressure drop gate for low-priority product events
  if (!isSecurityEvent) {
    try {
      const lowQueueLen = await client.lLen(`${prefix}queue:low`).catch(() => null);
      if (lowQueueLen === null || lowQueueLen >= 5000) {
        logger.warn('ANALYTICS_DROPPED_BACKPRESSURE', `Dropping PRODUCT analytics event under queue pressure.`, { eventName, queueLen: lowQueueLen });
        return null;
      }
    } catch {
      // Redis outage: drop product events safely to protect system stability
      return null;
    }
  }

  // 6. Enqueue — security goes high, product goes low
  try {
    const jobId = await enqueue('INGEST_ANALYTICS_EVENT', eventObj, {
      priority: isSecurityEvent ? 'high' : 'low',
      maxAttempts: isSecurityEvent ? 3 : 1, // Security events retry; product events drop on failure
    });
    return jobId;
  } catch (err) {
    // Enqueue failure must NEVER bubble up to the HTTP response lifecycle
    logger.warn('ANALYTICS_ENQUEUE_FAILED', `Failed to enqueue analytics event ${eventName}: ${err.message}`, { eventName });
    return null;
  }
}

// ---------------------------------------------------------------------------
// INGEST_ANALYTICS_EVENT — background worker handler.
// Validates schema version and writes a single event row to analytics_events.
// ---------------------------------------------------------------------------
export async function ingestAnalyticsEvent(payload) {
  const {
    eventType, eventName, userId, requestId,
    ipHash, payload: eventPayload, schemaVersion, occurredAt,
  } = payload;

  // Schema version forward-compatibility gate
  if (schemaVersion && schemaVersion > 1) {
    // Emit warning but still attempt basic storage for v2+ events with known fields
    logger.warn('ANALYTICS_SCHEMA_VERSION_AHEAD', `Analytics event has future schema version: ${schemaVersion}. Storing with available fields.`, { eventName, schemaVersion });
  }

  await db('analytics_events').insert({
    event_type:     eventType,
    event_name:     eventName,
    user_id:        userId || null,
    request_id:     requestId || null,
    ip_hash:        ipHash || null,
    schema_version: schemaVersion || 1,
    payload:        JSON.stringify(eventPayload || {}),
    occurred_at:    occurredAt ? new Date(occurredAt) : new Date(),
  });

  logger.info(`Analytics event persisted: ${eventName}`, { eventName, eventType });
}

// ---------------------------------------------------------------------------
// CLEANUP_AND_ROLLUP_ANALYTICS — daily scheduled job.
//
// Runs in sequence:
//   1. Compute DAU/WAU/MAU via COUNT(DISTINCT user_id) on raw events.
//      NOTE: At very high scale (tens of millions of events) these window
//      scans will need to be replaced with incremental Redis HyperLogLog
//      counters (PFADD/PFCOUNT) updated during ingest for O(1) daily counts.
//   2. Compute per-event-name occurrence counts for today.
//   3. Compute funnel conversion rates.
//   4. Compute security anomaly summary counts.
//   5. Upsert a single daily_analytics_rollups row for today.
//   6. Batch-prune raw analytics_events older than 30 days.
// ---------------------------------------------------------------------------
export async function runDailyAnalyticsRollup() {
  logger.info('Starting scheduled task: CLEANUP_AND_ROLLUP_ANALYTICS');

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const today = new Date(todayStr + 'T00:00:00.000Z');
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const sevenDaysAgo  = new Date(today); sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  // --- 1. DAU/WAU/MAU ---
  // NOTE: COUNT(DISTINCT) is sufficient at current scale. At >10M events/day,
  // migrate to HyperLogLog incremental counters updated during ingest.
  const [dauRow] = await db('analytics_events')
    .countDistinct('user_id as count')
    .where('occurred_at', '>=', today)
    .where('occurred_at', '<', tomorrow)
    .whereNotNull('user_id');

  const [wauRow] = await db('analytics_events')
    .countDistinct('user_id as count')
    .where('occurred_at', '>=', sevenDaysAgo)
    .whereNotNull('user_id');

  const [mauRow] = await db('analytics_events')
    .countDistinct('user_id as count')
    .where('occurred_at', '>=', thirtyDaysAgo)
    .whereNotNull('user_id');

  const dau = Number(dauRow?.count || 0);
  const wau = Number(wauRow?.count || 0);
  const mau = Number(mauRow?.count || 0);

  // --- 2. Per-event-name counts for today ---
  const eventCountRows = await db('analytics_events')
    .select('event_name')
    .count('id as cnt')
    .where('occurred_at', '>=', today)
    .where('occurred_at', '<', tomorrow)
    .groupBy('event_name');

  const eventCounts = {};
  for (const row of eventCountRows) {
    eventCounts[row.event_name] = Number(row.cnt);
  }

  // --- 3. New signups today ---
  const newSignups = eventCounts['user_registered'] || 0;

  // --- 4. Funnel metrics ---
  // registered_to_search: what % of new users also searched today
  const registeredToSearch = newSignups > 0
    ? Number(((eventCounts['search_executed'] || 0) / newSignups * 100).toFixed(1))
    : 0;

  // search_to_detail: what % of searches led to a detail view
  const searchCount = eventCounts['search_executed'] || 0;
  const searchToDetail = searchCount > 0
    ? Number(((eventCounts['place_details_viewed'] || 0) / searchCount * 100).toFixed(1))
    : 0;

  const funnelMetrics = {
    registered_to_search_pct: registeredToSearch,
    search_to_detail_pct:     searchToDetail,
  };

  // --- 5. Security summary for today ---
  const securitySummary = {
    replays:            eventCounts['replay_attack_intercepted'] || 0,
    rate_limits:        eventCounts['rate_limit_tripped']        || 0,
    suspicious_logins:  eventCounts['suspicious_login_blocked']  || 0,
    automation_flags:   eventCounts['automation_pattern_flagged'] || 0,
  };

  // --- 6. Upsert daily rollup row ---
  await db('daily_analytics_rollups')
    .insert({
      rollup_date:      todayStr,
      dau,
      wau,
      mau,
      new_signups:      newSignups,
      event_counts:     JSON.stringify(eventCounts),
      funnel_metrics:   JSON.stringify(funnelMetrics),
      security_summary: JSON.stringify(securitySummary),
      computed_at:      new Date(),
    })
    .onConflict('rollup_date')
    .merge(); // Idempotent — safe to re-run multiple times per day

  logger.info(`Daily analytics rollup complete for ${todayStr}.`, { dau, wau, mau, newSignups });

  // --- 7. Prune raw events older than 30 days in non-blocking batches ---
  await pruneRawAnalyticsEvents();
}

// ---------------------------------------------------------------------------
// pruneRawAnalyticsEvents — batched deletion of raw events older than 30 days.
// ---------------------------------------------------------------------------
export async function pruneRawAnalyticsEvents() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let totalDeleted = 0;
  let batchDeleted;

  do {
    const rows = await db('analytics_events')
      .select('id')
      .where('occurred_at', '<', cutoff)
      .limit(1000);

    if (rows.length === 0) break;

    const ids = rows.map(r => r.id);
    batchDeleted = await db('analytics_events').whereIn('id', ids).del();
    totalDeleted += batchDeleted;

    // 50 ms yield to release locks and avoid starving HTTP event loop
    await new Promise(resolve => setTimeout(resolve, 50));
  } while (batchDeleted >= 1000);

  logger.info(`Successfully completed PRUNE_RAW_ANALYTICS. Pruned ${totalDeleted} raw event rows older than 30 days.`);
  return totalDeleted;
}
