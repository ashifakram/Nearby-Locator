import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { EmailService } from '../services/emailService.js';
import { NotificationService } from '../services/notificationService.js';
import { EmailTemplateEngine } from '../services/emailTemplateEngine.js';
import { EmailProviderFactory } from '../providers/email/EmailProviderFactory.js';
import { DevJsonEmailProvider } from '../providers/email/DevJsonEmailProvider.js';
import { NullEmailProvider } from '../providers/email/NullEmailProvider.js';

describe('📬 Phase 1 — Messaging & Email Infrastructure Test Suite', () => {
  const scratchFile = path.resolve(process.cwd(), 'scratch', 'sent_emails.json');

  beforeEach(() => {
    EmailProviderFactory.resetCache();
    EmailTemplateEngine.clearCache();
    if (fs.existsSync(scratchFile)) {
      try {
        fs.unlinkSync(scratchFile);
      } catch (_) {}
    }
  });

  it('1. EmailProviderFactory resolves DevJsonEmailProvider in test environment', () => {
    const provider = EmailProviderFactory.getProvider();
    assert.ok(provider instanceof DevJsonEmailProvider);
  });

  it('2. EmailTemplateEngine renders base.hbs and test.hbs with branding tokens', () => {
    const html = EmailTemplateEngine.render('test', {
      userName: 'Alice',
      subject: 'Test Subject',
      timestamp: '2026-07-23',
      env: 'test'
    });

    assert.ok(html.includes('Infrastructure Test Email'));
    assert.ok(html.includes('Alice'));
    assert.ok(html.includes('Nearby Locator')); // Company name branding token
  });

  it('3. EmailService preserves backward compatible sendVerificationEmail', async () => {
    const success = await EmailService.sendVerificationEmail('verify_user@test.com', 'raw_verification_token_123');
    assert.equal(success, true);

    // Verify scratch file written
    assert.ok(fs.existsSync(scratchFile));
    const content = JSON.parse(fs.readFileSync(scratchFile, 'utf8'));
    assert.ok(content.length >= 1);
    const lastRecord = content[content.length - 1];
    assert.equal(lastRecord.to, 'verify_user@test.com');
    assert.equal(lastRecord.type, 'verify');
    assert.equal(lastRecord.token, 'raw_verification_token_123');
  });

  it('4. EmailService preserves backward compatible sendPasswordResetConfirmation', async () => {
    const success = await EmailService.sendPasswordResetConfirmation('reset_user@test.com', 'raw_reset_token_456');
    assert.equal(success, true);

    assert.ok(fs.existsSync(scratchFile));
    const content = JSON.parse(fs.readFileSync(scratchFile, 'utf8'));
    const lastRecord = content[content.length - 1];
    assert.equal(lastRecord.to, 'reset_user@test.com');
    assert.equal(lastRecord.type, 'reset');
    assert.equal(lastRecord.token, 'raw_reset_token_456');
  });

  it('5. NotificationService dispatches domain notification without exposing infrastructure details', async () => {
    const result = await NotificationService.notifyUser('notify_user@test.com', 'TEST_NOTIFICATION', {
      userName: 'Bob'
    });

    assert.equal(result.success, true);
    assert.ok(result.id);

    assert.ok(fs.existsSync(scratchFile));
    const content = JSON.parse(fs.readFileSync(scratchFile, 'utf8'));
    const lastRecord = content[content.length - 1];
    assert.equal(lastRecord.to, 'notify_user@test.com');
    assert.equal(lastRecord.subject, 'Infrastructure Test Notification');
    assert.ok(lastRecord.html.includes('Bob'));
  });

  it('6. EmailProviderFactory instantiates NullEmailProvider in production when SMTP is missing', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSmtpHost = process.env.SMTP_HOST;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.SMTP_HOST;
      EmailProviderFactory.resetCache();

      const provider = EmailProviderFactory.getProvider();
      assert.ok(provider instanceof NullEmailProvider);
      assert.equal(provider instanceof DevJsonEmailProvider, false);

      const result = await provider.send({ to: 'prod@test.com', subject: 'Test' });
      assert.equal(result.success, false);
      assert.equal(result.error, 'EMAIL_PROVIDER_UNCONFIGURED');

      // Verify scratch file is NEVER created in production
      assert.equal(fs.existsSync(scratchFile), false);
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalSmtpHost) {
        process.env.SMTP_HOST = originalSmtpHost;
      }
      EmailProviderFactory.resetCache();
    }
  });
});
