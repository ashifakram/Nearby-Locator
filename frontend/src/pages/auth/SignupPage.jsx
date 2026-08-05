import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../../services/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { normalizeError } from '../../utils/errors';
import GoogleLoginButton from '../../components/GoogleLoginButton';
import PasswordStrengthIndicator from '../../components/auth/PasswordStrengthIndicator';
import {
  AuthCard,
  AuthPageTitle,
  AuthDivider,
  AuthFooter,
  AuthLink,
  AuthSubmitButton,
  AuthFloatingInput,
  FormAlert,
  PasswordToggleButton,
} from '../../components/auth/AuthComponents';

const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export default function SignupPage() {
  const navigate = useNavigate();
  const triggerNavigation = useAuthStore((state) => state.triggerNavigation);
  const { showToast } = useToastStore();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', termsAccepted: false },
    shouldFocusError: true,
  });

  const passwordValue = watch('password');
  const confirmPasswordValue = watch('confirmPassword');

  const isConfirmTyped = Boolean(confirmPasswordValue && confirmPasswordValue.length > 0);
  const isPasswordMatch = isConfirmTyped && confirmPasswordValue === passwordValue;
  const isPasswordMismatch = isConfirmTyped && confirmPasswordValue !== passwordValue;

  const onSubmit = async (data) => {
    if (isSubmitting) return;
    abortControllerRef.current = new AbortController();

    try {
      await authService.signup(data.name, data.email, data.password, data.termsAccepted, abortControllerRef.current.signal);
      navigate('/verify-email', { state: { email: data.email } });
    } catch (err) {
      if (err.name === 'CanceledError') return;
      const code = err.code;
      const status = err.status;

      if (code === 'DUPLICATE_EMAIL') {
        setValue('password', '');
        setValue('confirmPassword', '');
        setError('email', { message: 'Email already exists. Please log in.' });
        setFocus('email');
      } else if (code === 'VALIDATION_FAILED' || status === 400) {
        const backendErrors = err.response?.data?.error?.details || [];
        if (backendErrors.length > 0) {
          backendErrors.forEach((fieldErr) => {
            if (fieldErr.field) setError(fieldErr.field, { message: fieldErr.message });
            else setError('root.serverError', { message: fieldErr.message });
          });
        } else {
          setError('root.serverError', { message: err.message || 'Registration failed due to invalid data.' });
        }
      } else if (code === 'DELIVERY_FAILURE' || status === 500) {
        triggerNavigation('/email-delivery-failed');
      } else {
        showToast(normalizeError(err), 'error');
      }
    }
  };

  return (
    <>
      <AuthCard>
        <AuthPageTitle
          title="Get Started"
          subtitle="Create your account to explore places with AI."
        />

        {errors.root?.serverError && (
          <FormAlert type="error">{errors.root.serverError.message}</FormAlert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <AuthFloatingInput
            id="name"
            label="Full Name"
            type="text"
            placeholder="Jane Doe"
            autoComplete="name"
            leftIcon={User}
            error={errors.name?.message}
            disabled={isSubmitting}
            {...register('name')}
          />

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

          <div>
            <AuthFloatingInput
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              autoComplete="new-password"
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
            <PasswordStrengthIndicator password={passwordValue} />
          </div>

          <div>
            <AuthFloatingInput
              id="confirmPassword"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter password"
              autoComplete="new-password"
              leftIcon={Lock}
              error={errors.confirmPassword?.message}
              disabled={isSubmitting}
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
                    show={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((v) => !v)}
                  />
                </div>
              }
              {...register('confirmPassword')}
            />

            {/* Live Password Match / Mismatch Feedback Badge */}
            {isConfirmTyped && !errors.confirmPassword?.message && (
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

          {/* Terms and Conditions */}
          <div className="flex items-start gap-2.5 pt-1">
            <input
              id="termsAccepted"
              type="checkbox"
              disabled={isSubmitting}
              {...register('termsAccepted')}
              className={`mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer ${
                errors.termsAccepted ? 'border-rose-400' : ''
              }`}
            />
            <div className="text-xs text-slate-600 font-sans leading-relaxed">
              <label htmlFor="termsAccepted" className="cursor-pointer">
                I agree to the{' '}
                <Link to="/terms" className="text-blue-600 hover:underline font-semibold" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-blue-600 hover:underline font-semibold" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </Link>
                .
              </label>
              {errors.termsAccepted && (
                <p role="alert" className="mt-1 text-rose-600 font-semibold">
                  {errors.termsAccepted.message}
                </p>
              )}
            </div>
          </div>

          <AuthSubmitButton isLoading={isSubmitting} loadingLabel="Creating account…" className="mt-2">
            <span>Create Account</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </AuthSubmitButton>

          <AuthDivider />

          <div className="flex flex-col gap-3">
            <GoogleLoginButton variant="minimal" label="Sign up with Google" />
          </div>
        </form>
      </AuthCard>

      <AuthFooter>
        Already have an account?{' '}
        <AuthLink onClick={() => navigate('/login')}>Sign In</AuthLink>
      </AuthFooter>
    </>
  );
}
