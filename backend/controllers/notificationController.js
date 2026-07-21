import db from '../db.js';
import client from '../redisClient.js';
import { NotificationService } from '../services/notificationService.js';
import { WebhookService } from '../services/webhookService.js';
import { logger } from '../utils/logger.js';
import config from '../config/index.js';

export const NotificationController = {
  /**
   * Retrieves notification preferences for the authenticated user
   */
  async getPreferences(req, res) {
    try {
      const userId = req.user.id;
      const preferences = await db('user_notification_preferences')
        .where({ user_id: userId });

      return res.json({ preferences });
    } catch (err) {
      logger.error('GET_PREFERENCES_ERROR', 'Failed to retrieve user preferences:', err);
      return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to retrieve preferences.' } });
    }
  },

  /**
   * Updates or registers notification preferences for the authenticated user
   */
  async updatePreferences(req, res) {
    try {
      const userId = req.user.id;
      const { channel, category, isEnabled } = req.body;

      if (!['email', 'sms', 'push'].includes(channel)) {
        return res.status(400).json({ error: { code: 'INVALID_CHANNEL', message: 'Unsupported channel.' } });
      }
      if (!['transactional', 'security', 'marketing'].includes(category)) {
        return res.status(400).json({ error: { code: 'INVALID_CATEGORY', message: 'Unsupported category.' } });
      }

      // Upsert preferences using PostgreSQL native ON CONFLICT
      await db('user_notification_preferences')
        .insert({
          user_id: userId,
          channel,
          category,
          is_enabled: !!isEnabled,
          updated_at: new Date()
        })
        .onConflict(['user_id', 'channel', 'category'])
        .merge();

      return res.json({ message: 'Preferences updated successfully.' });
    } catch (err) {
      logger.error('UPDATE_PREFERENCES_ERROR', 'Failed to update user preferences:', err);
      return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update preferences.' } });
    }
  },

  /**
   * Test dispatch endpoint for debugging
   */
  async testSend(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const { channel, category, target, templateId, payload, idempotencyToken } = req.body;

      if (!channel || !category || !target || !templateId) {
        return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Missing channel, category, target, or templateId.' } });
      }

      const result = await NotificationService.sendNotification({
        userId,
        channel,
        category,
        target,
        templateId,
        payload: payload || {},
        idempotencyToken
      });

      return res.json({ message: 'Notification send orchestrated.', result });
    } catch (err) {
      return res.status(500).json({ error: { code: 'DISPATCH_ERROR', message: err.message } });
    }
  },

  /**
   * Create outbound webhook subscription
   */
  async createWebhook(req, res) {
    try {
      const userId = req.user.id;
      const { targetUrl, eventTypes } = req.body;

      if (!targetUrl || !eventTypes) {
        return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Missing targetUrl or eventTypes.' } });
      }

      const sub = await WebhookService.createSubscription({
        userId,
        targetUrl,
        eventTypes
      });

      return res.status(201).json({ message: 'Webhook subscription created.', subscription: sub });
    } catch (err) {
      logger.error('CREATE_WEBHOOK_ERROR', 'Failed to register webhook subscription:', err);
      return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to register webhook.' } });
    }
  },

  /**
   * Inbound provider webhook ingestion endpoint. Parses SendGrid / Twilio bounce,
   * spam, and unsubscribe events, and synchronizes local suppression list.
   */
  async inboundProviderWebhook(req, res) {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    const trx = await db.transaction();

    try {
      for (const event of events) {
        const type = event.event || event.Type; // SendGrid 'event' or Twilio 'Type'
        const email = event.email || event.Email;
        const phone = event.phone || event.Phone || event.From;
        
        const isEmailBounce = ['bounce', 'dropped', 'spamreport', 'unsubscribe'].includes(type);
        const isSmsBounce = ['undelivered', 'failed', 'opt-out'].includes(type);

        const targetValue = isEmailBounce ? email : (isSmsBounce ? phone : null);
        const channelType = isEmailBounce ? 'email' : (isSmsBounce ? 'sms' : null);

        if (targetValue && channelType) {
          logger.warn('PROVIDER_INBOUND_SUPPRESSION', `Adding target to local suppression list: ${targetValue}`, { type });
          
          await trx('suppression_list')
            .insert({
              type: channelType,
              target_value: targetValue.trim(),
              reason: type,
              created_at: new Date()
            })
            .onConflict('target_value')
            .ignore();
        }
      }
      
      await trx.commit();
      return res.json({ message: 'Inbound provider events processed successfully.' });
    } catch (err) {
      await trx.rollback();
      logger.error('PROVIDER_WEBHOOK_ERROR', 'Failed to ingest inbound provider event:', err);
      return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to process provider event.' } });
    }
  },

  /**
   * Retrieves operational queue metric summaries and saturation limits
   */
  async getQueueTelemetry(req, res) {
    try {
      const prefix = config.redis.prefix || 'nearby-locator:';
      
      if (!client.isOpen) {
        return res.json({
          status: 'degraded',
          message: 'Redis server connection is offline. Operational telemetry unavailable.'
        });
      }

      // Read active Redis queue size profiles
      const highQueueLen = await client.lLen(`${prefix}queue:high`).catch(() => 0);
      const lowQueueLen = await client.lLen(`${prefix}queue:low`).catch(() => 0);
      const processingLen = await client.zCard(`${prefix}queue:processing`).catch(() => 0);
      const delayedLen = await client.zCard(`${prefix}queue:delayed`).catch(() => 0);
      const failedLen = await client.lLen(`${prefix}queue:failed`).catch(() => 0);

      const totalActiveQueue = highQueueLen + lowQueueLen;
      const isSaturated = totalActiveQueue >= 8000; // Trigger saturation warning at 80% capacity ceiling (10,000)

      return res.json({
        telemetry: {
          queues: {
            highPriorityDepth: highQueueLen,
            lowPriorityDepth: lowQueueLen,
            delayedCount: delayedLen,
            processingCount: processingLen,
            failedDLQCount: failedLen
          },
          saturation: {
            isSaturated,
            thresholdPercent: ((totalActiveQueue / 10000) * 100).toFixed(1) + '%'
          }
        }
      });
    } catch (err) {
      logger.error('TELEMETRY_ERROR', 'Failed to retrieve operational queue telemetry:', err);
      return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to compile telemetry report.' } });
    }
  }
};
