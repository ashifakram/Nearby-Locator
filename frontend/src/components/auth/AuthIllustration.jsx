import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Star, FileText, Search } from 'lucide-react';
import GeminiSparkleIcon from '../../icons/GeminiSparkleIcon';

export default function AuthIllustration({
  headline = (
    <>
      Discover Better <br />
      <motion.span
        className="inline-block italic pr-2 py-0.5"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 8,
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
        Places
      </motion.span>{' '}
      with AI
    </>
  ),
  description = "Find restaurants, hospitals, and local gems with intelligent summaries and contextual insights.",
  promptText = '"Find the best quiet cafe for working nearby..."'
}) {
  return (
    <section className="hidden flex-1 flex-col justify-between px-10 py-12 lg:flex font-sans">
      <div className="max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          {/* Brand Logo & Title matching Landing Page */}
          <div className="flex items-center gap-2.5">
            <img 
              src="/nearby_locator_standalone_icon.png" 
              alt="Nearby Locator" 
              className="w-8 h-8 object-contain rounded-xl shadow-xs" 
            />
            <span className="font-bold text-2xl font-heading text-slate-900 tracking-tight">
              Nearby <span className="text-blue-600">Locator</span>
            </span>
          </div>

          <div className="h-5 w-px bg-slate-300" />

          {/* Powered by Gemini AI Badge */}
          <div className="relative inline-flex items-center rounded-full p-[2px] shadow-xs overflow-hidden">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute -inset-[150%] rounded-full opacity-100"
              style={{
                background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, #1A73E8 60deg, #4285F4 120deg, #9B51E0 180deg, #E91E63 240deg, #FF6D00 300deg, transparent 360deg)',
              }}
            />

            <div className="relative z-10 flex items-center gap-1.5 rounded-full bg-white px-3 py-1">
              <motion.div
                animate={{ rotate: [0, 360, 360] }}
                transition={{
                  duration: 10,
                  times: [0, 0.12, 1],
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="shrink-0"
              >
                <GeminiSparkleIcon className="w-3.5 h-3.5 shrink-0" />
              </motion.div>
              <span className="text-[10px] font-bold tracking-wider text-slate-600 uppercase whitespace-nowrap">POWERED BY GEMINI AI</span>
            </div>
          </div>
        </div>

        <h1 className="mb-4 text-[48px] font-bold font-heading leading-[1.1] tracking-tight text-slate-900">
          {headline}
        </h1>

        <p className="mb-6 max-w-md text-base leading-relaxed text-slate-600">
          {description}
        </p>

        <div className="mb-12 flex flex-wrap gap-2">
          {[
            { Icon: Sparkles, label: 'AI Insights' },
            { Icon: Star, label: 'Smart Recs' },
            { Icon: FileText, label: 'Summaries' },
          ].map(({ Icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-full px-3.5 py-1.5 bg-white/70 border border-blue-100 shadow-2xs">
              <Icon className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-900">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative w-full max-w-lg self-start">
        <div className="absolute -right-6 -top-6 z-20 flex animate-bounce items-center gap-3 rounded-2xl border border-blue-200 bg-white/90 p-3 shadow-md backdrop-blur-md">
          <Search className="w-4 h-4 text-blue-600 shrink-0" />
          <p className="text-[11px] font-medium text-slate-900">
            <span className="font-semibold text-blue-600">Intent Match:</span> 98% Confidence
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl space-y-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <span className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600">
              Gemini AI Active
            </span>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-3.5 shadow-xs border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">{promptText}</span>
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Live AI Rationale</span>
              </div>
            </div>

            <div className="rounded-2xl bg-blue-600 p-4 text-white shadow-md">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold font-heading">Artisan Bean Cafe</h4>
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Top Recommendation</span>
              </div>
              <p className="text-xs text-white/90 leading-relaxed font-normal">
                Matches quiet atmospheric intent with 95%+ noise reduction rating, power sockets at 80% of tables, and under 5 min walk distance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
