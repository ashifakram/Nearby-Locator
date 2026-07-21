import { AuthenticationService } from '../services/authenticationService.js';
import OAuthRepository from '../repositories/oauthRepository.js';
import db from '../db.js';

async function verifyOAuth() {
  console.log('--- E2E OAuth Flow Verification ---');
  let mockUserEmail = `oauth_test_${Date.now()}@example.com`;

  try {
    // 1. Google Signup
    console.log('\n[1] Simulating Google Signup...');
    const googleProfile = {
      provider: 'google',
      providerUserId: 'google-sub-12345',
      email: mockUserEmail,
      emailVerified: true,
      name: 'Test Google User',
      metadata: { hd: 'example.com' }
    };
    
    const loginResult1 = await AuthenticationService.loginOAuth(googleProfile, { ipAddress: '127.0.0.1', userAgent: 'E2E Test' });
    if (!loginResult1.success) throw new Error('Google Signup failed: ' + JSON.stringify(loginResult1));
    console.log('✅ Google Signup Successful. User ID:', loginResult1.data.user.id);
    
    // 2. Apple Login (same email) - Should auto-link
    console.log('\n[2] Simulating Apple Login (Auto-Link)...');
    const appleProfile = {
      provider: 'apple',
      providerUserId: 'apple-sub-67890',
      email: mockUserEmail,
      emailVerified: true,
      metadata: { is_private_email: false }
    };

    const loginResult2 = await AuthenticationService.loginOAuth(appleProfile, { ipAddress: '127.0.0.1', userAgent: 'E2E Test' });
    if (!loginResult2.success) throw new Error('Apple Login failed: ' + JSON.stringify(loginResult2));
    
    if (loginResult1.data.user.id !== loginResult2.data.user.id) {
      throw new Error('Identity mismatch! Apple account was not linked to the same user.');
    }
    console.log('✅ Apple Auto-Link Successful. Same User ID.');

    // 3. Verify Database State
    console.log('\n[3] Verifying Database State...');
    const oauthAccounts = await OAuthRepository.findByUser(loginResult1.data.user.id);
    if (oauthAccounts.length !== 2) {
      throw new Error(`Expected 2 OAuth accounts, found ${oauthAccounts.length}`);
    }
    console.log('✅ 2 OAuth Accounts found in user_oauth_accounts.');

    const loginHistory = await db('login_history').where({ user_id: loginResult1.data.user.id });
    if (loginHistory.length !== 2) {
      throw new Error(`Expected 2 login history records, found ${loginHistory.length}`);
    }
    console.log('✅ 2 Login History records found.');

    // 4. Test Unlinking
    console.log('\n[4] Simulating Provider Unlinking...');
    await AuthenticationService.unlinkOAuth(loginResult1.data.user.id, 'google');
    console.log('✅ Unlinked Google.');

    // 5. Unlink protection test
    console.log('\n[5] Simulating Last Provider Unlink Protection...');
    try {
      await AuthenticationService.unlinkOAuth(loginResult1.data.user.id, 'apple');
      throw new Error('Should not have been able to unlink the last provider!');
    } catch (e) {
      if (e.message.includes('only authentication method')) {
        console.log('✅ Last provider unlink correctly blocked.');
      } else {
        throw e;
      }
    }

    console.log('\n🎉 All OAuth E2E Tests Passed!');
  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err);
  } finally {
    process.exit(0);
  }
}

verifyOAuth();
