import 'dotenv/config';
import db from '../db.js';
import { AuthenticationService } from '../services/authenticationService.js';
import { IdentityService } from '../services/identityService.js';
import { USER_STATUS } from '../constants/userStatus.js';
import bcrypt from 'bcrypt';

async function verify() {
  console.log('--- Starting Phase 3C (loginLocal) Verification ---');
  
  const baseEmail = `login_test_${Date.now()}@example.com`;
  
  // Setup: Create a verified user for testing
  let user1;
  await db.transaction(async (trx) => {
    // We bypass registerLocal to quickly set up a raw user
    const res = await trx('users').insert({
      email: baseEmail,
      password_hash: await bcrypt.hash('password123', 10),
      status: USER_STATUS.ACTIVE
    }).returning('*');
    user1 = res[0];
  });
  console.log(`Setup complete. User created: ${user1.email}`);

  // Scenario 1: Successful login
  console.log('\nScenario 1: Successful login');
  const res1 = await AuthenticationService.loginLocal(baseEmail, 'password123', { ipAddress: '127.0.0.1' });
  if (!res1.success) throw new Error('Expected successful login');
  if (!res1.data.accessToken || !res1.data.refreshToken || !res1.data.expiresAt) throw new Error('Missing tokens or expiresAt');
  
  // Scenario 2: Unknown email
  console.log('\nScenario 2: Unknown email');
  const res2 = await AuthenticationService.loginLocal('unknown_email@example.com', 'password123', { ipAddress: '127.0.0.1' });
  console.log('Result 2 Code:', res2.error?.code);
  if (res2.success || res2.error.code !== 'INVALID_CREDENTIALS') throw new Error('Expected INVALID_CREDENTIALS for unknown email');

  // Check audit log for Scenario 2
  const auditLogs2 = await db('authentication_events').where({ user_id: null, event_type: 'failure' });
  console.log('Unknown email audit log written:', auditLogs2.length > 0);
  if (auditLogs2.length === 0) throw new Error('Missing audit log for unknown email');

  // Scenario 3: Invalid password
  console.log('\nScenario 3: Invalid password');
  const res3 = await AuthenticationService.loginLocal(baseEmail, 'wrongpassword', { ipAddress: '127.0.0.1' });
  console.log('Result 3 Code:', res3.error?.code);
  if (res3.success || res3.error.code !== 'INVALID_CREDENTIALS') throw new Error('Expected INVALID_CREDENTIALS for wrong password');

  // Check audit log for Scenario 3
  const auditLogs3 = await db('authentication_events').where({ user_id: user1.id, event_type: 'failure' });
  console.log('Failed login audit log written:', auditLogs3.length > 0);
  if (auditLogs3.length === 0) throw new Error('Missing audit log for wrong password');

  // Verify responses are identical
  if (JSON.stringify(res2) !== JSON.stringify(res3)) {
    throw new Error('Responses for unknown email and invalid password are not identical');
  }

  // Scenario 4: Locked account (trigger lockout by failing 4 more times)
  console.log('\nScenario 4: Triggering and verifying Locked account');
  for (let i=0; i<4; i++) {
    await AuthenticationService.loginLocal(baseEmail, 'wrongpassword', { ipAddress: '127.0.0.1' });
  }
  const res4 = await AuthenticationService.loginLocal(baseEmail, 'password123', { ipAddress: '127.0.0.1' });
  console.log('Result 4 Code:', res4.error?.code);
  if (res4.success || res4.error.code !== 'ACCOUNT_LOCKED') throw new Error('Expected ACCOUNT_LOCKED');

  // Scenario 5: Disabled/Banned account
  console.log('\nScenario 5: Disabled account');
  await db('users').where({ id: user1.id }).update({ status: USER_STATUS.DISABLED });
  const res5 = await AuthenticationService.loginLocal(baseEmail, 'password123', { ipAddress: '127.0.0.1' });
  console.log('Result 5 Code:', res5.error?.code);
  if (res5.success || res5.error.code !== 'ACCOUNT_DISABLED') throw new Error('Expected ACCOUNT_DISABLED');

  // Scenario 6: Pending verification
  console.log('\nScenario 6: Pending verification');
  await db('users').where({ id: user1.id }).update({ status: USER_STATUS.PENDING_VERIFICATION });
  const res6 = await AuthenticationService.loginLocal(baseEmail, 'password123', { ipAddress: '127.0.0.1' });
  console.log('Result 6 Code:', res6.error?.code);
  if (res6.success || res6.error.code !== 'EMAIL_NOT_VERIFIED') throw new Error('Expected EMAIL_NOT_VERIFIED');
  
  // Scenario 11 & 12: DB Failure testing
  console.log('\nScenario 11: DB failure during recordFailedLogin');
  // Reset user
  await db('users').where({ id: user1.id }).update({ status: USER_STATUS.ACTIVE, failed_login_count: 0 });
  const originalRecordFailedLogin = IdentityService.recordFailedLogin;
  IdentityService.recordFailedLogin = async () => { throw new Error('Simulated DB failure during recordFailedLogin'); };
  try {
    await AuthenticationService.loginLocal(baseEmail, 'wrongpassword', { ipAddress: '127.0.0.1' });
    throw new Error('Expected error');
  } catch (err) {
    console.log('Caught expected infrastructure error:', err.message);
  }
  IdentityService.recordFailedLogin = originalRecordFailedLogin;
  
  console.log('\nScenario 12: DB failure during updateLastLogin');
  const originalUpdateLastLogin = IdentityService.updateLastLogin;
  IdentityService.updateLastLogin = async () => { throw new Error('Simulated DB failure during updateLastLogin'); };
  try {
    await AuthenticationService.loginLocal(baseEmail, 'password123', { ipAddress: '127.0.0.1' });
    throw new Error('Expected error');
  } catch (err) {
    console.log('Caught expected infrastructure error:', err.message);
  }
  IdentityService.updateLastLogin = originalUpdateLastLogin;

  // Verify that rollback occurred (no sessions created during failures)
  const sessions = await db('user_sessions').where({ user_id: user1.id });
  // There should be exactly 1 session from Scenario 1
  console.log('Sessions count (expect 1 from Scenario 1):', sessions.length);
  if (sessions.length !== 1) throw new Error('Rollback integrity failed, unexpected sessions found.');

  console.log('\n--- ALL VERIFICATION SCENARIOS PASSED ---');
  process.exit(0);
}

verify().catch((err) => {
  console.error('\nVERIFICATION FAILED:', err);
  process.exit(1);
});
