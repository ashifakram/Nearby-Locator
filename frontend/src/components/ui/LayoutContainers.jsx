import React from 'react';

/**
 * Shared Container component for layout max-width alignment.
 */
export function Container({
  children,
  size = '7xl',
  className = '',
  as: Component = 'div',
  ...props
}) {
  const sizeClasses = {
    '7xl': 'max-w-7xl',
    '6xl': 'max-w-6xl',
    '5xl': 'max-w-5xl',
    '4xl': 'max-w-4xl',
    '3xl': 'max-w-3xl',
    '2xl': 'max-w-2xl',
    xl: 'max-w-xl',
    lg: 'max-w-lg',
    md: 'max-w-md',
    sm: 'max-w-sm',
    full: 'max-w-full',
  };

  return (
    <Component
      className={`w-full mx-auto px-4 sm:px-6 lg:px-8 ${sizeClasses[size] || sizeClasses['7xl']} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Shared Section wrapper component.
 */
export function Section({
  children,
  spacing = 'default',
  background = 'transparent',
  className = '',
  id,
  as: Component = 'section',
  ...props
}) {
  const spacingClasses = {
    none: 'py-0',
    compact: 'py-8 md:py-12',
    default: 'py-12 md:py-20',
    spacious: 'py-20 md:py-28',
  };

  const bgClasses = {
    transparent: 'bg-transparent',
    white: 'bg-white',
    slate: 'bg-slate-50',
    dark: 'bg-slate-900 text-white',
    void: 'bg-[#070A12] text-white',
  };

  return (
    <Component
      id={id}
      className={`w-full ${spacingClasses[spacing] || spacingClasses.default} ${bgClasses[background] || bgClasses.transparent} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
