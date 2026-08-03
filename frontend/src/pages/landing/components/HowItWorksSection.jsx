import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Brain, MapPin, BarChart3, HelpCircle, Bookmark, CheckCircle2 } from 'lucide-react';

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      number: '01',
      title: 'You Search',
      subtitle: 'Natural language query input',
      icon: Search,
      description: 'Describe what you want naturally in your own words, including atmosphere, noise level, amenities, or walk time.',
      example: '"Quiet laptop-friendly café with patio and outlets within 15 minutes walk"',
    },
    {
      number: '02',
      title: 'AI Understands Intent',
      subtitle: 'Neural entity extraction',
      icon: Brain,
      description: 'Our AI model breaks down your query into implicit constraints (noise < 50dB, power outlets = true, distance <= 1.5km).',
      example: 'Parsed: Work Vibe (88%) + Outlets (Required) + Walk (1.5km)',
    },
    {
      number: '03',
      title: 'Analyzes Context',
      subtitle: 'Real-time spatial & temporal data',
      icon: MapPin,
      description: 'Cross-references live traffic, open hours, weather conditions, and crowd densities around your current location.',
      example: 'Evaluating 42 nearby venues within 1.5km radius...',
    },
    {
      number: '04',
      title: 'Ranks Results',
      subtitle: 'Multi-factor match scoring',
      icon: BarChart3,
      description: 'Orders venues using a personalized confidence index rather than generic star averages or paid ad placements.',
      example: '#1 Artisan Bean (98% Match) | #2 Gardenia (91% Match)',
    },
    {
      number: '05',
      title: 'Explains Why',
      subtitle: 'Transparent AI rationale',
      icon: HelpCircle,
      description: 'Provides a clear breakdown of *why* each recommendation fits your specific query so you can make confident decisions.',
      example: '"Selected because it features dedicated quiet zones and 120Mbps fiber Wi-Fi."',
    },
    {
      number: '06',
      title: 'Save Favorites',
      subtitle: 'Instant collection sync',
      icon: Bookmark,
      description: 'Bookmark locations into custom collections like "Study Spots" or "Client Dinners" accessible anywhere.',
      example: 'Added to "Weekend Work Nooks" collection',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-slate-50 relative border-y border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="px-3.5 py-1 rounded-full bg-blue-100/70 text-blue-700 text-xs sm:text-sm font-bold uppercase tracking-wider">
            Intelligent Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            How Nearby Locator{' '}
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
              Transforms Discovery
            </motion.span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            From natural sentence to perfect location match in less than 2 seconds. Here is how our AI engine processes your request.
          </p>
        </div>

        {/* Desktop Step Nav Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-12">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeStep === idx;
            return (
              <button
                key={step.number}
                onClick={() => setActiveStep(idx)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/10'
                    : 'bg-white/60 border-slate-200/80 hover:bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                    {step.number}
                  </span>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>
                <h4 className={`text-xs font-bold mt-3 ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                  {step.title}
                </h4>
              </button>
            );
          })}
        </div>

        {/* Selected Step Focused Details Box */}
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
        >
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
              <span>Step {steps[activeStep].number} of 06</span>
              <span>•</span>
              <span>{steps[activeStep].subtitle}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {steps[activeStep].title}
            </h3>

            <p className="text-slate-600 text-base leading-relaxed font-normal">
              {steps[activeStep].description}
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-mono flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-slate-400 block font-sans uppercase tracking-wider mb-1">
                  Live System Signal
                </span>
                <span>{steps[activeStep].example}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white space-y-4 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              {React.createElement(steps[activeStep].icon, { className: 'w-6 h-6' })}
            </div>
            <h4 className="text-xl font-bold">Step {steps[activeStep].number}: {steps[activeStep].title}</h4>
            <p className="text-blue-100 text-xs leading-relaxed">
              Every query is computed on-the-fly using deep neural spatial indexes to deliver 10x higher relevance than traditional map queries.
            </p>
            <div className="pt-2 text-[11px] font-semibold text-blue-200 uppercase tracking-widest flex items-center gap-1.5">
              <span>Next Step: Step {activeStep < 5 ? `0${activeStep + 2}` : '01'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
