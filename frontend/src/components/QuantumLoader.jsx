import React from 'react';

/**
 * QuantumLoader – a futuristic glass‑morphic loader.
 * Uses layered divs with CSS animations to create a spinning tech ring
 * and a pulsing core. No canvas – pure Tailwind + keyframes.
 */
export const QuantumLoader = () => {
  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-[spin_2s_linear_infinite]" />
      {/* Inner ring */}
      <div className="absolute inset-2 rounded-full border-2 border-fuchsia-400/30 border-b-fuchsia-400 animate-[spin_1.5s_reverse_linear_infinite]" />
      {/* Pulsing core */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 shadow-lg animate-pulse" />
    </div>
  );
};
