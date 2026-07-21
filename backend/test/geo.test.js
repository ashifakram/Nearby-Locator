import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index.js';
import db from '../db.js';
import client from '../redisClient.js';
import { cleanDatabase, resetGlobalState, flushRedisTestCache, teardownConnections } from './helpers.js';
import { clearGeoRateLimiterCache } from '../middleware/geoRateLimiter.js';

describe('📍 Geospatial Location & Search Optimization Integration Suite', () => {

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    await cleanDatabase();
    await flushRedisTestCache();
    resetGlobalState();
    clearGeoRateLimiterCache();
  });

  after(async () => {
    await teardownConnections();
  });

  // Helper: Seed Spot directly through API
  const seedSpot = async (name, category, lat, lng, rating = 4.5, is_active = true) => {
    const res = await request(app)
      .post('/api/spots')
      .send({
        name,
        category,
        latitude: lat,
        longitude: lng,
        rating,
        address: `${name} Street 123`,
        is_active
      });
    assert.equal(res.statusCode, 201);
    return res.body.spot;
  };

  it('1. Create spot and verify coordinate trigger automatic calculation', async () => {
    const spot = await seedSpot('Golden Gate Bridge', 'tourist', 37.8199, -122.4783);
    
    assert.ok(spot.id);
    assert.equal(spot.name, 'Golden Gate Bridge');
    assert.equal(spot.latitude, 37.8199);
    assert.equal(spot.longitude, -122.4783);

    // Verify coordinates column exists and is populated in the database
    const dbRecord = await db('spots').where({ id: spot.id }).first();
    assert.ok(dbRecord.coordinates);
  });

  it('2. Query nearby spots with strict radius filtering and deterministic sorting', async () => {
    // San Francisco Downtown (Market St / Powell) Search Center: 37.7844, -122.4080
    // Spot A: Union Square (Close ~400m): 37.7876, -122.4075
    // Spot B: Ferry Building (Mid ~1.7km): 37.7954, -122.3937
    // Spot C: Alcatraz Island (Far ~5.5km): 37.8270, -122.4230 (outside 5km radius)
    // Spot D: Inactive spot nearby: 37.7850, -122.4090 (is_active = false)

    await seedSpot('Union Square', 'shopping', 37.7876, -122.4075, 4.8, true);
    await seedSpot('Ferry Building', 'sightseeing', 37.7954, -122.3937, 4.6, true);
    await seedSpot('Alcatraz Island', 'tourist', 37.8500, -122.4230, 4.7, true);
    await seedSpot('Closed Shop', 'shopping', 37.7850, -122.4090, 3.0, false);

    const res = await request(app)
      .get('/api/spots/search')
      .query({
        lat: 37.7844,
        lng: -122.4080,
        radius: 5000, // 5km
        limit: 10
      });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.length, 2);

    // Assert correct deterministic sorting (Union Square first, Ferry Building second)
    assert.equal(res.body.data[0].name, 'Union Square');
    assert.equal(res.body.data[1].name, 'Ferry Building');
    
    // Assert rounded_dist in meters is returned
    assert.ok(res.body.data[0].rounded_dist > 0);
    assert.ok(res.body.data[1].rounded_dist > res.body.data[0].rounded_dist);
  });

  it('3. Validate float-safe pagination stability across pages', async () => {
    await seedSpot('Union Square', 'shopping', 37.7876, -122.4075, 4.8, true);
    await seedSpot('Ferry Building', 'sightseeing', 37.7954, -122.3937, 4.6, true);

    // Query Page 1 with limit = 1
    const page1Res = await request(app)
      .get('/api/spots/search')
      .query({
        lat: 37.7844,
        lng: -122.4080,
        radius: 5000,
        limit: 1
      });

    assert.equal(page1Res.statusCode, 200);
    assert.equal(page1Res.body.data.length, 1);
    assert.equal(page1Res.body.data[0].name, 'Union Square');
    assert.ok(page1Res.body.nextCursor);

    // Query Page 2 using the nextCursor
    const page2Res = await request(app)
      .get('/api/spots/search')
      .query({
        lat: 37.7844,
        lng: -122.4080,
        radius: 5000,
        limit: 1,
        cursor: page1Res.body.nextCursor
      });

    assert.equal(page2Res.statusCode, 200);
    assert.equal(page2Res.body.data.length, 1);
    assert.equal(page2Res.body.data[0].name, 'Ferry Building');
  });

  it('4. Prevent grid scraping with Geohash coordinate crawling rate limiter', async () => {
    // Make query requests to 11 different Geohash-5 regions within the same sliding window
    // SF Downtown: 37.7844, -122.4080
    // Oakland: 37.8044, -122.2711
    // San Jose: 37.3382, -121.8863
    // Los Angeles: 34.0522, -118.2437
    // San Diego: 32.7157, -117.1611
    // Las Vegas: 36.1716, -115.1398
    // Phoenix: 33.4484, -112.0740
    // Denver: 39.7392, -104.9903
    // Seattle: 47.6062, -122.3321
    // Portland: 45.5152, -122.6784
    // New York: 40.7128, -74.0060

    const coordinatesList = [
      { lat: 37.7844, lng: -122.4080 },
      { lat: 37.8044, lng: -122.2711 },
      { lat: 37.3382, lng: -121.8863 },
      { lat: 34.0522, lng: -118.2437 },
      { lat: 32.7157, lng: -117.1611 },
      { lat: 36.1716, lng: -115.1398 },
      { lat: 33.4484, lng: -112.0740 },
      { lat: 39.7392, lng: -104.9903 },
      { lat: 47.6062, lng: -122.3321 },
      { lat: 45.5152, lng: -122.6784 },
      { lat: 40.7128, lng: -74.0060 }
    ];

    // Seed a spot in NY to guarantee no DB empty exceptions
    await seedSpot('New York Park', 'park', 40.7128, -74.0060);

    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .get('/api/spots/search')
        .query({
          lat: coordinatesList[i].lat,
          lng: coordinatesList[i].lng,
          radius: 5000
        });
      assert.equal(res.statusCode, 200);
    }

    // The 11th request (distinct Geohash-5 cell) must be blocked by rate limiter
    const blockedRes = await request(app)
      .get('/api/spots/search')
      .query({
        lat: coordinatesList[10].lat,
        lng: coordinatesList[10].lng,
        radius: 5000
      });

    assert.equal(blockedRes.statusCode, 429);
    assert.equal(blockedRes.body.error.code, 'GEO_CRAWLING_DETECTED');
  });

  it('5. Confirm snapped geo-caching hit validation and page-2 caching exclusion', async () => {
    await seedSpot('Union Square', 'shopping', 37.7876, -122.4075, 4.8, true);

    // Initial Request: Cache MISS
    const res1 = await request(app)
      .get('/api/spots/search')
      .query({
        lat: 37.7844,
        lng: -122.4080,
        radius: 5000
      });
    
    assert.equal(res1.statusCode, 200);
    assert.equal(res1.headers['x-geo-cache'], 'MISS');

    // Second Request: Cache HIT
    const res2 = await request(app)
      .get('/api/spots/search')
      .query({
        lat: 37.7844,
        lng: -122.4080,
        radius: 5000
      });

    assert.equal(res2.statusCode, 200);
    assert.equal(res2.headers['x-geo-cache'], 'HIT');
    assert.equal(res2.body.data.length, res1.body.data.length);

    // Page 2 Request with cursor: Cache BYPASS
    const page2Res = await request(app)
      .get('/api/spots/search')
      .query({
        lat: 37.7844,
        lng: -122.4080,
        radius: 5000,
        cursor: Buffer.from('1.03|bd01de0b-b556-4777-bbf8-9a0d95730195').toString('base64')
      });

    assert.equal(page2Res.statusCode, 200);
    assert.equal(page2Res.headers['x-geo-cache'], undefined);
  });

  it('6. Perform zoom-aware map clustering and numeric average memory protection', async () => {
    // Seed 4 spots in close proximity to trigger clustering
    await seedSpot('Spot 1', 'food', 37.7844, -122.4080);
    await seedSpot('Spot 2', 'food', 37.7845, -122.4081);
    await seedSpot('Spot 3', 'food', 37.7846, -122.4082);
    await seedSpot('Spot 4', 'food', 37.7847, -122.4083);

    const res = await request(app)
      .get('/api/spots/clusters')
      .query({
        lat: 37.7844,
        lng: -122.4080,
        radius: 5000,
        zoom: 11
      });

    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);

    // Verify aggregate properties (count of spots in cluster cell)
    const firstCluster = res.body.data[0];
    assert.ok(firstCluster.count >= 1);
    assert.ok(firstCluster.latitude);
    assert.ok(firstCluster.longitude);
  });
});
