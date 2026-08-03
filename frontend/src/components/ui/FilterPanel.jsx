import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';

/**
 * FilterPanel Component
 * Advanced filter popover (desktop) and slide-up sheet (mobile).
 * Supports Radius, Minimum Rating, Open Now, and Category filters.
 */
export function FilterPanel({
  open = false,
  onClose = () => {},
  onApply = () => {},
  initialFilters = { radius: 5, rating: 0, openNow: false, category: '' },
  activeCount = 0
}) {
  const [radius, setRadius] = useState(initialFilters.radius || 5);
  const [rating, setRating] = useState(initialFilters.rating || 0);
  const [openNow, setOpenNow] = useState(initialFilters.openNow || false);
  const [category, setCategory] = useState(initialFilters.category || '');

  const panelRef = useRef(null);

  // Sync internal state when initialFilters changes or panel opens
  useEffect(() => {
    if (open) {
      setRadius(initialFilters.radius || 5);
      setRating(initialFilters.rating || 0);
      setOpenNow(initialFilters.openNow || false);
      setCategory(initialFilters.category || '');
    }
  }, [open, initialFilters]);

  // ESC keypress listener for accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const radiusOptions = [1, 2, 5, 10, 25, 50];
  const ratingOptions = [
    { value: 0, label: 'Any' },
    { value: 3.5, label: '3.5+' },
    { value: 4.0, label: '4.0+' },
    { value: 4.5, label: '4.5+' }
  ];
  const categories = ['', 'Cafe', 'Gym', 'Restaurant', 'Park', 'Work Pods'];

  const handleReset = () => {
    setRadius(5);
    setRating(0);
    setOpenNow(false);
    setCategory('');
  };

  const handleApply = () => {
    onApply({ radius, rating, openNow, category });
    onClose();
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9998] lg:hidden"
        aria-hidden="true"
      />

      {/* Main Panel Container */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Advanced Search Filters"
        className="fixed inset-x-0 bottom-0 z-[9999] lg:absolute lg:inset-auto lg:top-14 lg:right-0 lg:w-96 rounded-t-3xl lg:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-5 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">⚙️</span>
            <h3 className="text-sm font-heading font-bold text-slate-900 dark:text-slate-100">
              Discovery Filters
            </h3>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-mono font-bold">
                {activeCount} active
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Close filters"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 1. Radius Range Selection */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Distance Radius</span>
            <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{radius} km</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {radiusOptions.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadius(r)}
                className={`py-1.5 rounded-xl text-[11px] font-mono font-semibold transition-all ${
                  radius === r
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {r}km
              </button>
            ))}
          </div>
        </div>

        {/* 2. Minimum Rating Filter */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Minimum Rating
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {ratingOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRating(opt.value)}
                className={`py-1.5 rounded-xl text-xs font-medium transition-all ${
                  rating === opt.value
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                ⭐ {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Category Filter */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Category
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 px-3 outline-none focus:ring-2 focus:ring-blue-600/30"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === '' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Open Now Toggle */}
        <div className="flex items-center justify-between pt-1">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              Open Now
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
              Filter spots open right now
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={openNow}
            onClick={() => setOpenNow(!openNow)}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
              openNow ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-1 ${
                openNow ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="w-1/3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="w-2/3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
