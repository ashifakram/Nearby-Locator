import { newsletterService } from '../services/newsletterService.js';

// ─── Public endpoints ─────────────────────────────────────────────────────────

/**
 * POST /api/newsletter/subscribe
 * Public — no auth required
 */
export async function subscribe(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  const result = await newsletterService.subscribe({
    email,
    source: 'landing_page',
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  });

  if (!result.success) {
    return res.status(422).json({ success: false, message: result.message, code: result.code });
  }

  return res.status(200).json({
    success: true,
    message: result.message,
    code: result.code,
  });
}

/**
 * POST /api/newsletter/unsubscribe
 * Public — called via token from email link
 */
export async function unsubscribe(req, res) {
  const { token } = req.query;
  const result = await newsletterService.unsubscribe(token);
  if (!result.success) {
    return res.status(400).json({ success: false, message: result.message });
  }
  return res.status(200).json({ success: true, message: result.message });
}

// ─── Admin endpoints ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/newsletter/subscribers
 * Admin — requires newsletter.read permission
 */
export async function listSubscribers(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const { status, search, sortBy, sortDir } = req.query;

  const result = await newsletterService.listSubscribers({ page, limit, status, search, sortBy, sortDir });
  return res.status(200).json({ success: true, ...result });
}

/**
 * GET /api/admin/newsletter/stats
 * Admin — requires newsletter.read permission
 */
export async function getStats(req, res) {
  const stats = await newsletterService.getStats();
  return res.status(200).json({ success: true, data: stats });
}

/**
 * GET /api/admin/newsletter/export
 * Admin — requires newsletter.export permission
 * Returns a CSV file download
 */
export async function exportCsv(req, res) {
  const csv = await newsletterService.exportCsv();
  const filename = `newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csv);
}

/**
 * DELETE /api/admin/newsletter/subscribers/:id
 * Admin — requires newsletter.delete permission
 */
export async function deleteSubscriber(req, res) {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Invalid subscriber ID.' });
  }
  await newsletterService.deleteSubscriber(parseInt(id, 10));
  return res.status(200).json({ success: true, message: 'Subscriber deleted.' });
}
