import { contactService } from '../services/contactService.js';

// ─── Public Endpoints ─────────────────────────────────────────────────────────

/**
 * POST /api/contact/submit
 * Public — no auth required
 */
export async function submitContact(req, res) {
  const { name, email, category, subject, message } = req.body;

  if (!name || !email || !category || !subject || !message) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const result = await contactService.submit({
    name,
    email,
    category,
    subject,
    message,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  });

  if (!result.success) {
    return res.status(422).json({ success: false, message: result.message, code: result.code });
  }

  return res.status(201).json({
    success: true,
    ticket_id: result.ticket_id,
    message: result.message,
  });
}

// ─── Admin Endpoints ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/contact/submissions
 * Admin — list all submissions with pagination + filters
 */
export async function listSubmissions(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const { status, category, search, sortBy, sortDir } = req.query;

  const result = await contactService.list({ page, limit, status, category, search, sortBy, sortDir });
  return res.status(200).json({ success: true, ...result });
}

/**
 * GET /api/admin/contact/submissions/:id
 * Admin — get full submission details
 */
export async function getSubmission(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false, message: 'Invalid ID.' });
  const submission = await contactService.getDetail(id);
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });
  return res.status(200).json({ success: true, data: submission });
}

/**
 * PATCH /api/admin/contact/submissions/:id
 * Admin — update status, priority, assigned_to, admin_notes
 */
export async function updateSubmission(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false, message: 'Invalid ID.' });
  const { status, priority, assigned_to, admin_notes } = req.body;
  const result = await contactService.update(id, { status, priority, assigned_to, admin_notes });
  if (!result.success) return res.status(404).json(result);
  return res.status(200).json({ success: true, data: result.data });
}

/**
 * GET /api/admin/contact/stats
 * Admin — summary stats
 */
export async function getContactStats(req, res) {
  const stats = await contactService.getStats();
  return res.status(200).json({ success: true, data: stats });
}

/**
 * DELETE /api/admin/contact/submissions/:id
 * Admin — permanently delete a submission
 */
export async function deleteSubmission(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false, message: 'Invalid ID.' });
  await contactService.deleteSubmission(id);
  return res.status(200).json({ success: true, message: 'Submission deleted.' });
}
