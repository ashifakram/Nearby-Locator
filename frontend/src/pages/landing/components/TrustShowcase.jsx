import React from 'react';

export default function TrustShowcase() {
  const securityFeatures = [
    {
      title: 'Intelligent Search Recovery',
      desc: 'Instantly recovers from typos by suggesting nearby alternatives in real-time, ensuring your explorations never run into a dead end.',
      depthClass: 'bg-slate-950/20 shadow-sm opacity-90 hover:scale-[1.005]',
      shieldText: '01 / SYSTEM HEAL'
    },
    {
      title: 'Secure Session Handshakes',
      desc: 'Protects active searches using volatile memory safeguards and session rotations to prevent unauthorized data interception.',
      depthClass: 'bg-slate-950/60 shadow-2xl scale-[1.01] hover:scale-[1.015]',
      shieldText: '02 / HIGH PROTECTION'
    },
    {
      title: 'Quiet Coordinate Insights',
      desc: 'Anonymously compiles search engagement patterns to ensure local suggestions remain accurate and tailored to your region.',
      depthClass: 'bg-slate-950/40 shadow-md opacity-95 hover:scale-[1.008]',
      shieldText: '03 / REGIONAL ACCURACY'
    }
  ];

  return (
    <section id="moderation" className="py-20 bg-[#070A12] px-4 relative overflow-hidden">
      {/* Visual atmospheric blending underlay (Problem 5) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070A12] via-[#090D18] to-[#070A12] pointer-events-none z-0 opacity-40" />

      <div className="max-w-5xl mx-auto w-full space-y-12 relative z-10">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-heading">
            Trust & Moderation Showcase
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto font-body">
            Nearby Locator balances spatial visual exploration with highly mature, enterprise-grade data security and query intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {securityFeatures.map((feat, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-3xl border border-cyan-500/20 transition-all duration-400 flex flex-col justify-between min-h-[220px] ${feat.depthClass}`}
            >
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-cyan-400 font-semibold uppercase tracking-wider block">
                  {feat.shieldText}
                </span>
                <h3 className="text-lg font-bold text-white font-heading">{feat.title}</h3>
                <p className="text-xs text-slate-400 font-body leading-relaxed">{feat.desc}</p>
              </div>
              <div className="mt-6 flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-900/40">
                <span>VERIFIED SCHEMAS</span>
                <span className="text-emerald-500">● PASS</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
