import React from 'react';

/**
 * Shared Heading component inheriting Geist font and landing page typography scaling.
 */
export function Heading({
  as: Component = 'h2',
  level = 2,
  children,
  className = '',
  align = 'left',
  ...props
}) {
  const sizeClasses = {
    1: 'text-4xl md:text-5xl lg:text-6xl font-bold leading-tight',
    2: 'text-3xl md:text-4xl font-bold leading-tight',
    3: 'text-2xl md:text-3xl font-semibold leading-snug',
    4: 'text-xl md:text-2xl font-semibold leading-snug',
    5: 'text-lg md:text-xl font-medium leading-normal',
    6: 'text-base font-medium leading-normal',
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <Component
      className={`font-heading tracking-tight text-slate-900 ${sizeClasses[level] || sizeClasses[2]} ${alignClasses[align]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Shared Text body component inheriting Inter font.
 */
export function Text({
  as: Component = 'p',
  variant = 'default',
  size = 'md',
  children,
  className = '',
  ...props
}) {
  const variantClasses = {
    default: 'text-slate-700',
    muted: 'text-slate-500',
    subtle: 'text-slate-400',
    accent: 'text-blue-600',
    white: 'text-white',
  };

  const sizeClasses = {
    xs: 'text-xs leading-relaxed',
    sm: 'text-sm leading-relaxed',
    md: 'text-base leading-relaxed',
    lg: 'text-lg leading-relaxed',
    xl: 'text-xl leading-relaxed',
  };

  return (
    <Component
      className={`font-sans ${variantClasses[variant] || variantClasses.default} ${sizeClasses[size] || sizeClasses.md} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Shared Badge indicator component.
 */
export function Badge({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon = null,
  ...props
}) {
  const variantClasses = {
    primary: 'bg-blue-50 text-blue-700 border border-blue-200/60',
    teal: 'bg-teal-50 text-teal-700 border border-teal-200/60',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    error: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    glass: 'bg-white/80 backdrop-blur-md text-slate-700 border border-slate-200/80 shadow-xs',
    dark: 'bg-slate-900 text-slate-200 border border-slate-800',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-semibold rounded-md',
    md: 'px-2.5 py-1 text-xs font-semibold rounded-lg',
    lg: 'px-3 py-1.5 text-sm font-semibold rounded-xl',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-sans transition-all ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.md} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </span>
  );
}
