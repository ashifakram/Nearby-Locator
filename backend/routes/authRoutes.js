import express from 'express';
import { 
  signup, 
  login, 
  refresh, 
  logout, 
  logoutAll, 
  getSessions, 
  requestPasswordReset, 
  verifyPasswordResetOtp,
  resetPassword, 
  changePassword,
  googleUpsert, 
  unlinkProvider,
  verifyEmail,
  resendVerification
} from '../controllers/authController.js';
import { authJwt } from '../middleware/authJwt.js';
import { ipRateLimiter, checkAccountLockout } from '../middleware/rateLimiter.js';
import { authCsrfFailureTotal } from '../utils/metrics.js';

const router = express.Router();

// Custom CSRF Mitigation Header Guard Middleware for cookie-bearing routes
const csrfHeaderGuard = (req, res, next) => {
  const customHeader = req.headers['x-requested-with'];
  const origin = req.headers['origin'] || req.headers['referer'];
  
  if (!customHeader && !origin) {
    authCsrfFailureTotal.inc();
    return res.status(403).json({
      success: false,
      error: { code: 'CSRF_BLOCKED' },
      message: 'Access denied: Custom verification headers missing.'
    });
  }
  next();
};

// Public Routes (Protected by IP Rate Limiter and Account Lockout check gates)
router.post('/signup', ipRateLimiter(60, 60, 'signup'), signup);
router.post('/login', ipRateLimiter(60, 60, 'login'), checkAccountLockout, login);
router.post('/google', ipRateLimiter(60, 60, 'google'), googleUpsert);
router.post('/verify-email', ipRateLimiter(10, 60, 'verifyEmail'), verifyEmail);
router.post('/resend-verification', ipRateLimiter(5, 60, 'resendVerification'), resendVerification);

// Token Rotation & CSRF Protected Rotator (strictly accepts secure cookies only)
router.post('/refresh', ipRateLimiter(120, 60, 'refresh'), csrfHeaderGuard, refresh);

// Password Reset Routes (with sliding-window throttling protection)
router.post('/password/reset-request', ipRateLimiter(5, 60, 'resetReq'), requestPasswordReset);
router.post('/password/verify-otp', ipRateLimiter(10, 60, 'verifyResetOtp'), verifyPasswordResetOtp);
router.post('/password/reset', ipRateLimiter(10, 60, 'reset'), resetPassword);
router.post('/password/change', authJwt, csrfHeaderGuard, changePassword);

// Authenticated Routes (Requires active Bearer Access JWT verification)
router.post('/logout', authJwt, csrfHeaderGuard, logout);
router.post('/logout-all', authJwt, csrfHeaderGuard, logoutAll);
router.get('/sessions', authJwt, getSessions);
router.delete('/providers/:providerName', authJwt, csrfHeaderGuard, unlinkProvider);

export default router;
