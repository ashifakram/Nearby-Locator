import crypto from 'crypto';
import db from '../db.js';
import { enqueue } from '../utils/queue.js';
import { logger } from '../utils/logger.js';

export const NotificationService = {
  /**
   * Main Dispatch Orchestrator. Checks suppressions, verifies user preferences, 
   * evaluates timezone-aware quiet hours, compiles delivery keys, and enqueues jobs.
   */
  async sendNotification({ userId = null, channel, category, target, templateId, version = 'v1', payload = {}, idempotencyToken = null }, trx = db) {
    try {
      const parsedTarget = target.trim();
      
      // 1. Check Suppression List (Halt dispatches to permanently failed/bounced targets)
      const isSuppressed = await trx('suppression_list').where({ target_value: parsedTarget }).first();
      if (isSuppressed) {
        logger.warn('DELIVERY_SUPPRESSED', `Dispatch blocked due to suppression list match: ${parsedTarget}`, { reason: isSuppressed.reason });
        return { status: 'suppressed', reason: isSuppressed.reason };
      }

      let userTimezone = 'America/New_York'; // Default fallback timezone

      // 2. Evaluate User Preference Channel & Category settings if userId present
      if (userId) {
        const user = await trx('users').where({ id: userId }).first();
        if (!user) {
          throw new Error(`User with ID ${userId} does not exist.`);
        }
        
        userTimezone = user.timezone || 'America/New_York';

        // Check explicit channel preference overrides
        const preference = await trx('user_notification_preferences')
          .where({ user_id: userId, channel, category })
          .first();

        if (preference && !preference.is_enabled) {
          logger.info(`Notification blocked due to user preference opt-out: User ${userId}, Channel ${channel}, Category ${category}`);
          return { status: 'opted_out' };
        }
      }

      // 3. Compile event-specific idempotency delivery_key
      // If caller omits the idempotency token, assign a request-scoped UUID (no raw time bucket collapsing)
      const safeIdempotencyToken = idempotencyToken || crypto.randomUUID();
      const deliveryKey = crypto.createHash('sha256')
        .update(`${parsedTarget}:${channel}:${templateId}:${safeIdempotencyToken}`)
        .digest('hex');

      // 4. Timezone-Aware Quiet Hours Calculation (10 PM to 7 AM local time)
      let delayMs = 0;
      const isNonEssential = category === 'marketing';
      
      if (isNonEssential) {
        try {
          const formatterObj = new Intl.DateTimeFormat('en-US', {
            timeZone: userTimezone,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
          });
          const parts = formatterObj.formatToParts(new Date());
          const getPart = (type) => parseInt(parts.find(p => p.type === type).value, 10);

          const hour = getPart('hour');

          // Is quiet hours active? (10 PM to 7 AM)
          if (hour >= 22 || hour < 7) {
            // Target date representing 8 AM in user local scale
            const targetDate = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
            if (hour >= 22) {
              targetDate.setDate(targetDate.getDate() + 1);
            }
            targetDate.setHours(8, 0, 0, 0);

            const nowLocal = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
            const diffMs = targetDate.getTime() - nowLocal.getTime();
            delayMs = Math.max(1000, diffMs);

            logger.info(`Quiet period active (${hour} PM/AM) in user timezone (${userTimezone}). Delaying marketing dispatch by ${delayMs}ms.`, { userId });
          }
        } catch (tzErr) {
          logger.warn('TIMEZONE_CALCULATION_FAILED', 'Failed to calculate user localized quiet period. Defaulting to instant delivery.', tzErr);
        }
      }

      // 5. Enqueue background delivery job dynamically
      const jobId = await enqueue('SEND_NOTIFICATION', {
        userId,
        channel,
        category,
        target: parsedTarget,
        templateId,
        version,
        payload,
        deliveryKey
      }, {
        id: crypto.randomUUID(),
        delayMs,
        priority: category === 'marketing' ? 'low' : 'high'
      });

      return { status: 'enqueued', jobId, deliveryKey };

    } catch (err) {
      logger.error('NOTIFICATION_SERVICE_ERROR', 'Failed to orchestrate notification send:', err);
      throw err;
    }
  }
};
