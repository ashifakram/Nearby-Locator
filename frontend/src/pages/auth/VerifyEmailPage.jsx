import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useToastStore } from '../../store/useToastStore';
import { normalizeError } from '../../utils/errors';
import LoaderIcon from '../../icons/LoaderIcon';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToastStore();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(true);
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'expired', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resentEmail, setResentEmail] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Verification token is missing.');
      setVerifying(false);
      return;
    }

    const verify = async () => {
      try {
        await authService.verifyEmail(token);
        setStatus('success');
        showToast('Email verified successfully!', 'success');
      } catch (err) {
        const errorDetail = err.response?.data?.error || {};
        const code = errorDetail.code;
        if (code === 'TOKEN_EXPIRED') {
          setStatus('expired');
        } else if (code === 'TOKEN_CONSUMED') {
          // Replay protection friendly message already verified
          setStatus('success');
          showToast('Email already verified.', 'success');
        } else {
          setStatus('error');
          setErrorMessage(errorDetail.message || 'Token verification failed.');
        }
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [token, showToast]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast('Please enter your email address.', 'error');
      return;
    }

    setResending(true);
    try {
      await authService.resendVerification(email);
      showToast('Verification email resent! Please check your inbox.', 'success');
      setResentEmail(true);
      setEmail('');
    } catch (err) {
      const friendlyErr = normalizeError(err);
      showToast(friendlyErr, 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6">
      {status === 'loading' && (
        <div className="text-center py-8 space-y-4">
          <div className="flex justify-center">
            <LoaderIcon width={40} height={40} color="cyan" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Verifying Email</h2>
          <p className="text-sm text-slate-400">Please wait while we secure your account...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center py-6 space-y-5">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 text-emerald-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Email Verified!</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Your email has been successfully verified. Your account is now active and ready.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full h-12 rounded-2xl font-bold btn-primary-spatial transition-all duration-200 mt-4"
          >
            Sign In
          </button>
        </div>
      )}

      {status === 'expired' && (
        <div className="space-y-5 py-2">
          {resentEmail && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-400 text-center">
              ✅ Verification email resent! Please check your inbox.
            </div>
          )}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/30 text-amber-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Link Expired</h2>
            <p className="text-sm text-slate-400">
              The verification link has expired. Enter your email below to request a new link.
            </p>
          </div>

          <form onSubmit={handleResend} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-12 px-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 focus:border-cyan-500 focus:outline-none text-white transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={resending}
              className="w-full h-12 rounded-2xl font-bold btn-primary-spatial transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? (
                <>
                  <LoaderIcon width={20} height={20} color="cyan" />
                  <span>Resending...</span>
                </>
              ) : (
                <span>Request New Link</span>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <button onClick={() => navigate('/login')} className="text-xs text-slate-400 hover:text-white hover:underline transition-colors font-medium">
              Back to Login
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-6 space-y-5">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30 text-red-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Verification Failed</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {errorMessage || 'The verification link is invalid or has expired.'}
          </p>
          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={() => navigate('/signup')}
              className="w-full h-12 rounded-2xl font-bold btn-primary-spatial transition-all duration-200"
            >
              Create Account
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full h-12 rounded-2xl font-semibold bg-slate-900 border border-slate-800 hover:bg-slate-800/60 transition-all text-slate-300"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
