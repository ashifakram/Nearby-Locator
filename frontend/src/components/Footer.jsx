import React from 'react';

/**
 * Glass‑morphic footer with placeholder analytics columns.
 */
export const Footer = () => {
  return (
    <footer className="bg-white/10 backdrop-blur-xl border-t border-white/20 py-4 text-center text-sm text-white">
      <div className="flex justify-center space-x-6">
        <span>Uptime: 99.9%</span>
        <span>Active Sessions: 12</span>
        <span>© 2026 Nearby Locator</span>
      </div>
    </footer>
  );
};
