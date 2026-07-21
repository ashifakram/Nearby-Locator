import dotenv from 'dotenv';
dotenv.config();

import db from '../db.js';
import { AuthenticationService } from '../services/authenticationService.js';
import { AuthenticationRepository } from '../repositories/authenticationRepository.js';
import { SessionService } from '../services/sessionService.js';
import { USER_STATUS } from '../constants/userStatus.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

async function runVerification() {
  console.log('--- Starting Phase 3E.3 (Change Password) Verification ---\n');

  try {
    const ts = Date.now();
    const oldPassword = 'ValidPass1';
    const oldPasswordHash = await bcrypt.hash(oldPassword, 12);

    // Create test user 1 (Standard)
    const [user1] = await db('users').insert({
      email: `change_test_1_${ts}@example.com`,
      password_hash: oldPasswordHash,
      status: USER_STATUS.ACTIVE
    }).returning('*');

    // Create test user 2 (Disabled)
    const [user2] = await db('users').insert({
      email: `change_test_2_${ts}@example.com`,
      password_hash: oldPasswordHash,
      status: USER_STATUS.DISABLED
    }).returning('*');

    // Create test user 3 (Concurrent)
    const [user3] = await db('users').insert({
      email: `change_test_3_${ts}@example.com`,
      password_hash: oldPasswordHash,
      status: USER_STATUS.ACTIVE
    }).returning('*');

    // Setup sessions for user 1
    const family1 = crypto.randomUUID();
    const family2 = crypto.randomUUID();
    
    const [session1] = await db('user_sessions').insert({
      user_id: user1.id,
      session_family_id: family1,
      refresh_token_hash: crypto.createHash('sha256').update('refresh1').digest('hex'),
      expires_at: new Date(Date.now() + 86400000),
      ip_address: '1.1.1.1',
      user_agent: 'Device 1'
    }).returning('*');

    const [session2] = await db('user_sessions').insert({
      user_id: user1.id,
      session_family_id: family2,
      refresh_token_hash: crypto.createHash('sha256').update('refresh2').digest('hex'),
      expires_at: new Date(Date.now() + 86400000),
      ip_address: '2.2.2.2',
      user_agent: 'Device 2'
    }).returning('*');

    console.log('Setup complete.\n');

    // Scenario 2: Invalid old password
    console.log('Scenario 2: Invalid old password');
    const res2 = await AuthenticationService.changePassword(user1.id, session1.id, 'WrongPass1', 'NewPass1', { ipAddress: '127.0.0.1' });
    if (res2.success || res2.error.code !== 'INVALID_CREDENTIALS') throw new Error('Expected INVALID_CREDENTIALS');
    const log2 = await db('authentication_events').where({ user_id: user1.id, event_type: 'PASSWORD_CHANGE_REJECTED' }).orderBy('created_at', 'desc').first();
    if (!log2 || log2.metadata.reason !== 'INVALID_CREDENTIALS') throw new Error('Audit missing for Scenario 2');
    console.log('Result 2 Success: true (Rejected correctly)\n');

    // Scenario 3: New password fails policy
    console.log('Scenario 3: New password fails policy');
    const res3 = await AuthenticationService.changePassword(user1.id, session1.id, oldPassword, 'short', { ipAddress: '127.0.0.1' });
    if (res3.success || res3.error.code !== 'PASSWORD_POLICY_VIOLATION') throw new Error('Expected PASSWORD_POLICY_VIOLATION');
    console.log('Result 3 Success: true (Rejected correctly)\n');

    // Scenario 4: New password == old password
    console.log('Scenario 4: New password == old password');
    const res4 = await AuthenticationService.changePassword(user1.id, session1.id, oldPassword, oldPassword, { ipAddress: '127.0.0.1' });
    if (res4.success || res4.error.code !== 'PASSWORD_UNCHANGED') throw new Error('Expected PASSWORD_UNCHANGED');
    console.log('Result 4 Success: true (Rejected correctly)\n');

    // Scenario 6: Disabled user
    console.log('Scenario 6: Disabled user');
    const res6 = await AuthenticationService.changePassword(user2.id, crypto.randomUUID(), oldPassword, 'NewPass1', { ipAddress: '127.0.0.1' });
    if (res6.success || res6.error.code !== 'ACCOUNT_DISABLED') throw new Error('Expected ACCOUNT_DISABLED');
    const log6 = await db('authentication_events').where({ user_id: user2.id, event_type: 'PASSWORD_CHANGE_REJECTED' }).orderBy('created_at', 'desc').first();
    if (!log6 || log6.metadata.reason !== 'ACCOUNT_DISABLED') throw new Error('Audit missing for Scenario 6');
    console.log('Result 6 Success: true (Rejected correctly)\n');

    // Scenario 1: Standard valid change (also tests Scenario 7 session behavior)
    console.log('Scenario 1 & 7: Standard valid change & Session Verification');
    const res1 = await AuthenticationService.changePassword(user1.id, session1.id, oldPassword, 'NewPass1', { ipAddress: '127.0.0.1' });
    if (!res1.success) throw new Error('Scenario 1 failed: ' + JSON.stringify(res1.error));
    
    const user1Updated = await db('users').where({ id: user1.id }).first();
    const isNewHashValid = await bcrypt.compare('NewPass1', user1Updated.password_hash);
    if (!isNewHashValid) throw new Error('Password hash was not updated correctly');

    const log1 = await db('authentication_events').where({ user_id: user1.id, event_type: 'PASSWORD_CHANGE_COMPLETED' }).first();
    if (!log1) throw new Error('Audit missing for Scenario 1');

    // Verify Session Policy
    const s1 = await db('user_sessions').where({ id: session1.id }).first();
    const s2 = await db('user_sessions').where({ id: session2.id }).first();
    if (s1.is_revoked) throw new Error('Current session was unexpectedly revoked');
    if (!s2.is_revoked) throw new Error('Other session was NOT revoked');
    
    // Refresh tokens: session1 should succeed, session2 should fail
    const refresh1Res = await AuthenticationService.refreshToken('refresh1', { ipAddress: '127.0.0.1' });
    if (!refresh1Res.success) throw new Error('Current session refresh failed: ' + JSON.stringify(refresh1Res.error));
    
    const refresh2Res = await AuthenticationService.refreshToken('refresh2', { ipAddress: '127.0.0.1' });
    if (refresh2Res.success || refresh2Res.error.code !== 'INVALID_GRANT') throw new Error('Revoked session refresh succeeded unexpectedly');

    console.log('Result 1 & 7 Success: true (Password changed, current session survived and refreshed, other session revoked and refresh failed)\n');

    // Scenario 5: Concurrent requests
    console.log('Scenario 5: Concurrent requests');
    // We simulate concurrency by issuing two changePassword calls simultaneously.
    // They both read the old hash outside the transaction.
    // The first one locks and updates. The second one locks, compares the hash (which is now different), and fails with STALE_CREDENTIALS.
    const concurrentRes = await Promise.all([
      AuthenticationService.changePassword(user3.id, crypto.randomUUID(), oldPassword, 'NewPass1', { ipAddress: '127.0.0.1' }),
      AuthenticationService.changePassword(user3.id, crypto.randomUUID(), oldPassword, 'NewPass2', { ipAddress: '127.0.0.1' })
    ]);

    const successes = concurrentRes.filter(r => r.success);
    const failures = concurrentRes.filter(r => !r.success);

    if (successes.length !== 1 || failures.length !== 1) {
      throw new Error('Concurrent requests did not result in exactly 1 success and 1 failure.');
    }

    if (failures[0].error.code !== 'STALE_CREDENTIALS') {
      throw new Error('Failure was not STALE_CREDENTIALS: ' + failures[0].error.code);
    }

    const log5 = await db('authentication_events').where({ user_id: user3.id, event_type: 'PASSWORD_CHANGE_REJECTED' }).orderBy('created_at', 'desc').first();
    if (!log5 || log5.metadata.reason !== 'STALE_CREDENTIALS') throw new Error('Audit missing for STALE_CREDENTIALS');

    console.log('Result 5 Success: true (Concurrent overwrite prevented, STALE_CREDENTIALS audited)\n');

    console.log('--- Phase 3E.3 Verification Complete ---');
  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    await db.destroy();
  }
}

runVerification();
