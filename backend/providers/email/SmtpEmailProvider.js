import nodemailer from 'nodemailer';
import { BaseEmailProvider } from './BaseEmailProvider.js';
import { logger } from '../../utils/logger.js';

export class SmtpEmailProvider extends BaseEmailProvider {
  constructor(smtpConfig) {
    super();
    this.smtpConfig = smtpConfig;
    this.transporter = null;
  }

  getTransporter() {
    if (!this.transporter) {
      const port = Number(process.env.SMTP_PORT || 587);
      const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;
      const user = (process.env.SMTP_USER || '').replace(/["\s]/g, '');
      const pass = (process.env.SMTP_PASS || '').replace(/["\s]/g, '');
      const defaultFrom = (process.env.MAIL_FROM || user || 'noreply@nearby.com').replace(/["\s]/g, '');

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port,
        secure: isSecure,
        auth: (user && pass) ? { user, pass } : undefined
      });
    }
    return this.transporter;
  }

  async send(options) {
    const { to, subject, html, text, from } = options;
    const defaultFrom = (process.env.EMAIL_FROM_ADDRESS || process.env.MAIL_FROM || 'noreply@nearby.com').replace(/"/g, '').trim();
    const defaultFromName = (process.env.EMAIL_FROM_NAME || 'Nearby Locator').replace(/"/g, '').trim();

    try {
      const info = await this.getTransporter().sendMail({
        from: from || `"${defaultFromName}" <${defaultFrom}>`,
        to,
        subject,
        html,
        text
      });

      logger.info(`[SmtpEmailProvider] Dispatched SMTP email to ${to} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error(`[SmtpEmailProvider] SMTP delivery failed to ${to}:`, err);
      return { success: false, error: err.message };
    }
  }
}
