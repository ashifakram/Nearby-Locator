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
import userRoutes from '../routes/userRoutes.js';
import authRoutes from '../routes/authRoutes.js';
import { responseFormatter } from '../middleware/responseFormatter.js';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(responseFormatter);
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: { code: err.code || 'INTERNAL_ERROR', message: err.message }
  });
});

const request = supertest(app);

describe('Account Management Integration Tests', () => {
  let userToken;
  let userId;
  let userEmail = 'account_test_user@example.com';
  let rawPassword = 'Password123!';

  before(async () => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await flushRedisTestCache();

    // Create standard user account
    const result = await AuthenticationService.registerLocal(userEmail, rawPassword, { name: 'Account Test User' });
    userId = result.data.user.id;

    // Activate user for testing
    await db('users').where({ id: userId }).update({ status: 'ACTIVE' });

    // Login to obtain JWT token
    const loginResult = await AuthenticationService.loginLocal(userEmail, rawPassword);
    userToken = loginResult.data.accessToken;
  });

  after(async () => {
    await teardownConnections();
  });

  test('GET /api/user/profile - Should retrieve enriched profile details', async () => {
    const res = await request
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${userToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.email, userEmail);
    assert.ok(res.body.data.user.profile);
    assert.ok(res.body.data.user.preferences);
  });

  test('PUT /api/user/profile - Should update personal information and enforce username rules', async () => {
    const res = await request
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        first_name: 'John',
        last_name: 'Doe',
        display_name: 'Johnny',
        username: 'johnny_doe99',
        bio: 'Avid traveler and food enthusiast.',
        country: 'United States',
        city: 'San Francisco'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.profile.first_name, 'John');
    assert.strictEqual(res.body.data.user.profile.username, 'johnny_doe99');
    assert.strictEqual(res.body.data.user.profile.city, 'San Francisco');
  });

  test('POST /api/user/profile/avatar - Should upload base64 avatar image', async () => {
    // 1x1 valid PNG base64
    const validBase64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await request
      .post('/api/user/profile/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ avatar_base64: validBase64Png });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.avatar_url.startsWith('/uploads/avatars/'));
  });

  test('DELETE /api/user/profile/avatar - Should delete custom avatar image', async () => {
    const res = await request
      .delete('/api/user/profile/avatar')
      .set('Authorization', `Bearer ${userToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.avatar_url, null);
  });

  test('GET /api/user/preferences & PUT /api/user/preferences - Should get and update preferences', async () => {
    const putRes = await request
      .put('/api/user/preferences')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        theme: 'dark',
        search_preferences: { max_radius_km: 25 }
      });

    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(putRes.body.data.preferences.theme, 'dark');

    const getRes = await request
      .get('/api/user/preferences')
      .set('Authorization', `Bearer ${userToken}`);

    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.body.data.preferences.theme, 'dark');
  });

  test('GET /api/user/privacy & PUT /api/user/privacy - Should manage privacy settings', async () => {
    const putRes = await request
      .put('/api/user/privacy')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ profile_visibility: 'public' });

    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(putRes.body.data.privacy.profile_visibility, 'public');
  });

  test('GET /api/user/notifications/settings & PUT /api/user/notifications/settings - Should manage notifications', async () => {
    const putRes = await request
      .put('/api/user/notifications/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ security_alerts: true });

    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(putRes.body.data.notifications.security_alerts, true);
  });

  test('GET /api/user/account/security/sessions - Should list active sessions', async () => {
    const res = await request
      .get('/api/user/account/security/sessions')
      .set('Authorization', `Bearer ${userToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.devices));
  });

  test('POST /api/user/account/export - Should request async account data export returning HTTP 202', async () => {
    const res = await request
      .post('/api/user/account/export')
      .set('Authorization', `Bearer ${userToken}`);

    assert.strictEqual(res.status, 202);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.exportId);

    const exportId = res.body.data.exportId;

    // Check export status
    const statusRes = await request
      .get(`/api/user/account/export/${exportId}`)
      .set('Authorization', `Bearer ${userToken}`);

    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.success, true);
    assert.strictEqual(statusRes.body.data.exportId, exportId);
  });

  test('POST /api/user/account/deactivate - Should deactivate user account', async () => {
    const res = await request
      .post('/api/user/account/deactivate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reason: 'Taking a break' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  test('DELETE /api/user/account - Should self-delete account with password check', async () => {
    const res = await request
      .delete('/api/user/account')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ password: rawPassword });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });
});
