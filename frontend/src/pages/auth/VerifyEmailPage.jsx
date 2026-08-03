import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, CheckCheck } from 'lucide-react';
import { authService } from '../../services/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { normalizeError } from '../../utils/errors';
import OTPInput from '../../components/auth/OTPInput';
import CountdownTimer from '../../components/auth/CountdownTimer';
import FormMessage from '../../components/auth/FormMessage';
import {
  AuthCard,
  AuthPageTitle,
  AuthFooter,
  AuthLink,
  AuthSubmitButton,
  AuthInputWrapper,
  AuthFieldError,
} from '../../components/auth/AuthComponents';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const triggerNavigation = useAuthStore((state) => state.triggerNavigation);
  const { showToast } = useToastStore();

  const initialEmail = location.state?.email || '';
  const newlyRegistered = location.state?.newlyRegistered;
  const contextMessage = location.state?.message || '';

  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(60);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(!initialEmail);

  const otpInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (!initialEmail) {
      navigate('/login', { replace: true, state: { message: 'Please start from Login or Signup.' } });
    }
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [initialEmail, navigate]);

  if (!initialEmail) return null;

  const handleVerify = async (codeToVerify) => {
    if (submitting) return;
    const targetCode = codeToVerify || otpCode;
    if (!targetCode || targetCode.length < 6) {
      setErrorMessage('Please enter all 6 digits of your verification code.');
      return;
    }
    if (!email) {
      setErrorMessage('Email address is required.');
      setShowEmailInput(true);
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setResendSuccess('');
    abortControllerRef.current = new AbortController();

    try {
      await authService.verifyEmail(targetCode, email, abortControllerRef.current.signal);
      navigate('/email-verified', { replace: true });
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
        setCanResend(true);
      } else if (code === 'MAX_ATTEMPTS') {
        triggerNavigation('/account-locked');
      } else if (code === 'OTP_THROTTLED') {
        const retryAfter = err.response?.headers?.['retry-after'];
        const delay = retryAfter ? parseInt(retryAfter, 10) : 60;
        setCanResend(false);
        setCooldownTimer(delay);
        setErrorMessage(`Too many attempts. Please wait ${delay} seconds before trying again.`);
      } else {
        setErrorMessage(normalizeError(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resending) return;
    if (!email) {
      setErrorMessage('Please provide your email address to resend the code.');
      setShowEmailInput(true);
      return;
    }

    setResending(true);
    setErrorMessage('');
    setResendSuccess('');
    abortControllerRef.current = new AbortController();

    try {
      await authService.resendVerification(email, abortControllerRef.current.signal);
      setResendSuccess('New 6-digit OTP code sent! Check your inbox.');
      setCooldownTimer(60);
      setCanResend(false);
    } catch (err) {
      if (err.name === 'CanceledError') return;
      const code = err.code;

      if (code === 'DELIVERY_FAILURE') {
        triggerNavigation('/email-delivery-failed');
      } else if (code === 'OTP_THROTTLED') {
        const retryAfter = err.response?.headers?.['retry-after'];
        const delay = retryAfter ? parseInt(retryAfter, 10) : 60;
        setCanResend(false);
        setCooldownTimer(delay);
        setErrorMessage(`Please wait ${delay} seconds before requesting a new code.`);
      } else {
        setErrorMessage(normalizeError(err));
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <AuthCard>
        <AuthPageTitle
          title="Verify Your Email"
          icon={CheckCheck}
          subtitle={
            email
              ? `We sent a 6-digit code to ${email}`
              : 'Enter your email and the 6-digit verification code.'
          }
        />

        {resendSuccess && <FormMessage type="success" message={resendSuccess} />}
        {newlyRegistered && !resendSuccess && (
          <FormMessage type="success" message="Registration successful! Check your inbox for the 6-digit OTP code." />
        )}
        {contextMessage && !newlyRegistered && !resendSuccess && (
          <FormMessage type="info" message={contextMessage} />
        )}
        {errorMessage && <FormMessage type="error" message={errorMessage} />}

        {showEmailInput && (
          <div className="mb-4">
            <label htmlFor="email-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Email address
            </label>
            <AuthInputWrapper>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-[50px] w-full bg-transparent text-sm text-slate-900 outline-none rounded-xl font-sans pl-10 pr-4"
              />
            </AuthInputWrapper>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 text-center mb-1">
              6-Digit Verification Code
            </p>
            <OTPInput
              ref={otpInputRef}
              length={6}
              disabled={submitting}
              onComplete={(code) => {
                setOtpCode(code);
                handleVerify(code);
              }}
            />
          </div>

          <AuthSubmitButton
            type="button"
            isLoading={submitting}
            loadingLabel="Verifying…"
            disabled={submitting || otpCode.length < 6}
            onClick={() => handleVerify()}
          >
            <span>Verify Email</span>
            <CheckCheck className="w-4 h-4" />
          </AuthSubmitButton>

          <div className="mt-4 text-center space-y-2" aria-live="polite">
            {!canResend ? (
              <CountdownTimer
                key={cooldownTimer}
                initialSeconds={cooldownTimer}
                onTimerEnd={() => setCanResend(true)}
              />
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50 transition-colors"
              >
                {resending ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                    Resending…
                  </span>
                ) : (
                  'Resend Verification Code'
                )}
              </button>
            )}

            {email && !showEmailInput && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowEmailInput(true)}
                  className="text-xs text-slate-400 hover:text-blue-600 transition-colors mt-1"
                >
                  Wrong email? Change address
                </button>
              </div>
            )}
          </div>
        </div>
      </AuthCard>

      <AuthFooter>
        Back to{' '}
        <AuthLink onClick={() => navigate('/login')}>Sign In</AuthLink>
      </AuthFooter>
    </>
  );
}
