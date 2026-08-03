import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, KeyRound, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../../services/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { normalizeError } from '../../utils/errors';
import OTPInput from '../../components/auth/OTPInput';
import CountdownTimer from '../../components/auth/CountdownTimer';
import PasswordStrengthIndicator from '../../components/auth/PasswordStrengthIndicator';
import FormMessage from '../../components/auth/FormMessage';
import {
  AuthCard,
  AuthPageTitle,
  AuthFooter,
  AuthLink,
  AuthSubmitButton,
  AuthFloatingInput,
  AuthInputWrapper,
  PasswordToggleButton,
} from '../../components/auth/AuthComponents';

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const triggerNavigation = useAuthStore((state) => state.triggerNavigation);

  const [email, setEmail] = useState(location.state?.email || '');
  const [stage, setStage] = useState('otp'); // 'otp' | 'new_password'
  const [otpCode, setOtpCode] = useState('');
  const [resetGrantToken, setResetGrantToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [resendCooling, setResendCooling] = useState(true);
  const [cooldownTimer, setCooldownTimer] = useState(60);

  const otpInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const isConfirmTyped = Boolean(confirmPassword && confirmPassword.length > 0);
  const isPasswordMatch = isConfirmTyped && confirmPassword === newPassword;
  const isPasswordMismatch = isConfirmTyped && confirmPassword !== newPassword;

  // ── Verify the 6-digit OTP ─────────────────────────────────────────────
  const handleVerifyOtp = useCallback(async (codeToVerify) => {
    if (submitting) return;
    const code = codeToVerify || otpCode;
    if (!code || code.length < 6) {
      setErrorMessage('Please enter all 6 digits of your reset code.');
      return;
    }
    if (!email) {
      setErrorMessage('Please provide your account email address.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setResendSuccess('');
    abortControllerRef.current = new AbortController();

    try {
      const res = await authService.verifyPasswordResetOtp(email, code, abortControllerRef.current.signal);
      const token = res.resetGrantToken || res.data?.resetGrantToken;
      if (!token) throw new Error('Invalid server response — missing grant token.');
      setResetGrantToken(token);
      setStage('new_password');
    } catch (err) {
      if (err.name === 'CanceledError') return;
      const code = err.code;

      if (code === 'OTP_INVALID') {
        otpInputRef.current?.clear();
        setErrorMessage('Incorrect code. Please try again.');
      } else if (code === 'OTP_EXPIRED' || code === 'OTP_CONSUMED') {
        otpInputRef.current?.clear();
        setErrorMessage('Code expired or already used. Please request a new one.');
        setCooldownTimer(0);
        setResendCooling(false);
      } else if (code === 'MAX_ATTEMPTS') {
        triggerNavigation('/account-locked');
      } else if (code === 'OTP_THROTTLED') {
        const retryAfter = err.response?.headers?.['retry-after'];
        const delay = retryAfter ? parseInt(retryAfter, 10) : 60;
        setResendCooling(true);
        setCooldownTimer(delay);
        setErrorMessage(`Too many attempts. Please wait ${delay} seconds before trying again.`);
      } else {
        setErrorMessage(normalizeError(err));
      }
    } finally {
      setSubmitting(false);
    }
  }, [email, otpCode, submitting, triggerNavigation]);

  // ── Resend the reset code ──────────────────────────────────────────────
  const handleResend = useCallback(async () => {
    if (!email || resendCooling || resending) return;
    setResending(true);
    setErrorMessage('');
    setResendSuccess('');
    abortControllerRef.current = new AbortController();

    try {
      await authService.requestPasswordReset(email, abortControllerRef.current.signal);
      setResendSuccess('A new 6-digit reset code has been sent to your email.');
      setCooldownTimer(60);
      setResendCooling(true);
      setOtpCode('');
      otpInputRef.current?.clear();
    } catch (err) {
      if (err.name === 'CanceledError') return;
      const code = err.code;

      if (code === 'DELIVERY_FAILURE') {
        triggerNavigation('/email-delivery-failed');
      } else if (code === 'OTP_THROTTLED') {
        const retryAfter = err.response?.headers?.['retry-after'];
        const delay = retryAfter ? parseInt(retryAfter, 10) : 60;
        setResendCooling(true);
        setCooldownTimer(delay);
        setErrorMessage(`Please wait ${delay} seconds before requesting a new code.`);
      } else {
        setErrorMessage(normalizeError(err));
      }
    } finally {
      setResending(false);
    }
  }, [email, resendCooling, resending, triggerNavigation]);

  // ── Set new password ───────────────────────────────────────────────────
  const handleResetPassword = useCallback(async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    abortControllerRef.current = new AbortController();

    try {
      await authService.resetPasswordWithGrantToken(email, resetGrantToken, newPassword, abortControllerRef.current.signal);
      navigate('/reset-password-success', { replace: true });
    } catch (err) {
      if (err.name === 'CanceledError') return;
      const code = err.code;

      if (code === 'GRANT_EXPIRED' || code === 'GRANT_CONSUMED' || code === 'GRANT_INVALID') {
        setErrorMessage('Your password reset session has expired. Please request a new code.');
        setResetGrantToken('');
        setStage('otp');
        setOtpCode('');
        setCooldownTimer(0);
        setResendCooling(false);
      } else if (code === 'VALIDATION_FAILED') {
        setErrorMessage('Password does not meet the security requirements.');
      } else {
        setErrorMessage(normalizeError(err));
      }
    } finally {
      setSubmitting(false);
    }
  }, [email, resetGrantToken, newPassword, confirmPassword, submitting, navigate]);

  return (
    <>
      <AuthCard>
        {stage === 'otp' ? (
          <>
            <AuthPageTitle
              title="Verify Reset Code"
              icon={KeyRound}
              subtitle={
                email
                  ? `Enter the 6-digit code sent to ${email}`
                  : 'Enter your email and the 6-digit code below.'
              }
            />

            {resendSuccess && <FormMessage type="success" message={resendSuccess} />}
            {errorMessage && <FormMessage type="error" message={errorMessage} />}

            <div className="space-y-4">
              {/* Email field — only when not provided via navigation state */}
              {!email && (
                <div className="space-y-1.5">
                  <label htmlFor="reset-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Account Email
                  </label>
                  <AuthInputWrapper>
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-[50px] w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none rounded-xl font-sans pl-10 pr-4"
                    />
                  </AuthInputWrapper>
                </div>
              )}

              {/* OTP input */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 text-center mb-1">
                  6-Digit Reset Code
                </p>
                <OTPInput
                  ref={otpInputRef}
                  length={6}
                  disabled={submitting}
                  onComplete={(code) => {
                    setOtpCode(code);
                    handleVerifyOtp(code);
                  }}
                />
              </div>

              {/* Resend section with countdown */}
              <div className="text-center" aria-live="polite">
                {resendCooling ? (
                  <CountdownTimer
                    key={cooldownTimer}
                    initialSeconds={cooldownTimer}
                    onTimerEnd={() => setResendCooling(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-60 transition-colors"
                  >
                    {resending ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                        Sending…
                      </span>
                    ) : (
                      "Didn't receive a code? Resend"
                    )}
                  </button>
                )}
              </div>

              <AuthSubmitButton
                type="button"
                isLoading={submitting}
                loadingLabel="Verifying code…"
                disabled={submitting || otpCode.length < 6}
                onClick={() => handleVerifyOtp()}
              >
                <span>Verify Code</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </AuthSubmitButton>
            </div>
          </>
        ) : (
          <>
            <AuthPageTitle
              title="Set New Password"
              icon={Lock}
              subtitle="Choose a strong password for your account."
            />

            {errorMessage && <FormMessage type="error" message={errorMessage} />}

            <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
              <div>
                <AuthFloatingInput
                  id="new-password"
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  leftIcon={Lock}
                  disabled={submitting}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  rightSlot={
                    <PasswordToggleButton
                      show={showPassword}
                      onToggle={() => setShowPassword((v) => !v)}
                    />
                  }
                />
                <PasswordStrengthIndicator password={newPassword} />
              </div>

              <div>
                <AuthFloatingInput
                  id="confirm-password"
                  label="Confirm New Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  leftIcon={Lock}
                  disabled={submitting}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  rightSlot={
                    <div className="flex items-center gap-1.5">
                      <AnimatePresence mode="wait">
                        {isPasswordMatch && (
                          <motion.div
                            key="match-icon"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="text-emerald-500"
                            title="Passwords match"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </motion.div>
                        )}
                        {isPasswordMismatch && (
                          <motion.div
                            key="mismatch-icon"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="text-rose-500"
                            title="Passwords do not match"
                          >
                            <XCircle className="w-4 h-4" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <PasswordToggleButton
                        show={showPassword}
                        onToggle={() => setShowPassword((v) => !v)}
                      />
                    </div>
                  }
                />

                {/* Live Password Match / Mismatch Feedback Badge */}
                {isConfirmTyped && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1.5 px-1 text-xs font-semibold"
                  >
                    {isPasswordMatch ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Passwords match
                      </span>
                    ) : (
                      <span className="text-rose-600 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Passwords do not match
                      </span>
                    )}
                  </motion.div>
                )}
              </div>

              <AuthSubmitButton isLoading={submitting} loadingLabel="Updating password…">
                <span>Reset Password</span>
                <CheckCircle className="w-4 h-4" />
              </AuthSubmitButton>
            </form>
          </>
        )}
      </AuthCard>

      <AuthFooter>
        Back to{' '}
        <AuthLink onClick={() => navigate('/login')}>Sign In</AuthLink>
      </AuthFooter>
    </>
  );
}
