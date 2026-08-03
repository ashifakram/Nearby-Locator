import React from 'react';
import { Outlet } from 'react-router-dom';
import StickyNavbar from '../pages/landing/components/StickyNavbar';
import LandingFooter from '../pages/landing/components/LandingFooter';

/**
 * Shared ErrorLayout providing consistent Error Shell across system HTTP error pages.
 */
export default function ErrorLayout() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-between overflow-x-hidden antialiased">
      <StickyNavbar />
      <main className="flex-grow flex items-center justify-center py-16 px-4">
        <Outlet />
      </main>
      <LandingFooter />
    </div>
  );
}
