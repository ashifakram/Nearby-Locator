import React, { useState } from 'react';
import { motion } from 'framer-motion';
import GeminiSparkleIcon from '../../../icons/GeminiSparkleIcon';
import { Sparkles, User, Bot, MapPin, Clock, Star, ArrowRight, ShieldCheck, Heart, Coffee, Utensils, BookOpen, Wifi, Footprints, Car, BrainCircuit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AIShowcaseSection() {
  const navigate = useNavigate();
  const [selectedPrompt, setSelectedPrompt] = useState(0);

  const prompts = [
    {
      query: 'Find a quiet coffee shop with Wi-Fi and outdoor seating within 3 km.',
      aiResponse: 'I found 3 places matching your exact criteria: quiet atmosphere, high-speed Wi-Fi, outdoor seating, and under 3 km.',
      results: [
        {
          name: 'The Espresso Lab & Garden',
          type: 'Specialty Coffee & Bakery',
          distance: '1.4 km',
          travelTime: '5 min drive • 14 min walk',
          rating: 4.9,
          reasoning: 'Extremely quiet background noise levels (< 45dB). Features a shaded rear garden with 150Mbps Wi-Fi.',
          matchPercent: '99% Match',
        },
        {
          name: 'Brew & Botanicals',
          type: 'Artisanal Cafe',
          distance: '2.1 km',
          travelTime: '7 min drive • 22 min walk',
          rating: 4.8,
          reasoning: 'Outdoor patio with dedicated work tables. Wi-Fi verified at 90Mbps.',
          matchPercent: '94% Match',
        },
      ],
    },
    {
      query: 'Best romantic dinner spot with vegan options and low lighting within 5 km.',
      aiResponse: 'Analyzed 58 dining venues. Filtered for candlelit ambiance, dedicated plant-based menus, and distance.',
      results: [
        {
          name: 'LUMEN Fine Dining',
          type: 'Modern Mediterranean',
          distance: '3.2 km',
          travelTime: '10 min drive',
          rating: 4.9,
          reasoning: 'Dedicated vegan tasting menu, intimate seating, dim acoustic lighting, 4.9/5 romance rating.',
          matchPercent: '98% Match',
        },
      ],
    },
    {
      query: 'Late night study library or cafe open past 11 PM with power sockets.',
      aiResponse: 'Found 2 venues open past 11 PM near campus with accessible wall outlets and quiet study zones.',
      results: [
        {
          name: 'Midnight Chapter Study Cafe',
          type: '24/7 Study Lounge',
          distance: '0.8 km',
          travelTime: '9 min walk',
          rating: 4.7,
          reasoning: 'Open 24 Hours. Power sockets at every desk. Silent policy on 2nd floor.',
          matchPercent: '100% Match',
        },
      ],
    },
  ];

  const current = prompts[selectedPrompt];

  return (
    <section id="ai-showcase" className="py-20 md:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-50 via-blue-50 to-pink-50 text-purple-900 border border-purple-200/80 text-xs font-bold uppercase tracking-wider shadow-xs">
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
            <span>Powered by Google Gemini AI</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Ask Naturally.{' '}
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
              Gemini Explains Why.
            </motion.span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            See how Google Gemini AI parses complex natural requests and provides transparent spatial rationale for every location.
          </p>
        </div>

        {/* Prompt Selector Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
          {prompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedPrompt(idx)}
              className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                selectedPrompt === idx
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60'
              }`}
            >
              Example {idx + 1}
            </button>
          ))}
        </div>

        {/* Mock Chat Window Showcase */}
        <div className="max-w-4xl mx-auto bg-slate-50 rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white flex items-center justify-center font-bold shadow-2xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  Nearby Locator Assistant
                  <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    Gemini AI
                  </span>
                </h4>
                <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Intent & Reasoning Engine
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/discover')}
              className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Try Yourself →
            </button>
          </div>

          {/* Chat Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* User Message Bubble */}
            <motion.div
              key={`user-${selectedPrompt}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3 justify-end"
            >
              <div className="bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none text-sm max-w-xl shadow-md font-medium">
                <p>{current.query}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
            </motion.div>

            {/* AI Response Header */}
            <motion.div
              key={`ai-${selectedPrompt}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 text-slate-800 p-4 rounded-2xl rounded-tl-none text-sm max-w-xl shadow-sm space-y-2">
                <p className="font-semibold text-slate-900">{current.aiResponse}</p>
              </div>
            </motion.div>

            {/* Recommended Place Cards */}
            <div className="pl-11 space-y-4">
              {current.results.map((res, idx) => (
                <motion.div
                  key={res.name}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {idx === 0 ? (
                          <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
                        ) : selectedPrompt === 1 ? (
                          <Utensils className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : (
                          <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                        <h4 className="text-base font-bold text-slate-900">{res.name}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          {res.matchPercent}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium pl-6">{res.type}</p>
                    </div>
                    <span className="flex items-center gap-1 text-amber-500 font-bold text-xs bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/60">
                      <Star className="w-3.5 h-3.5 fill-amber-400" /> {res.rating}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" /> {res.distance}
                    </span>
                    <span className="flex items-center gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {res.travelTime}
                    </span>
                  </div>

                  {/* AI Rationale Box */}
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-950 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-blue-900">Why recommended: </strong>
                      {res.reasoning}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
