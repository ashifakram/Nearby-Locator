import React from 'react';

export function SettingsCard({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs rounded-2xl p-6 space-y-4 ${className}`}>
      {children}
    </div>
  );
}

export function SettingsSection({ title, description, children, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {(title || description) && (
        <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
          {title && <h4 className="text-sm font-heading font-bold text-slate-900 dark:text-slate-100">{title}</h4>}
          {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

export function SettingsRow({ label, description, children, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-slate-100/80 dark:border-slate-800/50 last:border-0 ${className}`}>
      <div className="space-y-0.5 max-w-md">
        <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">{label}</label>
        {description && <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsSwitch({ checked, onChange, disabled = false, ariaLabel = 'Toggle setting' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
        checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function SettingsDangerCard({ title, description, children, className = '' }) {
  return (
    <div className={`bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 shadow-xs rounded-2xl p-6 space-y-4 ${className}`}>
      {(title || description) && (
        <div className="border-b border-rose-100 dark:border-rose-900/40 pb-3">
          {title && <h4 className="text-sm font-heading font-bold text-rose-700 dark:text-rose-400">{title}</h4>}
          {description && <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
