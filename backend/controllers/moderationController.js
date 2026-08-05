import db from '../db.js';
import { ModerationService } from '../services/moderationService.js';
import { NotificationService } from '../services/notificationService.js';
import { sendSuccess, sendError } from '../middleware/responseFormatter.js';
import { logAudit } from '../utils/auditLogger.js';
import { logger } from '../utils/logger.js';
import { buildSortClause, buildPaginationClause } from '../utils/queryUtils.js';

export const submitReport = async (req, res) => {
  const trx = await db.transaction();
  try {
    const { spotId, category, details } = req.body;
    const reporterId = req.user.id;
    const ipAddress = req.ip || '127.0.0.1';

    if (!spotId || !category) {
      await trx.rollback();
      return sendError(res, { code: 'INVALID_INPUT' }, 'spotId and category are required.', 400);
    }

    const validCategories = ['FAKE_LISTING', 'SPAM', 'DUPLICATE', 'ABUSIVE', 'SCAM_FRAUD', 'INCORRECT_CATEGORY'];
    if (!validCategories.includes(category)) {
      await trx.rollback();
      return sendError(res, { code: 'INVALID_CATEGORY' }, 'Invalid report category.', 400);
    }

    const spot = await trx('spots').where({ id: spotId }).first();
    if (!spot) {
      await trx.rollback();
      return sendError(res, { code: 'SPOT_NOT_FOUND' }, 'Target spot not found.', 404);
    }

    // Unique Constraint: reporter can only submit one active report per spot.
    // Conflicting submissions update category, details, and reset status to PENDING
    const reportData = {
      reporter_id: reporterId,
      spot_id: spotId,
      category,
      details: details || null,
      ip_address: ipAddress,
      status: 'PENDING',
      updated_at: trx.fn.now()
    };

    let report;
    const existing = await trx('reports').where({ reporter_id: reporterId, spot_id: spotId }).first();
    if (existing) {
      await trx('reports')
        .where({ id: existing.id })
        .update(reportData);
      report = await trx('reports').where({ id: existing.id }).first();
    } else {
      const [inserted] = await trx('reports').insert({
        ...reportData,
        created_at: trx.fn.now()
      }).returning('*');
      report = inserted;
    }

    // Authoritative trust recalculation for this spot
    await ModerationService.recalculateTrustScore(spotId, 'spot', trx);

    await trx.commit();

    await logAudit({
      req,
      actorId: reporterId,
      action: 'SPOT_REPORTED',
      severity: 'INFO',
      metadata: { spotId, category }
    });

    return sendSuccess(res, report, 'Report submitted successfully.', 201);
  } catch (err) {
    await trx.rollback();
    logger.error('SUBMIT_REPORT_FAILED', err);
    return sendError(res, { code: 'DATABASE_ERROR' }, 'Internal database error during report submission.', 500);
  }
};

export const submitAppeal = async (req, res) => {
  try {
    const { spotId, details } = req.body;
    const userId = req.user.id;

    if (!spotId || !details) {
      return sendError(res, { code: 'INVALID_INPUT' }, 'spotId and details are required.', 400);
    }

    const spot = await db('spots').where({ id: spotId }).first();
    if (!spot) {
      return sendError(res, { code: 'SPOT_NOT_FOUND' }, 'Spot not found.', 404);
    }

    const [appeal] = await db('moderation_appeals')
      .insert({
        spot_id: spotId,
        user_id: userId,
        details,
        status: 'PENDING',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      })
      .returning('*');

    await logAudit({
      req,
      actorId: userId,
      action: 'SPOT_APPEAL_SUBMITTED',
      severity: 'INFO',
      metadata: { spotId, appealId: appeal.id }
    });

    return sendSuccess(res, appeal, 'Appeal submitted successfully.', 201);
  } catch (err) {
    logger.error('SUBMIT_APPEAL_FAILED', err);
    return sendError(res, { code: 'DATABASE_ERROR' }, 'Internal database error during appeal submission.', 500);
  }
};

export const resolveReport = async (req, res) => {
  const trx = await db.transaction();
  try {
    const { reportId } = req.params;
    const { action, reason } = req.body;
    const moderatorId = req.user.id;

    if (!action || !reason) {
      await trx.rollback();
      return sendError(res, { code: 'INVALID_INPUT' }, 'action and reason are required.', 400);
    }

    const report = await trx('reports').where({ id: reportId }).first();
    if (!report) {
      await trx.rollback();
      return sendError(res, { code: 'REPORT_NOT_FOUND' }, 'Report not found.', 404);
    }

    const nextStatus = action === 'CONFIRM' ? 'RESOLVED' : 'DISMISSED';

    await trx('reports')
      .where({ id: reportId })
      .update({
        status: nextStatus,
        updated_at: trx.fn.now()
      });

    // Authoritative trust updates on both the spot and reporter
    await ModerationService.recalculateTrustScore(report.spot_id, 'spot', trx);
    await ModerationService.recalculateTrustScore(report.reporter_id, 'user', trx);

    await trx.commit();

    await logAudit({
      req,
      actorId: moderatorId,
      action: `REPORT_${nextStatus}`,
      severity: 'INFO',
      metadata: { reportId, spotId: report.spot_id, reporterId: report.reporter_id, reason }
    });

    return sendSuccess(res, null, `Report has been successfully ${nextStatus.toLowerCase()}.`, 200);
  } catch (err) {
    await trx.rollback();
    logger.error('RESOLVE_REPORT_FAILED', err);
    return sendError(res, { code: 'DATABASE_ERROR' }, 'Internal database error during report resolution.', 500);
  }
};

export const moderatorAction = async (req, res) => {
  const trx = await db.transaction();
  try {
    const { spotId } = req.params;
    const { action, reason, notes } = req.body;
    const moderatorId = req.user.id;

    if (!action || !reason) {
      await trx.rollback();
      return sendError(res, { code: 'INVALID_INPUT' }, 'action and reason are required.', 400);
    }

    const validActions = ['SUSPEND', 'APPROVE', 'QUARANTINE'];
    if (!validActions.includes(action)) {
      await trx.rollback();
      return sendError(res, { code: 'INVALID_ACTION' }, 'Invalid action.', 400);
    }

    const spot = await trx('spots').where({ id: spotId }).first();
    if (!spot) {
      await trx.rollback();
      return sendError(res, { code: 'SPOT_NOT_FOUND' }, 'Spot not found.', 404);
    }

    const statusMap = {
      SUSPEND: 'SUSPENDED',
      APPROVE: 'APPROVED',
      QUARANTINE: 'QUARANTINED'
    };

    const nextStatus = statusMap[action];

    await trx('spots')
      .where({ id: spotId })
      .update({
        moderation_status: nextStatus,
        quarantined_at: nextStatus === 'QUARANTINED' ? trx.fn.now() : null
      });

    await trx('spot_moderation_history').insert({
      spot_id: spotId,
      moderator_id: moderatorId,
      action,
      reason,
      notes: notes || null,
      created_at: trx.fn.now()
    });

    // Authoritative creator user score recalculation if exists
    if (spot.creator_id) {
      await ModerationService.recalculateTrustScore(spot.creator_id, 'user', trx);
      const creator = await trx('users').where({ id: spot.creator_id }).first();
      if (creator) {
        await NotificationService.sendNotification({
          userId: creator.id,
          channel: 'email',
          category: 'account',
          target: creator.email,
          templateId: 'spot_moderated',
          payload: { spotTitle: spot.title, action: nextStatus, reason, notes: notes || '' }
        }, trx);
      }
    }

    await trx.commit();

    await logAudit({
      req,
      actorId: moderatorId,
      action: `SPOT_${nextStatus}`,
      severity: 'INFO',
      metadata: { spotId, action, reason }
    });

    return sendSuccess(res, null, `Spot has been successfully ${nextStatus.toLowerCase()}.`, 200);
  } catch (err) {
    await trx.rollback();
    logger.error('MODERATOR_ACTION_FAILED', err);
    return sendError(res, { code: 'DATABASE_ERROR' }, 'Internal database error during moderator action.', 500);
  }
};

export const resolveAppeal = async (req, res) => {
  const trx = await db.transaction();
  try {
    const { appealId } = req.params;
    const { action, reason } = req.body;
    const moderatorId = req.user.id;

    if (!action || !reason) {
      await trx.rollback();
      return sendError(res, { code: 'INVALID_INPUT' }, 'action and reason are required.', 400);
    }

    const appeal = await trx('moderation_appeals').where({ id: appealId }).first();
    if (!appeal) {
      await trx.rollback();
      return sendError(res, { code: 'APPEAL_NOT_FOUND' }, 'Appeal not found.', 404);
    }

    const nextStatus = action === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    await trx('moderation_appeals')
      .where({ id: appealId })
      .update({
        status: nextStatus,
        updated_at: trx.fn.now()
      });

    if (action === 'APPROVED') {
      const spot = await trx('spots').where({ id: appeal.spot_id }).first();

      // Restore spot status and reset spot trust
      await trx('spots')
        .where({ id: appeal.spot_id })
        .update({
          moderation_status: 'APPROVED',
          trust_score: 1.0,
          quarantined_at: null
        });

      // Mark associated reports on this spot as RESOLVED
      await trx('reports')
        .where({ spot_id: appeal.spot_id, status: 'PENDING' })
        .update({
          status: 'RESOLVED',
          updated_at: trx.fn.now()
        });

      // Log appeal success in spot history
      await trx('spot_moderation_history').insert({
        spot_id: appeal.spot_id,
        moderator_id: moderatorId,
        action: 'APPEAL_APPROVED',
        reason: `Appeal approved: ${reason}`
      });

      // Recalculate creator trust score with immediate recovery boost
      if (spot?.creator_id) {
        const creator = await trx('users').where({ id: spot.creator_id }).first();
        if (creator) {
          const newTrust = Math.min(1.0, creator.trust_score + 0.15);
          await trx('users')
            .where({ id: spot.creator_id })
            .update({ trust_score: newTrust });
        }
      }
    } else {
      await trx('spot_moderation_history').insert({
        spot_id: appeal.spot_id,
        moderator_id: moderatorId,
        action: 'APPEAL_REJECTED',
        reason: `Appeal rejected: ${reason}`
      });
    }

    const appellant = await trx('users').where({ id: appeal.user_id }).first();
    const spotForEmail = await trx('spots').where({ id: appeal.spot_id }).first();
    if (appellant && spotForEmail) {
      await NotificationService.sendNotification({
        userId: appellant.id,
        channel: 'email',
        category: 'account',
        target: appellant.email,
        templateId: 'appeal_resolved',
        payload: { spotTitle: spotForEmail.title, action: nextStatus, reason }
      }, trx);
    }

    await trx.commit();

    await logAudit({
      req,
      actorId: moderatorId,
      action: `APPEAL_${nextStatus}`,
      severity: 'INFO',
      metadata: { appealId, spotId: appeal.spot_id, userId: appeal.user_id, reason }
    });

    return sendSuccess(res, null, `Appeal has been successfully ${nextStatus.toLowerCase()}.`, 200);
  } catch (err) {
    await trx.rollback();
    logger.error('RESOLVE_APPEAL_FAILED', err);
    return sendError(res, { code: 'DATABASE_ERROR' }, 'Internal database error during appeal resolution.', 500);
  }
};

export const getModerationQueue = async (req, res) => {
  try {
    const { limit, offset, page } = buildPaginationClause(req.query);

    const query = db('spots')
      .select('spots.*')
      .leftJoin('reports', 'reports.spot_id', 'spots.id')
      .select(db.raw(`
        COALESCE(SUM(
          CASE 
            WHEN reports.status = 'PENDING' AND reports.category = 'SCAM_FRAUD' THEN 1.0
            WHEN reports.status = 'PENDING' AND reports.category = 'ABUSIVE' THEN 0.8
            WHEN reports.status = 'PENDING' AND reports.category = 'FAKE_LISTING' THEN 0.6
            WHEN reports.status = 'PENDING' AND reports.category = 'SPAM' THEN 0.4
            WHEN reports.status = 'PENDING' AND reports.category = 'INCORRECT_CATEGORY' THEN 0.2
            WHEN reports.status = 'PENDING' AND reports.category = 'DUPLICATE' THEN 0.2
            ELSE 0.0
          END
        ), 0.0) as priority_score
      `))
      .where('spots.moderation_status', 'QUARANTINED')
      .orWhere('reports.status', 'PENDING')
      .groupBy('spots.id');

    const countQuery = db.from(query.clone().as('q')).count('* as total').first();
    
    const [countResult, queue] = await Promise.all([
      countQuery,
      query.clone()
        .orderBy('priority_score', 'desc')
        .orderBy('spots.created_at', 'desc')
        .limit(limit)
        .offset(offset)
    ]);

    return sendSuccess(res, { total: Number(countResult?.total || 0), limit, page, queue }, 'Moderation queue retrieved successfully.');
  } catch (err) {
    logger.error('GET_MODERATION_QUEUE_FAILED', err);
    return sendError(res, { code: 'DATABASE_ERROR' }, 'Internal database error fetching moderation queue.', 500);
  }
};

export const getAdminReports = async (req, res) => {
  try {
    const { limit, offset, page } = buildPaginationClause(req.query);
    const { column, order } = buildSortClause(req.query, 'created_at', 'desc', ['created_at', 'status']);
    
    const query = db('reports')
      .join('users as reporter', 'reports.reporter_id', 'reporter.id')
      .join('spots', 'reports.spot_id', 'spots.id')
      .select('reports.*', 'reporter.email as reporter_email', 'spots.name as spot_title');
      
    if (req.query.status) query.where('reports.status', req.query.status);
    
    const countQuery = query.clone().clearSelect().count('* as total').first();
    const [countResult, reports] = await Promise.all([
      countQuery,
      query.clone().orderBy(column === 'created_at' ? 'reports.created_at' : `reports.${column}`, order).limit(limit).offset(offset)
    ]);
    
    return sendSuccess(res, { total: Number(countResult?.total || 0), limit, page, reports }, 'Reports retrieved.');
  } catch (err) {
    logger.error('GET_ADMIN_REPORTS_FAILED', err);
    return sendError(res, { code: 'DATABASE_ERROR' }, 'Error fetching reports.', 500);
  }
};

export const getAdminAppeals = async (req, res) => {
  try {
    const { limit, offset, page } = buildPaginationClause(req.query);
    const { column, order } = buildSortClause(req.query, 'created_at', 'desc', ['created_at', 'status']);
    
    const query = db('moderation_appeals')
      .join('users as appellant', 'moderation_appeals.user_id', 'appellant.id')
      .join('spots', 'moderation_appeals.spot_id', 'spots.id')
      .select('moderation_appeals.*', 'appellant.email as appellant_email', 'spots.name as spot_title');
      
    if (req.query.status) query.where('moderation_appeals.status', req.query.status);
    
    const countQuery = query.clone().clearSelect().count('* as total').first();
    const [countResult, appeals] = await Promise.all([
      countQuery,
      query.clone().orderBy(column === 'created_at' ? 'moderation_appeals.created_at' : `moderation_appeals.${column}`, order).limit(limit).offset(offset)
    ]);
    
    return sendSuccess(res, { total: Number(countResult?.total || 0), limit, page, appeals }, 'Appeals retrieved.');
  } catch (err) {
    logger.error('GET_ADMIN_APPEALS_FAILED', err);
    return sendError(res, { code: 'DATABASE_ERROR' }, 'Error fetching appeals.', 500);
  }
};
