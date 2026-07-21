import test from 'node:test';
import assert from 'node:assert';
import db from '../db.js';
import client from '../redisClient.js';
import crypto from 'crypto';
import { cleanDatabase, flushRedisTestCache } from './helpers.js';
import { SpotRepository } from '../repositories/spotRepository.js';
import { pruneDiscoveryTelemetry } from '../jobs/retentionJobs.js';

// Bootstrapping test environment variables
process.env.NODE_ENV = 'test';

test.describe('📢 Discovery, Composite Ranking, and Telelevance Infrastructure Suite', () => {
  let testUser;
  let testToken;

  test.before(async () => {
    await cleanDatabase();

    // Seed a standard user to test authenticated actions and saves
    const [user] = await db('users')
      .insert({
        email: 'discovery.test@locator.com',
        password_hash: 'mock_password_hash',
        role: 'user'
      })
      .returning('*');
    testUser = user;

    const jwt = (await import('jsonwebtoken')).default;
    testToken = jwt.sign(
      { id: testUser.id, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret-key'
    );
  });

  test.beforeEach(async () => {
    await db('discovery_clicks').del();
    await db('discovery_saves').del();
    await db('discovery_searches').del();
    await db('spots').del();
    await flushRedisTestCache();
  });

  test('1. Verify explainable composite ranking math is correct and returned transparently', async () => {
    // A. Insert 3 spots with varying freshness, distance, and ratings
    const now = new Date();
    const staleDate = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000); // 100 days old

    // Spot A: Very close (100m) but stale
    const spotA = await SpotRepository.create({
      name: 'Stale Close Cafe',
      category: 'cafe',
      latitude: 40.7128,
      longitude: -74.0060,
      is_active: true
    });
    await db('spots').where({ id: spotA.id }).update({ updated_at: staleDate });

    // Spot B: Medium distance (500m), popular (we will inject click engagement)
    const spotB = await SpotRepository.create({
      name: 'Popular Cafe',
      category: 'cafe',
      latitude: 40.7148, // ~220m north
      longitude: -74.0060,
      is_active: true
    });

    // Spot C: Farther (2km) but fresh
    const spotC = await SpotRepository.create({
      name: 'Fresh Far Cafe',
      category: 'cafe',
      latitude: 40.7308, // ~2km north
      longitude: -74.0060,
      is_active: true
    });

    // Log engagement for Spot B to boost it
    const [searchLog] = await db('discovery_searches')
      .insert({
        latitude: 40.7128,
        longitude: -74.0060,
        results_count: 3,
        abandoned: true
      })
      .returning('id');

    // Insert 5 click events for Spot B to trigger popularity score
    for (let i = 0; i < 5; i++) {
      await db('discovery_clicks').insert({
        search_id: searchLog.id,
        spot_id: spotB.id,
        rank: 1,
        created_at: now
      });
    }

    // B. Run search
    const { data } = await SpotRepository.findNearby({
      lat: 40.7128,
      lng: -74.0060,
      radius: 10000,
      limit: 10,
      discoverySearch: true
    });

    assert.strictEqual(data.length, 3);

    // Verify explainable components are exposed
    const popSpot = data.find(s => s.id === spotB.id);
    assert.ok(popSpot.composite_score > 0);
    assert.ok(popSpot.distance_score > 0);
    assert.ok(popSpot.popularity_score > 0);
    assert.ok(popSpot.freshness_score > 0);
    assert.strictEqual(popSpot.clicks_count, 5);

    // Verify distance decay ordering holds
    const closeSpot = data.find(s => s.id === spotA.id);
    const farSpot = data.find(s => s.id === spotC.id);
    assert.ok(closeSpot.distance_score > farSpot.distance_score);
  });

  test('2. Verify PostGIS-native snap-coordinate density penalty is correctly applied', async () => {
    // A. Insert 1 spot in a sparse grid cell (lat 40.80, lng -74.10)
    const sparseSpot = await SpotRepository.create({
      name: 'Sparse Oasis',
      category: 'restaurant',
      latitude: 40.8000,
      longitude: -74.1000,
      is_active: true
    });

    // B. Insert 10 spots packed inside the exact sameSnapped coordinate grid (lat 40.71, lng -74.00)
    const denseSpots = [];
    for (let i = 0; i < 8; i++) {
      denseSpots.push(await SpotRepository.create({
        name: `Dense Diner ${i}`,
        category: 'restaurant',
        latitude: 40.7128 + (i * 0.0001),
        longitude: -74.0060,
        is_active: true
      }));
    }

    // C. Perform nearby queries on dense and sparse coordinates
    const resDense = await SpotRepository.findNearby({
      lat: 40.7128,
      lng: -74.0060,
      radius: 5000,
      limit: 1,
      discoverySearch: true
    });

    const resSparse = await SpotRepository.findNearby({
      lat: 40.8000,
      lng: -74.1000,
      radius: 5000,
      limit: 1,
      discoverySearch: true
    });

    // Sparse spot in zero density grid should have 0.0 density penalty
    assert.strictEqual(resSparse.data[0].density_penalty, 0.0);

    // Dense spots should carry positive density penalties (>0) due to snapping grid ceiling
    assert.ok(resDense.data[0].density_penalty > 0.0);
  });

  test('3. Verify soft duplicate de-emphasis is flagged and penalized correctly for co-located spots', async () => {
    // Spot A: Original venue
    const originalSpot = await SpotRepository.create({
      name: 'Starbucks Central',
      category: 'cafe',
      latitude: 40.7128,
      longitude: -74.0060,
      is_active: true
    });

    // Spot B: Co-located near clone (<50m) matching prefix name (Starbucks Central DT)
    const duplicateSpot = await SpotRepository.create({
      name: 'Starbucks Central DT',
      category: 'cafe',
      latitude: 40.7129, // ~10 meters away
      longitude: -74.0060,
      is_active: true
    });

    const { data } = await SpotRepository.findNearby({
      lat: 40.7128,
      lng: -74.0060,
      radius: 1000,
      limit: 10,
      discoverySearch: true
    });

    const dup = data.find(s => s.id === duplicateSpot.id);
    assert.strictEqual(dup.is_soft_duplicate, true);
    assert.ok(dup.soft_duplicate_penalty > 0.0);
  });

  test('4. Verify context-aware category diversity balances generic queries but preserves targeted intent', async () => {
    // Insert 4 spots (2 cafes, 2 restaurants) at exact same distance
    const c1 = await SpotRepository.create({ name: 'Cafe A', category: 'cafe', latitude: 40.7128, longitude: -74.0060 });
    const c2 = await SpotRepository.create({ name: 'Cafe B', category: 'cafe', latitude: 40.7128, longitude: -74.0060 });
    const r1 = await SpotRepository.create({ name: 'Diner A', category: 'restaurant', latitude: 40.7128, longitude: -74.0060 });
    const r2 = await SpotRepository.create({ name: 'Diner B', category: 'restaurant', latitude: 40.7128, longitude: -74.0060 });

    // Scenario A: Generic search without category limit should interleave/diversify results
    const genericRes = await SpotRepository.findNearby({
      lat: 40.7128,
      lng: -74.0060,
      radius: 1000,
      limit: 4,
      discoverySearch: true
    });

    // MMR should penalize placing consecutive categories together, interleaving cafe -> restaurant -> cafe -> restaurant
    assert.notStrictEqual(genericRes.data[0].category, genericRes.data[1].category);

    // Scenario B: Category-specific search (e.g. 'cafe') should bypass diversity entirely
    const targetedRes = await SpotRepository.findNearby({
      lat: 40.7128,
      lng: -74.0060,
      radius: 1000,
      limit: 4,
      category: 'cafe',
      discoverySearch: true
    });

    // Should only contain cafes and have no MMR modifications applied
    assert.strictEqual(targetedRes.data.length, 2);
    assert.ok(targetedRes.data.every(s => s.category === 'cafe'));
  });

  test('5. Verify Redis 10-minute click deduplication and velocity spam protections', async () => {
    const spot = await SpotRepository.create({ name: 'Safe Spot', category: 'cafe', latitude: 40.7128, longitude: -74.0060 });

    // Log query to get valid searchId
    const [searchLog] = await db('discovery_searches')
      .insert({
        latitude: 40.7128,
        longitude: -74.0060,
        results_count: 1,
        abandoned: true
      })
      .returning('id');

    const supertest = (await import('supertest')).default;
    const app = (await import('../index.js')).default;

    // A. Perform duplicate clicks in 10-minute window
    const firstClick = await supertest(app)
      .post('/api/discovery/click')
      .send({ searchId: searchLog.id, spotId: spot.id, rank: 0 });
    assert.strictEqual(firstClick.status, 200);
    assert.strictEqual(firstClick.body.deduplicated, false);

    const secondClick = await supertest(app)
      .post('/api/discovery/click')
      .send({ searchId: searchLog.id, spotId: spot.id, rank: 0 });
    assert.strictEqual(secondClick.status, 200);
    assert.strictEqual(secondClick.body.deduplicated, true);

    const clicksInDb = await db('discovery_clicks').where({ spot_id: spot.id });
    assert.strictEqual(clicksInDb.length, 1); // Deduplicated click skipped DB write!

    // B. Bot click velocity block (>20 clicks within 60 seconds)
    // Run 20 clicks (mock clicks will hit velocity limit)
    for (let i = 0; i < 20; i++) {
      await supertest(app)
        .post('/api/discovery/click')
        .send({ searchId: searchLog.id, spotId: spot.id, rank: 0 });
    }

    // The 22nd click must trigger a 429 rate limit
    const spamClick = await supertest(app)
      .post('/api/discovery/click')
      .send({ searchId: searchLog.id, spotId: spot.id, rank: 0 });

    assert.strictEqual(spamClick.status, 429);
    assert.strictEqual(spamClick.body.error, 'TOO_MANY_REQUESTS');
  });

  test('6. Verify 90-day retention prune job deletes historic log rows', async () => {
    const now = new Date();
    const historicDate = new Date(now.getTime() - 105 * 24 * 60 * 60 * 1000); // 105 days old

    const spot = await SpotRepository.create({ name: 'Old Spot', category: 'cafe', latitude: 40.7128, longitude: -74.0060 });

    // Insert old telemetry search and click
    const [oldSearch] = await db('discovery_searches')
      .insert({
        latitude: 40.7128,
        longitude: -74.0060,
        results_count: 1,
        created_at: historicDate,
        abandoned: true
      })
      .returning('id');
    await db('discovery_clicks')
      .insert({ search_id: oldSearch.id, spot_id: spot.id, rank: 0, created_at: historicDate });

    // Insert fresh telemetry search
    const [freshSearch] = await db('discovery_searches')
      .insert({
        latitude: 40.7128,
        longitude: -74.0060,
        results_count: 1,
        created_at: now,
        abandoned: true
      })
      .returning('id');

    // Run background prune job
    await pruneDiscoveryTelemetry();

    // Verify historic records pruned, fresh records intact
    const remainingSearches = await db('discovery_searches').select('id');
    const remainingClicks = await db('discovery_clicks').select('id');

    assert.strictEqual(remainingSearches.length, 1);
    assert.strictEqual(remainingSearches[0].id, freshSearch.id);
    assert.strictEqual(remainingClicks.length, 0); // Historic click pruned
  });
});
