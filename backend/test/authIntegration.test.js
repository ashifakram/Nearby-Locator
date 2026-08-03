import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import db from '../db.js';
import { AuthenticationService } from '../services/authenticationService.js';
import { USER_STATUS } from '../constants/userStatus.js';
import { cleanDatabase } from './helpers.js';

describe('🔐 Complete Authentication End-to-End Integration Suite', () => {
  const scratchFile = path.resolve(process.cwd(), 'scratch', 'sent_emails.json');
  const testEmail = 'e2e_auth_user@test.com';
  const testPassword = 'Password_123!';

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    await cleanDatabase();
    if (fs.existsSync(scratchFile)) {
      try { fs.unlinkSync(scratchFile); } catch (_) {}
    }
  });

  it('1. Signup creates PENDING_VERIFICATION user and dispatches 6-digit OTP email', async () => {
    const signupRes = await AuthenticationService.registerLocal(testEmail, testPassword, { name: 'E2E User' });
    assert.equal(signupRes.success, true);
    assert.equal(signupRes.data.user.email, testEmail);
    assert.equal(signupRes.data.user.status, USER_STATUS.PENDING_VERIFICATION);

    // Verify email file written to scratch
    assert.ok(fs.existsSync(scratchFile));
    const emails = JSON.parse(fs.readFileSync(scratchFile, 'utf8'));
    assert.ok(emails.length >= 1);
    const lastEmail = emails[emails.length - 1];
    assert.equal(lastEmail.to, testEmail);
    assert.equal(lastEmail.type, 'verify_email');
    assert.ok(lastEmail.otpCode);
    assert.equal(lastEmail.otpCode.length, 6);
  });

  it('2. Login blocks PENDING_VERIFICATION user with EMAIL_NOT_VERIFIED', async () => {
    await AuthenticationService.registerLocal(testEmail, testPassword, { name: 'E2E User' });

    const loginRes = await AuthenticationService.loginLocal(testEmail, testPassword);
    assert.equal(loginRes.success, false);
    assert.equal(loginRes.error.code, 'EMAIL_NOT_VERIFIED');
  });

  it('3. Resend Verification OTP respects 60-second cooldown', async () => {
    await AuthenticationService.registerLocal(testEmail, testPassword, { name: 'E2E User' });

    // Immediate resend attempt must fail with THROTTLED / OTP_THROTTLED
    const resendRes = await AuthenticationService.resendVerification(testEmail);
    assert.equal(resendRes.success, false);
    assert.ok(['THROTTLED', 'OTP_THROTTLED'].includes(resendRes.error.code));
  });

  it('4. Submitting valid 6-digit OTP activates user and unlocks login', async () => {
    await AuthenticationService.registerLocal(testEmail, testPassword, { name: 'E2E User' });

    // Read dispatched OTP from scratch file
    const emails = JSON.parse(fs.readFileSync(scratchFile, 'utf8'));
    const dispatchedOtp = emails[emails.length - 1].otpCode;

    // Verify OTP
    const verifyRes = await AuthenticationService.verifyEmail(dispatchedOtp, {}, testEmail);
    assert.equal(verifyRes.success, true);

    // User status must now be ACTIVE in database
    const userInDb = await db('users').where({ email: testEmail }).first();
    assert.equal(userInDb.status, USER_STATUS.ACTIVE);

    // Login must now succeed cleanly
    const loginRes = await AuthenticationService.loginLocal(testEmail, testPassword, { ipAddress: '127.0.0.1' });
    assert.equal(loginRes.success, true);
    assert.ok(loginRes.data.accessToken);
    assert.ok(loginRes.data.refreshToken);
  });

  it('5. Password Reset OTP flow: Request -> Verify OTP -> Reset Password with Grant Token -> Revoke Sessions', async () => {
    // Register and activate user
    await AuthenticationService.registerLocal(testEmail, testPassword, { name: 'E2E User' });
    const emails = JSON.parse(fs.readFileSync(scratchFile, 'utf8'));
    await AuthenticationService.verifyEmail(emails[emails.length - 1].otpCode, {}, testEmail);

    // Log in to establish an active session
    const loginRes = await AuthenticationService.loginLocal(testEmail, testPassword, { ipAddress: '127.0.0.1' });
    assert.equal(loginRes.success, true);
    const initialRefreshToken = loginRes.data.refreshToken;

    // Step A: Request password reset OTP
    const forgotRes = await AuthenticationService.forgotPassword(testEmail);
    assert.equal(forgotRes.success, true);

    // Read password reset OTP from scratch file
    const updatedEmails = JSON.parse(fs.readFileSync(scratchFile, 'utf8'));
    const resetOtp = updatedEmails[updatedEmails.length - 1].otpCode;
    assert.equal(updatedEmails[updatedEmails.length - 1].type, 'forgot_password');

    // Step B: Verify Reset OTP code -> receive reset grant token
    const verifyOtpRes = await AuthenticationService.verifyPasswordResetOtp(testEmail, resetOtp);
    assert.equal(verifyOtpRes.success, true);
    assert.ok(verifyOtpRes.resetGrantToken);

    // Step C: Complete password reset using reset grant token
    const newPassword = 'NewSecurePassword_456!';
    const resetRes = await AuthenticationService.resetPasswordWithGrantToken(testEmail, verifyOtpRes.resetGrantToken, newPassword);
    assert.equal(resetRes.success, true);

    // Step D: Verify initial session was revoked (refreshing with old token must fail)
    const refreshRes = await AuthenticationService.refreshToken(initialRefreshToken);
    assert.equal(refreshRes.success, false);

    // Step E: Login with old password fails
    const oldLoginRes = await AuthenticationService.loginLocal(testEmail, testPassword);
    assert.equal(oldLoginRes.success, false);

    // Step F: Login with new password succeeds
    const newLoginRes = await AuthenticationService.loginLocal(testEmail, newPassword);
    assert.equal(newLoginRes.success, true);
    assert.ok(newLoginRes.data.accessToken);
  });
});
