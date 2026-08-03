import React from 'react';
import LoaderIcon from '../../icons/LoaderIcon';
import { AlertTriangle, Inbox, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from './Button';

/**
 * Shared Loading Spinner component
 */
export function LoadingSpinner({
  size = 36,
  label = 'Loading...',
  fullPage = false,
  className = '',
}) {
  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 p-6 text-center ${className}`}>
      <LoaderIcon width={size} height={size} color="#2563eb" />
      {label && (
        <span className="font-sans text-xs font-semibold text-slate-600 tracking-wider animate-pulse">
          {label}
        </span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Shared Skeleton loader element
 */
export function Skeleton({ className = '', variant = 'text', ...props }) {
  const variantClasses = {
    text: 'h-4 w-full rounded-md',
    avatar: 'w-10 h-10 rounded-full',
    card: 'h-48 w-full rounded-2xl',
    button: 'h-10 w-28 rounded-xl',
  };

  return (
    <div
      className={`bg-slate-200/80 animate-pulse ${variantClasses[variant] || variantClasses.text} ${className}`}
      {...props}
    />
  );
}

/**
 * Shared Empty State component
 */
export function EmptyState({
  title = 'No results found',
  description = 'Try adjusting your search query or filters.',
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-2xl ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="font-heading text-lg font-bold text-slate-900 mb-1">{title}</h4>
      <p className="font-sans text-sm text-slate-500 max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Shared Error Card component
 */
export function ErrorCard({
  title = 'Something went wrong',
  description = 'An error occurred while loading this section. Please try again.',
  onRetry,
  onBack,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-rose-50/60 backdrop-blur-sm border border-rose-200/80 rounded-2xl ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h4 className="font-heading text-lg font-bold text-slate-900 mb-1">{title}</h4>
      <p className="font-sans text-sm text-slate-600 max-w-sm mb-4">{description}</p>
      <div className="flex items-center gap-3">
        {onRetry && (
          <Button variant="danger" size="sm" leftIcon={RefreshCw} onClick={onRetry}>
            Retry
          </Button>
        )}
        {onBack && (
          <Button variant="outline" size="sm" leftIcon={ArrowLeft} onClick={onBack}>
            Go Back
          </Button>
        )}
      </div>
    </div>
  );
}
