import { test, describe, beforeEach, after, before } from 'node:test';
import assert from 'node:assert';
import supertest from 'supertest';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

import { validateTestEnvironment, cleanDatabase, flushRedisTestCache, teardownConnections } from './helpers.js';
import db from '../db.js';
import { AuthenticationService } from '../services/authenticationService.js';
import { RbacRepository } from '../repositories/rbacRepository.js';

// Express Test Server setup
import adminRoutes from '../routes/adminRoutes.js';
import { responseFormatter } from '../middleware/responseFormatter.js';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(responseFormatter);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: { code: err.code || 'INTERNAL_ERROR', message: err.message }
  });
});

const request = supertest(app);

describe('Admin User Management Integration Tests', () => {
  let adminToken;
  let adminUserId;
  let targetUserId;
  let targetEmail = 'target_managed_user@example.com';
  let rawPassword = 'Password123!';

  before(async () => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await flushRedisTestCache();

    // 1. Create Admin User
    const adminResult = await AuthenticationService.registerLocal('admin_test_user@example.com', rawPassword, { name: 'System Admin' });
    adminUserId = adminResult.data.user.id;
    await db('users').where({ id: adminUserId }).update({ status: 'ACTIVE' });

    // Assign Admin role
    const adminRole = await RbacRepository.getRoleByName('admin');
    if (adminRole) {
      await db('user_roles').insert({ user_id: adminUserId, role_id: adminRole.id });
    }

    // Login as Admin
    const adminLogin = await AuthenticationService.loginLocal('admin_test_user@example.com', rawPassword);
    adminToken = adminLogin.data.accessToken;

    // 2. Create Target User
    const targetResult = await AuthenticationService.registerLocal(targetEmail, rawPassword, { name: 'Target Managed User' });
    targetUserId = targetResult.data.user.id;
    await db('users').where({ id: targetUserId }).update({ status: 'ACTIVE' });
  });

  after(async () => {
    await teardownConnections();
  });

  test('GET /api/admin/users - Should search, filter, and paginate users', async () => {
    const res = await request
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ search: 'Target', limit: 10, page: 1 });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.users.length >= 1);
  });

  test('GET /api/admin/users/:userId - Should return aggregated deep-dive user details', async () => {
    const res = await request
      .get(`/api/admin/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.id, targetUserId);
    assert.ok(res.body.data.profile);
    assert.ok(res.body.data.preferences);
    assert.ok(Array.isArray(res.body.data.roles));
  });

  test('PUT /api/admin/users/:userId - Should update target user details', async () => {
    const res = await request
      .put(`/api/admin/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Target Name' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.name, 'Updated Target Name');
  });

  test('POST /api/admin/users/:userId/suspend & unsuspend - Should suspend and unsuspend target user', async () => {
    const suspendRes = await request
      .post(`/api/admin/users/${targetUserId}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Policy violation investigation' });

    assert.strictEqual(suspendRes.status, 200);
    assert.strictEqual(suspendRes.body.data.status, 'BANNED');

    const unsuspendRes = await request
      .post(`/api/admin/users/${targetUserId}/unsuspend`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(unsuspendRes.status, 200);
    assert.strictEqual(unsuspendRes.body.data.status, 'ACTIVE');
  });

  test('POST /api/admin/users/:userId/disable & enable - Should disable and enable user', async () => {
    const disableRes = await request
      .post(`/api/admin/users/${targetUserId}/disable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Administrative maintenance' });

    assert.strictEqual(disableRes.status, 200);
    assert.strictEqual(disableRes.body.data.status, 'DISABLED');

    const enableRes = await request
      .post(`/api/admin/users/${targetUserId}/enable`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(enableRes.status, 200);
    assert.strictEqual(enableRes.body.data.status, 'ACTIVE');
  });

  test('POST /api/admin/users/:userId/delete & restore - Should soft-delete and restore user', async () => {
    const deleteRes = await request
      .post(`/api/admin/users/${targetUserId}/delete`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteRes.body.data.status, 'SOFT_DELETED');

    const restoreRes = await request
      .post(`/api/admin/users/${targetUserId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(restoreRes.status, 200);
    assert.strictEqual(restoreRes.body.data.status, 'ACTIVE');
  });

  test('POST /api/admin/users/:userId/verify-email - Should manually mark user email verified', async () => {
    const res = await request
      .post(`/api/admin/users/${targetUserId}/verify-email`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'ACTIVE');
  });

  test('POST /api/admin/users/:userId/unlock - Should unlock account', async () => {
    const res = await request
      .post(`/api/admin/users/${targetUserId}/unlock`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'ACTIVE');
  });

  test('POST /api/admin/users/:userId/logout - Should force logout user sessions', async () => {
    const res = await request
      .post(`/api/admin/users/${targetUserId}/logout`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });
});
