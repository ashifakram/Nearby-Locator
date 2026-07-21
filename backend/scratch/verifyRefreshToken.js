import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import db from '../db.js';
import { AuthenticationService } from '../services/authenticationService.js';
import { SessionService } from '../services/sessionService.js';
import { AuthenticationRepository } from '../repositories/authenticationRepository.js';
import { USER_STATUS } from '../constants/userStatus.js';
import bcrypt from 'bcrypt';

async function run() {
  console.log('--- Starting Phase 3D (refreshToken) Verification ---\n');
  
  let user1, user2;
  let session1, rawToken1;

  // Setup: Create a test user and an initial session
  const baseEmail = `refresh_test_${Date.now()}@example.com`;
  
  await db.transaction(async (trx) => {
    const res = await trx('users').insert({
      email: baseEmail,
      password_hash: await bcrypt.hash('password123', 10),
      status: USER_STATUS.ACTIVE
    }).returning('*');
    user1 = res[0];

    const res2 = await trx('users').insert({
      email: `refresh_test2_${Date.now()}@example.com`,
      password_hash: await bcrypt.hash('password123', 10),
      status: USER_STATUS.ACTIVE
    }).returning('*');
    user2 = res2[0];
  });
  
  console.log(`Setup complete. Users created.`);

  // Create initial session manually via internal API
  rawToken1 = crypto.randomBytes(32).toString('hex');
  const token1Hash = SessionService.hashToken(rawToken1);
  await db.transaction(async (trx) => {
    session1 = await SessionService.createSession({
      user_id: user1.id,
      refresh_token_hash: token1Hash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ip_address: '127.0.0.1',
      user_agent: 'test-agent'
    }, trx);
  });
  console.log(`Initial session created: ${session1.id}`);

  // Scenario 1: Normal Refresh
  console.log('\nScenario 1: Normal Refresh');
  const res1 = await AuthenticationService.refreshToken(rawToken1, { ipAddress: '127.0.0.1', userAgent: 'test-agent' });
  if (!res1.success) throw new Error('Expected successful refresh for valid token');
  if (!res1.data.accessToken || !res1.data.refreshToken || !res1.data.expiresAt) throw new Error('Missing tokens or expiresAt');
  const rawToken2 = res1.data.refreshToken;
  console.log('Result 1 Success: true');

  // Verify Audit Log
  const auditLogs1 = await db('authentication_events').where({ user_id: user1.id, event_type: 'TOKEN_REFRESHED' });
  if (auditLogs1.length === 0) throw new Error('Missing TOKEN_REFRESHED audit log');

  // Scenario 2: Replay Attack (using the rotated token)
  console.log('\nScenario 2: Replay Attack');
  const res2 = await AuthenticationService.refreshToken(rawToken1, { ipAddress: '127.0.0.1', userAgent: 'attacker-agent' });
  console.log('Result 2 Code:', res2.error?.code);
  if (res2.success || res2.error.code !== 'INVALID_GRANT') throw new Error('Expected INVALID_GRANT for replay attack');
  
  // Verify Family is Revoked
  const familyCheck = await db('user_sessions').where({ session_family_id: session1.session_family_id, is_revoked: false });
  if (familyCheck.length > 0) throw new Error('Session family was not revoked during replay attack');

  // Verify Audit Log
  const auditLogs2 = await db('authentication_events').where({ event_type: 'REPLAY_ATTACK_MITIGATED' });
  if (auditLogs2.length === 0) throw new Error('Missing REPLAY_ATTACK_MITIGATED audit log');

  // Scenario 3: Replay Attack After Family Revoked
  console.log('\nScenario 3: Replay Attack After Family Revoked');
  const res3 = await AuthenticationService.refreshToken(rawToken1, { ipAddress: '127.0.0.1', userAgent: 'attacker-agent-2' });
  console.log('Result 3 Code:', res3.error?.code);
  if (res3.success || res3.error.code !== 'INVALID_GRANT') throw new Error('Expected INVALID_GRANT for post-revocation replay');

  // Scenario 4: Refresh using Successor Token
  // Wait, Scenario 2 revoked the whole family! So rawToken2 is also revoked.
  // We expect rawToken2 to fail now because it was collateral damage of the replay mitigation.
  console.log('\nScenario 4: Using successor token after family revocation (should fail)');
  const res4 = await AuthenticationService.refreshToken(rawToken2, { ipAddress: '127.0.0.1' });
  console.log('Result 4 Code:', res4.error?.code);
  if (res4.success || res4.error.code !== 'INVALID_GRANT') throw new Error('Expected successor token to be revoked');

  // Setup new session for remaining tests
  let rawToken3 = crypto.randomBytes(32).toString('hex');
  const token3Hash = SessionService.hashToken(rawToken3);
  let session3;
  await db.transaction(async (trx) => {
    session3 = await SessionService.createSession({
      user_id: user1.id,
      refresh_token_hash: token3Hash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ip_address: '127.0.0.1',
      user_agent: 'test-agent'
    }, trx);
  });

  // Scenario 5: Concurrent Refreshes
  console.log('\nScenario 5: Concurrent Refreshes (3+ requests)');
  const concurrentPromises = [
    AuthenticationService.refreshToken(rawToken3, { ipAddress: '127.0.0.1' }),
    AuthenticationService.refreshToken(rawToken3, { ipAddress: '127.0.0.1' }),
    AuthenticationService.refreshToken(rawToken3, { ipAddress: '127.0.0.1' })
  ];
  const concurrentResults = await Promise.all(concurrentPromises);
  const successes = concurrentResults.filter(r => r.success);
  const failures = concurrentResults.filter(r => !r.success && r.error?.code === 'INVALID_GRANT');
  console.log(`Concurrent results: ${successes.length} success, ${failures.length} failures (replay mitigated)`);
  if (successes.length !== 1 || failures.length !== 2) throw new Error('Concurrency violated: exactly one should succeed');

  // Scenario 6: Expired Tokens
  console.log('\nScenario 6: Expired Tokens');
  let rawTokenExpired = crypto.randomBytes(32).toString('hex');
  await db.transaction(async (trx) => {
    await trx('user_sessions').insert({
      user_id: user1.id,
      session_family_id: crypto.randomUUID(),
      refresh_token_hash: SessionService.hashToken(rawTokenExpired),
      expires_at: new Date(Date.now() - 10000), // Past
      ip_address: '127.0.0.1',
      user_agent: 'test-agent'
    });
  });
  const res6 = await AuthenticationService.refreshToken(rawTokenExpired, {});
  console.log('Result 6 Code:', res6.error?.code);
  if (res6.success) throw new Error('Expected expired token to fail');

  // Scenario 7: Revoked Sessions
  console.log('\nScenario 7: Revoked Sessions');
  let rawTokenRevoked = crypto.randomBytes(32).toString('hex');
  await db.transaction(async (trx) => {
    const s = await SessionService.createSession({
      user_id: user1.id,
      refresh_token_hash: SessionService.hashToken(rawTokenRevoked),
      expires_at: new Date(Date.now() + 100000),
      ip_address: '127.0.0.1'
    }, trx);
    await trx('user_sessions').where({ id: s.id }).update({ is_revoked: true });
  });
  const res7 = await AuthenticationService.refreshToken(rawTokenRevoked, {});
  console.log('Result 7 Code:', res7.error?.code);
  if (res7.success) throw new Error('Expected revoked token to fail');

  // Scenario 8: Syntactically Malformed Tokens
  console.log('\nScenario 8: Syntactically Malformed Tokens');
  const res8 = await AuthenticationService.refreshToken('', {});
  console.log('Result 8 Code:', res8.error?.code);
  if (res8.success || res8.error.code !== 'INVALID_REQUEST') throw new Error('Expected malformed to fail with INVALID_REQUEST');

  // Scenario 9: Valid but Non-Existent Tokens
  console.log('\nScenario 9: Valid but Non-Existent Tokens');
  const res9 = await AuthenticationService.refreshToken(crypto.randomBytes(32).toString('hex'), {});
  console.log('Result 9 Code:', res9.error?.code);
  if (res9.success || res9.error.code !== 'INVALID_GRANT') throw new Error('Expected non-existent to fail');

  // Scenario 10: Expired/Disabled User Account
  console.log('\nScenario 10: Expired/Disabled User Account');
  let rawTokenUserDisabled = crypto.randomBytes(32).toString('hex');
  await db.transaction(async (trx) => {
    await SessionService.createSession({
      user_id: user2.id,
      refresh_token_hash: SessionService.hashToken(rawTokenUserDisabled),
      expires_at: new Date(Date.now() + 100000),
      ip_address: '127.0.0.1'
    }, trx);
    await trx('users').where({ id: user2.id }).update({ status: USER_STATUS.DISABLED });
  });
  const res10 = await AuthenticationService.refreshToken(rawTokenUserDisabled, {});
  console.log('Result 10 Code:', res10.error?.code);
  if (res10.success) throw new Error('Expected disabled user refresh to fail');
  
  // Verify it was revoked with reason
  const auditLogs10 = await db('authentication_events').where({ user_id: user2.id, event_type: 'SESSION_REFRESH_REJECTED' }).orderBy('created_at', 'desc').first();
  if (auditLogs10.metadata.reason !== 'ACCOUNT_DISABLED') throw new Error('Expected audit log to reflect ACCOUNT_DISABLED');

  // Scenario 11: Audit Log Failure Rollback
  console.log('\nScenario 11: Audit Log Failure Rollback');
  let rawTokenAuditFail = crypto.randomBytes(32).toString('hex');
  let session11Id;
  await db.transaction(async (trx) => {
    const s = await SessionService.createSession({
      user_id: user1.id,
      refresh_token_hash: SessionService.hashToken(rawTokenAuditFail),
      expires_at: new Date(Date.now() + 100000),
      ip_address: '127.0.0.1'
    }, trx);
    session11Id = s.id;
  });
  
  // Mock logEvent to throw
  const originalLogEvent = AuthenticationRepository.logEvent;
  AuthenticationRepository.logEvent = async function() {
    throw new Error('Simulated DB failure during audit log');
  };
  
  try {
    await AuthenticationService.refreshToken(rawTokenAuditFail, {});
    throw new Error('Expected 500 error from audit failure');
  } catch (err) {
    if (err.message !== 'Simulated DB failure during audit log') {
      throw err;
    }
    console.log('Caught expected infrastructure error:', err.message);
  }
  
  // Restore logEvent
  AuthenticationRepository.logEvent = originalLogEvent;
  
  // Verify rollback: session should remain unrotated
  const check11 = await db('user_sessions').where({ id: session11Id }).first();
  if (check11.is_rotated) throw new Error('Session was rotated despite transaction rollback');

  console.log('\n--- ALL VERIFICATION SCENARIOS PASSED ---');
  process.exit(0);
}

run().catch(err => {
  console.error('\n--- VERIFICATION FAILED ---');
  console.error(err);
  process.exit(1);
});
