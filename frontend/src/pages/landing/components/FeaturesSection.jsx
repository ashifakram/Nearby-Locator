import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// Bespoke, high-end domain icons
const AISearchIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="url(#ai-pin-grad)" />
    <path d="M19 2L19.8 3.8L21.6 4.6L19.8 5.4L19 7.2L18.2 5.4L16.4 4.6L18.2 3.8L19 2Z" fill="#9B51E0" />
    <defs>
      <linearGradient id="ai-pin-grad" x1="5" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2563EB" />
        <stop offset="1" stopColor="#7C3AED" />
      </linearGradient>
    </defs>
  </svg>
);

const NaturalLanguageIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM11 12H7V10H11V12ZM17 9H7V7H17V9ZM15 15H7V13H15V15Z" fill="url(#nl-grad)" />
    <defs>
      <linearGradient id="nl-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4F46E5" />
        <stop offset="1" stopColor="#9333EA" />
      </linearGradient>
    </defs>
  </svg>
);

const SmartRecIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="url(#rec-grad)" strokeWidth="2" />
    <path d="M16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88L16.24 7.76ZM12 10.5C11.17 10.5 10.5 11.17 10.5 12C10.5 12.83 11.17 13.5 12 13.5C12.83 13.5 13.5 12.83 13.5 12C13.5 11.17 12.83 10.5 12 10.5Z" fill="url(#rec-grad)" />
    <defs>
      <linearGradient id="rec-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#9333EA" />
        <stop offset="1" stopColor="#DB2777" />
      </linearGradient>
    </defs>
  </svg>
);

const SavedIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3ZM12 14.5L9.5 12.5L10.5 9.5L12 11L13.5 9.5L14.5 12.5L12 14.5Z" fill="url(#saved-grad)" />
    <defs>
      <linearGradient id="saved-grad" x1="5" y1="3" x2="19" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#059669" />
        <stop offset="1" stopColor="#10B981" />
      </linearGradient>
    </defs>
  </svg>
);

const HistoryIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 3C8.03 3 4 7.03 4 12H1L4.89 15.89L4.96 16.03L9 12H6C6 8.13 9.13 5 13 5C16.87 5 20 8.13 20 12C20 15.87 16.87 19 13 19C11.07 19 9.32 18.21 8.06 16.94L6.64 18.36C8.27 19.99 10.51 21 13 21C17.97 21 22 16.97 22 12C22 7.03 17.97 3 13 3ZM12 8V13L16.25 15.54L17 14.33L13.5 12.25V8H12Z" fill="url(#hist-grad)" />
    <defs>
      <linearGradient id="hist-grad" x1="1" y1="3" x2="22" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#D97706" />
        <stop offset="1" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
  </svg>
);

const SecurityIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 11.99H19C18.47 16.11 15.72 19.78 12 20.93V12H5V6.3L12 3.19V11.99Z" fill="url(#sec-grad)" />
    <defs>
      <linearGradient id="sec-grad" x1="3" y1="1" x2="21" y2="23" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E11D48" />
        <stop offset="1" stopColor="#F43F5E" />
      </linearGradient>
    </defs>
  </svg>
);

export default function FeaturesSection() {
  const navigate = useNavigate();

  const features = [
    {
      icon: AISearchIcon,
      title: 'AI Search Engine',
      description: 'Intelligent neural query parsing transforms plain human speech into precise location intent, noise constraints, and amenity filters.',
      color: 'bg-blue-50/80 border-blue-100/80 shadow-xs',
    },
    {
      icon: NaturalLanguageIcon,
      title: 'Natural Language Search',
      description: 'Skip rigid category drop-downs. Type "cozy spot for reading with green tea" and get places matching your exact vibe.',
      color: 'bg-blue-50/80 border-blue-100/80 shadow-2xs',
    },
    {
      icon: SmartRecIcon,
      title: 'Smart Recommendations',
      description: 'Context-aware scoring evaluates live travel times, historical ratings, and your personal taste for tailored recommendations.',
      color: 'bg-purple-50/80 border-purple-100/80 shadow-xs',
    },
    {
      icon: SavedIcon,
      title: 'Saved Collections',
      description: 'Curate your favorite cafes, study nooks, or client meeting spots into custom shareable lists with instant cloud syncing.',
      color: 'bg-emerald-50/80 border-emerald-100/80 shadow-xs',
    },
    {
      icon: HistoryIcon,
      title: 'Search History',
      description: 'Easily revisit past discoveries with saved intent metadata, AI explanations, and previous route calculations.',
      color: 'bg-amber-50/80 border-amber-100/80 shadow-xs',
    },
    {
      icon: SecurityIcon,
      title: 'Privacy & Security',
      description: 'Bank-grade encryption, zero data selling, and explicit location controls ensure your discovery habits stay completely private.',
      color: 'bg-rose-50/80 border-rose-100/80 shadow-xs',
    },
  ];

  return (
    <section id="features" className="py-20 md:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-blue-600">
            Intelligent Location Capabilities
          </h2>
          <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Designed for Modern Discovery,{' '}
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
                backgroundImage: 'linear-gradient(90deg, #1A73E8, #4285F4, #9B51E0, #E91E63, #FF6D00, #4285F4)',
                backgroundSize: '300% 300%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Powered by Intent.
            </motion.span>
          </p>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Traditional maps only look at keywords. Nearby Locator analyzes context, preferences, travel constraints, and atmospheric quality to surface places you'll actually love.
          </p>
        </div>

        {/* 6 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${feature.color}`}>
                    <Icon />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-normal">
                    {feature.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <button
                    onClick={() => navigate('/discover')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <span>Learn More</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
