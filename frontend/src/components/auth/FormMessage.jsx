import React from 'react';

/**
 * FormMessage — colored inline alert banner. Kept for backward compatibility.
 * Prefer importing FormAlert from AuthComponents.jsx for new code.
 */
export default function FormMessage({ type = 'info', message, className = '', children }) {
  if (!message && !children) return null;

  const styles = {
    success: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    error:   'bg-rose-50 border-rose-300 text-rose-800',
    warning: 'bg-amber-50 border-amber-300 text-amber-900',
    info:    'bg-blue-50 border-blue-300 text-blue-800',
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
