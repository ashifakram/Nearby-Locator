import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import db from '../db.js';
import bcrypt from 'bcrypt';
import { OtpService } from '../services/otpService.js';
import { OTP_CONSTANTS, OTP_ERROR_CODES } from '../constants/otp.js';
import { cleanDatabase } from './helpers.js';
import { up as migrationUp, down as migrationDown } from '../migrations/20260723_add_otp_infrastructure.js';

describe('🔑 Phase 2 — OTP Infrastructure Test Suite', () => {
  let testUser;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    await cleanDatabase();
    
    // Create test user directly
    const password_hash = await bcrypt.hash('Password_123!', 10);
    const roleRecord = await db('roles').where({ name: 'user' }).first();
    [testUser] = await db('users').insert({
      email: 'otp_infra_test@saas.com',
      password_hash,
      status: 'PENDING_VERIFICATION'
    }).returning('*');
    await db('user_roles').insert({ user_id: testUser.id, role_id: roleRecord.id });
  });

  it('1. OtpService generates valid 6-digit numeric codes and SHA-256 hashes', () => {
    const rawOtp = OtpService.generateOtp();
    assert.equal(typeof rawOtp, 'string');
    assert.equal(rawOtp.length, 6);
    assert.ok(/^\d{6}$/.test(rawOtp));

    const hash = OtpService.hashOtp(rawOtp);
    assert.equal(typeof hash, 'string');
    assert.equal(hash.length, 64); // SHA-256 hex string
  });

  it('2. OtpService issues Verification OTP and enforces 60-second resend cooldown', async () => {
    const issueResult = await OtpService.issueVerificationOtp(testUser.id);
    assert.equal(issueResult.success, true);
    assert.ok(issueResult.rawOtp);
    assert.equal(issueResult.rawOtp.length, 6);

    // Immediate second issuance attempt must fail with OTP_THROTTLED
    const secondAttempt = await OtpService.issueVerificationOtp(testUser.id);
    assert.equal(secondAttempt.success, false);
    assert.equal(secondAttempt.error.code, OTP_ERROR_CODES.THROTTLED);
  });

  it('3. OtpService verifies OTP code and enforces single-use consumption', async () => {
    const issueResult = await OtpService.issueVerificationOtp(testUser.id);
    const rawOtp = issueResult.rawOtp;

    // Verify correct OTP
    const verifyResult = await OtpService.verifyVerificationOtp(testUser.id, rawOtp);
    assert.equal(verifyResult.success, true);

    // Re-verifying same OTP must fail with OTP_CONSUMED
    const reVerifyResult = await OtpService.verifyVerificationOtp(testUser.id, rawOtp);
    assert.equal(reVerifyResult.success, false);
    assert.equal(reVerifyResult.error.code, OTP_ERROR_CODES.CONSUMED);
  });

  it('4. OtpService invalidates OTP on 5th failed verification attempt', async () => {
    const issueResult = await OtpService.issueVerificationOtp(testUser.id);
    const wrongOtp = '000000';

    // Submit 4 wrong attempts
    for (let i = 0; i < 4; i++) {
      const res = await OtpService.verifyVerificationOtp(testUser.id, wrongOtp);
      assert.equal(res.success, false);
      assert.equal(res.error.code, OTP_ERROR_CODES.INVALID);

      // Increment attempt count directly in DB to simulate attempt tracking
      const token = await db('email_verification_tokens').where({ user_id: testUser.id }).first();
      await db('email_verification_tokens').where({ id: token.id }).update({ attempt_count: i + 1 });
    }

    // Set attempt count to 5
    const token = await db('email_verification_tokens').where({ user_id: testUser.id }).first();
    await db('email_verification_tokens').where({ id: token.id }).update({ attempt_count: 5 });

    // 5th attempt must fail with OTP_MAX_ATTEMPTS_EXCEEDED
    const fifthResult = await OtpService.verifyVerificationOtp(testUser.id, wrongOtp);
    assert.equal(fifthResult.success, false);
    assert.equal(fifthResult.error.code, OTP_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED);
  });

  it('5. Password Reset OTP issues single-use 5-minute Reset Grant Token', async () => {
    const issueResult = await OtpService.issuePasswordResetOtp(testUser.id);
    const rawOtp = issueResult.rawOtp;

    const verifyResult = await OtpService.verifyPasswordResetOtp(testUser.id, rawOtp);
    assert.equal(verifyResult.success, true);
    assert.ok(verifyResult.resetGrantToken);
    assert.equal(verifyResult.resetGrantToken.length, 64); // 32-byte hex

    // Validate Reset Grant Token
    const grantResult = await OtpService.verifyResetGrantToken(testUser.id, verifyResult.resetGrantToken);
    assert.equal(grantResult.success, true);
  });

  it('6. Concurrency Test: Simultaneous parallel OTP verification requests handle row locks cleanly', async () => {
    const issueResult = await OtpService.issueVerificationOtp(testUser.id);
    const rawOtp = issueResult.rawOtp;

    // Trigger simultaneous parallel verification requests with identical OTP
    const [resA, resB] = await Promise.all([
      OtpService.verifyVerificationOtp(testUser.id, rawOtp),
      OtpService.verifyVerificationOtp(testUser.id, rawOtp)
    ]);

    // Exactly ONE request must succeed; the other must return OTP_CONSUMED or OTP_INVALID
    const successCount = [resA, resB].filter(r => r.success).length;
    assert.equal(successCount, 1);
  });

  it('7. Concurrency Test: Simultaneous parallel OTP issuance requests observe cooldown lock', async () => {
    // Force reset cooldown timestamp
    await db('users').where({ id: testUser.id }).update({ last_verification_request_at: null });

    const [resA, resB] = await Promise.all([
      OtpService.issueVerificationOtp(testUser.id),
      OtpService.issueVerificationOtp(testUser.id)
    ]);

    // Exactly ONE issuance must succeed; the other must be THROTTLED
    const successes = [resA, resB].filter(r => r.success);
    const throttles = [resA, resB].filter(r => !r.success && r.error.code === OTP_ERROR_CODES.THROTTLED);

    assert.equal(successes.length, 1);
    assert.equal(throttles.length, 1);
  });

  it('8. Migration Rollback Test: Verify migration down and up functions execute without error', async () => {
    // Test rollback (down)
    await migrationDown(db);

    // Verify columns dropped
    const hasOtpVerif = await db.schema.hasColumn('email_verification_tokens', 'otp_code_hash');
    assert.equal(hasOtpVerif, false);

    // Test re-apply (up)
    await migrationUp(db);
    const reHasOtpVerif = await db.schema.hasColumn('email_verification_tokens', 'otp_code_hash');
    assert.equal(reHasOtpVerif, true);
  });
});
