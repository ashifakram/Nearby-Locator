import React, { forwardRef } from 'react';

/**
 * Form Group container helper
 */
export function FormGroup({ children, className = '', ...props }) {
  return (
    <div className={`space-y-1.5 ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Form Label
 */
export function Label({ children, htmlFor, required = false, className = '', ...props }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block font-sans text-xs font-semibold uppercase tracking-wider text-slate-700 ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-rose-500 ml-1">*</span>}
    </label>
  );
}

/**
 * Form Error Message
 */
export function ErrorMessage({ message, className = '' }) {
  if (!message) return null;
  return (
    <p className={`font-sans text-xs text-rose-600 font-medium leading-normal flex items-center gap-1 ${className}`}>
      <span>⚠️</span> {message}
    </p>
  );
}

/**
 * Shared Input component
 */
export const Input = forwardRef(function Input(
  {
    type = 'text',
    error = null,
    leftIcon: LeftIcon = null,
    rightIcon: RightIcon = null,
    className = '',
    isDisabled = false,
    ...props
  },
  ref
) {
  const borderClasses = error
    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/20';

  return (
    <div className="relative w-full">
      {LeftIcon && (
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <LeftIcon className="w-4 h-4" />
        </div>
      )}
      <input
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-slate-900 text-sm placeholder:text-slate-400 font-sans transition-all focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
          LeftIcon ? 'pl-10' : ''
        } ${RightIcon ? 'pr-10' : ''} ${borderClasses} ${className}`}
        {...props}
      />
      {RightIcon && (
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
          <RightIcon className="w-4 h-4" />
        </div>
      )}
    </div>
  );
});

/**
 * Shared Textarea component
 */
export const Textarea = forwardRef(function Textarea(
  { error = null, rows = 4, className = '', isDisabled = false, ...props },
  ref
) {
  const borderClasses = error
    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/20';

  return (
    <textarea
      ref={ref}
      rows={rows}
      disabled={isDisabled}
      className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-slate-900 text-sm placeholder:text-slate-400 font-sans transition-all focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:cursor-not-allowed ${borderClasses} ${className}`}
      {...props}
    />
  );
});

/**
 * Shared Select component
 */
export const Select = forwardRef(function Select(
  { options = [], error = null, className = '', isDisabled = false, children, ...props },
  ref
) {
  const borderClasses = error
    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/20';

  return (
    <select
      ref={ref}
      disabled={isDisabled}
      className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-slate-900 text-sm font-sans transition-all focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:cursor-not-allowed ${borderClasses} ${className}`}
      {...props}
    >
      {children ||
        options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
    </select>
  );
});

/**
 * Shared Checkbox component
 */
export const Checkbox = forwardRef(function Checkbox(
  { label, error = null, className = '', ...props },
  ref
) {
  return (
    <label className={`inline-flex items-center gap-2.5 cursor-pointer font-sans text-sm text-slate-700 ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
        {...props}
      />
      {label && <span>{label}</span>}
    </label>
  );
});
