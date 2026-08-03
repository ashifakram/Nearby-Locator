import db from '../db.js';
import client from '../redisClient.js';
import { NotificationTemplates } from '../templates/notificationTemplates.js';
import { WebhookService } from '../services/webhookService.js';
import { logger } from '../utils/logger.js';

class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Deep-cleans and sanitizes failure logs to prevent PII, OTP tokens, 
 * and user password secrets from leaking into PostgreSQL dead_letter_jobs logs.
 * Enforces a strict 2KB size cap on stored fields.
 */
export function sanitizePayloadForDLQ(payload) {
  if (!payload || typeof payload !== 'object') {
    return {};
  }
  
  try {
    const sanitized = JSON.parse(JSON.stringify(payload));
    const keysToRedact = ['password', 'token', 'otp', 'secret', 'credentials', 'authorization', 'secret_key'];
    
    const redact = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          redact(obj[key]);
        } else if (keysToRedact.includes(key.toLowerCase())) {
          obj[key] = '[REDACTED]';
        }
      }
    };
    
    redact(sanitized);
    
    const payloadStr = JSON.stringify(sanitized);
    if (Buffer.byteLength(payloadStr, 'utf-8') > 2 * 1024) {
      return { _truncated: 'Payload size exceeded 2KB DLQ limit and was pruned for security compliance.' };
    }
    return sanitized;
  } catch (err) {
    return { _error: 'Failed to safely sanitize payload fields.' };
  }
}

/**
 * Commits a permanently failed or poisoned background job to dead_letter_jobs
 */
async function archiveToDLQ(jobId, type, payload, error) {
  try {
    const sanitizedPayload = sanitizePayloadForDLQ(payload);
    await db('dead_letter_jobs').insert({
      job_id: jobId,
      type,
      payload: JSON.stringify(sanitizedPayload),
      error_details: JSON.stringify({
        message: error.message || 'Unknown permanent failure',
        name: error.name || 'Error',
        stack: error.stack
      }),
      failed_at: new Date()
    });
    logger.error('JOB_ARCHIVED_TO_DLQ', `Job ${jobId} failed permanently. Serialized details committed to database DLQ.`);
  } catch (archiveErr) {
    logger.error('DLQ_ARCHIVAL_FAILED', 'Failed to commit failed job details to PostgreSQL:', archiveErr);
  }
}

/**
 * Job Handler: SEND_NOTIFICATION
 */
export async function sendNotificationJob(payload, options = {}) {
  const { userId, channel, category, target, templateId, version, deliveryKey } = payload;
  const startTime = Date.now();

  try {
    // 1. Enforce effectively-once Best-Effort Delivery lock in DB
    try {
      await db('notification_deliveries').insert({
        delivery_key: deliveryKey,
        user_id: userId,
        channel,
        category,
        target,
        status: 'pending',
        provider: null,
        retries: 0
      });
    } catch (dbErr) {
      if (dbErr.code === '23505') { // PostgreSQL unique violation
        logger.warn('DUPLICATE_DELIVERY_BLOCKED', `Deduplicated redundant dispatch for key: ${deliveryKey}`);
        return; // Exit silently
      }
      throw dbErr;
    }

    // 2. Render Template Content Safely (Raises permanent ValidationError if invalid)
    const rendered = NotificationTemplates.render(templateId, version, channel, payload.payload);

    // 3. Dispatch through ProviderRegistry (Contains critical lanes & failovers)
    const priority = category === 'marketing' ? 'low' : 'high';
    const dispatcheResult = await ProviderRegistry.dispatch(
      channel,
      priority,
      target,
      rendered.subject || rendered.text,
      rendered.html || null
    );

    // 4. Update Delivery log on Success
    const latency = Date.now() - startTime;
    await db('notification_deliveries')
      .where({ delivery_key: deliveryKey })
      .update({
        status: 'delivered',
        provider: dispatcheResult.provider,
        latency_ms: latency,
        updated_at: new Date()
      });

  } catch (err) {
    // Check error type to determine if transient vs permanent
    const isValidationError = err.name === 'ValidationError';
    
    // Parse Rate-Limiter HTTP 429 exceptions to trigger adaptive backoffs
    const isRateLimit = err.name === 'RateLimitExceededError' || (err.message || '').includes('429');
    
    if (isValidationError) {
      // Permanent ValidationError -> Stop retry, archive to DLQ
      await db('notification_deliveries').where({ delivery_key: deliveryKey }).update({
        status: 'failed',
        error_details: err.message,
        updated_at: new Date()
      });
      await archiveToDLQ(options.jobId || 'local', 'SEND_NOTIFICATION', payload, err);
      return;
    }

    if (isRateLimit) {
      logger.warn('PROVIDER_RATE_LIMITED', `Rate limits encountered during SMS/Email dispatch: ${err.message}. Retrying adaptive backoff.`);
      const retryAfter = 5000; // Schedule next attempt with 5s delay
      const delayError = new TimeoutError(`Rate limit backoff. Retry-After: ${retryAfter}ms`);
      throw delayError; // Bubble transient exception to trigger backoff delay ZADD
    }

    // Capture standard network timeouts as transient, let other errors bubble
    const msg = (err.message || '').toLowerCase();
    const isTransient = msg.includes('timeout') || msg.includes('network') || msg.includes('connection');
    
    if (isTransient) {
      throw err; // Bubble transient network error to let scheduler retry exponentially
    }

    // permanent unknown error -> write to DLQ
    await db('notification_deliveries').where({ delivery_key: deliveryKey }).update({
      status: 'failed',
      error_details: err.message,
      updated_at: new Date()
    });
    await archiveToDLQ(options.jobId || 'local', 'SEND_NOTIFICATION', payload, err);
  }
}

/**
 * Job Handler: SEND_WEBHOOK
 */
export async function sendWebhookJob(payload, options = {}) {
  const { subscriptionId, deliveryId, eventType, payload: webhookPayload } = payload;
  const startTime = Date.now();

  try {
    // 1. Check Redis duplicate replay cache to prevent downstream storms
    const lockAcquired = await WebhookService.acquireDeliveryLock(deliveryId);
    if (!lockAcquired) {
      logger.warn('WEBHOOK_DUPLICATE_DISPATCH_BLOCKED', `Replay cache blocked duplicate webhook: ${deliveryId}`);
      return;
    }

    // 2. Fetch target URL and Secret Key
    const sub = await db('webhook_subscriptions').where({ id: subscriptionId }).first();
    if (!sub) {
      throw new Error(`Webhook subscription ${subscriptionId} has been deleted.`);
    }

    if (sub.status === 'paused' || sub.status === 'disabled') {
      logger.info(`Webhook job dropped because subscription ${subscriptionId} is currently paused/disabled.`);
      return;
    }

    // 3. HMAC-SHA256 Payload signing and Timestamp skew header preparation
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = WebhookService.createSignatureHeader(webhookPayload, sub.secret_key, timestamp);

    // 4. Fire outbound request under tight 5-second timeout boundary
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response;
    try {
      response = await fetch(sub.target_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Delivery-Id': deliveryId,
          'X-Webhook-Event': eventType
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const latency = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`Webhook consumer endpoint returned HTTP ${response.status}`);
    }

    // 5. Log success and reset circuit breaker consecutive counters
    await db('webhook_deliveries').insert({
      delivery_id: deliveryId,
      subscription_id: subscriptionId,
      event_type: eventType,
      status: 'success',
      response_status: response.status,
      latency_ms: latency,
      retries: 0
    });

    await WebhookService.handleSuccess(subscriptionId);

  } catch (err) {
    const latency = Date.now() - startTime;
    logger.warn('WEBHOOK_DELIVERY_FAILED', `Webhook subscription ${subscriptionId} delivery failed: ${err.message}`);

    // Track consecutive failure to feed circuit-breaker Trip limits
    await WebhookService.handleFailure(subscriptionId);

    // Record failure log in database
    try {
      await db('webhook_deliveries').insert({
        delivery_id: deliveryId,
        subscription_id: subscriptionId,
        event_type: eventType,
        status: 'failed',
        response_status: err.message.includes('HTTP') ? parseInt(err.message.split('HTTP ')[1], 10) : null,
        latency_ms: latency,
        retries: 1,
        error_details: err.message
      });
    } catch (dbErr) {
      // Ignored if duplicate delivery primary key
    }

    // Webhook failures bubble as transient to let queue handle standard retries
    // unless maxAttempts are reached, upon which queue naturally archives to DLQ
    throw err;
  }
}
