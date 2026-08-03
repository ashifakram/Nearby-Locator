import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { authService } from '../../services/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { normalizeError } from '../../utils/errors';
import GoogleLoginButton from '../../components/GoogleLoginButton';
import {
  AuthCard,
  AuthPageTitle,
  AuthDivider,
  AuthFooter,
  AuthLink,
  AuthSubmitButton,
  AuthFloatingInput,
  AuthFieldError,
  FormAlert,
  PasswordToggleButton,
} from '../../components/auth/AuthComponents';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToastStore();
  const triggerNavigation = useAuthStore((state) => state.triggerNavigation);

  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from || '/dashboard';
  const registered = location.state?.registered;


  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    shouldFocusError: true,
  });

  const onSubmit = async (data) => {
    if (isSubmitting) return;
    setUnverifiedEmail('');
    abortControllerRef.current = new AbortController();

    try {
      await authService.login(data.email, data.password, abortControllerRef.current.signal);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.name === 'CanceledError') return;
      const code = err.code;

      if (code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(data.email);
      } else if (code === 'INVALID_CREDENTIALS') {
        setValue('password', '');
        setError('password', { message: 'Invalid credentials. Please try again.' });
        setFocus('password');
      } else if (code === 'OAUTH_ONLY_ACCOUNT') {
        setValue('password', '');
        setError('password', { message: "This account uses Google Sign-In. Please click 'Continue with Google'." });
        setFocus('password');
      } else if (code === 'ACCOUNT_LOCKED') {
        triggerNavigation('/account-locked');
      } else if (code === 'ACCOUNT_DISABLED') {
        triggerNavigation('/account-disabled');
      } else if (code === 'ACCOUNT_BANNED') {
        triggerNavigation('/forbidden');
      } else {
        showToast(normalizeError(err), 'error');
      }
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      await authService.resendVerification(unverifiedEmail);
      showToast('Verification email resent! Please check your inbox.', 'success');
      navigate('/verify-email', { state: { email: unverifiedEmail } });
    } catch (err) {
      showToast(normalizeError(err), 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <AuthCard>
        <AuthPageTitle
          title="Welcome Back"
          subtitle="Sign in to explore your city with AI."
        />

        {registered && (
          <FormAlert type="success">
            Account created. Check your email to verify before logging in.
          </FormAlert>
        )}

        {unverifiedEmail && (
          <FormAlert type="warning">
            <p>Your account is not verified yet.</p>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className="mt-1.5 text-xs font-bold text-blue-600 hover:underline disabled:opacity-50 transition-colors"
            >
              {resending ? 'Resending…' : 'Resend Verification Email'}
            </button>
          </FormAlert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <AuthFloatingInput
            id="email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="username"
            leftIcon={Mail}
            error={errors.email?.message}
            disabled={isSubmitting}
            {...register('email')}
          />

          <div className="space-y-1">
            <AuthFloatingInput
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              leftIcon={Lock}
              error={errors.password?.message}
              disabled={isSubmitting}
              rightSlot={
                <PasswordToggleButton
                  show={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                />
              }
              {...register('password')}
            />
            <div className="flex justify-end pt-0.5">
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <AuthSubmitButton isLoading={isSubmitting} loadingLabel="Authenticating…">
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </AuthSubmitButton>

          <AuthDivider />

          <div className="flex flex-col gap-3">
            <GoogleLoginButton variant="minimal" label="Continue with Google" />
          </div>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <p className="text-[11px] font-semibold">Your data stays private and secure.</p>
        </div>
      </AuthCard>

      <AuthFooter>
        Don't have an account?{' '}
        <AuthLink onClick={() => navigate('/signup')}>Create Account</AuthLink>
      </AuthFooter>
    </>
  );
}
