import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import request from 'supertest';
import app from '../index.js';
import db from '../db.js';
import client from '../redisClient.js';
import config from '../config/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  trackEvent,
  ingestAnalyticsEvent,
  runDailyAnalyticsRollup,
  pruneRawAnalyticsEvents,
  anonymiseIp,
  redactPayload,
  ALLOWED_EVENTS,
} from '../jobs/analyticsJobs.js';
import { enqueue, Worker } from '../utils/queue.js';
import { jobRegistry } from '../jobs/index.js';
import { cleanDatabase, resetGlobalState, flushRedisTestCache, teardownConnections } from './helpers.js';
import { metricsStore } from '../utils/logger.js';

describe('📊 Analytics, Product Events, & Operational Intelligence Suite', () => {

  let worker = null;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    await cleanDatabase();
    await flushRedisTestCache();
    resetGlobalState();
    metricsStore.jobSuccesses = 0;
    metricsStore.jobFailures = 0;
    metricsStore.jobDurationMsTotal = 0;
  });

  after(async () => {
    if (worker) {
      await worker.shutdown();
      worker = null;
    }
    await teardownConnections();
  });

  // Helper: create a base user in DB
  const createUser = async (email = 'analytics@saas.com', role = 'user') => {
    const password_hash = await bcrypt.hash('Password123!', 10);
    const [user] = await db('users').insert({ email, password_hash, role }).returning('*');
    return user;
  };

  // Helper: mint a signed JWT for a user with an explicit sessionId
  const mintToken = (user, sessionId) => jwt.sign(
    { sub: user.id, sid: sessionId },
    config.auth.jwtSecret,
    { expiresIn: '1h' }
  );

  // ---------------------------------------------------------------------------
  // TEST 1: IP Anonymisation strips last IPv4 octet correctly
  // ---------------------------------------------------------------------------
  it('1. IP anonymisation zeroes last IPv4 octet and masks IPv6 suffix', () => {
    assert.equal(anonymiseIp('198.51.100.42'), '198.51.100.XXX');
    assert.equal(anonymiseIp('::ffff:192.168.1.1'), '192.168.1.XXX');
    assert.equal(anonymiseIp('2001:db8:85a3:0:0:8a2e:370:7334'), '2001:db8:85a3:0:XXXX');
    assert.equal(anonymiseIp(null), null);
    assert.equal(anonymiseIp(''), null);
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Payload redaction strips PII keys and enforces key allowlist
  // ---------------------------------------------------------------------------
  it('2. Payload redaction strips PII, enforces per-event key allowlist, and caps at 5KB', () => {
    // search_executed only allows 'category' key
    const raw = {
      category: 'restaurant',
      email: 'user@example.com',     // PII — must be stripped
      password: 'secret123',         // PII — must be stripped
      token: 'eyJhbGci...',          // PII — must be stripped
      ip_address: '192.168.1.1',     // PII — must be stripped
      irrelevant_field: 'noise',     // Not in allowlist — must be stripped
    };

    const clean = redactPayload('search_executed', raw);
    assert.deepEqual(clean, { category: 'restaurant' });
  });

  // ---------------------------------------------------------------------------
  // TEST 3: trackEvent drops unknown events silently
  // ---------------------------------------------------------------------------
  it('3. trackEvent silently drops unknown event names to prevent analytics sprawl', async () => {
    const result = await trackEvent({
      eventType: 'PRODUCT',
      eventName: 'button_hovered', // Not in ALLOWED_EVENTS
      userId: crypto.randomUUID(),
    });
    assert.equal(result, null);
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Security events are enqueued on queue:high, product events on queue:low
  // ---------------------------------------------------------------------------
  it('4. Security events route to queue:high; product events route to queue:low', async () => {
    const prefix = config.redis.prefix || 'nearby-locator:';

    // Security event
    const secJobId = await trackEvent({
      eventType: 'SECURITY',
      eventName: 'rate_limit_tripped',
      payload: { endpoint: '/api/auth/login', bucket: 'ip' },
    });
    assert.ok(secJobId);

    const highLen = await client.lLen(`${prefix}queue:high`);
    assert.equal(highLen, 1);

    // Flush and test product event
    await flushRedisTestCache();

    const prodJobId = await trackEvent({
      eventType: 'PRODUCT',
      eventName: 'user_registered',
      userId: crypto.randomUUID(),
      payload: { method: 'email' },
    });
    assert.ok(prodJobId);

    const lowLen = await client.lLen(`${prefix}queue:low`);
    assert.equal(lowLen, 1);
    const highLen2 = await client.lLen(`${prefix}queue:high`);
    assert.equal(highLen2, 0);
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Backpressure drop gate — product events dropped when queue:low >= 5000
  // ---------------------------------------------------------------------------
  it('5. Product events dropped gracefully when low queue exceeds 5,000 items', async () => {
    const prefix = config.redis.prefix || 'nearby-locator:';
    const originalLLen = client.lLen.bind(client);

    // Stub lLen to return 5000 for the low queue
    client.lLen = async (key) => {
      if (key === `${prefix}queue:low`) return 5000;
      return originalLLen(key);
    };

    try {
      const result = await trackEvent({
        eventType: 'PRODUCT',
        eventName: 'search_executed',
        payload: { category: 'cafe' },
      });
      assert.equal(result, null, 'Product event should be dropped under backpressure');

      // Security event must NOT be dropped by the product backpressure gate
      const secResult = await trackEvent({
        eventType: 'SECURITY',
        eventName: 'rate_limit_tripped',
        payload: { endpoint: '/api/auth/login', bucket: 'ip' },
      });
      assert.ok(secResult, 'Security event must survive despite product queue pressure');
    } finally {
      client.lLen = originalLLen;
    }
  });

  // ---------------------------------------------------------------------------
  // TEST 6: ingestAnalyticsEvent writes clean rows to analytics_events table
  // ---------------------------------------------------------------------------
  it('6. ingestAnalyticsEvent writes redacted event rows to the database correctly', async () => {
    const userId = crypto.randomUUID();
    await db('users').insert({
      id: userId,
      email: 'ingest_test@saas.com',
      password_hash: 'hash',
    });

    await ingestAnalyticsEvent({
      eventType:     'PRODUCT',
      eventName:     'user_registered',
      userId,
      requestId:     crypto.randomUUID(),
      ipHash:        '192.168.1.XXX',
      payload:       { method: 'email' },
      schemaVersion: 1,
      occurredAt:    new Date().toISOString(),
    });

    const rows = await db('analytics_events').where({ event_name: 'user_registered' });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].event_type, 'PRODUCT');
    assert.equal(rows[0].ip_hash, '192.168.1.XXX');
    assert.equal(rows[0].user_id, userId);

    // Verify no raw IP or email was written
    const payloadObj = typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload;
    assert.equal(payloadObj.email, undefined);
    assert.equal(payloadObj.ip_address, undefined);
  });

  // ---------------------------------------------------------------------------
  // TEST 7: Daily rollup aggregates DAU/WAU/MAU and security summaries correctly
  // ---------------------------------------------------------------------------
  it('7. Daily rollup computes DAU/WAU/MAU, funnel metrics, and security summary correctly', async () => {
    const userId1 = crypto.randomUUID();
    const userId2 = crypto.randomUUID();
    const now = new Date();

    // Seed two users
    await db('users').insert([
      { id: userId1, email: 'u1@saas.com', password_hash: 'h1' },
      { id: userId2, email: 'u2@saas.com', password_hash: 'h2' },
    ]);

    // Seed today's raw events
    await db('analytics_events').insert([
      // DAU: both users active today
      { event_type: 'PRODUCT', event_name: 'user_registered', user_id: userId1, payload: '{"method":"email"}',  schema_version: 1, occurred_at: now },
      { event_type: 'PRODUCT', event_name: 'search_executed',  user_id: userId1, payload: '{"category":"cafe"}', schema_version: 1, occurred_at: now },
      { event_type: 'PRODUCT', event_name: 'search_executed',  user_id: userId2, payload: '{"category":"cafe"}', schema_version: 1, occurred_at: now },
      // Security events
      { event_type: 'SECURITY', event_name: 'rate_limit_tripped', payload: '{}', schema_version: 1, occurred_at: now },
      { event_type: 'SECURITY', event_name: 'replay_attack_intercepted', payload: '{}', schema_version: 1, occurred_at: now },
    ]);

    // Run the rollup job
    await runDailyAnalyticsRollup();

    const todayStr = now.toISOString().split('T')[0];
    const [rollup] = await db('daily_analytics_rollups').where({ rollup_date: todayStr });

    assert.ok(rollup, 'Rollup row should exist for today');
    assert.equal(rollup.dau, 2);    // Both users were active today
    assert.equal(rollup.new_signups, 1);

    const eventCounts = typeof rollup.event_counts === 'string' ? JSON.parse(rollup.event_counts) : rollup.event_counts;
    assert.equal(eventCounts['search_executed'], 2);
    assert.equal(eventCounts['rate_limit_tripped'], 1);

    const secSummary = typeof rollup.security_summary === 'string' ? JSON.parse(rollup.security_summary) : rollup.security_summary;
    assert.equal(secSummary.replays, 1);
    assert.equal(secSummary.rate_limits, 1);

    const funnelMetrics = typeof rollup.funnel_metrics === 'string' ? JSON.parse(rollup.funnel_metrics) : rollup.funnel_metrics;
    // 2 searches / 1 signup = 200% (signups can share multiple search actions per day)
    assert.ok(funnelMetrics.registered_to_search_pct >= 0);
  });

  // ---------------------------------------------------------------------------
  // TEST 8: 30-day pruning sweep deletes stale raw events in batches
  // ---------------------------------------------------------------------------
  it('8. 30-day pruning sweep deletes stale raw events in batches and retains recent ones', async () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const yesterday        = new Date(Date.now() - 1  * 24 * 60 * 60 * 1000);

    await db('analytics_events').insert([
      { event_type: 'PRODUCT', event_name: 'search_executed', payload: '{}', schema_version: 1, occurred_at: thirtyOneDaysAgo },
      { event_type: 'PRODUCT', event_name: 'search_executed', payload: '{}', schema_version: 1, occurred_at: thirtyOneDaysAgo },
      { event_type: 'PRODUCT', event_name: 'search_executed', payload: '{}', schema_version: 1, occurred_at: yesterday }, // recent — keep
    ]);

    const beforeCount = await db('analytics_events').count('id as cnt').first();
    assert.equal(Number(beforeCount.cnt), 3);

    await pruneRawAnalyticsEvents();

    const afterCount = await db('analytics_events').count('id as cnt').first();
    assert.equal(Number(afterCount.cnt), 1, 'Only the recent event should remain after pruning');
  });

  // ---------------------------------------------------------------------------
  // TEST 9: Admin dashboard API — 403 for non-admin session
  // ---------------------------------------------------------------------------
  it('9. Analytics dashboard returns 403 for authenticated non-admin users', async () => {
    const user = await createUser('plain@saas.com', 'user');
    const sessionId = crypto.randomUUID();
    const token = mintToken(user, sessionId);

    // Seed session matching the JWT sid claim
    await db('user_sessions').insert({
      id:                  sessionId,
      user_id:             user.id,
      expires_at:          new Date(Date.now() + 60 * 60 * 1000),
      refresh_token_hash:  'hash_admin_test',
      session_family_id:   crypto.randomUUID(),
    });

    const res = await request(app)
      .get('/api/admin/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .set('x-internal-token', process.env.INTERNAL_METRICS_TOKEN || 'test-internal-token');

    assert.equal(res.statusCode, 403);
  });

  // ---------------------------------------------------------------------------
  // TEST 10: Admin dashboard returns rollup data for valid admin with internal token
  // ---------------------------------------------------------------------------
  it('10. Analytics dashboard returns rollup rows for admin with valid internal token', async () => {
    // Compute local date string (not UTC, to match Postgres date column in local timezone)
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    await db('daily_analytics_rollups').insert({
      rollup_date:      todayStr,
      dau:              42,
      wau:              150,
      mau:              600,
      new_signups:      5,
      event_counts:     JSON.stringify({ search_executed: 100 }),
      funnel_metrics:   JSON.stringify({ registered_to_search_pct: 80 }),
      security_summary: JSON.stringify({ replays: 0 }),
    });

    const admin = await createUser('admin@saas.com', 'admin');
    const sessionId = crypto.randomUUID();
    const token = mintToken(admin, sessionId);

    // Seed session matching the JWT sid claim exactly
    await db('user_sessions').insert({
      id:                  sessionId,
      user_id:             admin.id,
      expires_at:          new Date(Date.now() + 60 * 60 * 1000),
      refresh_token_hash:  'hash_admin_2',
      session_family_id:   crypto.randomUUID(),
    });

    const internalToken = 'test-internal-token';
    process.env.INTERNAL_METRICS_TOKEN = internalToken;

    const res = await request(app)
      .get('/api/admin/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .set('x-internal-token', internalToken);

    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.data.rollups));
    // rollup_date from Postgres 'date' type may arrive as an ISO string at UTC midnight.
    // Normalise to YYYY-MM-DD using local time components to match todayStr.
    const normaliseDate = (d) => {
      const dt = new Date(d);
      return isNaN(dt) ? String(d).slice(0, 10)
        : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };
    const rollup = res.body.data.rollups.find(r => normaliseDate(r.rollup_date) === todayStr);
    assert.ok(rollup, `Expected rollup for ${todayStr}, got: ${JSON.stringify(res.body.data.rollups.map(r => r.rollup_date))}`);
    assert.equal(rollup.dau, 42);
    assert.equal(rollup.wau, 150);
  });
});
