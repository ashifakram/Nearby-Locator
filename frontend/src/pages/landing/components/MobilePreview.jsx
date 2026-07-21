import React from 'react';

export default function MobilePreview() {
  return (
    <section id="mobile" className="py-24 bg-[#070A12] px-4 relative overflow-hidden">
      {/* Background visual continuity blending gradient layer (Problem 6) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070A12] via-[#090D18] to-[#070A12] pointer-events-none z-0 opacity-40" />

      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        {/* Left Side: Mobile Specs - Reduced density and improved vertical rhythm (Issue 8) */}
        <div className="lg:col-span-6 space-y-8 text-center lg:text-left max-w-lg mx-auto lg:mx-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-xs font-semibold text-[#08B3C5] tracking-widest uppercase">
            📱 Responsive Mechanics
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-heading leading-tight">
            Mobile-First Discovery <br />
            <span className="text-[#08B3C5] opacity-90">Architecture</span>
          </h2>
          
          <p className="text-slate-400 text-sm leading-relaxed font-body">
            Optimized for real-world wandering. The mobile layout refines touch ergonomics with elegant thumb gestures and responsive coordinate layers.
          </p>
          
          <ul className="space-y-4 text-left max-w-sm mx-auto lg:mx-0 text-xs text-slate-400 font-body pt-2">
            <li className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 text-[10px] font-bold">✓</span>
              <span>Thumb-accessible search bottom sheets</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 text-[10px] font-bold">✓</span>
              <span>Low-power mobile GPU-safe blur downgrades</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 text-[10px] font-bold">✓</span>
              <span>Dynamic offline query persistence options</span>
            </li>
          </ul>
        </div>

        {/* Right Side: Phone mockup */}
        <div className="lg:col-span-6 flex justify-center items-center">
          {/* Outer Case */}
          <div className="w-[280px] h-[540px] rounded-[40px] border-4 border-slate-800 bg-[#070A12] shadow-2xl p-3 relative overflow-hidden flex flex-col justify-between">
            {/* Phone Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 rounded-b-xl bg-slate-800 z-30" />

            {/* Map Underlay Simulation - Panning SVG Map Background (Problem 7) */}
            <div className="absolute inset-0 bg-[#090D18] z-0 overflow-hidden pointer-events-none">
              
              {/* Animated Map Container with rich building outlines, route traces, and parks */}
              <div className="absolute w-[360px] h-[640px] -left-[40px] -top-[50px] animate-map-pan z-0 opacity-25">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  {/* Rich Park layers outlines */}
                  <rect x="30" y="20" width="80" height="90" rx="8" fill="#065f46" opacity="0.15" />
                  <rect x="180" y="320" width="120" height="100" rx="8" fill="#065f46" opacity="0.15" />

                  {/* Styled block outlines representing buildings */}
                  <rect x="120" y="30" width="100" height="110" rx="8" fill="#1E293B" opacity="0.4" />
                  <rect x="240" y="50" width="80" height="70" rx="8" fill="#1E293B" opacity="0.4" />
                  
                  <rect x="30" y="160" width="90" height="110" rx="8" fill="#1E293B" opacity="0.4" />
                  <rect x="250" y="140" width="80" height="120" rx="8" fill="#1E293B" opacity="0.4" />
                  
                  <rect x="30" y="300" width="100" height="90" rx="8" fill="#1E293B" opacity="0.4" />

                  {/* Road Vectors intersecting Bryant district */}
                  <line x1="0" y1="150" x2="360" y2="150" stroke="#334155" strokeWidth="6" />
                  <line x1="0" y1="290" x2="360" y2="290" stroke="#334155" strokeWidth="6" />
                  <line x1="135" y1="0" x2="135" y2="640" stroke="#334155" strokeWidth="6" />
                  <line x1="230" y1="0" x2="230" y2="640" stroke="#334155" strokeWidth="6" />
                  
                  {/* Secondary small connector roads */}
                  <line x1="0" y1="420" x2="360" y2="420" stroke="#1e293b" strokeWidth="3" strokeDasharray="3 3" />
                  
                  {/* Subtle dynamic routing trace line (Problem 7) */}
                  <path
                    d="M 60 150 L 135 150 L 135 290 L 230 290"
                    fill="none"
                    stroke="#08B3C5"
                    strokeWidth="3.5"
                    strokeDasharray="6 4"
                    opacity="0.8"
                  />

                  {/* Lake / Shoreline */}
                  <path d="M 0 580 Q 180 540 360 600" fill="none" stroke="#08B3C5" strokeWidth="16" opacity="0.3" />

                  {/* Secondary location points on map */}
                  <circle cx="60" cy="150" r="4" fill="#08B3C5" />
                  
                  {/* Moving coordinates pulse to add visual heartbeat (Problem 4) */}
                  <g className="animate-pulse" style={{ animationDuration: '3s' }}>
                    <circle cx="230" cy="290" r="7" fill="none" stroke="#08B3C5" strokeWidth="1.5" />
                    <circle cx="230" cy="290" r="3" fill="#08B3C5" />
                  </g>
                </svg>
              </div>

              {/* Bouncing Location Pin dropped at coordinates Bryant St (140, 290) relative to phone space */}
              <div className="absolute left-[140px] top-[290px] -translate-x-1/2 -translate-y-full z-20 flex flex-col items-center">
                <div className="animate-pin-drop">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
                      fill="#08B3C5"
                      stroke="#070A12"
                      strokeWidth="1.5"
                    />
                    <circle cx="12" cy="9" r="3" fill="#070A12" />
                  </svg>
                </div>
                {/* Soft pin base coordinate shadow */}
                <div className="w-4.5 h-1.5 bg-black/70 rounded-full blur-[1px] mt-0.5" />
              </div>

              {/* Concentric maps radar wave pulse radiating from (140, 290) intersection */}
              <div className="absolute left-[140px] top-[295px] -translate-x-1/2 -translate-y-1/2 z-10 w-[80px] h-[80px] flex items-center justify-center">
                <div className="absolute w-full h-full rounded-full border border-cyan-500/40 animate-map-pulse" />
                <div className="absolute w-[40px] h-[40px] rounded-full border border-cyan-500/25 animate-map-pulse" style={{ animationDelay: '1s' }} />
              </div>
            </div>

            {/* Floating Top Header inside mockup */}
            <div className="relative z-10 w-full pt-4 px-2">
              <div className="h-9 rounded-xl bg-slate-950/70 border border-slate-900 px-3 flex items-center justify-between backdrop-blur-md">
                <span className="text-[10px] font-semibold text-slate-300">🔍 Cafes nearby</span>
                <span className="text-[9px] font-mono text-cyan-400">1.0 km</span>
              </div>
            </div>

            {/* Floating Collapsible Bottom Sheet Mockup */}
            <div className="relative z-10 w-full pb-2 px-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3 shadow-xl backdrop-blur-lg space-y-2">
                {/* Gestural drag bar */}
                <div className="w-10 h-1 bg-slate-800 rounded-full mx-auto mb-1" />
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-200">Blue Bottle Cafe</span>
                  <span className="text-[9px] text-yellow-500 font-semibold">★ 4.8</span>
                </div>
                <p className="text-[9px] text-slate-500 font-body">450 Bryant St • Open till 7:00 PM</p>
                <div className="flex gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-850 text-[8px] font-mono text-cyan-400">COFFEE</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-850 text-[8px] font-mono text-cyan-400">VERIFIED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
