import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { authService } from '../services/auth';
import LocationIcon from '../icons/LocationIcon';

export default function AppLayout() {
  const { user } = useAuthStore();
  const { isDark, toggleTheme } = useUIStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-cyan-500/20 selection:text-cyan-300 overflow-hidden relative">
      {/* Background spatial ambient light layers */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#08B3C5]/5 filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#08B3C5]/5 filter blur-[120px] pointer-events-none" />

      {/* 1. Cinematic Geo-Grid Background (Very low contrast) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.015]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="layoutGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#08B3C5" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#layoutGrid)" />
        </svg>
      </div>

      {/* 2. Main Frame Shell with Solid Canvas Anchors & Glass Level 2 */}
      <div className="w-full max-w-5xl h-[90vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden transition-all duration-300 relative z-10 bg-[#0F1322] border-slate-800/60">
        
        {/* Navigation Header - Floating Glass Header Look */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center ring-2 bg-slate-800/50 ring-cyan-500/20">
              <LocationIcon width={24} height={24} color="#08B3C5" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-white tracking-tight flex items-center gap-1.5">
                <span>Nearby Locator</span>
                {user && (
                  <span className="w-2.5 h-2.5 bg-[#08B3C5] rounded-full notification-aura" title="Session active" />
                )}
              </h1>
              <p className="text-xs text-slate-400">Discover premium spots around you</p>
            </div>
          </div>

          {/* User Profile, Theme toggler, Logouts */}
          <div className="flex items-center gap-3">
            {/* Visual Notification Bell with enhanced size, larger hit area and active ping (Issue 6) */}
            <div className="relative p-3 bg-slate-800/40 rounded-xl cursor-pointer hover:text-white border border-slate-900 flex items-center justify-center transition-all duration-200 hover:scale-105">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-slate-400 hover:text-white transition-colors duration-200">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-[#08B3C5] rounded-full notification-aura" />
            </div>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl transition-all duration-200 hover:scale-105 bg-slate-800/50 hover:bg-slate-700/50 text-yellow-400 border border-slate-800"
              aria-label="Toggle Theme"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {user && (
              <div className="flex items-center gap-2">
                {user.permissions?.includes('metrics.read') && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-900/20 transition-all duration-200"
                  >
                    Admin Console
                  </button>
                )}
                
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs font-semibold text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{user.name}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-850 hover:bg-slate-800 text-slate-300 transition-all duration-200 border border-slate-800"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content Body Container */}
        <main className="flex-grow overflow-y-auto relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
