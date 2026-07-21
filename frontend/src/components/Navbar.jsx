import React from 'react';
import { Link } from 'react-router-dom';
import { BellIcon } from '../icons/BellIcon'; // assume an SVG component exists or create placeholder

/**
 * Floating Navbar with notification bell.
 * Uses Tailwind utilities to appear as a glass‑morphic island.
 */
export const Navbar = ({ hasAnomalies = false }) => {
  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[92%] flex items-center justify-between bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-3 shadow-lg">
      <div className="flex items-center space-x-4">
        <Link to="/" className="text-white font-bold text-lg">Nearby Locator</Link>
        <Link to="/about" className="text-white hover:underline">About</Link>
        <Link to="/dashboard" className="text-white hover:underline">Dashboard</Link>
        <Link to="/admin/analytics" className="text-white hover:underline">Analytics</Link>
      </div>
      <div className="relative">
        <BellIcon className="w-6 h-6 text-white" />
        {hasAnomalies && (
          <span className="absolute -top-1 -right-1 inline-flex h-3 w-3 rounded-full bg-red-500 animate-ping" />
        )}
      </div>
    </nav>
  );
};
