import { EmailService } from './emailService.js';
import { EmailTemplateEngine } from './emailTemplateEngine.js';
import { logger } from '../utils/logger.js';

/**
 * NotificationService (Domain Notification Orchestrator)
 * Exposes a pure domain-level notification interface across all SaaS email types.
 * Zero direct dependency on Nodemailer, Handlebars, or SMTP providers.
 */
export const NotificationService = {
  /**
   * Dispatches a domain notification email to a recipient.
   * @param {string} recipientEmail - Recipient email address
   * @param {string} notificationType - High-level notification event type
   * @param {Object} payload - Notification variables and metadata
   * @returns {Promise<{ success: boolean, id?: string }>}
   */
  async notifyUser(recipientEmail, notificationType, payload = {}) {
    logger.info(`[NotificationService] Processing domain notification '${notificationType}' for ${recipientEmail}`);

    const userName = payload.userName || recipientEmail.split('@')[0];
    const defaultMeta = {
      userName,
      timestamp: payload.timestamp || new Date().toISOString(),
      browser: payload.browser || payload.userAgent || 'Unknown Browser',
      os: payload.os || 'Unknown OS',
      location: payload.location || 'Unknown Location',
      ipAddress: payload.ipAddress || '127.0.0.1',
      ...payload
    };

    let templateName = 'test';
    let subject = 'System Notification';

    switch (notificationType) {
      case 'VERIFY_EMAIL':
        templateName = 'verify_email';
        subject = 'Verify your email address';
        break;
      case 'WELCOME':
        templateName = 'welcome';
        subject = `Welcome to ${process.env.COMPANY_NAME || 'Nearby Locator'}!`;
        break;
      case 'RESEND_VERIFICATION':
        templateName = 'resend_verification';
        subject = 'Your new verification code';
        break;
      case 'FORGOT_PASSWORD':
        templateName = 'password_reset_request';
        subject = 'Password reset request';
        break;
      case 'PASSWORD_CHANGED':
        templateName = 'password_changed';
        subject = 'Your password was changed';
        break;
      case 'LOGIN_ALERT':
        templateName = 'login_alert';
        subject = 'New login detected';
        break;
      case 'ACCOUNT_LOCKED':
        templateName = 'account_locked';
        subject = 'Account temporarily locked';
        break;
      case 'ACCOUNT_REACTIVATED':
        templateName = 'account_reactivated';
        subject = 'Your account has been reactivated';
        break;
      case 'EMAIL_CHANGED':
        templateName = 'email_changed';
        subject = 'Your email address was changed';
        break;
      case 'SECURITY_ALERT':
        templateName = 'security_alert';
        subject = `Security Alert: ${payload.alertTitle || 'Critical Event Detected'}`;
        break;
      case 'ACCOUNT_DELETED':
        templateName = 'account_deleted';
        subject = 'Account deletion confirmation';
        break;
      case 'ADMIN_INVITATION':
        templateName = 'admin_invitation';
        subject = `You've been invited to join ${process.env.COMPANY_NAME || 'Nearby Locator'}`;
        break;
      case 'TEST_NOTIFICATION':
        templateName = 'test';
        subject = 'Infrastructure Test Notification';
        break;
      default:
        templateName = 'test';
        subject = payload.subject || 'System Notification';
        break;
    }

    const html = EmailTemplateEngine.render(templateName, {
      ...defaultMeta,
      subject
    });

    const result = await EmailService.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text: payload.message || `${subject} for ${recipientEmail}`,
      type: notificationType.toLowerCase(),
      otpCode: payload.otpCode
    });

    return { success: result.success, id: result.messageId };
  }
};
