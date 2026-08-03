import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '../../store/useUIStore';
import { useToastStore } from '../../store/useToastStore';
import { queryKeys } from '../../lib/queryKeys';
import { spotsService } from '../../services/spots';
import { normalizeError } from '../../utils/errors';
import useSearchState from '../../features/chat-discovery/hooks/useSearchState';

// Subcomponents
import SpatialMap from './components/SpatialMap';
import DiscoverySearchBar from './components/DiscoverySearchBar';
import { SpotCard } from '../../components/ui/SpotCard';
import { PlaceDetailDrawer } from '../../components/ui/PlaceDetailDrawer';

const COORDINATE_EPSILON = 0.0001;

export default function SearchPage() {
  const { isDark } = useUIStore();
  const { showToast } = useToastStore();
  const searchState = useSearchState();

  const [input, setInput] = useState(searchState.q || '');
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredSpotId, setHoveredSpotId] = useState(null);
  const [selectedSpot, setSelectedSpot] = useState(null);
  
  // Mobile Collapsible Sheet state
  const [sheetExpanded, setSheetExpanded] = useState(false);
  
  // Coached GPS permissions onboarding state
  const [onboardingOpen, setOnboardingOpen] = useState(true);

  // Emotional discovery vibe selection state (Objective 2)
  const [selectedVibe, setSelectedVibe] = useState('');

  // Advanced FilterPanel state
  const [filters, setFilters] = useState({
    radius: searchState.radius || 5,
    rating: 0,
    openNow: false,
    category: ''
  });

  const activeFilterCount = useMemo(
    () =>
      (filters.radius !== 5 ? 1 : 0) +
      (filters.rating > 0 ? 1 : 0) +
      (filters.openNow ? 1 : 0) +
      (filters.category ? 1 : 0),
    [filters]
  );

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    if (newFilters.radius !== searchState.radius) {
      searchState.setRadius(newFilters.radius);
    }
    handleSearch(input, newFilters.radius);
  };

  // Discovered Coordinates history memory (Objective 11)
  const [discoveredHistory, setDiscoveredHistory] = useState([]);

  // Search error state
  const [searchError, setSearchError] = useState(null);


  // Keyboard navigation & card DOM reference map
  const cardRefs = useRef({});
  const [keyboardIndex, setKeyboardIndex] = useState(-1);

  // Smoothly scroll selected card into view on desktop
  useEffect(() => {
    if (selectedSpot) {
      const spotId = selectedSpot.id || selectedSpot.spotId;
      if (cardRefs.current[spotId]) {
        cardRefs.current[spotId].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedSpot]);

  // Load explored history on bootstrap
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nearby_discovered_history');
      if (stored) {
        setDiscoveredHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.warn('Failed loading discovery history:', err);
    }
  }, []);

  // Update geodiscovery history list when a spot gets selected (Objective 11)
  useEffect(() => {
    if (selectedSpot && selectedSpot.name && !selectedSpot.id?.startsWith('curio-')) {
      setDiscoveredHistory((prevHistory) => {
        const filtered = prevHistory.filter(
          (item) => (item.id || item.spotId) !== (selectedSpot.id || selectedSpot.spotId)
        ).slice(0, 3); // Max 4 history listings total
        const updated = [selectedSpot, ...filtered];
        try {
          localStorage.setItem('nearby_discovered_history', JSON.stringify(updated));
        } catch (err) {
          console.warn('Failed saving discovery history:', err);
        }
        return updated;
      });
    }
  }, [selectedSpot]);

  // Set default San Francisco Bryant coordinates
  useEffect(() => {
    if (!searchState.lat || !searchState.lng) {
      searchState.setCoordinates(37.7749, -122.4194);
    }
  }, [searchState]);

  // Autocomplete Query triggers with 5-min staleTime cache
  const { data: suggestions } = useQuery({
    queryKey: queryKeys.spots.list({ autocomplete: input }),
    queryFn: () => spotsService.autocomplete({ q: input }),
    enabled: input.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const handleSearch = async (queryStr, radiusOverride = null, latOverride = null, lngOverride = null) => {
    setLoading(true);
    try {
      const activeRadius = radiusOverride || searchState.radius;
      const radiusMeters = activeRadius * 1000;
      const activeLat = latOverride !== null && latOverride !== undefined ? latOverride : (searchState.lat || 37.7749);
      const activeLng = lngOverride !== null && lngOverride !== undefined ? lngOverride : (searchState.lng || -122.4194);

      if (latOverride !== null && lngOverride !== null && latOverride !== undefined && lngOverride !== undefined) {
        searchState.setCoordinates(latOverride, lngOverride);
      }

      const data = await spotsService.search({
        lat: activeLat,
        lng: activeLng,
        radius: radiusMeters,
        q: queryStr || undefined
      });


      const resolvedSpots = data.data || data.spots || (Array.isArray(data) ? data : []);
      setSpots(resolvedSpots);

      // Cache successful response in localStorage (Objective 9)
      if (resolvedSpots.length > 0) {
        localStorage.setItem('nearby_discovery_cache', JSON.stringify(resolvedSpots));
      }

      if (resolvedSpots.length > 0) {
        showToast(`Located ${resolvedSpots.length} premium spots!`, 'success');
        
        let targetSpot = resolvedSpots[0];
        
        // The backend orders search results by composite_score rather than exact coordinate proximity. 
        // When deep-linking from Saved Places, we first attempt to locate the exact coordinate match 
        // before falling back to the default ranked result.
        if (searchState.lat !== null && searchState.lng !== null) {
          const exactMatch = resolvedSpots.find(s => 
            Math.abs(s.latitude - searchState.lat) < COORDINATE_EPSILON && 
            Math.abs(s.longitude - searchState.lng) < COORDINATE_EPSILON
          );
          if (exactMatch) {
            targetSpot = exactMatch;
          }
        }
        
        setSelectedSpot(targetSpot);
      } else {
        showToast('No spots located inside search radius.', 'info');
      }

      setSearchError(null);
      setOnboardingOpen(false);
    } catch (err) {
      // Graceful offline fallback load (Objective 3 & 9)
      const cached = localStorage.getItem('nearby_discovery_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        setSpots(parsed);
        if (parsed.length > 0) {
          setSelectedSpot(parsed[0]);
        }
        showToast('Degraded connection. Loaded persistent nearby cache.', 'info');
      } else {
        const friendlyErr = normalizeError(err);
        setSearchError(friendlyErr);
        showToast(`Search failed: ${friendlyErr}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Coached Geolocation permission
  const requestBrowserGeolocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      setOnboardingOpen(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        searchState.setCoordinates(pos.coords.latitude, pos.coords.longitude);
        showToast('Location coordinates updated successfully!', 'success');
        setOnboardingOpen(false);
        setTimeout(() => handleSearch(''), 300);
      },
      (err) => {
        showToast('Permission denied. Defaulting to Bryant district coordinates.', 'info');
        setOnboardingOpen(false);
        setTimeout(() => handleSearch(''), 300);
      }
    );
  };

  useEffect(() => {
    handleSearch(searchState.q || '');
  }, []);

  // Filter spots dynamically by vibe pivots & FilterPanel criteria (Memoized)
  const filteredSpotsList = useMemo(() => {
    let result = spots;

    if (selectedVibe) {
      result = result.filter((spot) => {
        if (selectedVibe === 'calm') return spot.category?.toLowerCase().includes('cafe') || spot.rating >= 4.7;
        if (selectedVibe === 'gems') return spot.rating >= 4.8;
        if (selectedVibe === 'active') return spot.category?.toLowerCase().includes('gym') || spot.category?.toLowerCase().includes('restaurant');
        if (selectedVibe === 'trusted') return spot.rating >= 4.6;
        return true;
      });
    }

    if (filters.rating > 0) {
      result = result.filter((spot) => (spot.rating || 0) >= filters.rating);
    }

    if (filters.category) {
      result = result.filter((spot) => spot.category?.toLowerCase().includes(filters.category.toLowerCase()));
    }

    if (filters.openNow) {
      result = result.filter((spot) => spot.is_open !== false);
    }

    return result;
  }, [spots, selectedVibe, filters]);

  // Human-centered discovery badges generator
  const getEmotionalTag = (spot) => {
    if (spot.rating >= 4.8) return { label: '⭐ Top Rated', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' };
    if (spot.distance <= 600) return { label: '📍 5-Min Walk', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' };
    if (spot.category?.toLowerCase().includes('cafe')) return { label: '☕ Cafe Workspace', color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' };
    return { label: '🛡️ Verified', color: 'text-slate-600 dark:text-slate-400 bg-slate-500/10' };
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden relative bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      
      {/* ========================================== */}
      {/* 1. LEFT PANEL: Exploration Console (420px Fixed) */}
      {/* ========================================== */}
      <aside className="hidden lg:flex w-[420px] h-full flex-col border-r border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md relative z-10 shrink-0">
        
        {/* Sticky Search & Filter header container */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 space-y-3 shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
          <DiscoverySearchBar
            value={input}
            onChange={setInput}
            onSearch={handleSearch}
            suggestions={suggestions}
            loading={loading}
            placeholder="Search spots, categories, or vibes..."
            selectedVibe={selectedVibe}
            onVibeSelect={setSelectedVibe}
            filters={filters}
            onApplyFilters={handleApplyFilters}
            activeFilterCount={activeFilterCount}
          />

          {/* Active coordinate controls */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono text-[11px] font-medium">Radius: {searchState.radius} km</span>
            <button
              onClick={() => {
                const nextRadius = searchState.radius === 1 ? 2 : searchState.radius === 2 ? 5 : 1;
                searchState.setRadius(nextRadius);
                handleSearch(input, nextRadius);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-blue-600 dark:text-blue-400 font-mono font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Adjust Radius
            </button>
          </div>
        </div>

        {/* Scrollable list of verified result cards */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4 focus-visible:outline-none"
          tabIndex={0}
          onKeyDown={(e) => {
            if (!filteredSpotsList.length) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              const nextIndex = (keyboardIndex + 1) % filteredSpotsList.length;
              setKeyboardIndex(nextIndex);
              setSelectedSpot(filteredSpotsList[nextIndex]);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              const prevIndex = keyboardIndex <= 0 ? filteredSpotsList.length - 1 : keyboardIndex - 1;
              setKeyboardIndex(prevIndex);
              setSelectedSpot(filteredSpotsList[prevIndex]);
            } else if (e.key === 'Escape') {
              if (selectedSpot) setSelectedSpot(null);
            }
          }}
        >
          
          {loading ? (
            <div className="space-y-3">
              <SpotCard isLoading={true} />
              <SpotCard isLoading={true} />
              <SpotCard isLoading={true} />
              <SpotCard isLoading={true} />
            </div>
          ) : searchError ? (
            /* Error & Retry State */
            <div className="py-12 flex flex-col items-center justify-center text-center px-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-500">
                ⚠️
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-heading font-bold text-slate-900 dark:text-slate-100">Unable to load discovery spots</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed">
                  {searchError || 'Network connection interrupted. Please check your connection and retry.'}
                </p>
              </div>
              <button
                onClick={() => handleSearch(input)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-md hover:bg-blue-700 transition-colors"
              >
                🔄 Retry Search
              </button>
            </div>
          ) : filteredSpotsList.length > 0 ? (
            <div className="space-y-3">
              {filteredSpotsList.map((spot, idx) => {
                const isHovered = hoveredSpotId === spot.id || hoveredSpotId === spot.spotId;
                const isSelected = selectedSpot?.id === spot.id || selectedSpot?.spotId === spot.spotId;
                const spotId = spot.id || spot.spotId;

                return (
                  <div key={spotId} ref={(el) => (cardRefs.current[spotId] = el)}>
                    <SpotCard
                      spot={spot}
                      isSelected={isSelected}
                      isHovered={isHovered}
                      onSelect={(selected) => {
                        setKeyboardIndex(idx);
                        setSelectedSpot(selected);
                      }}
                      onMouseEnter={() => setHoveredSpotId(spotId)}
                      onMouseLeave={() => setHoveredSpotId(null)}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            /* Delightful Recovery Empty State */
            <div className="py-12 flex flex-col items-center justify-center text-center px-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 flex items-center justify-center text-lg">
                📍
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-heading font-bold text-slate-800 dark:text-slate-200">No spots resolved in this vibe</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[220px] leading-relaxed">
                  Broaden the camera scanning radius or toggle back to standard filters.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-[220px] pt-1">
                <button
                  onClick={() => {
                    searchState.setRadius(5);
                    handleSearch(input, 5);
                  }}
                  className="px-3 py-2 rounded-xl bg-blue-600 text-white text-[11px] font-medium shadow-sm hover:bg-blue-700 transition-colors"
                >
                  Expand Range to 5km
                </button>
                <button
                  onClick={() => {
                    setSelectedVibe('');
                    setInput('');
                    handleSearch('');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Clear All Filters & Reset Search
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Adjacent Exploration Continuation Flows */}
          {selectedSpot && !loading && (
            <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border">
              <p className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold tracking-wider uppercase">
                What else nearby feels worth exploring?
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                Adjacent geocells highlight secondary points within 10 minutes walking space:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setInput('Coffee');
                    handleSearch('Coffee');
                  }}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-blue-500/40 text-[11px] text-left text-slate-700 dark:text-slate-300 transition-all duration-150 shadow-sm"
                >
                  ☕ Grab Coffee
                </button>
                <button
                  onClick={() => {
                    setInput('Park');
                    handleSearch('Park');
                  }}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-blue-500/40 text-[11px] text-left text-slate-700 dark:text-slate-300 transition-all duration-150 shadow-sm"
                >
                  🌳 Walk in Park
                </button>
              </div>
            </div>
          )}

          {/* Explored Coordinates memory history */}
          {discoveredHistory.length > 0 && (
            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                Exploration History
              </p>
              <div className="flex flex-col gap-1.5">
                {discoveredHistory.map((hist, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSpot(hist)}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors duration-150 flex items-center justify-between"
                  >
                    <span className="truncate">📍 {hist.name}</span>
                    <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">REVISIT</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </aside>

      {/* ========================================== */}
      {/* 2. RIGHT PANEL: Vector Map */}
      {/* ========================================== */}
      <section className="flex-grow h-full relative z-0">
        <SpatialMap
          spots={spots}
          hoveredSpotId={hoveredSpotId}
          setHoveredSpotId={setHoveredSpotId}
          selectedSpot={selectedSpot}
          setSelectedSpot={setSelectedSpot}
          centerLat={searchState.lat || 37.7749}
          centerLng={searchState.lng || -122.4194}
          radiusMeters={searchState.radius * 1000}
          discoveredHistory={discoveredHistory}
          isSearchingArea={loading}
          onSearchArea={({ lat, lng }) => {
            handleSearch(input, null, lat, lng);
          }}
        />

      </section>

      {/* ========================================== */}
      {/* 3. MOBILE INTERFACE */}
      {/* ========================================== */}
      <div className="absolute top-4 left-4 right-4 lg:hidden z-30">
        <DiscoverySearchBar
          value={input}
          onChange={setInput}
          onSearch={handleSearch}
          suggestions={suggestions}
          loading={loading}
          placeholder="Explore nearby spots..."
          selectedVibe={selectedVibe}
          onVibeSelect={setSelectedVibe}
          filters={filters}
          onApplyFilters={handleApplyFilters}
          activeFilterCount={activeFilterCount}
        />
      </div>

      {/* Mobile Collapsible Sheet placeholder */}
      <div
        className={`absolute bottom-0 left-0 right-0 lg:hidden rounded-t-[32px] border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-30 flex flex-col transition-all duration-300 shadow-2xl ${
          sheetExpanded ? 'h-[60vh]' : 'h-[170px]'
        }`}
      >
        <div
          onClick={() => setSheetExpanded(!sheetExpanded)}
          className="w-full py-3 flex items-center justify-center cursor-pointer active:bg-slate-100 dark:active:bg-slate-800/40 rounded-t-[32px]"
        >
          <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        <div className="px-5 pb-3 flex justify-between items-center text-xs border-b border-slate-200/80 dark:border-slate-800/80 shrink-0">
          <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
            {filteredSpotsList.length} spots resolved
          </span>
          <button
            onClick={() => setSheetExpanded(!sheetExpanded)}
            className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-semibold"
          >
            {sheetExpanded ? 'COLLAPSE' : 'EXPAND'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredSpotsList.slice(0, sheetExpanded ? undefined : 2).map((spot) => {
            const isSelected = selectedSpot?.id === spot.id || selectedSpot?.spotId === spot.spotId;

            return (
              <SpotCard
                key={spot.id || spot.spotId}
                spot={spot}
                isSelected={isSelected}
                onSelect={(selected) => {
                  setSelectedSpot(selected);
                  if (sheetExpanded) setSheetExpanded(false);
                }}
              />
            );
          })}

          {/* Mobile Empty State pivot */}
          {filteredSpotsList.length === 0 && (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">No matching vibes in range.</p>
              <button
                onClick={() => setSelectedVibe('')}
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[10px] font-mono font-medium"
              >
                Reset vibe filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* 4. ONBOARDING OVERLAY */}
      {/* ========================================== */}
      {onboardingOpen && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md z-[999] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto shadow-inner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-blue-600 dark:text-blue-400">
                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="9" r="3" fill="currentColor" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-heading font-bold text-slate-900 dark:text-slate-100 tracking-tight">Enable Spatial Exploration</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                Nearby Locator maps premium cafes, work pods, and local highlights inside your precise coordinates quadrant. Enable geolocation to explore instantly.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={requestBrowserGeolocation}
                className="h-11 w-full rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center shadow-md hover:bg-blue-700 transition-colors"
              >
                Use current coordinates
              </button>
              <button
                onClick={() => {
                  setOnboardingOpen(false);
                  handleSearch('');
                }}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors duration-150 py-1"
              >
                Default to San Francisco Bryant district
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. PLACE DETAIL DRAWER */}
      <PlaceDetailDrawer
        open={Boolean(selectedSpot)}
        spot={selectedSpot}
        onClose={() => setSelectedSpot(null)}
      />

    </div>
  );
}
