import React from 'react';
import { Outlet } from 'react-router-dom';
import AnnouncementBar from '../pages/landing/components/AnnouncementBar';
import StickyNavbar from '../pages/landing/components/StickyNavbar';
import LandingFooter from '../pages/landing/components/LandingFooter';

/**
 * Shared PublicLayout providing consistent Header Navbar + Footer across public pages.
 */
export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-between overflow-x-hidden antialiased">
      <AnnouncementBar />
      <StickyNavbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <LandingFooter />
    </div>
  );
}
