import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, CheckCircle2, Sparkles, MapPin, Search } from 'lucide-react';
import GeminiSparkleIcon from '../../../icons/GeminiSparkleIcon';
import HeroProductPreview from './HeroProductPreview';
import { useAuthStore } from '../../../store/useAuthStore';

export default function HeroSection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handlePrimaryCTA = () => {
    if (isAuthenticated) {
      navigate('/discover');
    } else {
      navigate('/signup');
    }
  };

  const handleSecondaryCTA = () => {
    const el = document.getElementById('ai-showcase');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 bg-gradient-to-b from-white via-slate-50/50 to-white overflow-hidden">
      {/* Delicate background grid pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Hero Copy (7 Cols) */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border border-purple-200/80 text-purple-900 text-xs sm:text-sm font-semibold shadow-xs">
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
                <GeminiSparkleIcon className="w-4 h-4 shrink-0" />
              </motion.div>
              <span>Powered by <strong className="font-bold text-slate-900">Google Gemini AI</strong></span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Find Better Places with{' '}
              <motion.span
                className="inline"
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  backgroundImage: 'linear-gradient(90deg, #1A73E8, #4285F4, #9B51E0, #E91E63, #FF6D00, #4285F4)',
                  backgroundSize: '300% 300%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                <span className="inline-block whitespace-nowrap mr-3">
                  {"Gemini AI,".split('').map((char, index) => (
                    <motion.span
                      key={index}
                      initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 0.6, delay: index * 0.05, ease: 'easeOut' }}
                      className="inline-block"
                    >
                      {char === ' ' ? '\u00A0' : char}
                    </motion.span>
                  ))}
                </span>
                <span className="inline-block whitespace-nowrap">
                  {"Not Just".split('').map((char, index) => (
                    <motion.span
                      key={index}
                      initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 0.6, delay: (10 + index) * 0.05, ease: 'easeOut' }}
                      className="inline-block"
                    >
                      {char === ' ' ? '\u00A0' : char}
                    </motion.span>
                  ))}
                </span>
                <br />
                <span className="inline-block whitespace-nowrap">
                  {"Maps.".split('').map((char, index) => (
                    <motion.span
                      key={index}
                      initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 0.6, delay: (18 + index) * 0.05, ease: 'easeOut' }}
                      className="inline-block"
                    >
                      {char}
                    </motion.span>
                  ))}
                </span>
              </motion.span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Nearby Locator leverages Google Gemini's advanced spatial reasoning to understand your real intent, atmosphere preferences, and context instead of simple keyword matching.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                onClick={handlePrimaryCTA}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <span>{isAuthenticated ? 'Open Discover Console' : 'Start Free'}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={handleSecondaryCTA}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer hover:border-slate-300"
              >
                <Play className="w-4 h-4 fill-slate-700" />
                <span>See Gemini in Action</span>
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="pt-4 border-t border-slate-200/60 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs sm:text-sm font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Google Gemini AI Powered</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Real-time Spatial Reasoning</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Free to get started</span>
              </div>
            </div>
          </div>

          {/* Right Product Preview (5 Cols) */}
          <div className="lg:col-span-5">
            <HeroProductPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
