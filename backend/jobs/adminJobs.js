import db from '../db.js';
import client from '../redisClient.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * EXPORT_USER_DATA:
 * Asynchronously gathers all target user database entities, structures them,
 * and sets a single-use download token in Redis.
 */
export async function exportUserDataJob(payload) {
  const { userId, exportId, requesterId } = payload;
  logger.info(`Starting async data export job for user: ${userId}`, { exportId });

  try {
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      await client.set(`export:status:${exportId}`, JSON.stringify({ status: 'FAILED', error: 'User not found' }), { EX: 600 });
      return;
    }

    // Fetch related records with size limits to prevent memory bloat
    const loginAttempts = await db('login_attempts')
      .where({ email: user.email })
      .orderBy('created_at', 'desc')
      .limit(100);

    const sessions = await db('user_sessions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(100);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      requesterId,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isSuspended: !!user.is_suspended,
        createdAt: user.created_at
      },
      loginAttempts: loginAttempts.map(la => ({
        ipAddress: la.ip_address,
        isSuccessful: la.is_successful,
        createdAt: la.created_at
      })),
      sessions: sessions.map(s => ({
        id: s.id,
        isRevoked: s.is_revoked,
        isRotated: s.is_rotated,
        ipAddress: s.ip_address,
        userAgent: s.user_agent,
        expiresAt: s.expires_at,
        createdAt: s.created_at
      }))
    };

    // Generate secure single-use download token
    const downloadToken = crypto.randomUUID();
    const payloadKey = `download:payload:${downloadToken}`;
    
    // Save structured payload in Redis with 5 minutes TTL
    await client.set(payloadKey, JSON.stringify(exportPayload), { EX: 300 });

    // Update export status to ready
    await client.set(`export:status:${exportId}`, JSON.stringify({ status: 'READY', downloadToken }), { EX: 600 });
    logger.info(`Async data export complete for user ${userId}`, { exportId, downloadToken });
  } catch (err) {
    logger.error('Failed to execute user data export job', err);
    await client.set(`export:status:${exportId}`, JSON.stringify({ status: 'FAILED', error: err.message }), { EX: 600 });
  }
}
