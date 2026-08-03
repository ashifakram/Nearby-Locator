import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, SlidersHorizontal, Wand2, Compass, Zap, Sparkles } from 'lucide-react';

export default function PersonalizationSection() {
  const pillars = [
    {
      icon: BrainCircuit,
      title: 'Learns Preferences',
      description: 'Adapts to your favorite atmosphere types, dietary needs, noise tolerance, and transit habits automatically.',
    },
    {
      icon: Wand2,
      title: 'Smarter Recommendations',
      description: 'As you search and save places, the AI refines its rationale engine to surface higher confidence matches.',
    },
    {
      icon: SlidersHorizontal,
      title: 'Personalized Search',
      description: 'Custom weighting for distance vs. rating vs. specific amenity requirements based on your historical choices.',
    },
    {
      icon: Compass,
      title: 'Relevant Discoveries',
      description: 'Uncovers hidden gems around your current location that match your exact lifestyle instead of generic tourist traps.',
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" /> Continuous Learning Engine
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              An Engine That Adapts To{' '}
              <motion.span
                className="inline-block"
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  backgroundImage: 'linear-gradient(90deg, #1A73E8, #4285F4, #9B51E0, #E91E63, #FF6D00, #1A73E8)',
                  backgroundSize: '300% 300%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                How You Live.
              </motion.span>
            </h2>
            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
              Unlike static map databases, Nearby Locator builds an adaptive spatial taste profile. The more you use it, the better it understands whether "quiet work spot" means a 40dB library or a bustling background jazz cafe.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              {pillars.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.title} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">{p.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">{p.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Visual Graphic */}
          <div className="lg:col-span-6 bg-gradient-to-br from-blue-50 to-teal-50/40 p-8 sm:p-10 rounded-3xl border border-blue-100/80 space-y-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">AI Taste Profile Matrix</span>
              <span className="px-2.5 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-full">Active Learning</span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Work & Quiet Affinity</span>
                  <span>92%</span>
                </div>
                <div className="w-full h-2.5 bg-blue-200/60 rounded-full overflow-hidden">
                  <div className="w-[92%] h-full bg-blue-600 rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Walkability Preference (&lt;15 mins)</span>
                  <span>88%</span>
                </div>
                <div className="w-full h-2.5 bg-blue-200/60 rounded-full overflow-hidden">
                  <div className="w-[88%] h-full bg-blue-600 rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Outdoor Patio & Sunshine</span>
                  <span>75%</span>
                </div>
                <div className="w-full h-2.5 bg-blue-200/60 rounded-full overflow-hidden">
                  <div className="w-[75%] h-full bg-emerald-600 rounded-full" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-blue-200/80 text-xs text-slate-700 font-medium">
              ✨ <strong className="text-slate-900 font-bold">Insight: </strong>
              Your profile prefers places with verified Wi-Fi and low noise levels between 9 AM and 4 PM.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
