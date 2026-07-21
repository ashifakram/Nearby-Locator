import { sendError } from './responseFormatter.js';

/**
 * Middleware ensuring that the user has elevated "sudo" status.
 * Sudo status is verified out-of-band and stored inside the active session context.
 */
export const sudoConfirm = (req, res, next) => {
  if (!req.user || !req.user.isSudo) {
    return sendError(res, { code: 'SUDO_REQUIRED' }, 'Step-up authentication required', 403);
  }
  next();
};
