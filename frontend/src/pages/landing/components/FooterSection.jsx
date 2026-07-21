import React from 'react';
import { useNavigate } from 'react-router-dom';
import LocationIcon from '../../../icons/LocationIcon';

export default function FooterSection() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 bg-gradient-to-b from-[#070A12] to-[#04060a] border-t border-slate-900/30 px-6 relative overflow-hidden">
      {/* Background spatial continuity light fade (Issue 9) */}
      <div className="absolute inset-0 bg-[#08B3C5]/[0.01] pointer-events-none filter blur-[80px]" />

      <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        
        {/* Branding block */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-800/50 ring-1 ring-cyan-500/10">
            <LocationIcon width={16} height={16} color="#08B3C5" />
          </div>
          <span className="font-bold text-base text-white tracking-tight">Nearby Locator</span>
        </div>

        {/* Minimal compact nav */}
        <nav className="flex flex-wrap justify-center gap-6 text-xs font-semibold text-slate-500">
          <a href="#features" className="hover:text-slate-300 transition-colors duration-200">Features</a>
          <a href="#simulation" className="hover:text-slate-300 transition-colors duration-200">Simulation</a>
          <a href="#moderation" className="hover:text-slate-300 transition-colors duration-200">Trust Engine</a>
          <a href="#mobile" className="hover:text-slate-300 transition-colors duration-200">Mobile First</a>
        </nav>

        {/* Telemetry signature */}
        <div className="text-[10px] font-mono text-slate-600 tracking-wider">
          © {currentYear} NEARBY LOCATOR INC. • COORDINATES PROTECTED BY VOLATILE CLOSED MEMORY
        </div>

      </div>
    </footer>
  );
}
