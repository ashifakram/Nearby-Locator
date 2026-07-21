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
import { QueryIntelligenceService } from '../services/queryIntelligenceService.js';
import { SearchRollupJob } from '../jobs/searchRollupJob.js';

describe('🔍 Search-Quality, Query-Intelligence, and User-Intent Suite', () => {

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    await cleanDatabase();
    await flushRedisTestCache();
    resetGlobalState();
  });

  after(async () => {
    await teardownConnections();
  });

  const createUser = async (email, trustScore = 0.5) => {
    const password_hash = await bcrypt.hash('SecurePassword123!', 10);
    const [user] = await db('users').insert({
      email,
      password_hash,
      role: 'user',
      trust_score: trustScore,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    }).returning('*');
    return user;
  };

  const establishActiveSession = async (user) => {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 3600000);
    
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
      isSuspended: false,
      sudoUntil: null
    };

    await client.set(cacheKey, JSON.stringify(sessionCache), { EX: 3600 });
    const token = jwt.sign({ sub: user.id, sid: sessionId }, config.auth.jwtSecret, { expiresIn: '1h' });

    return { sessionId, token };
  };

  // ---------------------------------------------------------------------------
  // TEST 1: PostgreSQL Stemming Normalization & Filler Removal
  // ---------------------------------------------------------------------------
  it('1. Removes filler words and matches stemmed plurals natively via PostgreSQL FTS', async () => {
    // Create a spot named "Amazing Cafes"
    const spot = await SpotRepository.create({
      name: 'Amazing Cafes',
      category: 'cafe',
      latitude: 40.7128,
      longitude: -74.0060,
      moderation_status: 'APPROVED',
      trust_score: 1.0
    });

    await db('spots').where({ id: spot.id }).update({ moderation_status: 'APPROVED', trust_score: 1.0 });

    // Normalize and FTS query matching
    const query = 'amazing cafes near the';
    const normalized = QueryIntelligenceService.normalizeQuery(query);
    // Asserts fillers removed
    assert.strictEqual(normalized.includes('near'), false);
    assert.strictEqual(normalized.includes('the'), false);

    // Matches cafes -> cafe natively in database
    const { tsquery } = await QueryIntelligenceService.expandSynonyms(normalized);
    const searchRes = await SpotRepository.findNearby({
      lat: 40.7128,
      lng: -74.0060,
      radius: 5000,
      discoverySearch: true,
      tsquery
    });

    assert.strictEqual(searchRes.data.length, 1);
    assert.strictEqual(searchRes.data[0].name, 'Amazing Cafes');
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Soft Typo Auto-Correction and suggestions
  // ---------------------------------------------------------------------------
  it('2. Conservatively auto-corrects high confidence typos while proposing did-you-mean for borderline entries', async () => {
    // Populate dictionary terms
    await db('search_terms').insert([
      { term: 'supermarket', frequency: 10, updated_at: db.fn.now() },
      { term: 'coffee', frequency: 10, updated_at: db.fn.now() }
    ]);

    // A. High confidence similarity >= 0.75: "supermarkett" -> "supermarket"
    const highConf = await QueryIntelligenceService.evaluateTypos('supermarkett');
    assert.strictEqual(highConf.isTypoCorrected, true);
    assert.strictEqual(highConf.correctedQuery, 'supermarket');
    assert.strictEqual(highConf.didYouMean, null);

    // B. Borderline similarity 0.50 - 0.75: "supermark" -> original "supermark", suggestion "supermarket"
    const borderConf = await QueryIntelligenceService.evaluateTypos('supermark');
    assert.strictEqual(borderConf.isTypoCorrected, false);
    assert.strictEqual(borderConf.correctedQuery, 'supermark');
    assert.strictEqual(borderConf.didYouMean, 'supermarket');
  });

  // ---------------------------------------------------------------------------
  // TEST 3: Vocabulary Gating Protection
  // ---------------------------------------------------------------------------
  it('3. Gates vocabulary inclusion in search_terms to approved and high-trust entities only', async () => {
    const trustedUser = await createUser('creator@trust.com', 0.8);
    const untrustedUser = await createUser('creator@spam.com', 0.2);

    // A. Spot 1: Approved + Trusted User = Enters dictionary
    await db('spots').insert({
      name: 'SuperbCoffee',
      category: 'cafe',
      latitude: 40.7128,
      longitude: -74.0060,
      moderation_status: 'APPROVED',
      trust_score: 0.9,
      creator_id: trustedUser.id
    });

    // B. Spot 2: Unapproved/Quarantined = Rejected
    await db('spots').insert({
      name: 'SpammyAdWords',
      category: 'cafe',
      latitude: 40.7128,
      longitude: -74.0060,
      moderation_status: 'QUARANTINED',
      trust_score: 0.9,
      creator_id: trustedUser.id
    });

    // C. Spot 3: Untrusted User Creator = Rejected
    await db('spots').insert({
      name: 'CheapoPills',
      category: 'pharmacy',
      latitude: 40.7128,
      longitude: -74.0060,
      moderation_status: 'APPROVED',
      trust_score: 0.9,
      creator_id: untrustedUser.id
    });

    // Run rollup vocabulary job
    await SearchRollupJob.execute();

    const terms = await db('search_terms').select('term');
    const termSet = new Set(terms.map(t => t.term));

    assert.ok(termSet.has('superbcoffee'));
    assert.ok(!termSet.has('spammyadwords'));
    assert.ok(!termSet.has('cheapopills'));
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Category-Aware Synonym Expansion
  // ---------------------------------------------------------------------------
  it('4. Restricts synonym expansion contextually using category filters and weight boundaries', async () => {
    await db('search_synonyms').insert([
      { source_phrase: 'atm', target_phrase: 'bank', restricted_category: 'bank', weight: 1.0, bi_directional: true },
      { source_phrase: 'petrol', target_phrase: 'fuel', restricted_category: 'gas_station', weight: 0.5, bi_directional: true }
    ]);

    // A. Expanding "atm" inside "bank" category expands FTS query
    const atmExpand = await QueryIntelligenceService.expandSynonyms('atm', 'bank');
    assert.strictEqual(atmExpand.isSynonymExpanded, true);
    assert.ok(atmExpand.tsquery.includes('bank'));

    // B. Expanding "atm" outside category does not expand
    const atmExpandNull = await QueryIntelligenceService.expandSynonyms('atm', 'cafe');
    assert.strictEqual(atmExpandNull.isSynonymExpanded, false);

    // C. Petrol mapping weight (0.5) is under our strict threshold limit (0.6) and is ignored
    const lowWeightExpand = await QueryIntelligenceService.expandSynonyms('petrol', 'gas_station');
    assert.strictEqual(lowWeightExpand.isSynonymExpanded, false);
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Context-Aware Radius Cap Empty Recovery
  // ---------------------------------------------------------------------------
  it('5. Widens search radius iteratively under contextual category limits if results are empty', async () => {
    // Create a cafe spot exactly 8km away
    // Initial search radius of 2km will yield 0 results
    const spot = await SpotRepository.create({
      name: 'Wistant Bakery',
      category: 'cafe',
      latitude: 40.7850, // approx 8km north
      longitude: -74.0060,
      moderation_status: 'APPROVED',
      trust_score: 1.0
    });
    await db('spots').where({ id: spot.id }).update({ moderation_status: 'APPROVED', trust_score: 1.0 });

    const searchRes = await request(app)
      .get('/api/discovery/search')
      .query({
        lat: 40.7128,
        lng: -74.0060,
        radius: 2000,
        category: 'cafe'
      });

    assert.strictEqual(searchRes.status, 200);
    // Verified recovery widened search and picked up the bakery!
    assert.strictEqual(searchRes.body.data.length, 1);
    assert.strictEqual(searchRes.body.data[0].name, 'Wistant Bakery');
    assert.ok(searchRes.body.meta.recovery);
    assert.strictEqual(searchRes.body.meta.recovery.expandedRadius, 10000);
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Autocomplete abuse protections & async rollups
  // ---------------------------------------------------------------------------
  it('6. Only returns autocomplete suggestions computed from engaged conversion click rollups', async () => {
    const user = await createUser('searcher@test.com', 0.8);
    const { token } = await establishActiveSession(user);

    // Create a target spot
    const spot = await SpotRepository.create({
      name: 'Fuel Station',
      category: 'gas_station',
      latitude: 40.7128,
      longitude: -74.0060,
      moderation_status: 'APPROVED',
      trust_score: 1.0
    });
    await db('spots').where({ id: spot.id }).update({ moderation_status: 'APPROVED', trust_score: 1.0 });

    // A. Query suggestions endpoint initially - empty suggestion list
    const initialAuto = await request(app).get('/api/discovery/autocomplete').query({ q: 'fuel' });
    console.log('--- TEST 6 INITIAL SUGGESTIONS:', initialAuto.body.suggestions);
    assert.strictEqual(initialAuto.body.suggestions.length, 0);

    // B. Search raw query and log conversion (click)
    const searchApi = await request(app)
      .get('/api/discovery/search')
      .set('Authorization', `Bearer ${token}`)
      .query({
        lat: 40.7128,
        lng: -74.0060,
        q: 'fuel station'
      });

    const searchId = searchApi.body.searchId;

    await request(app)
      .post('/api/discovery/click')
      .set('Authorization', `Bearer ${token}`)
      .send({
        searchId,
        spotId: spot.id,
        rank: 1
      });

    // C. Execute rollup job to aggregate engaged suggestions asynchronously
    await SearchRollupJob.execute();

    // D. Autocomplete returns suggestions now
    const afterAuto = await request(app).get('/api/discovery/autocomplete').query({ q: 'fue' });
    assert.strictEqual(afterAuto.body.suggestions.length, 1);
    assert.strictEqual(afterAuto.body.suggestions[0].phrase, 'fuel station');
  });
});
