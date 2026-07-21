import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useToastStore } from '../../store/useToastStore';
import { normalizeError } from '../../utils/errors';
import LoaderIcon from '../../icons/LoaderIcon';

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number')
      .regex(/[\W_]/, 'Must contain a special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export default function ResetPasswordPage() {
  const { showToast } = useToastStore();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data) => {
    try {
      await authService.resetPassword(token, data.password);
      setSubmitted(true);
      showToast('Password reset successful', 'success');
    } catch (err) {
      const friendlyErr = normalizeError(err);
      showToast(friendlyErr, 'error');
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-500/10">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Invalid Request</h2>
        <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
          The reset link is missing a token. Please click the exact link from your email or request a new one.
        </p>
        <Link
          to="/forgot-password"
          className="inline-block px-6 py-3 w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all font-semibold border border-slate-700"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Password Updated!</h2>
        <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
          Your password has been successfully changed. You can now log in with your new credentials.
        </p>
        <Link
          to="/login"
          className="inline-block px-6 py-3 w-full bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-all font-bold border border-cyan-500 shadow-lg"
        >
          Proceed to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">New Password</h2>
        <p className="text-sm text-slate-400 mt-2">Create a new, strong password</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Password Field */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-300">New Password</label>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            disabled={isSubmitting}
            className={`w-full bg-slate-900/50 border ${
              errors.password ? 'border-red-500' : 'border-slate-800 focus:border-cyan-500'
            } rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all`}
          />
          {errors.password && (
            <p className="text-red-400 text-xs mt-1 ml-1">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-300">Confirm Password</label>
          <input
            {...register('confirmPassword')}
            type="password"
            placeholder="••••••••"
            disabled={isSubmitting}
            className={`w-full bg-slate-900/50 border ${
              errors.confirmPassword ? 'border-red-500' : 'border-slate-800 focus:border-cyan-500'
            } rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all`}
          />
          {errors.confirmPassword && (
            <p className="text-red-400 text-xs mt-1 ml-1">{errors.confirmPassword.message}</p>
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
                Updating...
              </>
            ) : (
              'Change Password'
            )}
          </span>
        </button>
      </form>
    </div>
  );
}
