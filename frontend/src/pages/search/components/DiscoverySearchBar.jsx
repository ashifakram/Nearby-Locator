import React, { useState, useEffect, useRef } from 'react';
import { FilterPanel } from '../../../components/ui/FilterPanel';

export default function DiscoverySearchBar({
  value = '',
  onChange = () => {},
  onSearch = () => {},
  suggestions = [],
  loading = false,
  placeholder = 'Search spots, categories, or vibes...',
  selectedVibe = '',
  onVibeSelect = () => {},
  filters = { radius: 5, rating: 0, openNow: false, category: '' },
  onApplyFilters = () => {},
  activeFilterCount = 0
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const containerRef = useRef(null);


  // Load recent searches from memory
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nearby_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (err) {
      console.warn('Failed reading recent searches:', err);
    }
  }, []);

  const saveRecentSearch = (query) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 30) return;

    // Deduplicate case-insensitively
    const filtered = recentSearches.filter(
      (s) => s.toLowerCase() !== trimmed.toLowerCase()
    ).slice(0, 4);

    const updated = [trimmed, ...filtered];
    setRecentSearches(updated);

    try {
      localStorage.setItem('nearby_recent_searches', JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed saving recent search:', err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch(value);
      saveRecentSearch(value);
      setIsFocused(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categoryQuickHints = ['Cafe', 'Restaurant', 'Gym', 'Park', 'ATM', 'Gas'];

  // Emotional discovery vibe pivots (Objective 2 & 5)
  const emotionalVibes = [
    { key: 'calm', label: '☕ Quiet Cafe' },
    { key: 'gems', label: '⭐ Top Rated' },
    { key: 'active', label: '🏃 Active Hub' },
    { key: 'trusted', label: '🛡️ Verified' }
  ];

  return (
    <div ref={containerRef} className="relative w-full space-y-3 z-[99]">
      
      {/* 1. Interactive Animated Search Input (Focus Expansion) */}
      <div
        className={`relative flex items-center h-11 rounded-2xl px-4 transition-all duration-300 bg-slate-100/80 dark:bg-slate-900/80 border backdrop-blur-md shadow-sm ${
          isFocused
            ? 'border-blue-500/50 ring-2 ring-blue-500/10 bg-white dark:bg-slate-900'
            : 'border-slate-200/80 dark:border-slate-800/80'
        }`}
      >
        <span className="text-slate-400 mr-2.5 text-sm">🔍</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          disabled={loading}
          className="flex-grow bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-sans outline-none w-full"
        />

        {loading ? (
          <div className="w-4 h-4 rounded-full border-2 border-blue-500/20 border-t-blue-600 animate-spin shrink-0 mr-2" />
        ) : value ? (
          <button
            onClick={() => onChange('')}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold px-1.5 shrink-0 transition-colors mr-1"
          >
            ✕
          </button>
        ) : null}

        {/* Filter Panel Trigger Button */}
        <button
          type="button"
          onClick={() => setFilterOpen(!filterOpen)}
          aria-label="Open discovery filters"
          className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border ${
            activeFilterCount > 0
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 shadow-2xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <span>⚙️</span>
          <span className="hidden sm:inline">Filter</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-mono flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Reusable FilterPanel Popover / Drawer */}
      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={onApplyFilters}
        initialFilters={filters}
        activeCount={activeFilterCount}
      />


      {/* 2. Emotional vibe filtering pivots horizontal list (Objective 2) */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {emotionalVibes.map((vibe) => {
          const isActive = selectedVibe === vibe.key;
          return (
            <button
              key={vibe.key}
              onClick={() => onVibeSelect(isActive ? '' : vibe.key)}
              className={`px-3 py-1 rounded-full text-[11px] font-mono tracking-wider font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-500/40 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {vibe.label}
            </button>
          );
        })}
      </div>

      {/* 3. Autocomplete & Recent History overlay dropdowns */}
      {isFocused && (
        <div className="absolute top-14 left-0 right-0 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-2 shadow-2xl backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 z-[9999] overflow-hidden max-h-[260px] overflow-y-auto space-y-3">
          
          {/* Autocomplete suggestions */}
          {suggestions && suggestions.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-semibold px-2 uppercase tracking-wider">
                Suggestions Found
              </p>
              {suggestions.map((item, idx) => {
                const phrase = item.phrase || item.name || item;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onChange(phrase);
                      onSearch(phrase);
                      saveRecentSearch(phrase);
                      setIsFocused(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300 transition-colors duration-150 flex items-center gap-2"
                  >
                    <span>📍</span>
                    <span className="truncate">{phrase}</span>
                  </button>
                );
              })}
            </div>
          ) : value.trim().length >= 2 ? (
            <div className="text-center py-4 text-xs text-slate-500 dark:text-slate-400 font-sans">
              No direct autocompletes. Press enter to search fully.
            </div>
          ) : null}

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold px-2 uppercase tracking-wider">
                Recent Searches
              </p>
              {recentSearches.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onChange(item);
                    onSearch(item);
                    setIsFocused(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors duration-150 flex items-center gap-2"
                >
                  <span>⏱</span>
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </div>
          )}

          {/* Helper quick tips tags */}
          <div className="pt-1.5 border-t border-slate-200/80 dark:border-slate-800/80">
            <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-semibold px-2 uppercase tracking-wider mb-1.5">
              Explore categories
            </p>
            <div className="flex flex-wrap gap-1.5 px-2">
              {categoryQuickHints.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    onChange(cat);
                    onSearch(cat);
                    saveRecentSearch(cat);
                    setIsFocused(false);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[10px] text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/30 transition-all duration-150"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
