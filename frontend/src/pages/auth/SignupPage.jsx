import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useToastStore } from '../../store/useToastStore';
import { normalizeError } from '../../utils/errors';
import LoaderIcon from '../../icons/LoaderIcon';
import GoogleLoginButton from '../../components/GoogleLoginButton';

// Zod validation schema for signup (Problem 6 Form Architecture)
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function SignupPage() {
  const navigate = useNavigate();
  const { showToast } = useToastStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      await authService.signup(data.name, data.email, data.password);
      showToast('Account created! Please check your email to verify your account.', 'success');
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      const friendlyErr = normalizeError(err);
      showToast(friendlyErr, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Get Started</h2>
        <p className="text-sm text-slate-400 mt-2">Create an account to explore premium spots</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name Field */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-300">Full Name</label>
          <input
            type="text"
            placeholder="John Doe"
            disabled={isSubmitting}
            {...register('name')}
            className={`w-full rounded-2xl px-4 py-3 bg-slate-800/40 border focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 ${
              errors.name ? 'border-red-500/50' : 'border-slate-850'
            } text-white`}
          />
          {errors.name && (
            <span className="text-xs text-red-400 font-semibold px-2">{errors.name.message}</span>
          )}
        </div>

        {/* Email Field */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-300">Email Address</label>
          <input
            type="email"
            placeholder="name@example.com"
            disabled={isSubmitting}
            {...register('email')}
            className={`w-full rounded-2xl px-4 py-3 bg-slate-800/40 border focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 ${
              errors.email ? 'border-red-500/50' : 'border-slate-850'
            } text-white`}
          />
          {errors.email && (
            <span className="text-xs text-red-400 font-semibold px-2">{errors.email.message}</span>
          )}
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-300">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            disabled={isSubmitting}
            {...register('password')}
            className={`w-full rounded-2xl px-4 py-3 bg-slate-800/40 border focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 ${
              errors.password ? 'border-red-500/50' : 'border-slate-850'
            } text-white`}
          />
          {errors.password && (
            <span className="text-xs text-red-400 font-semibold px-2">{errors.password.message}</span>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-2xl font-bold btn-primary-spatial transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
        >
          {isSubmitting ? (
            <>
              <LoaderIcon width={20} height={20} color="cyan" />
              <span>Registering...</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </button>
      </form>

      <div className="relative my-6 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <span className="relative bg-[#0F1322] px-3 text-xs uppercase text-slate-500 font-semibold tracking-wider">
          Or Continue With
        </span>
      </div>

      <GoogleLoginButton />

      <div className="text-center text-sm text-slate-400 mt-6">
        Already have an account?{' '}
        <button
          onClick={() => navigate('/login')}
          className="font-semibold text-cyan-400 hover:underline focus:outline-none"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
