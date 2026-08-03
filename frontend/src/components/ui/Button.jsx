import React from 'react';
import LoaderIcon from '../../icons/LoaderIcon';

/**
 * Shared Button component inheriting Landing Page design language.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isDisabled = false,
  leftIcon: LeftIcon = null,
  rightIcon: RightIcon = null,
  fullWidth = false,
  type = 'button',
  className = '',
  onClick,
  ...props
}) {
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 hover:shadow-lg active:scale-[0.98]',
    secondary: 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm active:scale-[0.98]',
    'spatial-primary': 'btn-primary-spatial',
    'glass-secondary': 'btn-secondary-spatial',
    outline: 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs active:scale-[0.98]',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 active:scale-[0.98]',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20 active:scale-[0.98]',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm font-semibold rounded-xl gap-2',
    lg: 'px-6 py-3 text-base font-semibold rounded-xl gap-2.5',
  };

  const disabled = isDisabled || isLoading;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-sans tracking-tight transition-all duration-200 cursor-pointer select-none disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none ${fullWidth ? 'w-full' : ''} ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <LoaderIcon width={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} height={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
      ) : (
        LeftIcon && <LeftIcon className="w-4 h-4 shrink-0" />
      )}
      <span>{children}</span>
      {!isLoading && RightIcon && <RightIcon className="w-4 h-4 shrink-0" />}
    </button>
  );
}
