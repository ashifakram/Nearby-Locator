import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/useAuthStore';

export default function HeroSection() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // Simulated coordinate drift loop representing active live system energy (Problem 1)
  const [coords, setCoords] = useState({ lat: '37.7749', lng: '-122.4194' });
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        // Drift coordinates slightly around Bryant District SF
        const newLat = (37.7740 + Math.random() * 0.0020).toFixed(4);
        const newLng = (-122.4200 + Math.random() * 0.0020).toFixed(4);
        setCoords({ lat: newLat, lng: newLng });
        setFade(false);
      }, 300);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center pt-24 overflow-hidden bg-[#070A12] px-4">
      {/* 1. Cinematic Geo-Grid Background - Strict 1.5% Opacity limit for premium visual calmness (Problem 2) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.015]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#08B3C5" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* 2. Concentric Spatial Radar Sonar Signal sweep lines underlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none z-0 opacity-20">
        <div className="absolute inset-0 rounded-full border border-cyan-500/10 animate-ping" style={{ animationDuration: '6s' }} />
        <div className="absolute inset-[100px] rounded-full border border-cyan-500/5 animate-ping" style={{ animationDuration: '9s' }} />
        <div className="absolute inset-[200px] rounded-full border border-cyan-500/5" />
      </div>

      <div className="max-w-5xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Side: Cinematic Copy - Replaced Tech jargon with elite Search Copy (Problem 10, balanced Issue 5) */}
        <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-xs font-semibold text-[#08B3C5] tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#08B3C5] notification-aura" />
            Spatial Command & Discovery
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white">
            Immersive Local Discovery <br />
            {/* Soft optical rhythm weighting (Problem 5) */}
            <span className="text-[#08B3C5] font-semibold text-2xl sm:text-3xl block mt-1.5 opacity-90">Coordinates Refined.</span>
          </h2>
          <p className="text-slate-400 text-base max-w-lg mx-auto lg:mx-0 leading-relaxed font-body">
            Fusing high-performance spatial coordinate search with immersive interactive maps to guide your exploration of verified local highlights instantly, with zero clutter.
          </p>
          <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-2">
            <button
              onClick={() => navigate(isAuthenticated ? '/discover' : '/signup')}
              className="h-12 px-6 rounded-2xl btn-primary-spatial text-sm font-semibold flex items-center gap-2 transition-all duration-200"
            >
              <span>Explore nearby now</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <a
              href="#simulation"
              className="h-12 px-6 rounded-2xl btn-secondary-spatial text-sm font-semibold flex items-center justify-center transition-all duration-200"
            >
              Watch Simulation
            </a>
          </div>
        </div>

        {/* Right Side: Animated spatial telemetry preview (Problem 1) */}
        <div className="lg:col-span-6 relative flex justify-center items-center h-[350px]">
          {/* Floating Command Panel Mockup */}
          <div className="w-full max-w-sm rounded-3xl p-6 bg-slate-950/60 border border-slate-850 shadow-2xl backdrop-blur-md relative z-10 transition-transform duration-300 hover:scale-[1.01]">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4">
              <div className="flex items-center gap-2">
                {/* Blinking State Circle to represent continuous live-state energy */}
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1" />
                <span className="text-[9px] font-mono tracking-widest text-emerald-400 uppercase">SYSTEM ONLINE</span>
              </div>
              <span className="text-[10px] font-mono tracking-widest text-slate-500">TELEMETRY LAYER</span>
            </div>

            <div className="space-y-4">
              {/* Authentic production REST API schema */}
              <div className="px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-cyan-400 break-all relative overflow-hidden">
                <span className={`transition-opacity duration-350 ${fade ? 'opacity-30' : 'opacity-100'}`}>
                  GET /api/v1/spots?lat={coords.lat}&lng={coords.lng}
                </span>
                {/* Subtle sweeping scan light beam overlay */}
                <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent skew-x-12 animate-shimmer-swipe" style={{ animationDuration: '3s', animationIterationCount: 'infinite' }} />
              </div>

              {/* Floating listing cards inside panel mockup */}
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-850 flex items-center justify-between transition-all duration-300 hover:border-cyan-500/20">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">📍 Blue Bottle Coffee</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">340m • Bryant District SF</p>
                  </div>
                  <span className="text-xs text-yellow-500 font-semibold">⭐ 4.8</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-850 flex items-center justify-between opacity-75 transition-all duration-300 hover:border-cyan-500/20">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">📍 Equinox Gym</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">720m • Core Center</p>
                  </div>
                  <span className="text-xs text-yellow-500 font-semibold">⭐ 4.6</span>
                </div>
              </div>
            </div>
          </div>

          {/* Underlay glowing halo orb */}
          <div className="absolute w-[200px] h-[200px] rounded-full bg-[#08B3C5]/5 filter blur-[60px] pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
