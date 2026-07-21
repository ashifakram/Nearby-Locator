import React, { useState, useEffect, useRef } from 'react';

export default function DiscoverySearchBar({
  value = '',
  onChange = () => {},
  onSearch = () => {},
  suggestions = [],
  loading = false,
  placeholder = 'Search by spot name or category...',
  selectedVibe = '',
  onVibeSelect = () => {}
}) {
  const [isFocused, setIsFocused] = useState(false);
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
        className={`relative flex items-center h-12 rounded-2xl px-4 transition-all duration-400 bg-slate-950/70 border backdrop-blur-md shadow-2xl ${
          isFocused ? 'border-cyan-500/40 ring-2 ring-cyan-500/10 scale-[1.01]' : 'border-slate-850'
        }`}
      >
        <span className="text-slate-500 mr-3">🔍</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          disabled={loading}
          className="flex-grow bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none w-full"
        />

        {loading ? (
          <div className="w-5 h-5 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin flex-shrink-0" />
        ) : value ? (
          <button
            onClick={() => onChange('')}
            className="text-xs text-slate-500 hover:text-slate-300 font-bold px-1.5 flex-shrink-0"
          >
            ✕
          </button>
        ) : null}
      </div>

      {/* 2. Emotional vibe filtering pivots horizontal list (Objective 2) */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hidden pb-1">
        {emotionalVibes.map((vibe) => {
          const isActive = selectedVibe === vibe.key;
          return (
            <button
              key={vibe.key}
              onClick={() => onVibeSelect(isActive ? '' : vibe.key)}
              className={`px-3 py-1 rounded-full text-[10px] font-mono tracking-wider font-semibold whitespace-nowrap transition-all duration-300 ${
                isActive
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {vibe.label}
            </button>
          );
        })}
      </div>

      {/* 3. Autocomplete & Recent History overlay dropdowns */}
      {isFocused && (
        <div className="absolute top-14 left-0 right-0 rounded-2xl border border-slate-850 p-2 shadow-2xl backdrop-blur-xl bg-slate-950/95 z-[9999] overflow-hidden max-h-[260px] overflow-y-auto space-y-3">
          
          {/* Autocomplete suggestions */}
          {suggestions && suggestions.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[10px] font-mono text-cyan-400 font-semibold px-2 uppercase tracking-wider">
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
                    className="w-full text-left px-2 py-1.5 rounded-xl hover:bg-slate-900 text-xs text-slate-300 transition-colors duration-150 flex items-center gap-2"
                  >
                    <span>📍</span>
                    <span className="truncate">{phrase}</span>
                  </button>
                );
              })}
            </div>
          ) : value.trim().length >= 2 ? (
            <div className="text-center py-4 text-xs text-slate-500 font-body">
              No direct autocompletes. Press enter to search fully.
            </div>
          ) : null}

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-mono text-slate-500 font-semibold px-2 uppercase tracking-wider">
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
                  className="w-full text-left px-2 py-1.5 rounded-xl hover:bg-slate-900 text-xs text-slate-400 hover:text-slate-300 transition-colors duration-150 flex items-center gap-2"
                >
                  <span>⏱</span>
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </div>
          )}

          {/* Helper quick tips tags */}
          <div className="pt-1.5 border-t border-slate-900">
            <p className="text-[9px] font-mono text-slate-500 font-semibold px-2 uppercase tracking-wider mb-1.5">
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
                  className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-850 text-[10px] text-slate-400 hover:text-white hover:border-cyan-500/30 transition-all duration-150"
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
