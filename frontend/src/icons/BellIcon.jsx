import React from 'react';

/**
 * BellIcon – a minimal, scalable SVG component.
 * Uses Tailwind's `w-6 h-6` sizing via the `className` prop for easy scaling.
 * The SVG inherits `currentColor`, allowing parent text color to drive the icon hue (e.g., neon cyan/fuchsia).
 */
export const BellIcon = ({ className = '' }) => (
  <svg
    className={`w-6 h-6 ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Bell body */}
    <path
      d="M18 8a6 6 0 10-12 0c0 3.22-1.17 4.81-2.11 5.64a1 1 0 00-.24 1.09c.2.42.64.67 1.1.67h13.5c.46 0 .9-.25 1.1-.67a1 1 0 00-.24-1.09C19.17 12.81 18 11.22 18 8z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Bell clapper */}
    <path
      d="M13.73 21a2 2 0 01-3.46 0"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
