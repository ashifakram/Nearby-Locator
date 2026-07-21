import db from '../db.js';
import { logger } from '../utils/logger.js';

const SEVERITY_WEIGHTS = {
  SCAM_FRAUD: 1.0,
  ABUSIVE: 0.8,
  FAKE_LISTING: 0.6,
  SPAM: 0.4,
  INCORRECT_CATEGORY: 0.2,
  DUPLICATE: 0.2
};

export const ModerationService = {
  /**
   * Single, authoritative in-application trust score calculation.
   * Completely eliminates recalculation drift across triggers/batch tasks.
   */
  async recalculateTrustScore(targetId, targetType, trx = db) {
    try {
      if (targetType === 'spot') {
        // 1. Fetch the spot
        const spot = await trx('spots').where({ id: targetId }).first();
        if (!spot) {
          logger.warn(`SPOT_NOT_FOUND_FOR_RECALCULATION`, `Spot not found: ${targetId}`);
          return;
        }

        // 2. Fetch active unresolved reports for this spot
        const activeReports = await trx('reports').where({ spot_id: targetId, status: 'PENDING' });
        
        let cumulativeScore = 0.0;
        
        // 3. Aggregate trust-weighted report scores
        for (const report of activeReports) {
          const reporter = await trx('users').where({ id: report.reporter_id }).first();
          const reporterTrust = reporter ? reporter.trust_score : 0.5;
          const severityWeight = SEVERITY_WEIGHTS[report.category] || 0.2;
          
          cumulativeScore += severityWeight * reporterTrust;
        }

        const spotTrustScore = Math.max(0.0, 1.0 - cumulativeScore);

        // 4. Update spot trust score
        await trx('spots')
          .where({ id: targetId })
          .update({ trust_score: parseFloat(spotTrustScore.toFixed(4)) });

        // 5. Evaluate Auto-Quarantine thresholds (Cumulative score >= 1.5 OR trust_score <= 0.4)
        if (cumulativeScore >= 1.5 || spotTrustScore <= 0.4) {
          if (spot.moderation_status === 'APPROVED') {
            await trx('spots')
              .where({ id: targetId })
              .update({
                moderation_status: 'QUARANTINED',
                quarantined_at: trx.fn.now()
              });

            await trx('spot_moderation_history').insert({
              spot_id: targetId,
              moderator_id: null,
              action: 'AUTO_QUARANTINE',
              reason: `Authoritative auto-quarantine triggered: cumulative reports score reached ${cumulativeScore.toFixed(2)} (trust_score: ${spotTrustScore.toFixed(2)})`
            });

            logger.info(`SPOT_AUTO_QUARANTINED`, `Spot ${targetId} auto-quarantined (score: ${cumulativeScore.toFixed(2)})`);
          }
        }
      } else if (targetType === 'user') {
        // 1. Fetch user record
        const user = await trx('users').where({ id: targetId }).first();
        if (!user) {
          logger.warn(`USER_NOT_FOUND_FOR_RECALCULATION`, `User not found: ${targetId}`);
          return;
        }

        // 2. Account age calculation: starts at 0.5, adds +0.1 per 30 days active, capped at 1.0
        const ageDays = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
        const ageBoost = Math.floor(ageDays / 30) * 0.1;
        const baseScore = Math.min(1.0, 0.5 + ageBoost);

        // 3. Fetch dismissed false reports submitted by this user
        const dismissedRes = await trx('reports')
          .where({ reporter_id: targetId, status: 'DISMISSED' })
          .count('id as cnt')
          .first();
        const dismissedCount = parseInt(dismissedRes?.cnt || 0, 10);
        const falseReportPenalty = dismissedCount * 0.05;

        // 4. Fetch suspended spots created by this user
        const suspendedRes = await trx('spots')
          .where({ creator_id: targetId, moderation_status: 'SUSPENDED' })
          .count('id as cnt')
          .first();
        const suspendedCount = parseInt(suspendedRes?.cnt || 0, 10);
        const suspendedSpotsPenalty = suspendedCount * 0.15;

        // 5. Compute final user trust score
        const finalScore = Math.min(1.0, Math.max(0.0, baseScore - falseReportPenalty - suspendedSpotsPenalty));

        // 6. Update user record
        await trx('users')
          .where({ id: targetId })
          .update({ trust_score: parseFloat(finalScore.toFixed(4)) });
      }
    } catch (err) {
      logger.error('RECALCULATE_TRUST_SCORE_FAILED', `Failed to recalculate trust score for ${targetType} ${targetId}`, err);
      throw err;
    }
  },

  /**
   * Weekly scheduled user trust score recovery routine.
   * Increments trust_score by +0.02 per clean week (no false reports, no suspended spots) since last_recovery_at, capped at 1.0.
   */
  async recoverUserTrustScores(trx = db) {
    try {
      logger.info('Starting user trust scores recovery routine');
      const usersToRecover = await trx('users').where('trust_score', '<', 1.0);
      
      for (const user of usersToRecover) {
        const lastRecovery = user.last_recovery_at || user.created_at;
        const millisecondsSinceLastRecovery = Date.now() - new Date(lastRecovery).getTime();
        const weeksElapsed = Math.floor(millisecondsSinceLastRecovery / (7 * 24 * 60 * 60 * 1000));
        
        if (weeksElapsed >= 1) {
          // Check for any false reports (DISMISSED reports submitted by this user) since last recovery/creation
          const newDismissedRes = await trx('reports')
            .where({ reporter_id: user.id, status: 'DISMISSED' })
            .andWhere('updated_at', '>', lastRecovery)
            .count('id as cnt')
            .first();
          const newDismissedCount = parseInt(newDismissedRes?.cnt || 0, 10);

          // Check for any suspended spots created by this user since last recovery/creation
          const newSuspendedRes = await trx('spots')
            .where({ creator_id: user.id, moderation_status: 'SUSPENDED' })
            .andWhere('updated_at', '>', lastRecovery)
            .count('id as cnt')
            .first();
          const newSuspendedCount = parseInt(newSuspendedRes?.cnt || 0, 10);

          if (newDismissedCount === 0 && newSuspendedCount === 0) {
            const recoveryBoost = weeksElapsed * 0.02;
            const newScore = Math.min(1.0, user.trust_score + recoveryBoost);
            
            await trx('users')
              .where({ id: user.id })
              .update({
                trust_score: parseFloat(newScore.toFixed(4)),
                last_recovery_at: trx.fn.now()
              });

            logger.info(`USER_TRUST_RECOVERED`, `User ${user.id} trust score successfully recovered to ${newScore.toFixed(2)} (+${recoveryBoost.toFixed(2)})`);
          } else {
            // User had platform-safety infractions; slide forward their last_recovery_at to prevent penalizing past errors forever
            await trx('users')
              .where({ id: user.id })
              .update({
                last_recovery_at: trx.fn.now()
              });
          }
        }
      }
      logger.info('User trust scores recovery routine successfully completed');
    } catch (err) {
      logger.error('RECOVER_USER_TRUST_SCORES_FAILED', err);
      throw err;
    }
  }
};
