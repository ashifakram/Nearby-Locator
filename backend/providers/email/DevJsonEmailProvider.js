import fs from 'fs';
import path from 'path';
import { BaseEmailProvider } from './BaseEmailProvider.js';
import { logger } from '../../utils/logger.js';

export class DevJsonEmailProvider extends BaseEmailProvider {
  async send(options) {
    const { to, subject, html, text, from, type, token, otpCode } = options;

    try {
      const dir = path.resolve(process.cwd(), 'scratch');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const filePath = path.resolve(dir, 'sent_emails.json');
      let emails = [];
      if (fs.existsSync(filePath)) {
        try {
          emails = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (_) {
          emails = [];
        }
      }

      const emailRecord = {
        id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        to,
        from: from || 'noreply@nearby.local',
        subject,
        html,
        text,
        type: type || 'general',
        token: token || null,
        otpCode: otpCode || null,
        timestamp: Date.now(),
        isoDate: new Date().toISOString()
      };

      emails.push(emailRecord);
      fs.writeFileSync(filePath, JSON.stringify(emails, null, 2), 'utf8');

      logger.info(`[DevJsonEmailProvider] Recorded development email to ${to} (Subject: "${subject}")`);

      return { success: true, messageId: emailRecord.id };
    } catch (err) {
      logger.error('[DevJsonEmailProvider] Failed to log development email to scratch:', err);
      return { success: false, error: err.message };
    }
  }
}
