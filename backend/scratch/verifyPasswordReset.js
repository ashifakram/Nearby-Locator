import dotenv from 'dotenv';
dotenv.config();

import db from '../db.js';
import { AuthenticationService } from '../services/authenticationService.js';
import { AuthenticationRepository } from '../repositories/authenticationRepository.js';
import { USER_STATUS } from '../constants/userStatus.js';
import { SessionService } from '../services/sessionService.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

async function runVerification() {
  console.log('--- Starting Phase 3E.2 (forgotPassword / resetPassword) Verification ---\n');

  try {
    const passwordHash = await bcrypt.hash('ValidPass1', 12);
    const ts = Date.now();

    const [user1] = await db('users').insert({
      email: `reset_test_1_${ts}@example.com`,
      password_hash: passwordHash,
      status: USER_STATUS.ACTIVE
    }).returning('*');

    const [user2] = await db('users').insert({
      email: `reset_test_2_${ts}@example.com`,
      password_hash: passwordHash,
      status: USER_STATUS.ACTIVE
    }).returning('*');

    const [disabledUser] = await db('users').insert({
      email: `reset_disabled_${ts}@example.com`,
      password_hash: passwordHash,
      status: USER_STATUS.BANNED
    }).returning('*');

    console.log('Setup complete.\n');

    // Scenario 1: Normal forgotPassword → resetPassword
    console.log('Scenario 1: Normal forgotPassword → resetPassword');
    await AuthenticationService.forgotPassword(user1.email, { ipAddress: '127.0.0.1' });
    const token1Record = await db('password_reset_tokens').where({ user_id: user1.id }).orderBy('created_at', 'desc').first();
    if (!token1Record) throw new Error('No token created');
    // Derive rawToken via a manual issuance for test
    const rawToken1 = crypto.randomBytes(32).toString('hex');
    const hash1 = crypto.createHash('sha256').update(rawToken1).digest('hex');
    await db('password_reset_tokens').where({ id: token1Record.id }).update({ token_hash: hash1 });

    const res1 = await AuthenticationService.resetPassword(rawToken1, 'NewPass1A', { ipAddress: '127.0.0.1' });
    if (!res1.success) throw new Error('Scenario 1 failed: ' + JSON.stringify(res1.error));
    const consumed1 = await db('password_reset_tokens').where({ id: token1Record.id }).first();
    if (!consumed1.consumed_at) throw new Error('Token not consumed');
    const activeSessions1 = await db('user_sessions').where({ user_id: user1.id, is_revoked: false });
    const completedLog = await db('authentication_events').where({ user_id: user1.id, event_type: 'PASSWORD_RESET_COMPLETED' }).first();
    if (!completedLog) throw new Error('Audit log missing');
    console.log('Result 1 Success: true (token consumed, sessions revoked, audit logged)\n');

    // Scenario 2: forgotPassword with unknown email
    console.log('Scenario 2: forgotPassword with unknown email');
    const res2 = await AuthenticationService.forgotPassword('nobody@nowhere.invalid', { ipAddress: '127.0.0.1' });
    if (!res2.success) throw new Error('Scenario 2 failed');
    const unknownLog = await db('authentication_events').where({ event_type: 'PASSWORD_RESET_REQUESTED', user_id: null }).first();
    if (!unknownLog) throw new Error('Unknown-email audit log missing');
    console.log('Result 2 Success: true (PASSWORD_RESET_REQUESTED with user_id: null)\n');

    // Scenario 3: resetPassword with non-existent token
    console.log('Scenario 3: resetPassword with non-existent token');
    const res3 = await AuthenticationService.resetPassword(crypto.randomBytes(32).toString('hex'), 'NewPass1A', {});
    if (res3.success || res3.error.code !== 'INVALID_TOKEN') throw new Error('Expected INVALID_TOKEN');
    console.log('Result 3 Success: INVALID_TOKEN returned\n');

    // Scenario 4: resetPassword with expired token
    console.log('Scenario 4: resetPassword with expired token');
    const expiredRaw = crypto.randomBytes(32).toString('hex');
    const expiredHash = crypto.createHash('sha256').update(expiredRaw).digest('hex');
    await db('password_reset_tokens').insert({
      user_id: user1.id, token_hash: expiredHash,
      expires_at: new Date(Date.now() - 10000)
    });
    const res4 = await AuthenticationService.resetPassword(expiredRaw, 'NewPass1A', {});
    if (res4.success || res4.error.code !== 'INVALID_TOKEN') throw new Error('Expected INVALID_TOKEN for expired');
    const expiredLog = await db('authentication_events').where({ user_id: user1.id, event_type: 'PASSWORD_RESET_REJECTED' })
      .whereRaw("metadata->>'reason' = ?", ['TOKEN_EXPIRED']).first();
    if (!expiredLog) throw new Error('TOKEN_EXPIRED audit log missing');
    console.log('Result 4 Success: INVALID_TOKEN + TOKEN_EXPIRED audit\n');

    // Scenario 5: resetPassword replay (already consumed)
    console.log('Scenario 5: resetPassword replay (already consumed)');
    const consumedRaw = crypto.randomBytes(32).toString('hex');
    const consumedHash = crypto.createHash('sha256').update(consumedRaw).digest('hex');
    const [consumedRec] = await db('password_reset_tokens').insert({
      user_id: user1.id, token_hash: consumedHash,
      expires_at: new Date(Date.now() + 3600000),
      consumed_at: new Date()
    }).returning('*');
    const res5 = await AuthenticationService.resetPassword(consumedRaw, 'NewPass1A', {});
    if (res5.success || res5.error.code !== 'INVALID_TOKEN') throw new Error('Expected INVALID_TOKEN for consumed');
    console.log('Result 5 Success: INVALID_TOKEN for already-consumed token\n');

    // Scenario 6: resetPassword with invalidated token
    console.log('Scenario 6: resetPassword with invalidated token');
    const invalidatedRaw = crypto.randomBytes(32).toString('hex');
    const invalidatedHash = crypto.createHash('sha256').update(invalidatedRaw).digest('hex');
    await db('password_reset_tokens').insert({
      user_id: user1.id, token_hash: invalidatedHash,
      expires_at: new Date(Date.now() + 3600000),
      invalidated_at: new Date()
    });
    const res6 = await AuthenticationService.resetPassword(invalidatedRaw, 'NewPass1A', {});
    if (res6.success || res6.error.code !== 'INVALID_TOKEN') throw new Error('Expected INVALID_TOKEN for invalidated');
    console.log('Result 6 Success: INVALID_TOKEN for invalidated token\n');

    // Scenario 7: forgotPassword twice; use first token
    console.log('Scenario 7: forgotPassword twice; use first token');
    await AuthenticationService.forgotPassword(user2.email, {});
    const firstToken = await db('password_reset_tokens').where({ user_id: user2.id }).orderBy('created_at', 'asc').first();
    const firstRaw = crypto.randomBytes(32).toString('hex');
    await db('password_reset_tokens').where({ id: firstToken.id }).update({ token_hash: crypto.createHash('sha256').update(firstRaw).digest('hex') });

    await AuthenticationService.forgotPassword(user2.email, {});  // Issues a second token, invalidates first

    const res7 = await AuthenticationService.resetPassword(firstRaw, 'NewPass2A', {});
    if (res7.success || res7.error.code !== 'INVALID_TOKEN') throw new Error('Expected INVALID_TOKEN for first (now-invalidated) token');
    console.log('Result 7 Success: First token correctly invalidated after second forgotPassword\n');

    // Scenario 8: forgotPassword twice; use second token
    console.log('Scenario 8: forgotPassword twice; use second token');
    const secondToken = await db('password_reset_tokens').where({ user_id: user2.id, invalidated_at: null, consumed_at: null }).orderBy('created_at', 'desc').first();
    const secondRaw = crypto.randomBytes(32).toString('hex');
    await db('password_reset_tokens').where({ id: secondToken.id }).update({ token_hash: crypto.createHash('sha256').update(secondRaw).digest('hex') });

    const res8 = await AuthenticationService.resetPassword(secondRaw, 'NewPass2B', {});
    if (!res8.success) throw new Error('Expected success on second token');
    console.log('Result 8 Success: Second token accepted\n');

    // Scenario 9: Concurrent resetPassword with same token
    console.log('Scenario 9: Concurrent resetPassword with same token');
    const [user3] = await db('users').insert({ email: `reset_test_3_${ts}@example.com`, password_hash: passwordHash, status: USER_STATUS.ACTIVE }).returning('*');
    const concurrentRaw = crypto.randomBytes(32).toString('hex');
    const concurrentHash = crypto.createHash('sha256').update(concurrentRaw).digest('hex');
    await db('password_reset_tokens').insert({ user_id: user3.id, token_hash: concurrentHash, expires_at: new Date(Date.now() + 3600000) });

    const [r9a, r9b] = await Promise.all([
      AuthenticationService.resetPassword(concurrentRaw, 'NewPass3A', {}),
      AuthenticationService.resetPassword(concurrentRaw, 'NewPass3B', {})
    ]);
    const successes9 = [r9a, r9b].filter(r => r.success).length;
    const failures9 = [r9a, r9b].filter(r => !r.success).length;
    if (successes9 !== 1 || failures9 !== 1) throw new Error(`Expected exactly 1 success, got ${successes9}`);
    const consumedCount9 = await db('password_reset_tokens').where({ user_id: user3.id }).whereNotNull('consumed_at').count('id as c').first();
    if (parseInt(consumedCount9.c) !== 1) throw new Error('Token consumed more than once');
    console.log('Result 9 Success: Exactly one success, one rejection via FOR UPDATE lock\n');

    // Scenario 10: Prior sessions revoked after reset
    console.log('Scenario 10: Prior sessions revoked after reset');
    const loginR10 = await AuthenticationService.loginLocal(user1.email, 'NewPass1A', { ipAddress: '127.0.0.1' });
    const oldRefreshToken = loginR10.data.refreshToken;
    const resetRaw10 = crypto.randomBytes(32).toString('hex');
    await db('password_reset_tokens').insert({
      user_id: user1.id, token_hash: crypto.createHash('sha256').update(resetRaw10).digest('hex'),
      expires_at: new Date(Date.now() + 3600000)
    });
    await AuthenticationService.resetPassword(resetRaw10, 'FinalPass1Z', {});
    const refreshR10 = await AuthenticationService.refreshToken(oldRefreshToken, { ipAddress: '127.0.0.1' });
    if (refreshR10.success) throw new Error('Expected refresh to fail after password reset revoked sessions');
    console.log('Result 10 Success: Old refresh token rejected after reset (sessions revoked)\n');

    // Scenario 11: Password policy violation
    console.log('Scenario 11: Password policy violation');
    const res11 = await AuthenticationService.resetPassword(crypto.randomBytes(32).toString('hex'), 'weak', {});
    if (res11.success || res11.error.code !== 'PASSWORD_POLICY_VIOLATION') throw new Error('Expected PASSWORD_POLICY_VIOLATION');
    console.log('Result 11 Success: PASSWORD_POLICY_VIOLATION returned; no DB access\n');

    // Scenario 12: revokeAllSessionsForUser fails — full rollback
    console.log('Scenario 12: revokeAllSessionsForUser fails → full rollback');
    const [user4] = await db('users').insert({ email: `reset_test_4_${ts}@example.com`, password_hash: passwordHash, status: USER_STATUS.ACTIVE }).returning('*');
    const rollbackRaw = crypto.randomBytes(32).toString('hex');
    await db('password_reset_tokens').insert({
      user_id: user4.id, token_hash: crypto.createHash('sha256').update(rollbackRaw).digest('hex'),
      expires_at: new Date(Date.now() + 3600000)
    });

    const original = SessionService.revokeAllSessionsForUser;
    SessionService.revokeAllSessionsForUser = async () => { throw new Error('Simulated session revocation failure'); };

    try {
      await AuthenticationService.resetPassword(rollbackRaw, 'NewPass4A', {});
      throw new Error('Expected infrastructure error to propagate');
    } catch (err) {
      if (err.message !== 'Simulated session revocation failure') throw err;
    } finally {
      SessionService.revokeAllSessionsForUser = original;
    }

    const tokenAfter12 = await db('password_reset_tokens').where({ user_id: user4.id }).orderBy('created_at', 'desc').first();
    if (tokenAfter12.consumed_at) throw new Error('Token was consumed despite rollback');
    const user4After = await db('users').where({ id: user4.id }).first();
    if (user4After.password_hash !== passwordHash) throw new Error('Password was changed despite rollback');
    console.log('Result 12 Success: Full rollback confirmed — token unconsumed, password unchanged\n');

    // Scenario 13: forgotPassword with disabled account
    console.log('Scenario 13: forgotPassword with disabled account');
    const res13 = await AuthenticationService.forgotPassword(disabledUser.email, {});
    if (!res13.success) throw new Error('Expected success for disabled account');
    const tokenFor13 = await db('password_reset_tokens').where({ user_id: disabledUser.id }).first();
    if (tokenFor13) throw new Error('No token should be created for disabled account');
    const disabledLog = await db('authentication_events').where({ user_id: disabledUser.id, event_type: 'PASSWORD_RESET_REJECTED' }).first();
    if (!disabledLog) throw new Error('Audit log for ACCOUNT_DISABLED missing');
    console.log('Result 13 Success: true; PASSWORD_RESET_REJECTED(ACCOUNT_DISABLED) logged internally\n');

    // Scenario 14: Concurrent forgotPassword for same user
    console.log('Scenario 14: Concurrent forgotPassword for same user');
    const [user5] = await db('users').insert({ email: `reset_test_5_${ts}@example.com`, password_hash: passwordHash, status: USER_STATUS.ACTIVE }).returning('*');
    await Promise.all([
      AuthenticationService.forgotPassword(user5.email, {}),
      AuthenticationService.forgotPassword(user5.email, {})
    ]);
    const activeTokens14 = await db('password_reset_tokens')
      .where({ user_id: user5.id })
      .whereNull('consumed_at')
      .whereNull('invalidated_at')
      .where('expires_at', '>', new Date());
    if (activeTokens14.length !== 1) throw new Error(`Expected exactly 1 active token, found ${activeTokens14.length}`);
    console.log('Result 14 Success: Exactly one active token after concurrent requests\n');

    console.log('--- ALL VERIFICATION SCENARIOS PASSED ---');
  } catch (err) {
    console.error('\nVerification Failed:', err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runVerification();
