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
import { cleanDatabase, resetGlobalState, flushRedisTestCache, teardownConnections } from './helpers.js';
import { SpotRepository } from '../repositories/spotRepository.js';
import { ModerationService } from '../services/moderationService.js';

describe('🛡️ Platform Trust, Safety, & Moderation Infrastructure Suite', () => {

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    await cleanDatabase();
    await flushRedisTestCache();
    resetGlobalState();
  });

  after(async () => {
    await teardownConnections();
  });

  // Helper: create a user with a hashed password
  const createUser = async (email, role = 'user', trustScore = 0.5) => {
    const password_hash = await bcrypt.hash('SecurePassword123!', 10);
    const [user] = await db('users').insert({
      email,
      password_hash,
      role,
      trust_score: trustScore,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    }).returning('*');
    return user;
  };

  // Helper: establish an active session in DB and cache it in Redis
  const establishActiveSession = async (user) => {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour TTL
    
    await db('user_sessions').insert({
      id: sessionId,
      user_id: user.id,
      ip_address: '127.0.0.1',
      user_agent: 'NodeTest',
      expires_at: expiresAt,
      refresh_token_hash: crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex'),
      session_family_id: crypto.randomUUID()
    });

    const cacheKey = `session:active:${sessionId}`;
    const sessionCache = {
      userId: user.id,
      email: user.email,
      role: user.role,
      isSuspended: !!user.is_suspended,
      sudoUntil: null
    };

    await client.set(cacheKey, JSON.stringify(sessionCache), { EX: 3600 });
    const token = jwt.sign({ sub: user.id, sid: sessionId }, config.auth.jwtSecret, { expiresIn: '1h' });

    return { sessionId, token };
  };

  // ---------------------------------------------------------------------------
  // TEST 1: Authenticated Reports & Category Validation
  // ---------------------------------------------------------------------------
  it('1. Rejects anonymous reports and validates categories', async () => {
    // A. Create a spot
    const spot = await SpotRepository.create({
      name: 'Test Spot',
      category: 'restaurant',
      latitude: 40.7128,
      longitude: -74.0060
    });

    // B. Anonymous post gets 401
    const anonRes = await request(app)
      .post('/api/moderation/reports')
      .send({
        spotId: spot.id,
        category: 'SPAM',
        details: 'Anonymous report spam'
      });
    assert.strictEqual(anonRes.status, 401);

    // C. Logged in user with invalid category gets 400
    const reporter = await createUser('reporter@test.com');
    const { token } = await establishActiveSession(reporter);

    const badCatRes = await request(app)
      .post('/api/moderation/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        spotId: spot.id,
        category: 'INVALID_ABUSE_CAT',
        details: 'Not allowed category'
      });
    assert.strictEqual(badCatRes.status, 400);
    assert.strictEqual(badCatRes.body.error.code, 'INVALID_CATEGORY');
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Cumulative Trust Auto-Quarantine Math
  // ---------------------------------------------------------------------------
  it('2. Automatically quarantines spots when trust-weighted score >= 1.5', async () => {
    // A. Seed Spot and Creator
    const creator = await createUser('creator@test.com', 'user', 0.8);
    const spot = await SpotRepository.create({
      name: 'Fraudulent Spot',
      category: 'restaurant',
      latitude: 40.7128,
      longitude: -74.0060,
      creator_id: creator.id
    });

    // B. Create three high-trust reporters
    const reporter1 = await createUser('r1@test.com', 'user', 0.5);
    const reporter2 = await createUser('r2@test.com', 'user', 0.4);
    const reporter3 = await createUser('r3@test.com', 'user', 1.0);

    const s1 = await establishActiveSession(reporter1);
    const s2 = await establishActiveSession(reporter2);
    const s3 = await establishActiveSession(reporter3);

    // Reporter 1 files FAKE_LISTING (severity weight 0.6) -> Weighted Score = 0.6 * 0.5 = 0.3
    const report1Res = await request(app)
      .post('/api/moderation/reports')
      .set('Authorization', `Bearer ${s1.token}`)
      .send({
        spotId: spot.id,
        category: 'FAKE_LISTING',
        details: 'Minor flag 1'
      });
    assert.strictEqual(report1Res.status, 201);

    let updatedSpot = await db('spots').where({ id: spot.id }).first();
    assert.strictEqual(updatedSpot.moderation_status, 'APPROVED'); // Still active (score = 0.3 < 1.5)
    assert.ok(updatedSpot.trust_score < 1.0);

    // Reporter 2 files FAKE_LISTING (severity weight 0.6) -> Weighted Score = 0.3 + (0.6 * 0.4) = 0.54
    const report2Res = await request(app)
      .post('/api/moderation/reports')
      .set('Authorization', `Bearer ${s2.token}`)
      .send({
        spotId: spot.id,
        category: 'FAKE_LISTING',
        details: 'Minor flag 2'
      });
    assert.strictEqual(report2Res.status, 201);

    updatedSpot = await db('spots').where({ id: spot.id }).first();
    assert.strictEqual(updatedSpot.moderation_status, 'APPROVED'); // Still active (score = 0.54 < 1.5, trust = 0.46 > 0.4)

    // Reporter 3 files SCAM_FRAUD (severity weight 1.0) -> Weighted Score = 0.54 + (1.0 * 1.0) = 1.54 >= 1.5
    const report3Res = await request(app)
      .post('/api/moderation/reports')
      .set('Authorization', `Bearer ${s3.token}`)
      .send({
        spotId: spot.id,
        category: 'SCAM_FRAUD',
        details: 'Major fraud'
      });
    assert.strictEqual(report3Res.status, 201);

    // Assert AUTO-QUARANTINE has occurred
    updatedSpot = await db('spots').where({ id: spot.id }).first();
    assert.strictEqual(updatedSpot.moderation_status, 'QUARANTINED');
    assert.ok(updatedSpot.quarantined_at !== null);

    const history = await db('spot_moderation_history').where({ spot_id: spot.id }).first();
    assert.strictEqual(history.action, 'AUTO_QUARANTINE');
  });

  // ---------------------------------------------------------------------------
  // TEST 3: De-ranking in Discovery vs Hard Exclusion in standard search
  // ---------------------------------------------------------------------------
  it('3. Filters quarantined spots from standard search but heavily de-ranks in discovery', async () => {
    // A. Seed two spots (one APPROVED, one QUARANTINED)
    const activeSpot = await SpotRepository.create({
      name: 'Safe Active Cafe',
      category: 'cafe',
      latitude: 40.7128,
      longitude: -74.0060
    });

    const quarantinedSpot = await SpotRepository.create({
      name: 'Suspicious Flagged Shop',
      category: 'shop',
      latitude: 40.7130,
      longitude: -74.0062
    });
    await db('spots').where({ id: quarantinedSpot.id }).update({ moderation_status: 'QUARANTINED' });

    // B. Standard distance search
    const standardRes = await request(app)
      .get('/api/spots/search')
      .query({
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 2000
      });
    assert.strictEqual(standardRes.status, 200);
    const standardData = standardRes.body.data;
    
    // Quarantined spot MUST be hidden from standard list
    assert.strictEqual(standardData.length, 1);
    assert.strictEqual(standardData[0].id, activeSpot.id);

    // C. Discovery Search utilizing composite CTE relevance
    const discoveryRes = await request(app)
      .get('/api/discovery/search')
      .query({
        lat: 40.7128,
        lng: -74.0060,
        radius: 2000
      });
    assert.strictEqual(discoveryRes.status, 200);
    const discoveryData = discoveryRes.body.data;

    // Both returned, but Quarantined spot must carry the de-ranked penalty and fall below
    assert.strictEqual(discoveryData.length, 2);
    const quarantinedDiscoveryItem = discoveryData.find(s => s.id === quarantinedSpot.id);
    assert.ok(quarantinedDiscoveryItem.composite_score < 0); // score drops due to -0.85 penalty
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Appeal Routing & Creator Recovery
  // ---------------------------------------------------------------------------
  it('4. Allows appeals and restores spot trust/creator score on approval', async () => {
    // A. Creator with degraded user trust score
    const creator = await createUser('owner@saas.com', 'user', 0.6);
    const spot = await SpotRepository.create({
      name: 'Quarantined Shop',
      category: 'restaurant',
      latitude: 40.7128,
      longitude: -74.0060,
      creator_id: creator.id
    });
    
    // Set status to QUARANTINED
    await db('spots').where({ id: spot.id }).update({ moderation_status: 'QUARANTINED', trust_score: 0.2 });

    // B. User submits an appeal
    const { token } = await establishActiveSession(creator);
    const appealRes = await request(app)
      .post('/api/moderation/appeals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        spotId: spot.id,
        details: 'False flags from rival competitors!'
      });
    assert.strictEqual(appealRes.status, 201);
    const appeal = appealRes.body.data;

    // C. Admin approves the appeal
    const admin = await createUser('admin@locator.com', 'admin');
    const adminSession = await establishActiveSession(admin);

    const resolveRes = await request(app)
      .post(`/api/moderation/admin/appeals/${appeal.id}/resolve`)
      .set('Authorization', `Bearer ${adminSession.token}`)
      .send({
        action: 'APPROVED',
        reason: 'Legitimate business verification provided'
      });
    assert.strictEqual(resolveRes.status, 200);

    // D. Verify spot restored, trust score reset, and creator trust score recovered
    const restoredSpot = await db('spots').where({ id: spot.id }).first();
    assert.strictEqual(restoredSpot.moderation_status, 'APPROVED');
    assert.strictEqual(restoredSpot.trust_score, 1.0);

    const recoveredCreator = await db('users').where({ id: creator.id }).first();
    assert.strictEqual(recoveredCreator.trust_score, 0.75); // 0.6 + 0.15 recovery boost = 0.75
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Telemetry click spikes triggering warning
  // ---------------------------------------------------------------------------
  it('5. Triggers suspicious telemetry flag warning without auto-quarantine upon click spikes', async () => {
    // A. Seed search and spot
    const spot = await SpotRepository.create({
      name: 'Click Bait Cafe',
      category: 'cafe',
      latitude: 40.7128,
      longitude: -74.0060
    });

    const [searchLog] = await db('discovery_searches').insert({
      latitude: 40.7128,
      longitude: -74.0060,
      results_count: 1,
      abandoned: true
    }).returning('id');

    // B. Send 20 clicks (under velocity threshold)
    for (let i = 0; i < 20; i++) {
      const res = await request(app)
        .post('/api/discovery/click')
        .send({
          searchId: searchLog.id,
          spotId: spot.id,
          rank: 1
        });
      assert.strictEqual(res.status, 200);
    }

    // Spot status remains APPROVED, flag is false
    let currentSpot = await db('spots').where({ id: spot.id }).first();
    assert.strictEqual(currentSpot.moderation_status, 'APPROVED');
    assert.strictEqual(currentSpot.suspicious_telemetry_flag, false);

    // C. The 21st click triggers a velocity spike
    const spikeRes = await request(app)
      .post('/api/discovery/click')
      .send({
        searchId: searchLog.id,
        spotId: spot.id,
        rank: 1
      });
    assert.strictEqual(spikeRes.status, 429);

    // Assert spot remains APPROVED but carries the suspicious telemetry flag
    currentSpot = await db('spots').where({ id: spot.id }).first();
    assert.strictEqual(currentSpot.moderation_status, 'APPROVED');
    assert.strictEqual(currentSpot.suspicious_telemetry_flag, true);
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Scheduled Gradual Recovery Worker
  // ---------------------------------------------------------------------------
  it('6. Weekly scheduled recovery worker restores user trust scores incrementally', async () => {
    // A. Seed user with depleted trust score
    const degradedUser = await createUser('degraded@test.com', 'user', 0.8);
    
    // Set last_recovery_at to 14 days ago (equivalent to 2 clean weeks)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    await db('users').where({ id: degradedUser.id }).update({ last_recovery_at: fourteenDaysAgo });

    // B. Run authoritative recovery routine
    await ModerationService.recoverUserTrustScores();

    // C. Assert trust score has recovered by 2 weeks * 0.02 = 0.04
    const recoveredUser = await db('users').where({ id: degradedUser.id }).first();
    assert.strictEqual(recoveredUser.trust_score, 0.84);
    assert.ok(new Date(recoveredUser.last_recovery_at).getTime() > fourteenDaysAgo.getTime());
  });

});
