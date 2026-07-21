import crypto from 'crypto';
import db from '../db.js';
import client from '../redisClient.js';
import { enqueue } from '../utils/queue.js';
import { logger } from '../utils/logger.js';

export const WebhookService = {
  /**
   * Register a new webhook subscription for a user
   */
  async createSubscription({ userId, targetUrl, eventTypes }, trx = db) {
    const secretKey = 'whsec_' + crypto.randomBytes(24).toString('hex');
    const [sub] = await trx('webhook_subscriptions').insert({
      user_id: userId,
      target_url: targetUrl,
      event_types: Array.isArray(eventTypes) ? eventTypes.join(',') : eventTypes,
      secret_key: secretKey,
      status: 'active',
      consecutive_failures: 0
    }).returning('*');
    
    return sub;
  },

  /**
   * Enqueue a webhook dispatch job after verifying subscription status and event subscription matching
   */
  async triggerEvent(eventType, payload, trx = db) {
    // 1. Fetch active/paused subscriptions matching the targeted event type
    const subscriptions = await trx('webhook_subscriptions')
      .whereIn('status', ['active', 'paused']);

    const matchedSubs = subscriptions.filter(sub => {
      const types = sub.event_types.split(',');
      return types.includes(eventType) || types.includes('*');
    });

    const jobs = [];
    for (const sub of matchedSubs) {
      // 2. Prevent sending to subscriptions paused/disabled by circuit breaker
      if (sub.status === 'paused' || sub.status === 'disabled') {
        logger.info(`Webhook event ${eventType} skipped for subscription ${sub.id} due to paused/disabled status.`);
        continue;
      }

      const deliveryId = crypto.randomUUID();
      const jobId = await enqueue('SEND_WEBHOOK', {
        subscriptionId: sub.id,
        deliveryId,
        eventType,
        payload
      }, {
        id: crypto.randomUUID(),
        priority: 'high' // Webhooks are high-priority operations
      });

      jobs.push({ subscriptionId: sub.id, jobId, deliveryId });
    }

    return jobs;
  },

  /**
   * Compute signature headers for outbound payloads (HMAC-SHA256)
   * Appends timestamp t=... to protect against replay attacks.
   */
  createSignatureHeader(payload, secretKey, timestamp) {
    const serializedPayload = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secretKey)
      .update(`${timestamp}.${serializedPayload}`)
      .digest('hex');
    
    return `t=${timestamp},v1=${signature}`;
  },

  /**
   * Inbound verification logic for third-party endpoints consuming our webhooks (or for testing)
   * Restricts signatures to a strict 5-minute skew window.
   */
  verifySignatureHeader(payload, signatureHeader, secretKey) {
    if (!signatureHeader) return false;

    // Parse t=... and v1=...
    const parts = signatureHeader.split(',');
    const tPart = parts.find(p => p.startsWith('t='));
    const vPart = parts.find(p => p.startsWith('v1='));

    if (!tPart || !vPart) return false;

    const timestamp = parseInt(tPart.split('=')[1], 10);
    const signature = vPart.split('=')[1];

    // 1. Validate strict 5-minute timestamp skew window
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      logger.warn('WEBHOOK_SIGNATURE_EXPIRED', `Webhook timestamp skew exceeded limit: ${Math.abs(now - timestamp)}s`);
      return false;
    }

    // 2. Re-compute HMAC and compare
    const serializedPayload = JSON.stringify(payload);
    const expectedSignature = crypto.createHmac('sha256', secretKey)
      .update(`${timestamp}.${serializedPayload}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  },

  /**
   * Check for duplicate webhook deliveries using Redis replay cache with 10-minute TTL
   */
  async acquireDeliveryLock(deliveryId) {
    const key = `nearby-locator:webhook:delivery-lock:${deliveryId}`;
    try {
      if (client.isOpen) {
        const acquired = await client.set(key, '1', { NX: true, EX: 600 }); // 10-minute replay cache
        return !!acquired;
      }
      return true; // Fallback to pass on Redis degradation
    } catch (err) {
      logger.warn('REDIS_DEGRADATION', 'Webhook replay cache check degraded:', err.message);
      return true;
    }
  },

  /**
   * Trigger circuit breaker on repeated consecutive failures
   */
  async handleFailure(subscriptionId, trx = db) {
    const sub = await trx('webhook_subscriptions').where({ id: subscriptionId }).first();
    if (!sub) return;

    const currentFailures = sub.consecutive_failures + 1;
    const patch = { consecutive_failures: currentFailures };

    // Trip circuit breaker after 10 consecutive failures
    if (currentFailures >= 10) {
      patch.status = 'paused';
      logger.error('WEBHOOK_CIRCUIT_BREAKER_TRIPPED', `Webhook subscription ${subscriptionId} paused due to consecutive failures ceiling (10).`);
      
      // Enqueue notification delivery informing user of their paused webhook
      await enqueue('SEND_NOTIFICATION', {
        userId: sub.user_id,
        channel: 'email',
        category: 'security',
        target: 'customer@example.com', // Typically mapped to sub owner email
        templateId: 'GEO_ALERT', // Or an email alerting about webhook pause
        version: 'v1',
        payload: { spotName: `System Alert: Webhook to URL ${sub.target_url} paused due to consecutive failures. Please resume in dashboard.`, distanceMeters: 0 },
        deliveryKey: `webhook_breaker:${sub.id}:${Date.now()}`
      });
    }

    await trx('webhook_subscriptions').where({ id: subscriptionId }).update(patch);
  },

  /**
   * Reset circuit breaker failures count upon a successful delivery
   */
  async handleSuccess(subscriptionId, trx = db) {
    await trx('webhook_subscriptions').where({ id: subscriptionId }).update({
      consecutive_failures: 0,
      status: 'active' // Resume active state if paused earlier
    });
  }
};
