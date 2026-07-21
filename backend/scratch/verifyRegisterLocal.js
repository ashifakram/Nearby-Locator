import db from '../db.js';
import { AuthenticationService } from '../services/authenticationService.js';
import { IdentityService } from '../services/identityService.js';
import { EmailService } from '../services/emailService.js';
import { EmailVerificationService } from '../services/emailVerificationService.js';
import { AuthenticationRepository } from '../repositories/authenticationRepository.js';

async function verify() {
  console.log('--- Starting Phase 3B Verification ---');
  let email1 = `test1_${Date.now()}@example.com`;
  
  // Scenario 1: Register with a brand-new email
  console.log(`\nScenario 1: Register brand new email (${email1})`);
  let result1 = await AuthenticationService.registerLocal(email1, 'password123', { name: 'Test User' }, { ipAddress: '127.0.0.1' });
  console.log('Result 1:', result1);
  if (!result1.success) throw new Error('Expected success');

  // Verify DB state for Scenario 1
  const user1 = await IdentityService.findByEmail(email1);
  console.log('DB User 1 exists:', !!user1);
  const auditLogs1 = await db('authentication_events').where({ user_id: user1.id });
  console.log('Audit log written:', auditLogs1.length > 0);
  const verificationTokens = await db('email_verification_tokens').where({ user_id: user1.id });
  console.log('Verification token created:', verificationTokens.length > 0);

  // Scenario 2: Register with an existing email
  console.log(`\nScenario 2: Register existing email (${email1})`);
  let result2 = await AuthenticationService.registerLocal(email1, 'password123', { name: 'Duplicate' }, { ipAddress: '127.0.0.1' });
  console.log('Result 2:', result2);
  if (result2.success || result2.error.code !== 'EMAIL_ALREADY_IN_USE') throw new Error('Expected EMAIL_ALREADY_IN_USE');

  // Scenario 3: Concurrent duplicate registration
  let email2 = `test2_${Date.now()}@example.com`;
  console.log(`\nScenario 3: Concurrent registration (${email2})`);
  
  // We mock findByEmail temporarily to bypass the pre-check and force the UNIQUE constraint to fire
  const originalFindByEmail = IdentityService.findByEmail;
  IdentityService.findByEmail = async () => null; // Bypass pre-check

  const [resA, resB] = await Promise.all([
    AuthenticationService.registerLocal(email2, 'password123', {}, {}).catch(e => e),
    AuthenticationService.registerLocal(email2, 'password123', {}, {}).catch(e => e)
  ]);
  
  IdentityService.findByEmail = originalFindByEmail; // Restore

  console.log('Concurrent Res A:', resA);
  console.log('Concurrent Res B:', resB);
  const successCount = [resA, resB].filter(r => r && r.success).length;
  const duplicateCount = [resA, resB].filter(r => r && !r.success && r.error?.code === 'EMAIL_ALREADY_IN_USE').length;
  console.log(`Success Count: ${successCount}, Duplicate Count: ${duplicateCount}`);
  if (successCount !== 1 || duplicateCount !== 1) throw new Error('Expected exactly one success and one EMAIL_ALREADY_IN_USE');

  // Scenario 4: Force EmailService to fail
  let email3 = `test3_${Date.now()}@example.com`;
  console.log(`\nScenario 4: Force EmailService failure (${email3})`);
  const originalSendEmail = EmailService.sendVerificationEmail;
  EmailService.sendVerificationEmail = async () => { throw new Error('Simulated network error'); };
  
  let result4 = await AuthenticationService.registerLocal(email3, 'password123', {}, {});
  EmailService.sendVerificationEmail = originalSendEmail; // Restore
  
  console.log('Result 4:', result4);
  if (!result4.success || !result4.meta.warnings.includes('VERIFICATION_EMAIL_FAILED')) throw new Error('Expected success with warning');

  const user3 = await IdentityService.findByEmail(email3);
  console.log('User 3 committed despite email failure:', !!user3);

  // Scenario 5: Infrastructure failure inside transaction
  let email4 = `test4_${Date.now()}@example.com`;
  console.log(`\nScenario 5: Infrastructure failure inside transaction (${email4})`);
  
  const originalLogEvent = AuthenticationRepository.logEvent;
  AuthenticationRepository.logEvent = async () => { throw new Error('Simulated DB failure during audit'); };
  
  try {
    await AuthenticationService.registerLocal(email4, 'password123', {}, {});
    console.log('FAILED: Should have thrown an error');
  } catch (err) {
    console.log('Caught expected infrastructure error:', err.message);
  }
  
  AuthenticationRepository.logEvent = originalLogEvent; // Restore
  
  const user4 = await IdentityService.findByEmail(email4);
  console.log('User 4 exists (should be false due to rollback):', !!user4);
  if (user4) throw new Error('Transaction did not roll back user creation');

  console.log('\n--- ALL VERIFICATION SCENARIOS PASSED ---');
  process.exit(0);
}

verify().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
