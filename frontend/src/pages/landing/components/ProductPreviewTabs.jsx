import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SearchCode, MapPin, BookmarkCheck, Clock3, UserCheck, Sliders, Sparkles, Coffee, Wine, BookOpen } from 'lucide-react';

export default function ProductPreviewTabs() {
  const [activeTab, setActiveTab] = useState('search');

  const tabs = [
    { id: 'search', label: 'AI Search', icon: SearchCode },
    { id: 'map', label: 'Interactive Map', icon: MapPin },
    { id: 'saved', label: 'Saved Collections', icon: BookmarkCheck },
    { id: 'history', label: 'Search History', icon: Clock3 },
    { id: 'profile', label: 'Profile', icon: UserCheck },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  const tabContents = {
    search: {
      title: 'Neural Intent Search Engine',
      subtitle: 'Type long-form atmospheric requests and receive structured spatial results.',
      mock: (
        <div className="space-y-4">
          <div className="p-3.5 bg-white rounded-xl border border-blue-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SearchCode className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-800">"Quiet rooftop lounge with craft cocktails & city view"</span>
            </div>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg">AI Parsed</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <h5 className="font-bold text-sm text-slate-900">Skyline Sanctuary</h5>
              <p className="text-xs text-slate-500 mt-0.5">Rooftop Lounge • 1.8 km</p>
              <div className="mt-2 text-[11px] text-blue-700 bg-blue-50 p-2 rounded-lg font-medium">
                Rationale: Elevated rooftop + quiet acoustic acoustic layout + 4.9 cocktail rating.
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <h5 className="font-bold text-sm text-slate-900">Veranda Heights</h5>
              <p className="text-xs text-slate-500 mt-0.5">Craft Bar & Lounge • 2.5 km</p>
              <div className="mt-2 text-[11px] text-blue-700 bg-blue-50 p-2 rounded-lg font-medium">
                Rationale: Outdoor heated terrace with panoramic city views.
              </div>
            </div>
          </div>
        </div>
      ),
    },
    map: {
      title: 'Interactive Spatial Mapping',
      subtitle: 'Real-time radius overlays, traffic awareness, and location pins.',
      mock: (
        <div className="bg-slate-100 rounded-xl p-6 border border-slate-200 min-h-[220px] flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-center z-10">
            <span className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-slate-800 shadow-sm">
              Radius: 5.0 km
            </span>
            <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm">
              12 Pins Found
            </span>
          </div>
          <div className="my-8 text-center text-slate-500 font-medium text-xs z-10">
            [ Interactive Vector Map Layer Active ]
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 bg-white/90 p-2.5 rounded-lg z-10">
            <span>📍 Center: Current Location</span>
            <span className="font-bold text-blue-600">Auto-Update Radius</span>
          </div>
        </div>
      ),
    },
    saved: {
      title: 'Personalized Saved Collections',
      subtitle: 'Organize favorite places into custom lists for travel or work.',
      mock: (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
              <h5 className="font-bold text-sm text-slate-900">Study Spots</h5>
            </div>
            <p className="text-xs text-slate-500 mt-2">6 saved places</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <Wine className="w-4 h-4 text-rose-600 shrink-0" />
              <h5 className="font-bold text-sm text-slate-900">Client Dinners</h5>
            </div>
            <p className="text-xs text-slate-500 mt-2">4 saved places</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
              <h5 className="font-bold text-sm text-slate-900">Coffee Nooks</h5>
            </div>
            <p className="text-xs text-slate-500 mt-2">9 saved places</p>
          </div>
        </div>
      ),
    },
    history: {
      title: 'Context-Aware Search History',
      subtitle: 'Revisit past prompts and re-analyze previous recommendations anytime.',
      mock: (
        <div className="space-y-2">
          {['Quiet coffee shop with Wi-Fi near campus', 'Late night ramen open past midnight', 'Dog-friendly park with shade'].map((query, i) => (
            <div key={i} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs font-medium">
              <span className="text-slate-800">"{query}"</span>
              <span className="text-slate-400">2 days ago</span>
            </div>
          ))}
        </div>
      ),
    },
    profile: {
      title: 'User Profile & Preferences',
      subtitle: 'Manage your AI discovery profile, noise tolerance, and search defaults.',
      mock: (
        <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
              JD
            </div>
            <div>
              <h5 className="font-bold text-sm text-slate-900">John Doe</h5>
              <p className="text-xs text-slate-500">Premium Explorer Member</p>
            </div>
          </div>
          <div className="pt-2 flex gap-2 text-xs">
            <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-medium">Prefers Quiet Places</span>
            <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-medium">Walk Distance &lt; 2km</span>
          </div>
        </div>
      ),
    },
    settings: {
      title: 'Granular Account & Privacy Settings',
      subtitle: 'Control location accuracy, notification preferences, and data privacy.',
      mock: (
        <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">Precise Location Access</span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-md">Enabled</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-2">
            <span className="font-medium text-slate-800">AI Preference Learning</span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-md">Active</span>
          </div>
        </div>
      ),
    },
  };

  return (
    <section className="py-20 md:py-28 bg-slate-50 relative border-t border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <span className="px-3.5 py-1 rounded-full bg-blue-100/70 text-blue-700 text-xs sm:text-sm font-bold uppercase tracking-wider">
            Product Deep Dive
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Built for Seamless{' '}
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
              Every-Day Discovery
            </motion.span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal">
            Explore the core interfaces designed to give you instant clarity and intuitive control.
          </p>
        </div>

        {/* Tab Headers */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mockup Container */}
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-8">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h3 className="text-xl font-bold text-slate-900">{tabContents[activeTab].title}</h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">{tabContents[activeTab].subtitle}</p>
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {tabContents[activeTab].mock}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
