import React from 'react';

/**
 * Shared Card container component inheriting Landing Page card styles.
 */
export function Card({
  children,
  variant = 'glass',
  hoverEffect = false,
  className = '',
  ...props
}) {
  const variantClasses = {
    glass: 'bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-sm text-slate-900',
    solid: 'bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-900',
    anchor: 'card-anchor rounded-2xl text-white',
    dark: 'bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl text-white shadow-xl',
  };

  const hoverClasses = hoverEffect ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-300' : '';

  return (
    <div
      className={`${variantClasses[variant] || variantClasses.glass} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`p-6 pb-4 space-y-1.5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', as: Component = 'h3', ...props }) {
  return (
    <Component className={`font-heading text-xl font-bold tracking-tight text-slate-900 ${className}`} {...props}>
      {children}
    </Component>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`font-sans text-sm text-slate-500 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`px-6 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`p-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
