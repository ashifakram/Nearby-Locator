import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, Clock, Lock, Info, ArrowRight } from 'lucide-react';
import { AuthCard, AuthStatusIcon, AuthSubmitButton, AuthLink } from './AuthComponents';

const TYPE_CONFIG = {
  success: { Icon: CheckCircle, badge: 'bg-emerald-50 border-emerald-200 text-emerald-600' },
  error:   { Icon: XCircle,     badge: 'bg-rose-50 border-rose-200 text-rose-600' },
  warning: { Icon: AlertTriangle, badge: 'bg-amber-50 border-amber-200 text-amber-600' },
  expired: { Icon: Clock,       badge: 'bg-amber-50 border-amber-200 text-amber-600' },
  locked:  { Icon: Lock,        badge: 'bg-rose-50 border-rose-200 text-rose-600' },
  info:    { Icon: Info,        badge: 'bg-blue-50 border-blue-200 text-blue-600' },
};

/**
 * StatusCard — reusable status state card for account-locked, session-expired, link-expired,
 * email-verified, etc. Uses Lucide icons and shared design tokens.
 */
export default function StatusCard({
  type = 'info',
  title,
  description,
  details,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionTo,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionTo,
  children,
}) {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const { Icon } = cfg;

  const handlePrimaryClick = () => {
    if (onPrimaryAction) onPrimaryAction();
    else if (primaryActionTo) navigate(primaryActionTo);
  };

  const handleSecondaryClick = () => {
    if (onSecondaryAction) onSecondaryAction();
    else if (secondaryActionTo) navigate(secondaryActionTo);
  };

  return (
    <div className="text-center py-2 space-y-5">
      {/* Status icon */}
      <div className="flex justify-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${cfg.badge}`}>
          <Icon className="w-8 h-8" aria-hidden="true" />
        </div>
      </div>

      {/* Title + Description */}
      <div>
        <h2 className="text-xl font-bold font-heading tracking-tight text-slate-900">{title}</h2>
        {description && (
          <p className="mt-2 text-sm text-slate-500 font-sans leading-relaxed max-w-sm mx-auto">
            {description}
          </p>
        )}
      </div>

      {/* Details box */}
      {details && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-700 text-left space-y-2 font-sans leading-relaxed">
          {details}
        </div>
      )}

      {children}

      {/* Action buttons */}
      <div className="space-y-3 pt-2">
        {primaryActionLabel && (onPrimaryAction || primaryActionTo) && (
          <AuthSubmitButton type="button" onClick={handlePrimaryClick}>
            <span>{primaryActionLabel}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </AuthSubmitButton>
        )}

        {secondaryActionLabel && (onSecondaryAction || secondaryActionTo) && (
          <div className="pt-1">
            <AuthLink onClick={handleSecondaryClick}>
              {secondaryActionLabel}
            </AuthLink>
          </div>
        )}
      </div>
    </div>
  );
}
