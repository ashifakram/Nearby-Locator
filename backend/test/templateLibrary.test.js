import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { NotificationService } from '../services/notificationService.js';
import { EmailTemplateEngine } from '../services/emailTemplateEngine.js';
import { EmailProviderFactory } from '../providers/email/EmailProviderFactory.js';

describe('🎨 SaaS Email Template Library & Design System Test Suite', () => {
  const scratchFile = path.resolve(process.cwd(), 'scratch', 'sent_emails.json');

  beforeEach(() => {
    EmailProviderFactory.resetCache();
    EmailTemplateEngine.clearCache();
    if (fs.existsSync(scratchFile)) {
      try { fs.unlinkSync(scratchFile); } catch (_) {}
    }
  });

  const templates = [
    { type: 'VERIFY_EMAIL', payload: { otpCode: '492018' }, check: '492018' },
    { type: 'WELCOME', payload: { dashboardUrl: 'https://nearby.local/dashboard' }, check: 'Dashboard' },
    { type: 'RESEND_VERIFICATION', payload: { otpCode: '183920' }, check: '183920' },
    { type: 'FORGOT_PASSWORD', payload: { otpCode: '930184' }, check: '930184' },
    { type: 'PASSWORD_CHANGED', payload: { browser: 'Chrome', os: 'macOS', location: 'San Francisco, CA', ipAddress: '192.168.1.1' }, check: 'San Francisco' },
    { type: 'LOGIN_ALERT', payload: { browser: 'Firefox', os: 'Linux', location: 'New York, NY', ipAddress: '10.0.0.1' }, check: 'New Login Detected' },
    { type: 'ACCOUNT_LOCKED', payload: { reason: 'Failed logins', ipAddress: '10.0.0.1', location: 'Chicago, IL' }, check: 'Temporarily Locked' },
    { type: 'ACCOUNT_REACTIVATED', payload: { loginUrl: 'https://nearby.local/login' }, check: 'Reactivated' },
    { type: 'EMAIL_CHANGED', payload: { oldEmail: 'old@test.com', newEmail: 'new@test.com' }, check: 'old@test.com' },
    { type: 'SECURITY_ALERT', payload: { alertTitle: 'Replay Attack Mitigated', eventType: 'SESSION_REPLAY' }, check: 'Replay Attack' },
    { type: 'ACCOUNT_DELETED', payload: { retentionDays: 30 }, check: '30 days' },
    { type: 'ADMIN_INVITATION', payload: { inviterName: 'Admin User', roleName: 'Moderator', inviteUrl: 'https://nearby.local/invite' }, check: 'Moderator' }
  ];

  templates.forEach(({ type, payload, check }) => {
    it(`Renders template '${type}' cleanly extending base layout`, async () => {
      const res = await NotificationService.notifyUser('template_test@nearby.com', type, payload);
      assert.equal(res.success, true);

      assert.ok(fs.existsSync(scratchFile));
      const emails = JSON.parse(fs.readFileSync(scratchFile, 'utf8'));
      const last = emails[emails.length - 1];
      assert.ok(last.html.includes('Nearby Locator')); // Brand token check
      assert.ok(last.html.includes(check));
    });
  });
});
