import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import db from '../db.js';
import { UserProfileService } from '../services/userProfileService.js';
import { UserAccountService } from '../services/userAccountService.js';
import { logger } from '../utils/logger.js';
import { logAudit } from '../utils/auditLogger.js';

const EXPORTS_DIR = path.join(process.cwd(), 'uploads', 'exports');

if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

/**
 * Background worker job handler for GENERATE_ACCOUNT_EXPORT.
 * Generates user data JSON package, updates job status, creates single-use download token.
 */
export async function generateAccountExportJob(payload) {
  const { exportId, userId } = payload;
  logger.info(`[AccountJobs] Starting async account export job ${exportId} for user ${userId}`);

  try {
    // 1. Update status to PROCESSING
    await db('user_account_exports')
      .where({ id: exportId })
      .update({ status: 'PROCESSING', updated_at: db.fn.now() });

    await logAudit({
      actorId: userId,
      targetUserId: userId,
      action: 'ACCOUNT_EXPORT_PROCESSING',
      severity: 'INFO',
      metadata: { exportId }
    });

    // 2. Aggregate export data
    const fullProfile = await UserProfileService.getEnrichedProfile(userId);
    const [sessions, loginHistory, securityEvents, oauthAccounts] = await Promise.all([
      UserAccountService.getActiveSessions(userId),
      UserAccountService.getLoginHistory(userId, { limit: 1000 }),
      UserAccountService.getSecurityEvents(userId, { limit: 1000 }),
      UserAccountService.getConnectedOAuthAccounts(userId)
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      account: fullProfile,
      active_sessions: sessions,
      login_history: loginHistory.history,
      security_events: securityEvents.events,
      oauth_accounts: oauthAccounts
    };

    // 3. Write file to disk
    const fileName = `${exportId}.json`;
    const filePath = path.join(EXPORTS_DIR, fileName);
    await fs.promises.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

    // 4. Generate download token and 24-hour expiration
    const downloadToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db('user_account_exports')
      .where({ id: exportId })
      .update({
        status: 'COMPLETED',
        file_path: `/uploads/exports/${fileName}`,
        download_token: downloadToken,
        expires_at: expiresAt,
        updated_at: db.fn.now()
      });

    await logAudit({
      actorId: userId,
      targetUserId: userId,
      action: 'ACCOUNT_EXPORT_COMPLETED',
      severity: 'INFO',
      metadata: { exportId, expiresAt }
    });

    logger.info(`[AccountJobs] Successfully completed account export job ${exportId}`);
  } catch (err) {
    logger.error(`[AccountJobs] Account export job failed for ${exportId}:`, err);

    await db('user_account_exports')
      .where({ id: exportId })
      .update({ status: 'FAILED', updated_at: db.fn.now() });

    await logAudit({
      actorId: userId,
      targetUserId: userId,
      action: 'ACCOUNT_EXPORT_FAILED',
      severity: 'ERROR',
      metadata: { exportId, error: err.message }
    });

    throw err; // Re-throw to trigger worker queue retry logic
  }
}
