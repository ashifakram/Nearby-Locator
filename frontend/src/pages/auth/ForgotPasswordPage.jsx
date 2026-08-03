import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { Mail, KeyRound, ArrowRight } from 'lucide-react';
import { authService } from '../../services/auth';
import { useToastStore } from '../../store/useToastStore';
import { normalizeError } from '../../utils/errors';
import {
  AuthCard,
  AuthPageTitle,
  AuthFooter,
  AuthLink,
  AuthSubmitButton,
  AuthFloatingInput,
} from '../../components/auth/AuthComponents';

const forgotSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToastStore();
  const [submitted, setSubmitted] = useState(false);
  const abortControllerRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const onSubmit = async (data) => {
    if (submitted) return;
    abortControllerRef.current = new AbortController();

    try {
      await authService.requestPasswordReset(data.email, abortControllerRef.current.signal);
    } catch (err) {
      if (err.name === 'CanceledError') return;
      const code = err.code;

      if (code === 'ACCOUNT_NOT_VERIFIED') {
        showToast(
          "Your account hasn't been verified yet. We've sent you a new verification code.",
          'info'
        );
        navigate('/verify-email', {
          state: {
            email: data.email,
            message: 'A new verification code has been sent to your inbox.',
          },
        });
        return;
      }

      // Absorb identity-related errors silently to prevent user enumeration
      if (!code) {
        showToast(normalizeError(err), 'error');
        return;
      }
    }

    // Unconditional success flow to prevent user enumeration
    showToast('If the account exists, a 6-digit reset OTP has been sent.', 'success');
    setSubmitted(true);
    navigate('/reset-password', { state: { email: data.email } });
  };

  return (
    <>
      <AuthCard>
        <AuthPageTitle
          title="Reset Your Password"
          icon={KeyRound}
          subtitle="Enter your account email to receive a 6-digit verification code."
        />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <AuthFloatingInput
            id="email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            leftIcon={Mail}
            error={errors.email?.message}
            disabled={isSubmitting || submitted}
            {...register('email')}
          />

          <AuthSubmitButton isLoading={isSubmitting} loadingLabel="Sending code…" disabled={submitted}>
            <span>Send Reset Code</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </AuthSubmitButton>
        </form>
      </AuthCard>

      <AuthFooter>
        Remember your password?{' '}
        <AuthLink onClick={() => navigate('/login')}>Sign In</AuthLink>
      </AuthFooter>
    </>
  );
}
