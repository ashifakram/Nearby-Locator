import test from 'node.test';
import assert from 'assert';
import supertest from 'supertest';
import app from '../index.js';

const request = supertest(app);

test('Admin Platform Operations & Telemetry Integration Tests', async (t) => {
  await t.test('GET /api/admin/dashboard/widgets - 401 Unauthorized without Bearer token', async () => {
    const res = await request.get('/api/admin/dashboard/widgets');
    assert.strictEqual(res.status, 401);
  });

  await t.test('GET /api/admin/ai/provider-health - 401 Unauthorized without Bearer token', async () => {
    const res = await request.get('/api/admin/ai/provider-health');
    assert.strictEqual(res.status, 401);
  });

  await t.test('GET /api/admin/search-quality/analytics - 401 Unauthorized without Bearer token', async () => {
    const res = await request.get('/api/admin/search-quality/analytics');
    assert.strictEqual(res.status, 401);
  });

  await t.test('GET /api/admin/security/telemetry - 401 Unauthorized without Bearer token', async () => {
    const res = await request.get('/api/admin/security/telemetry');
    assert.strictEqual(res.status, 401);
  });

  await t.test('GET /api/admin/ops/queues - 401 Unauthorized without Bearer token', async () => {
    const res = await request.get('/api/admin/ops/queues');
    assert.strictEqual(res.status, 401);
  });

  await t.test('GET /api/admin/search - 401 Unauthorized without Bearer token', async () => {
    const res = await request.get('/api/admin/search?q=test');
    assert.strictEqual(res.status, 401);
  });

  await t.test('GET /api/admin/feature-flags - 401 Unauthorized without Bearer token', async () => {
    const res = await request.get('/api/admin/feature-flags');
    assert.strictEqual(res.status, 401);
  });
});
