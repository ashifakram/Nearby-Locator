import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useToastStore } from '../../store/useToastStore';
import { normalizeError } from '../../utils/errors';
import LoaderIcon from '../../icons/LoaderIcon';

const forgotSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

export default function ForgotPasswordPage() {
  const { showToast } = useToastStore();
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data) => {
    try {
      await authService.requestPasswordReset(data.email);
      setSubmitted(true);
    } catch (err) {
      const friendlyErr = normalizeError(err);
      showToast(friendlyErr, 'error');
    }
  };

  if (submitted) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Check Your Inbox</h2>
        <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
          If an account exists for that email, we've sent a password reset link. Please check your spam folder if you don't see it.
        </p>
        <Link
          to="/login"
          className="inline-block px-6 py-3 w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all font-semibold border border-slate-700"
        >
          Return to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Reset Password</h2>
        <p className="text-sm text-slate-400 mt-2">Enter your email to receive a reset link</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-300">Email Address</label>
          <input
            {...register('email')}
            type="email"
            placeholder="name@example.com"
            disabled={isSubmitting}
            className={`w-full bg-slate-900/50 border ${
              errors.email ? 'border-red-500' : 'border-slate-800 focus:border-cyan-500'
            } rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all`}
          />
          {errors.email && (
            <p className="text-red-400 text-xs mt-1 ml-1">{errors.email.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full relative group overflow-hidden rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-500/50 shadow-[0_0_20px_-5px_rgba(8,179,197,0.4)]"
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          <span className="flex items-center justify-center gap-2 relative z-10">
            {isSubmitting ? (
              <>
                <LoaderIcon className="animate-spin" width={18} height={18} color="#fff" />
                Sending Link...
              </>
            ) : (
              'Send Reset Link'
            )}
          </span>
        </button>
      </form>

      {/* Back to login */}
      <div className="text-center mt-6">
        <p className="text-sm text-slate-400">
          Remember your password?{' '}
          <Link to="/login" className="font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
