import React, { useState, useEffect } from 'react';

export default function LiveSimulation() {
  const [searchText, setSearchText] = useState('');
  const [phase, setPhase] = useState('TYPING'); // TYPING -> SEARCHING -> COMPLETED
  const [staggerIndex, setStaggerIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  const mockPlaces = [
    { name: '📍 Blue Bottle Coffee', address: '450 Bryant St, San Francisco', rating: '4.8', distance: '0.4 km' },
    { name: '📍 Sightglass Coffee', address: '270 7th St, San Francisco', rating: '4.7', distance: '0.8 km' },
    { name: '📍 Blue Bottle Espresso Bar', address: '115 Sansome St, San Francisco', rating: '4.6', distance: '1.2 km' }
  ];

  useEffect(() => {
    let timer;
    if (phase === 'TYPING') {
      const fullText = 'coffee';
      let index = 0;
      setSearchText('');
      setStaggerIndex(0);

      // Typing loop with custom humanized speed variation (Problem 5)
      const interval = setInterval(() => {
        if (index < fullText.length) {
          // Absolute substring safety: fully resolves "offeeundefined" bug (Problem 4)
          setSearchText(fullText.substring(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          timer = setTimeout(() => {
            setPhase('SEARCHING');
          }, 800);
        }
      }, 220 + Math.random() * 80); // Human-like hesitation pacing

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    } else if (phase === 'SEARCHING') {
      // Natural PostgreSQL calculation index query delay (Problem 5)
      timer = setTimeout(() => {
        setPhase('COMPLETED');
      }, 1400);

      return () => clearTimeout(timer);
    } else if (phase === 'COMPLETED') {
      // Stagger result card entry sequences softly for visual calmness
      const interval = setInterval(() => {
        setStaggerIndex((prev) => {
          if (prev >= mockPlaces.length) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 250);

      timer = setTimeout(() => {
        setPhase('TYPING');
      }, 5000); // Display for 5 seconds

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [phase]);

  return (
    <section id="simulation" className="py-20 bg-[#070A12] px-4 relative overflow-hidden">
      {/* Background spatial continuous blending overlay (Problem 5) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070A12] via-[#090D18] to-[#070A12] pointer-events-none z-0 opacity-40" />

      <div className="max-w-4xl mx-auto w-full space-y-12 relative z-10">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-heading">
            Live Discovery Simulation
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto font-body">
            Watch Nearby Locator process full-text searches, autocomplete, and map overlays dynamically under our high-speed geospatial indexing engine.
          </p>
        </div>

        {/* Dynamic Simulation Box with Spatial Glass Level 2 and hover signature interaction (Issue 7) */}
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="rounded-3xl border border-slate-850 p-6 bg-slate-950/40 backdrop-blur-xl relative overflow-hidden shadow-2xl max-w-2xl mx-auto min-h-[380px] flex flex-col transition-all duration-500 hover:border-cyan-500/20"
        >
          {/* Signature Moment: Floating Coordinate Particles synced to active synchronization (Issue 7) */}
          {hovered && (
            <div className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-500">
              {/* Particle 1 */}
              <div className="absolute left-[10%] top-[25%] text-[9px] font-mono text-cyan-500/15 animate-pulse" style={{ animationDuration: '2s' }}>+ 37.7749</div>
              {/* Particle 2 */}
              <div className="absolute right-[12%] top-[30%] text-[9px] font-mono text-cyan-500/15 animate-pulse" style={{ animationDuration: '2.5s' }}>+ -122.4194</div>
              {/* Particle 3 */}
              <div className="absolute left-[15%] bottom-[20%] text-[9px] font-mono text-cyan-500/15 animate-pulse" style={{ animationDuration: '3s' }}>+ 37.7812</div>
              {/* Particle 4 */}
              <div className="absolute right-[20%] bottom-[15%] text-[9px] font-mono text-cyan-500/15 animate-pulse" style={{ animationDuration: '1.8s' }}>+ -122.4116</div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-6 relative z-10">
            <span className="text-xs font-mono text-cyan-400">GEO-DISCOVERY SIMULATOR</span>
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
          </div>

          <div className="flex-grow flex flex-col justify-center relative z-10">
            {/* Search Input Bar Mockup */}
            <div className="relative mb-6">
              <div className={`w-full h-12 rounded-2xl px-4 flex items-center bg-slate-900/50 border text-slate-300 transition-all duration-300 ${hovered ? 'border-cyan-500/30 shadow-lg' : 'border-slate-800'}`}>
                <span className="mr-2">🔍</span>
                <span className="font-mono text-sm tracking-wide">{searchText}</span>
                {phase === 'TYPING' && (
                  <span className="w-2 h-4 bg-cyan-400 ml-0.5 animate-pulse" />
                )}
              </div>
            </div>

            {/* Results / Loader Body */}
            <div className="flex-grow flex flex-col items-center justify-center min-h-[180px]">
              {phase === 'SEARCHING' && (
                <div className="flex flex-col items-center gap-4">
                  {/* Sweep radar speeds up on hover to express coordinated search activation! */}
                  <div className="radar-sweep-indicator" style={hovered ? { animationDuration: '1s' } : undefined} />
                  <span className="text-xs font-mono text-slate-500 tracking-widest uppercase animate-pulse">
                    Scanning local quadrants...
                  </span>
                </div>
              )}

              {(phase === 'COMPLETED' && staggerIndex > 0) && (
                <div className="w-full space-y-3">
                  {mockPlaces.slice(0, staggerIndex).map((place, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-900/40 border border-slate-850 flex items-center justify-between hover:border-slate-800 transition-all duration-300 transform translate-y-0 opacity-100 animate-fade-in"
                    >
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-200">{place.name}</h3>
                        <p className="text-xs text-slate-500 font-body">{place.address}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-yellow-500 block">⭐ {place.rating}</span>
                        <span className="text-[10px] text-cyan-400 font-mono mt-1 block">{place.distance}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
