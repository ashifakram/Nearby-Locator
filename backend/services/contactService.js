import { contactRepository } from '../repositories/contactRepository.js';
import { EmailTemplateEngine } from './emailTemplateEngine.js';
import { EmailProviderFactory } from '../providers/email/EmailProviderFactory.js';
import { logger } from '../utils/logger.js';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || process.env.SUPPORT_EMAIL || 'admin@nearby.com';

const CATEGORY_LABELS = {
  general: 'General Inquiry',
  technical: 'Technical & API Support',
  billing: 'Billing & Account',
  privacy: 'Data Privacy & Security',
  partnerships: 'Business Partnerships',
};

const RESPONSE_TIMES = {
  general: 'Within 5 business days',
  technical: 'Within 48 hours',
  billing: 'Within 24 hours',
  privacy: 'Within 24 hours',
  partnerships: 'Within 7 working days',
};

export const contactService = {
  /**
   * Submit a new contact inquiry.
   * - Validates input
   * - Creates DB record with auto ticket ID
   * - Sends confirmation email to user (non-blocking)
   * - Sends internal admin alert email (non-blocking)
   */
  async submit({ name, email, category, subject, message, ip_address, user_agent }) {
    // Sanitize
    name = name?.trim();
    email = email?.toLowerCase().trim();
    subject = subject?.trim();
    message = message?.trim();

    if (!name || !email || !category || !subject || !message) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'All fields are required.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' };
    }
    if (message.length < 10) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Message must be at least 10 characters.' };
    }

    const submission = await contactRepository.create({
      name,
      email,
      category,
      subject,
      message,
      ip_address,
      user_agent,
    });

    // Fire emails asynchronously — never block the response
    contactService
      .sendUserConfirmation(submission)
      .then(() => contactRepository.markConfirmationSent(submission.id))
      .catch((err) => logger.error(`[Contact] User confirmation email failed for ticket ${submission.ticket_id}:`, err));

    contactService
      .sendAdminAlert(submission)
      .catch((err) => logger.error(`[Contact] Admin alert email failed for ticket ${submission.ticket_id}:`, err));

    logger.info(`[Contact] New submission: ticket=${submission.ticket_id} category=${category} email=${email}`);

    return {
      success: true,
      ticket_id: submission.ticket_id,
      message: `Your message has been received. Ticket ${submission.ticket_id} has been created. Check your email for confirmation.`,
    };
  },

  /**
   * Send confirmation email to the user who submitted
   */
  async sendUserConfirmation(submission) {
    const html = EmailTemplateEngine.render('contact_confirmation', {
      subject: `We've received your message — Ticket ${submission.ticket_id}`,
      name: submission.name,
      email: submission.email,
      ticketId: submission.ticket_id,
      categoryLabel: CATEGORY_LABELS[submission.category] || submission.category,
      subject_line: submission.subject,
      responseTime: RESPONSE_TIMES[submission.category] || 'Within 24 hours',
      appUrl: APP_URL,
    });

    const provider = EmailProviderFactory.getProvider();
    await provider.send({
      to: submission.email,
      subject: `[${submission.ticket_id}] We've received your message — Nearby Locator Support`,
      html,
    });

    logger.info(`[Contact] Confirmation email sent → ${submission.email} (${submission.ticket_id})`);
  },

  /**
   * Send internal admin notification email for new submissions
   */
  async sendAdminAlert(submission) {
    const html = EmailTemplateEngine.render('contact_admin_alert', {
      subject: `New Support Ticket: ${submission.ticket_id}`,
      ticketId: submission.ticket_id,
      name: submission.name,
      email: submission.email,
      categoryLabel: CATEGORY_LABELS[submission.category] || submission.category,
      priority: submission.priority,
      subject_line: submission.subject,
      message: submission.message,
      adminUrl: `${APP_URL}/admin`,
    });

    const provider = EmailProviderFactory.getProvider();
    await provider.send({
      to: ADMIN_NOTIFY_EMAIL,
      subject: `[${submission.priority.toUpperCase()}] New Ticket ${submission.ticket_id}: ${submission.subject}`,
      html,
    });
  },

  // ─── Admin Methods ────────────────────────────────────────────────────────

  async list(options) {
    return contactRepository.list(options);
  },

  async getDetail(id) {
    return contactRepository.getDetail(id);
  },

  async update(id, updates) {
    const submission = await contactRepository.findById(id);
    if (!submission) return { success: false, message: 'Submission not found.' };
    const updated = await contactRepository.update(id, updates);
    return { success: true, data: updated };
  },

  async getStats() {
    return contactRepository.getStats();
  },

  async deleteSubmission(id) {
    await contactRepository.deleteById(id);
    return { success: true };
  },
};
