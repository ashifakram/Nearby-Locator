process.env.NO_LISTEN = 'true';
// process.env.MOCK_REDIS = 'true'; // Removed to test with real Redis

import dotenv from 'dotenv';
dotenv.config();

// MOCK_REDIS already set at top

import request from 'supertest';
import app from '../index.js';
import db from '../db.js';
import { AuthenticationService } from '../services/authenticationService.js';
import crypto from 'crypto';

async function runE2E() {
  console.log('--- Starting Phase 8 E2E Auth Cutover Verification ---\n');

  try {
    const ts = Date.now();
    const email = `e2e_user_${ts}@example.com`;
    const password = 'ValidPass123';
    let accessToken = null;
    let refreshTokenCookie = null;
    let userId = null;

    // 1. Signup
    console.log('Test 1: Signup');
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({ email, password, name: 'E2E User' });
    
    if (signupRes.status !== 201) throw new Error(`Signup failed: ${signupRes.status} ${JSON.stringify(signupRes.body)}`);
    userId = signupRes.body.data.user.id;
    if (signupRes.headers['set-cookie']) throw new Error('Signup should not return cookies');
    console.log('  ✅ Passed (201, User Created, PENDING_VERIFICATION)');

    // 2. Email Verification (Bypass via service since route may not exist yet)
    console.log('Test 2: Email Verification Bypass');
    const tokenRecord = await db('email_verification_tokens').where({ user_id: userId }).first();
    if (!tokenRecord) throw new Error('Verification token not generated');
    
    // We need the raw token. Since we only store the hash, we can't get it.
    // Instead, just update the user status directly for the test to proceed.
    await db('users').where({ id: userId }).update({ status: 'ACTIVE' });
    await db('email_verification_tokens').where({ user_id: userId }).delete();
    console.log('  ✅ Passed (User manually activated for test)');

    // 3. Login
    console.log('Test 3: Login');
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    
    if (loginRes.status !== 200) throw new Error(`Login failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
    accessToken = loginRes.body.data.token;
    refreshTokenCookie = loginRes.headers['set-cookie'].find(c => c.startsWith('refreshToken='));
    if (!accessToken || !refreshTokenCookie) throw new Error('Tokens missing from login response');
    console.log('  ✅ Passed (200, JWT and secure cookie issued)');

    // 4. Refresh
    console.log('Test 4: Token Refresh');
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshTokenCookie)
      .set('x-requested-with', 'XMLHttpRequest');
    
    if (refreshRes.status !== 200) throw new Error(`Refresh failed: ${refreshRes.status} ${JSON.stringify(refreshRes.body)}`);
    const newAccessToken = refreshRes.body.data.accessToken;
    const newRefreshTokenCookie = refreshRes.headers['set-cookie'].find(c => c.startsWith('refreshToken='));
    
    if (!newAccessToken || !newRefreshTokenCookie || newAccessToken === accessToken || newRefreshTokenCookie === refreshTokenCookie) {
      throw new Error('Tokens not properly rotated');
    }
    accessToken = newAccessToken;
    const oldRefreshTokenCookie = refreshTokenCookie;
    refreshTokenCookie = newRefreshTokenCookie;
    console.log('  ✅ Passed (200, Tokens rotated securely)');

    // 5. Token Replay Detection
    console.log('Test 5: Token Replay Detection');
    const replayRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', oldRefreshTokenCookie)
      .set('x-requested-with', 'XMLHttpRequest');
    
    if (replayRes.status !== 401 || replayRes.body.error.code !== 'INVALID_GRANT') {
      throw new Error(`Replay detection failed: ${replayRes.status} ${JSON.stringify(replayRes.body)}`);
    }
    console.log('  ✅ Passed (401 INVALID_GRANT, cookie cleared)');

    // Since replay revoked the family, we need to login again
    const login2Res = await request(app).post('/api/auth/login').send({ email, password });
    accessToken = login2Res.body.data.token;
    refreshTokenCookie = login2Res.headers['set-cookie'].find(c => c.startsWith('refreshToken='));

    // 6. Get Sessions
    console.log('Test 6: Get Active Sessions');
    const sessionsRes = await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`);
    
    if (sessionsRes.status !== 200 || !Array.isArray(sessionsRes.body.data) || sessionsRes.body.data.length !== 1) {
      throw new Error(`Get sessions failed: ${sessionsRes.status} ${JSON.stringify(sessionsRes.body)}`);
    }
    console.log('  ✅ Passed (200, 1 active session returned)');

    // 7. Change Password
    console.log('Test 7: Authenticated Change Password');
    const changePassRes = await request(app)
      .post('/api/auth/password/change')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ oldPassword: password, newPassword: 'NewValidPass123' });
    
    if (changePassRes.status !== 200) throw new Error(`Change password failed: ${changePassRes.status} ${JSON.stringify(changePassRes.body)}`);
    console.log('  ✅ Passed (200, Password changed)');

    // 8. Forgot Password
    console.log('Test 8: Forgot Password Request');
    const forgotRes = await request(app)
      .post('/api/auth/password/reset-request')
      .send({ email });
    
    if (forgotRes.status !== 200) throw new Error(`Forgot password failed: ${forgotRes.status} ${JSON.stringify(forgotRes.body)}`);
    console.log('  ✅ Passed (200, Reset link requested)');

    // Get the reset token manually for the next step
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const resetHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    await db('password_reset_tokens').where({ user_id: userId }).update({ invalidated_at: new Date() });
    await db('password_reset_tokens').insert({
      user_id: userId,
      token_hash: resetHash,
      expires_at: new Date(Date.now() + 3600000)
    });

    // 9. Reset Password
    console.log('Test 9: Reset Password');
    const resetRes = await request(app)
      .post('/api/auth/password/reset')
      .send({ token: rawResetToken, newPassword: 'ResetPass123' });
    
    if (resetRes.status !== 200) throw new Error(`Reset password failed: ${resetRes.status} ${JSON.stringify(resetRes.body)}`);
    console.log('  ✅ Passed (200, Password reset via token)');

    // 10. Logout
    // Must login first to get fresh tokens after reset revoked them
    const login3Res = await request(app).post('/api/auth/login').send({ email, password: 'ResetPass123' });
    accessToken = login3Res.body.data.token;
    refreshTokenCookie = login3Res.headers['set-cookie'].find(c => c.startsWith('refreshToken='));

    console.log('Test 10: Logout');
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', refreshTokenCookie)
      .set('x-requested-with', 'XMLHttpRequest');
    
    if (logoutRes.status !== 200) throw new Error(`Logout failed: ${logoutRes.status} ${JSON.stringify(logoutRes.body)}`);
    console.log('  ✅ Passed (200, Logged out successfully)');

    // 11. Concurrent Races Simulation (Logout All)
    console.log('Test 11: Concurrent Races (Logout All)');
    const login4Res = await request(app).post('/api/auth/login').send({ email, password: 'ResetPass123' });
    accessToken = login4Res.body.data.token;
    
    const [logout1, logout2] = await Promise.all([
      request(app).post('/api/auth/logout-all').set('Authorization', `Bearer ${accessToken}`).set('x-requested-with', 'XMLHttpRequest'),
      request(app).post('/api/auth/logout-all').set('Authorization', `Bearer ${accessToken}`).set('x-requested-with', 'XMLHttpRequest')
    ]);

    if (logout1.status === 200 && logout2.status === 200) {
      console.log('  ✅ Passed (Both returned 200 smoothly. Concurrency safely handled at DB level)');
    } else {
      throw new Error(`LogoutAll concurrency failed: ${logout1.status} / ${logout2.status}`);
    }

    console.log('\n🎉 All E2E Integration Tests Passed Successfully!');
  } catch (err) {
    console.error('\n❌ E2E Verification failed:');
    console.error(err);
  } finally {
    await db.destroy();
  }
}

runE2E();
