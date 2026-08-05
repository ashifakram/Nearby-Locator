import crypto from 'crypto';
import db from '../db.js';
import { newsletterRepository } from '../repositories/newsletterRepository.js';
import { EmailTemplateEngine } from './emailTemplateEngine.js';
import { EmailProviderFactory } from '../providers/email/EmailProviderFactory.js';
import { logger } from '../utils/logger.js';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export const newsletterService = {
  /**
   * Subscribe an email to the newsletter.
   * Rules:
   *  - Invalid email → return error
   *  - Already active → return success silently (no email, prevents enumeration)
   *  - Previously unsubscribed → re-activate and send confirmation
   *  - New → create record and send confirmation
   */
  async subscribe({ email, source = 'landing_page', ip_address, user_agent }) {
    const normalizedEmail = email.toLowerCase().trim();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return { success: false, code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' };
    }

    const existing = await newsletterRepository.findByEmail(normalizedEmail);

    // Already active — respond positively but don't send another email
    if (existing && existing.status === 'active') {
      logger.info(`[Newsletter] Duplicate subscribe attempt silently accepted: ${normalizedEmail}`);
      return {
        success: true,
        code: 'ALREADY_SUBSCRIBED',
        message: "You're already subscribed! We'll keep you updated.",
        alreadyExisted: true,
      };
    }

    let subscriber;

    if (existing && existing.status === 'unsubscribed') {
      // Re-activate — give a fresh unsubscribe token
      const newToken = crypto.randomBytes(32).toString('hex');
      await db('newsletter_subscribers').where({ id: existing.id }).update({
        status: 'active',
        unsubscribed_at: null,
        unsubscribe_token: newToken,
        confirmation_sent: false,
        source,
        ip_address: ip_address || existing.ip_address,
        updated_at: new Date(),
      });
      subscriber = { ...existing, unsubscribe_token: newToken };
    } else {
      // Brand new subscriber
      const unsubscribe_token = crypto.randomBytes(32).toString('hex');
      subscriber = await newsletterRepository.create({
        email: normalizedEmail,
        source,
        ip_address,
        user_agent,
        unsubscribe_token,
      });
    }

    // Send confirmation email asynchronously — don't fail the subscription if email fails
    newsletterService
      .sendConfirmationEmail(subscriber)
      .then(() => newsletterRepository.markConfirmationSent(subscriber.id))
      .catch((err) =>
        logger.error(`[Newsletter] Failed to send confirmation to ${normalizedEmail}:`, err)
      );

    return {
      success: true,
      code: 'SUBSCRIBED',
      message: "You're subscribed! A confirmation email is on its way.",
      alreadyExisted: false,
    };
  },

  /**
   * Send the beautifully styled confirmation email
   */
  async sendConfirmationEmail(subscriber) {
    const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${subscriber.unsubscribe_token}`;
    const html = EmailTemplateEngine.render('newsletter_confirmation', {
      subject: 'Welcome to Nearby Locator Updates!',
      email: subscriber.email,
      unsubscribeUrl,
      appUrl: APP_URL,
    });

    const provider = EmailProviderFactory.getProvider();
    await provider.send({
      to: subscriber.email,
      subject: 'Welcome to Nearby Locator Updates! 🗺️',
      html,
    });

    logger.info(`[Newsletter] Confirmation email sent → ${subscriber.email}`);
  },

  /**
   * Unsubscribe via token link (called from email link click)
   */
  async unsubscribe(token) {
    if (!token) return { success: false, message: 'Invalid unsubscribe link.' };
    const subscriber = await newsletterRepository.findByToken(token);
    if (!subscriber) return { success: false, message: 'Invalid or expired unsubscribe link.' };
    if (subscriber.status === 'unsubscribed') {
      return { success: true, message: 'You are already unsubscribed.' };
    }
    await newsletterRepository.unsubscribeByToken(token);
    logger.info(`[Newsletter] Unsubscribed: ${subscriber.email}`);
    return { success: true, message: 'You have been unsubscribed successfully.' };
  },

  // ─── Admin Methods ────────────────────────────────────────────────────────

  async listSubscribers(options) {
    return newsletterRepository.list(options);
  },

  async getStats() {
    return newsletterRepository.getStats();
  },

  async exportCsv() {
    const rows = await newsletterRepository.exportActive();
    const header = 'email,source,subscribed_at\r\n';
    const body = rows
      .map((r) => `${r.email},${r.source},${new Date(r.created_at).toISOString()}`)
      .join('\r\n');
    return header + body;
  },

  async deleteSubscriber(id) {
    await newsletterRepository.deleteById(id);
    return { success: true };
  },
};
