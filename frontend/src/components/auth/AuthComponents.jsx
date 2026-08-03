import React from 'react';
import { motion } from 'framer-motion';

/**
 * AuthCard — shared glass card wrapper for all auth and status pages.
 */
export function AuthCard({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`w-full bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-900/5 space-y-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

/**
 * AuthPageTitle — header title + subtitle + optional icon.
 */
export function AuthPageTitle({ title, subtitle, icon: Icon, className = '' }) {
  return (
    <div className={`text-center space-y-1.5 ${className}`}>
      {Icon && (
        <div className="mx-auto w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-2xs">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-xs text-slate-600 font-sans leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/**
 * AuthDivider — horizontal 'OR' line for login/signup pages.
 */
export function AuthDivider({ text = 'OR' }) {
  return (
    <div className="relative my-4 flex items-center justify-center">
      <div className="w-full border-t border-slate-200" />
      <span className="absolute bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
        {text}
      </span>
    </div>
  );
}

/**
 * AuthFooter — text at bottom of AuthLayout (e.g. "Don't have an account? Create Account").
 */
export function AuthFooter({ children, className = '' }) {
  return (
    <div className={`mt-6 text-center text-xs text-slate-600 font-sans ${className}`}>
      {children}
    </div>
  );
}

/**
 * AuthLink — styled text button or link for switching auth pages.
 */
export function AuthLink({ children, onClick, to, className = '' }) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors ${className}`}
      >
        {children}
      </button>
    );
  }
  return (
    <a
      href={to}
      className={`font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors ${className}`}
    >
      {children}
    </a>
  );
}

/**
 * AuthStatusIcon — large centered icon for status pages.
 */
export function AuthStatusIcon({ type = 'info' }) {
  const configs = {
    success: { color: 'bg-emerald-50 border-emerald-100 text-emerald-600', emoji: '✓', label: 'Success' },
    error:   { color: 'bg-rose-50 border-rose-100 text-rose-600',       emoji: '✕', label: 'Error' },
    warning: { color: 'bg-amber-50 border-amber-100 text-amber-600',    emoji: '⚠', label: 'Warning' },
    expired: { color: 'bg-amber-50 border-amber-100 text-amber-600',    emoji: '⏱', label: 'Expired' },
    locked:  { color: 'bg-rose-50 border-rose-100 text-rose-600',       emoji: '🔒', label: 'Locked' },
    info:    { color: 'bg-blue-50 border-blue-100 text-blue-600',       emoji: 'ℹ', label: 'Info' },
  };
  const cfg = configs[type] || configs.info;
  return (
    <div className="flex justify-center mb-4">
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center border-2 text-3xl font-bold select-none ${cfg.color}`}
        aria-label={cfg.label}
      >
        {cfg.emoji}
      </div>
    </div>
  );
}

/**
 * FormAlert — colored inline alert banner inside a form.
 */
export function FormAlert({ type = 'info', message, children, className = '' }) {
  if (!message && !children) return null;

  const styles = {
    success: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    error:   'bg-rose-50   border-rose-300   text-rose-800',
    warning: 'bg-amber-50  border-amber-300  text-amber-900',
    info:    'bg-blue-50   border-blue-300   text-blue-800',
  };

  return (
    <div
      role="alert"
      className={`mb-4 rounded-xl border px-4 py-3 text-center text-sm font-medium leading-snug ${styles[type] || styles.info} ${className}`}
    >
      {message && <p>{message}</p>}
      {children}
    </div>
  );
}

/**
 * AuthFieldError — single field error below an input.
 */
export function AuthFieldError({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 px-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
      <span aria-hidden="true">⚠</span> {message}
    </p>
  );
}

/**
 * AuthInputWrapper — consistent bordered input container with icon slot.
 */
export function AuthInputWrapper({ error = false, children, className = '' }) {
  return (
    <div
      className={`group relative rounded-xl border bg-white/60 transition-all duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:shadow-xs ${
        error ? 'border-rose-400 ring-1 ring-rose-400/20' : 'border-slate-300'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * AuthFloatingInput — floating label input.
 * Renders a clean standard input with a label above it and a visible placeholder.
 */
export const AuthFloatingInput = React.forwardRef(function AuthFloatingInput(
  {
    id,
    label,
    type = 'text',
    error,
    leftIcon: LeftIcon,
    rightSlot,
    disabled,
    autoComplete,
    placeholder,
    ...props
  },
  ref
) {
  const computedPlaceholder =
    placeholder !== undefined
      ? placeholder
      : type === 'email'
      ? 'you@example.com'
      : type === 'password'
      ? '••••••••'
      : '';

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </label>
      <AuthInputWrapper error={!!error}>
        {LeftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
            <LeftIcon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          id={id}
          type={type}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder={computedPlaceholder}
          className={`h-[50px] w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none rounded-xl font-sans pr-4 disabled:opacity-60 ${
            LeftIcon ? 'pl-10' : 'pl-3.5'
          } ${rightSlot ? 'pr-12' : ''}`}
          {...props}
        />
        {rightSlot && (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
            {rightSlot}
          </div>
        )}
      </AuthInputWrapper>
      {error && <AuthFieldError message={error} />}
    </div>
  );
});

/**
 * AuthSubmitButton — full-width submit/action button.
 */
export function AuthSubmitButton({ children, isLoading, loadingLabel, disabled, type = 'submit', onClick, className = '' }) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`relative group w-full h-[52px] flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none active:scale-[0.98] ${className}`}
    >
      {isLoading ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>{loadingLabel || 'Please wait...'}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * PasswordToggleButton — eye icon button for password visibility.
 */
export function PasswordToggleButton({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors p-1 rounded-lg"
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.05 10.05 0 013.122-.876c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );
}
