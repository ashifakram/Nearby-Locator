import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/useAuthStore';
import LocationIcon from '../../../icons/LocationIcon';

export default function HeaderSection() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-4 left-4 right-4 z-50 max-w-5xl mx-auto rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-md px-6 py-3 flex items-center justify-between transition-all duration-300">
      <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800/50 ring-1 ring-cyan-500/20">
          <LocationIcon width={18} height={18} color="#08B3C5" />
        </div>
        <span className="font-bold text-lg text-white tracking-tight">Nearby Locator</span>
      </div>

      {/* Navigation center items */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-400">
        <a href="#features" className="hover:text-white transition-colors duration-200">Features</a>
        <a href="#simulation" className="hover:text-white transition-colors duration-200">Simulation</a>
        <a href="#moderation" className="hover:text-white transition-colors duration-200">Trust Engine</a>
        <a href="#mobile" className="hover:text-white transition-colors duration-200">Mobile First</a>
      </nav>

      {/* Navigation actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(isAuthenticated ? '/discover' : '/login')}
          className="px-4 py-2 rounded-xl text-xs font-semibold btn-primary-spatial transition-all duration-200"
        >
          {isAuthenticated ? 'Discover Console' : 'Launch Console'}
        </button>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 rounded-lg bg-slate-800/40 text-slate-400 hover:text-white border border-slate-800"
        >
          ☰
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 rounded-2xl border border-slate-800/80 bg-slate-950/90 backdrop-blur-xl flex flex-col gap-3 text-sm font-semibold text-slate-400 animate-fade-in z-50">
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-1">Features</a>
          <a href="#simulation" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-1">Simulation</a>
          <a href="#moderation" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-1">Trust Engine</a>
          <a href="#mobile" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-1">Mobile First</a>
        </div>
      )}
    </header>
  );
}
