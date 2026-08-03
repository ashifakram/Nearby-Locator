import React from 'react';

/**
 * PasswordStrengthIndicator — visual password strength feedback bar + rule checklist.
 * Shows only when password is non-empty.
 */
export default function PasswordStrengthIndicator({ password = '' }) {
  if (!password) return null;

  const rules = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Contains a number', valid: /[0-9]/.test(password) },
    { label: 'Uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'Special character', valid: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = rules.filter((r) => r.valid).length;

  const strengthConfig = {
    1: { label: 'Weak',   bar: 'bg-rose-500',   text: 'text-rose-600',   width: '25%' },
    2: { label: 'Fair',   bar: 'bg-amber-500',  text: 'text-amber-600',  width: '50%' },
    3: { label: 'Good',   bar: 'bg-blue-500',   text: 'text-blue-600',   width: '75%' },
    4: { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-600', width: '100%' },
  };

  const cfg = strengthConfig[score] || strengthConfig[1];

  return (
    <div className="mt-2 space-y-2 rounded-xl bg-slate-50/80 border border-slate-200 p-3 text-xs">
      {/* Strength label + bar */}
      <div className="flex items-center justify-between font-semibold">
        <span className="text-slate-500">Password strength</span>
        <span className={cfg.text}>{cfg.label}</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full transition-all duration-300 rounded-full ${cfg.bar}`}
          style={{ width: cfg.width }}
        />
      </div>

      {/* Rule checklist */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5">
        {rules.map((rule, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-[11px]">
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                rule.valid ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
              }`}
              aria-hidden="true"
            >
              ✓
            </span>
            <span className={rule.valid ? 'text-slate-700 font-medium' : 'text-slate-400'}>
              {rule.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
