import db from './db.js';
import client from './redisClient.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from './config/index.js';
import { refresh, requestPasswordReset, resetPassword } from './controllers/authController.js';

const sha256 = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Safe Redis operation wrapper
async function safeRedis(op, fallbackVal = null) {
  try {
    return await op();
  } catch (err) {
    return fallbackVal;
  }
}

(async () => {
  try {
    console.log('🧪 Starting Authentication & Hardened Session Lifecycle validation tests...');

    // Setup Test User
    const email = 'security_test@gmail.com';
    await db('login_attempts').where({ email }).del();
    await db('user_sessions').whereIn('user_id', db('users').select('id').where({ email })).del();
    await db('users').where({ email }).del();

    const saltRounds = 12;
    const password_hash = await bcrypt.hash('SecurePassword123!', saltRounds);
    
    const [user] = await db('users')
      .insert({ email, password_hash, name: 'Security Tester', provider: 'local' })
      .returning(['id', 'email', 'name', 'provider']);

    console.log(`\n✅ Test user created with ID: ${user.id}`);

    // --- TEST 1: Initial Login Session and Cookie Creation ---
    console.log('\n1. Testing Initial Login Session Family generation...');
    const sessionId = crypto.randomUUID();
    const sessionFamilyId = crypto.randomUUID();
    const rawRefreshToken_1 = crypto.randomBytes(32).toString('hex');
    const hashedToken_1 = sha256(rawRefreshToken_1);

    await db('user_sessions').insert({
      id: sessionId,
      user_id: user.id,
      session_family_id: sessionFamilyId,
      refresh_token_hash: hashedToken_1,
      ip_address: '127.0.0.1',
      user_agent: 'Automated Test Agent',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    await safeRedis(() => client.set(`session:active:${sessionId}`, '1', { EX: 15 * 60 }));

    const sessionRow = await db('user_sessions').where({ id: sessionId }).first();
    if (sessionRow && sessionRow.session_family_id === sessionFamilyId) {
      console.log('✅ Session Family initial state recorded accurately!');
    } else {
      throw new Error('Initial session family matching failure');
    }

    // --- TEST 2: Token Rotation (RTR) ---
    console.log('\n2. Testing Refresh Token Rotation (RTR) lineage preservation...');
    
    // Simulate Request Mock
    const mockRes = {
      cookie: (name, val, opts) => {
        mockRes.cookies[name] = val;
      },
      clearCookie: (name, opts) => {
        delete mockRes.cookies[name];
      },
      cookies: {},
      status: (code) => {
        mockRes.statusCode = code;
        return mockRes;
      },
      json: (data) => {
        mockRes.body = data;
        return mockRes;
      }
    };
    
    const mockReq = {
      cookies: { refreshToken: rawRefreshToken_1 },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Automated Test Agent' },
      body: {}
    };

    await refresh(mockReq, mockRes, (err) => { if (err) throw err; });
    
    const newRawRefreshToken = mockRes.cookies.refreshToken;
    if (mockRes.statusCode === 200 && newRawRefreshToken && mockRes.body.success) {
      console.log('✅ First token rotation executed successfully!');
    } else {
      throw new Error(`Rotation failed: ${JSON.stringify(mockRes.body)}`);
    }

    // Check database lineage (new session S_2 created with same family_id)
    const activeSession = await db('user_sessions')
      .where({ session_family_id: sessionFamilyId, is_revoked: false, is_rotated: false })
      .first();

    const previousSession = await db('user_sessions')
      .where({ id: sessionId })
      .first();

    if (activeSession && previousSession && previousSession.is_rotated && activeSession.session_family_id === sessionFamilyId) {
      console.log('✅ Token lineage preserved: old row marked is_rotated=true, new row created with identical session_family_id!');
    } else {
      throw new Error('Token lineage validation failure');
    }

    // --- TEST 3: Replay Attack Invalidation ---
    console.log('\n3. Testing Replay Attack Detection & Family Lineage Invalidation...');
    
    // Resubmit already rotated rawRefreshToken_1 (replay attempt!)
    const replayRes = {
      cookie: (name, val, opts) => {},
      clearCookie: (name, opts) => {},
      status: (code) => { replayRes.statusCode = code; return replayRes; },
      json: (data) => { replayRes.body = data; return replayRes; }
    };
    
    const replayReq = {
      cookies: { refreshToken: rawRefreshToken_1 }, // Replayed!
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Automated Test Agent' },
      body: {}
    };

    await refresh(replayReq, replayRes, (err) => { if (err) throw err; });

    if (replayRes.statusCode === 401 && replayRes.body.error.code === 'SECURITY_COMPROMISE') {
      console.log('✅ Replay attempt detected and blocked with 401 SECURITY_COMPROMISE!');
    } else {
      throw new Error(`Replay should have returned 401: ${JSON.stringify(replayRes.body)}`);
    }

    // Confirm FULL family lineage invalidation
    const activeFamilySessionsCount = await db('user_sessions')
      .where({ session_family_id: sessionFamilyId, is_revoked: false })
      .count('id as count')
      .first();

    if (Number(activeFamilySessionsCount.count) === 0) {
      console.log('✅ True Family Invalidation succeeded! All sessions sharing lineage are fully revoked.');
    } else {
      throw new Error('Family session invalidation check failed: active rows remain');
    }

    // --- TEST 4: Single-Active Password Reset Discipline & Resend Throttling ---
    console.log('\n4. Testing Single-Active Password Reset Token rules & Throttles...');
    
    // Request first reset
    const resetReq_1 = { body: { email } };
    const resetRes_1 = {
      status: (code) => { resetRes_1.statusCode = code; return resetRes_1; },
      json: (data) => { resetRes_1.body = data; return resetRes_1; }
    };
    await requestPasswordReset(resetReq_1, resetRes_1, (err) => { if (err) throw err; });

    const userWithReset_1 = await db('users').where({ id: user.id }).first();
    const tokenHash_1 = userWithReset_1.password_reset_token_hash;

    // Trigger instant second reset request within 60s window (should be throttled!)
    const resetRes_2 = {
      status: (code) => { resetRes_2.statusCode = code; return resetRes_2; },
      json: (data) => { resetRes_2.body = data; return resetRes_2; }
    };
    await requestPasswordReset(resetReq_1, resetRes_2, (err) => { if (err) throw err; });

    if (resetRes_2.statusCode === 429 && resetRes_2.body.error.code === 'THROTTLED') {
      console.log('✅ Resend Throttling protects password resets from request floods!');
    } else {
      throw new Error(`Resend throttling failed: ${JSON.stringify(resetRes_2.body)}`);
    }

    // Clear reset throttle in DB to simulate second token generation to check single-active token discipline
    await db('users')
      .where({ id: user.id })
      .update({ last_reset_request_at: new Date(Date.now() - 70000) });

    const resetRes_3 = {
      status: (code) => { resetRes_3.statusCode = code; return resetRes_3; },
      json: (data) => { resetRes_3.body = data; return resetRes_3; }
    };
    await requestPasswordReset(resetReq_1, resetRes_3, (err) => { if (err) throw err; });

    const userWithReset_3 = await db('users').where({ id: user.id }).first();
    const tokenHash_3 = userWithReset_3.password_reset_token_hash;

    if (tokenHash_1 !== tokenHash_3) {
      console.log('✅ Single-Active reset token verified! Old reset tokens invalidated when a new one is requested.');
    } else {
      throw new Error('Single active reset token discipline failed');
    }

    // --- TEST 5: Password Reset Session Revocation ---
    console.log('\n5. Testing Password Reset all-device session invalidations...');
    
    // Setup multiple active session families for the user
    await db('user_sessions').insert([
      {
        id: crypto.randomUUID(),
        user_id: user.id,
        session_family_id: crypto.randomUUID(),
        refresh_token_hash: sha256('token_device_A'),
        is_revoked: false,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: crypto.randomUUID(),
        user_id: user.id,
        session_family_id: crypto.randomUUID(),
        refresh_token_hash: sha256('token_device_B'),
        is_revoked: false,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    ]);

    const beforeResetActiveCount = await db('user_sessions')
      .where({ user_id: user.id, is_revoked: false })
      .count('id as count')
      .first();

    if (Number(beforeResetActiveCount.count) !== 2) {
      throw new Error('Failed to set up multiple active device sessions before reset');
    }

    // Perform password reset using mock controller call
    const resetSubmitReq = {
      body: {
        token: 'token_that_does_not_matter_here_we_bypass_with_mock_flow',
        newPassword: 'NewSecurePassword456!'
      }
    };
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = sha256(rawResetToken);
    await db('users')
      .where({ id: user.id })
      .update({
        password_reset_token_hash: hashedResetToken,
        password_reset_expires_at: new Date(Date.now() + 60 * 60 * 1000)
      });

    resetSubmitReq.body.token = rawResetToken;

    const resetSubmitRes = {
      status: (code) => { resetSubmitRes.statusCode = code; return resetSubmitRes; },
      json: (data) => { resetSubmitRes.body = data; return resetSubmitRes; }
    };

    await resetPassword(resetSubmitReq, resetSubmitRes, (err) => { if (err) throw err; });

    if (resetSubmitRes.statusCode === 200 && resetSubmitRes.body.success) {
      console.log('✅ Password successfully updated in database!');
    } else {
      throw new Error(`Password reset submission failed: ${JSON.stringify(resetSubmitRes.body)}`);
    }

    // Confirm that ALL active sessions are now fully revoked
    const afterResetActiveCount = await db('user_sessions')
      .where({ user_id: user.id, is_revoked: false })
      .count('id as count')
      .first();

    if (Number(afterResetActiveCount.count) === 0) {
      console.log('✅ Password reset session revocation succeeded! Stolen active sessions on all other devices flushed immediately.');
    } else {
      throw new Error(`Sessions remain active after credentials update: ${afterResetActiveCount.count} active`);
    }

    // Clean up
    await db('user_sessions').whereIn('user_id', db('users').select('id').where({ email })).del();
    await db('users').where({ email }).del();

    console.log('\n🎉 All Authentication Hardening validation tests passed cleanly!');
    process.exit(0);
  } catch (err) {
    console.error('Validation suite error:', err);
    process.exit(1);
  }
})();
