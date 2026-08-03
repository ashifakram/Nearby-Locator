import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Play } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';

export default function FinalCTASection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleStartFree = () => {
    if (isAuthenticated) {
      navigate('/discover');
    } else {
      navigate('/signup');
    }
  };

  const handleAIDemo = () => {
    const el = document.getElementById('ai-showcase');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-20 md:py-28 bg-white relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-3xl p-10 sm:p-16 text-center text-white shadow-2xl overflow-hidden space-y-8">
          {/* Subtle overlay elements */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-xs sm:text-sm font-semibold border border-white/20">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Join Thousands of Explorers</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight max-w-3xl mx-auto">
            Ready to{' '}
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
                backgroundImage: 'linear-gradient(90deg, #93C5FD, #C084FC, #F472B6, #FDE047, #93C5FD)',
                backgroundSize: '300% 300%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Discover Better Places?
            </motion.span>
          </h2>

          <p className="text-base sm:text-lg text-blue-100 font-normal leading-relaxed max-w-2xl mx-auto">
            Stop guessing with keyword maps. Start searching with intent and unlock personalized AI recommendations in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={handleStartFree}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-blue-700 font-bold text-base hover:bg-blue-50 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>{isAuthenticated ? 'Open Discover Console' : 'Start Free'}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={handleAIDemo}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-base border border-white/20 backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>See AI Demo</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
