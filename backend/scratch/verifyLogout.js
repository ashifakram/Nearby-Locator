import dotenv from 'dotenv';
dotenv.config();

import db from '../db.js';
import { AuthenticationService } from '../services/authenticationService.js';
import { SessionService } from '../services/sessionService.js';
import { AuthenticationRepository } from '../repositories/authenticationRepository.js';
import { USER_STATUS } from '../constants/userStatus.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

async function runVerification() {
  console.log('--- Starting Phase 3E.1 (logout) Verification ---\n');

  try {
    // === Setup ===


    const testPassword = 'password123';
    const passwordHash = await bcrypt.hash(testPassword, 10);
    
    // Create users
    const [user1] = await db('users').insert({
      email: `logout_test_1_${Date.now()}@example.com`,
      password_hash: passwordHash,
      status: USER_STATUS.ACTIVE
    }).returning('*');

    const [user2] = await db('users').insert({
      email: `logout_test_2_${Date.now()}@example.com`,
      password_hash: passwordHash,
      status: USER_STATUS.ACTIVE
    }).returning('*');

    console.log('Setup complete. Users created.');

    // Scenario 1: Normal Logout
    console.log('\nScenario 1: Normal Logout');
    const loginRes1 = await AuthenticationService.loginLocal(user1.email, testPassword, { ipAddress: '127.0.0.1' });
    const session1 = loginRes1.data.refreshToken;
    const sessionRecord1 = await db('user_sessions').where({ user_id: user1.id }).first();
    
    const logoutRes1 = await AuthenticationService.logout(sessionRecord1.id, { ipAddress: '127.0.0.1' });
    const updatedSession1 = await db('user_sessions').where({ id: sessionRecord1.id }).first();
    const logs1 = await db('authentication_events').where({ event_type: 'LOGOUT_SUCCESS', user_id: user1.id });
    if (!logoutRes1.success) throw new Error('Expected success');
    if (!updatedSession1.is_revoked) throw new Error('Expected session to be revoked');
    if (logs1.length !== 1) throw new Error('Expected exactly one LOGOUT_SUCCESS audit log');
    console.log('Result 1 Success: true');

    // Scenario 2: Idempotent Logout
    console.log('\nScenario 2: Idempotent Logout');
    const logoutRes2 = await AuthenticationService.logout(sessionRecord1.id, { ipAddress: '127.0.0.1' });
    const logs2 = await db('authentication_events').where({ event_type: 'LOGOUT_SUCCESS', user_id: user1.id });
    if (!logoutRes2.success) throw new Error('Expected success for idempotent call');
    if (logs2.length !== 1) throw new Error('Expected audit logs to remain exactly one (no new logs)');
    console.log('Result 2 Success: true (no duplicate audit logs)');

    // Scenario 3: Invalid Session Logout
    console.log('\nScenario 3: Invalid Session Logout');
    const fakeId = crypto.randomUUID();
    const logoutRes3 = await AuthenticationService.logout(fakeId, { ipAddress: '127.0.0.1' });
    if (!logoutRes3.success) throw new Error('Expected success for missing session');
    console.log('Result 3 Success: true');

    // Scenario 4: Rotated Session Logout
    console.log('\nScenario 4: Rotated Session Logout');
    const loginRes4 = await AuthenticationService.loginLocal(user1.email, testPassword, { ipAddress: '127.0.0.1' });
    const session4 = loginRes4.data.refreshToken;
    const parentSession = await db('user_sessions').where({ refresh_token_hash: crypto.createHash('sha256').update(session4).digest('hex') }).first();
    
    // Refresh to rotate
    await AuthenticationService.refreshToken(session4, { ipAddress: '127.0.0.1' });
    
    // Now logout the *rotated* parent session
    const logoutRes4 = await AuthenticationService.logout(parentSession.id, { ipAddress: '127.0.0.1' });
    if (!logoutRes4.success) throw new Error('Expected success');
    
    // Check family is revoked
    const familyCheck = await db('user_sessions').where({ session_family_id: parentSession.session_family_id, is_revoked: false });
    if (familyCheck.length > 0) throw new Error('Expected entire family to be revoked');
    console.log('Result 4 Success: true (Family revoked)');

    // Scenario 5: Concurrent Logout
    console.log('\nScenario 5: Concurrent Logout');
    const loginRes5 = await AuthenticationService.loginLocal(user2.email, testPassword, { ipAddress: '127.0.0.1' });
    const sessionRecord5 = await db('user_sessions').where({ refresh_token_hash: crypto.createHash('sha256').update(loginRes5.data.refreshToken).digest('hex') }).first();
    
    const concurrentLogouts = await Promise.all([
      AuthenticationService.logout(sessionRecord5.id, { ipAddress: '127.0.0.1' }),
      AuthenticationService.logout(sessionRecord5.id, { ipAddress: '127.0.0.1' }),
      AuthenticationService.logout(sessionRecord5.id, { ipAddress: '127.0.0.1' })
    ]);
    if (concurrentLogouts.some(r => !r.success)) throw new Error('Expected all to return success');
    
    const logs5 = await db('authentication_events').where({ event_type: 'LOGOUT_SUCCESS', user_id: user2.id });
    if (logs5.length !== 1) throw new Error('Expected exactly one audit log due to FOR UPDATE lock');
    console.log('Result 5 Success: true (Concurrency handled perfectly)');

    // Scenario 6: Concurrent Logout vs Refresh
    console.log('\nScenario 6: Concurrent Logout vs Refresh');
    const loginRes6 = await AuthenticationService.loginLocal(user2.email, testPassword, { ipAddress: '127.0.0.1' });
    const sessionRecord6 = await db('user_sessions').where({ refresh_token_hash: crypto.createHash('sha256').update(loginRes6.data.refreshToken).digest('hex') }).first();
    
    // Run refresh and logout at same time
    const [logout6, refresh6] = await Promise.all([
      AuthenticationService.logout(sessionRecord6.id, { ipAddress: '127.0.0.1' }),
      AuthenticationService.refreshToken(loginRes6.data.refreshToken, { ipAddress: '127.0.0.1' }).catch(err => ({ success: false, error: err }))
    ]);
    
    // Verify torn state
    const family6 = await db('user_sessions').where({ session_family_id: sessionRecord6.session_family_id });
    const allRevoked = family6.every(s => s.is_revoked === true);
    if (!allRevoked) throw new Error('Family not entirely revoked');
    if (!logout6.success) throw new Error('Logout failed');
    // Refresh might succeed (if it ran first) or fail (if logout ran first). Regardless, family must be revoked.
    console.log('Result 6 Success: true (Deterministic serialization. Refresh success:', refresh6.success, ')');

    // Scenario 7: Logout All
    console.log('\nScenario 7: Logout All');
    await AuthenticationService.loginLocal(user1.email, testPassword, { ipAddress: '127.0.0.1' });
    await AuthenticationService.loginLocal(user1.email, testPassword, { ipAddress: '127.0.0.1' });
    await AuthenticationService.loginLocal(user1.email, testPassword, { ipAddress: '127.0.0.1' });
    
    const activeBefore7 = await db('user_sessions').where({ user_id: user1.id, is_revoked: false });
    if (activeBefore7.length !== 3) throw new Error('Setup failed, expected 3 active sessions');

    const logoutAllRes = await AuthenticationService.logoutAll(user1.id, { ipAddress: '127.0.0.1' });
    if (!logoutAllRes.success) throw new Error('Expected success');
    
    const activeAfter7 = await db('user_sessions').where({ user_id: user1.id, is_revoked: false });
    if (activeAfter7.length !== 0) throw new Error('Expected 0 active sessions');
    
    const logs7 = await db('authentication_events').where({ event_type: 'LOGOUT_ALL_SUCCESS', user_id: user1.id });
    if (logs7.length !== 1) throw new Error('Expected exactly 1 LOGOUT_ALL_SUCCESS log');
    console.log('Result 7 Success: true');

    // Scenario 8: Idempotent Logout All
    console.log('\nScenario 8: Idempotent Logout All');
    const logoutAllRes2 = await AuthenticationService.logoutAll(user1.id, { ipAddress: '127.0.0.1' });
    if (!logoutAllRes2.success) throw new Error('Expected success');
    
    const logs8 = await db('authentication_events').where({ event_type: 'LOGOUT_ALL_SUCCESS', user_id: user1.id });
    if (logs8.length !== 1) throw new Error('Expected exactly 1 LOGOUT_ALL_SUCCESS log (no duplicates)');
    console.log('Result 8 Success: true');

    // Scenario 9: Infrastructure Failure Rollback
    console.log('\nScenario 9: Infrastructure Failure Rollback');
    const loginRes9 = await AuthenticationService.loginLocal(user2.email, testPassword, { ipAddress: '127.0.0.1' });
    const sessionRecord9 = await db('user_sessions').where({ refresh_token_hash: crypto.createHash('sha256').update(loginRes9.data.refreshToken).digest('hex') }).first();
    
    // Mock logEvent to fail
    const originalLogEvent = AuthenticationRepository.logEvent;
    AuthenticationRepository.logEvent = async () => { throw new Error('Simulated DB failure during audit log'); };
    
    try {
      await AuthenticationService.logout(sessionRecord9.id, { ipAddress: '127.0.0.1' });
      throw new Error('Should have thrown infrastructure error');
    } catch (err) {
      if (err.message !== 'Simulated DB failure during audit log') throw err;
      console.log('Caught expected infrastructure error:', err.message);
    } finally {
      AuthenticationRepository.logEvent = originalLogEvent;
    }
    
    const sessionCheck9 = await db('user_sessions').where({ id: sessionRecord9.id }).first();
    if (sessionCheck9.is_revoked) throw new Error('Transaction rollback failed, session was revoked');
    console.log('Result 9 Success: true (Rollback verified)');

    console.log('\n--- ALL VERIFICATION SCENARIOS PASSED ---');
  } catch (err) {
    console.error('\nVerification Failed:', err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runVerification();
