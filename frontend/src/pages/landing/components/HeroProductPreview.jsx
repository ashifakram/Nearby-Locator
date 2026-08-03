import React, { useState } from 'react';
import { motion } from 'framer-motion';
import GeminiSparkleIcon from '../../../icons/GeminiSparkleIcon';
import { Search, MapPin, Star, Bookmark, Clock, Navigation, Sparkles, Coffee, Wifi, Trees, Footprints, Car, ShieldCheck, Compass, Check } from 'lucide-react';

export default function HeroProductPreview() {
  const [savedItems, setSavedItems] = useState([1]);
  const [selectedPin, setSelectedPin] = useState(1);

  const mockPlaces = [
    {
      id: 1,
      name: 'Artisan & Bean Co.',
      category: 'Quiet Specialty Coffee',
      rating: 4.9,
      reviews: 142,
      distance: '1.2 km',
      driveTime: '4 min drive',
      walkTime: '12 min walk',
      reasoning: 'Matches "Quiet atmosphere" (85% noise level low) + High-Speed Wi-Fi (120Mbps) & Patio',
      tags: ['Quiet Work', 'Fast Wi-Fi', 'Patio Seating', 'Outlets Available'],
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 2,
      name: 'Gardenia Roastery',
      category: 'Coffee & Greenhouse',
      rating: 4.8,
      reviews: 98,
      distance: '2.4 km',
      driveTime: '7 min drive',
      walkTime: '22 min walk',
      reasoning: 'Outdoor garden seating + strong Wi-Fi. Moderately busy during peak hours.',
      tags: ['Spacious Outdoor', 'Wi-Fi', 'Pet Friendly'],
      image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80',
    },
  ];

  const toggleSave = (id) => {
    setSavedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="relative w-full max-w-xl mx-auto lg:max-w-none">
      {/* Glow Effect Background */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-teal-500/20 rounded-3xl blur-2xl opacity-70" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden"
      >
        {/* Mock App Window Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-400/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-400/80 inline-block" />
            <span className="ml-2 text-xs font-semibold text-slate-500 tracking-wide">Nearby Locator App</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-50 to-blue-50 text-purple-900 rounded-full text-[11px] font-bold border border-purple-200/80 shadow-xs">
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
            <span>Gemini AI Engine</span>
          </div>
        </div>

        {/* Mock Search Bar Header */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-blue-600" />
            <input
              type="text"
              readOnly
              value="Quiet coffee shop with Wi-Fi & outdoor seating within 3km"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-blue-200 text-slate-800 text-xs sm:text-sm font-medium shadow-sm focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="px-2.5 py-1 rounded-full bg-blue-100/70 text-blue-800 font-medium">✨ Intent: Work Spot</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">📍 &lt; 3.0 km</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">📶 High Speed Wi-Fi</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">🌿 Outdoor Patio</span>
          </div>
        </div>

        {/* App Content Split: Left List & Right Mini Map */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50/30">
          {/* Places List (7 Cols) */}
          <div className="md:col-span-7 space-y-3">
            {mockPlaces.map((place) => {
              const isSaved = savedItems.includes(place.id);
              const isSelected = selectedPin === place.id;
              return (
                <motion.div
                  key={place.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setSelectedPin(place.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/10'
                      : 'bg-white border-slate-200 hover:border-blue-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {place.name}
                        {isSelected && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-blue-600 text-white font-semibold rounded">
                            Top Match
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">{place.category}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSave(place.id);
                      }}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isSaved
                          ? 'bg-blue-50 border-blue-200 text-blue-600'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-blue-600' : ''}`} />
                    </button>
                  </div>

                  {/* Rating & Distance */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {place.rating}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="w-3 h-3 text-slate-400" /> {place.distance}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Car className="w-3 h-3 text-slate-400" /> {place.driveTime}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Footprints className="w-3 h-3 text-slate-400" /> {place.walkTime}
                    </span>
                  </div>

                  {/* AI Reasoning Panel */}
                  <div className="mt-2.5 p-2 rounded-lg bg-blue-50/60 border border-blue-100 text-[10.5px] text-blue-900 leading-tight flex items-start gap-1.5">
                    <Sparkles className="w-3 h-3 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-semibold text-blue-950">AI Rationale: </strong>
                      {place.reasoning}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Mini Interactive Map View (5 Cols) */}
          <div className="md:col-span-5 relative rounded-xl bg-slate-200/70 border border-slate-200 min-h-[220px] overflow-hidden flex flex-col justify-between p-3">
            {/* Fake SVG Map Grid Lines */}
            <div className="absolute inset-0 opacity-40">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#94A3B8" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Map Controls Header */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-md text-[10px] font-bold text-slate-700 shadow-sm border border-slate-200">
                Live Spatial Radius: 3.0 km
              </span>
              <div className="p-1 bg-white rounded-md shadow-sm border border-slate-200 text-slate-600">
                <Compass className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Interactive Pins */}
            <div className="relative z-10 my-8 flex items-center justify-around">
              {/* Pin 1 */}
              <motion.div
                animate={{ y: selectedPin === 1 ? [0, -4, 0] : 0 }}
                transition={{ repeat: Infinity, duration: 2 }}
                onClick={() => setSelectedPin(1)}
                className={`relative cursor-pointer flex flex-col items-center group`}
              >
                <div className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full shadow-lg flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" /> 4.9
                </div>
                <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md -mt-1" />
              </motion.div>

              {/* Pin 2 */}
              <motion.div
                animate={{ y: selectedPin === 2 ? [0, -4, 0] : 0 }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                onClick={() => setSelectedPin(2)}
                className={`relative cursor-pointer flex flex-col items-center group`}
              >
                <div className="px-2 py-0.5 bg-slate-800 text-white text-[10px] font-bold rounded-full shadow-lg">
                  4.8
                </div>
                <div className="w-3.5 h-3.5 bg-slate-800 rounded-full border-2 border-white shadow-md -mt-1" />
              </motion.div>
            </div>

            {/* Map Footer Indicator */}
            <div className="relative z-10 flex items-center justify-between bg-white/90 backdrop-blur-sm p-2 rounded-lg border border-slate-200/80 text-[10px] text-slate-600">
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                <Navigation className="w-3 h-3 text-blue-600" /> Travel Time: 4 mins
              </span>
              <span className="text-blue-600 font-bold">Directions →</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating Micro Feature Card 1 (Bottom Left) */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden sm:flex absolute -bottom-5 -left-6 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xl items-center gap-3 z-30 max-w-[210px]"
      >
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h5 className="text-xs font-bold text-slate-900">100% Intent Match</h5>
          <p className="text-[10px] text-slate-500 font-medium">Verified by AI reasoning</p>
        </div>
      </motion.div>

      {/* Floating Micro Feature Card 2 (Top Right) */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden sm:flex absolute -top-5 -right-6 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xl items-center gap-3 z-30 max-w-[200px]"
      >
        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
          <Check className="w-5 h-5" />
        </div>
        <div>
          <h5 className="text-xs font-bold text-slate-900">Saved Collection</h5>
          <p className="text-[10px] text-slate-500 font-medium">1-click sync to mobile</p>
        </div>
      </motion.div>
    </div>
  );
}
