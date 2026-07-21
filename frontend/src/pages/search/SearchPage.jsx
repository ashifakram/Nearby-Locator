import React, { useState, useEffect, useRef } from 'react';
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

export default function SearchPage() {
  const { isDark } = useUIStore();
  const { showToast } = useToastStore();
  const searchState = useSearchState();

  const [input, setInput] = useState('');
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

  // Discovered Coordinates history memory (Objective 11)
  const [discoveredHistory, setDiscoveredHistory] = useState([]);

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
      const filtered = discoveredHistory.filter(
        (item) => (item.id || item.spotId) !== (selectedSpot.id || selectedSpot.spotId)
      ).slice(0, 3); // Max 4 history listings total
      const updated = [selectedSpot, ...filtered];
      setDiscoveredHistory(updated);
      try {
        localStorage.setItem('nearby_discovered_history', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed saving discovery history:', err);
      }
    }
  }, [selectedSpot]);

  // Set default San Francisco Bryant coordinates
  useEffect(() => {
    if (!searchState.lat || !searchState.lng) {
      searchState.setCoordinates(37.7749, -122.4194);
    }
  }, [searchState]);

  // Autocomplete Query triggers
  const { data: suggestions } = useQuery({
    queryKey: queryKeys.spots.list({ autocomplete: input }),
    queryFn: () => spotsService.autocomplete({ q: input }),
    enabled: input.trim().length >= 2,
  });

  const handleSearch = async (queryStr, radiusOverride = null) => {
    setLoading(true);
    try {
      const activeRadius = radiusOverride || searchState.radius;
      const radiusMeters = activeRadius * 1000;
      const data = await spotsService.search({
        lat: searchState.lat || 37.7749,
        lng: searchState.lng || -122.4194,
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
        setSelectedSpot(resolvedSpots[0]);
      } else {
        showToast('No spots located inside search radius.', 'info');
      }

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
    handleSearch('');
  }, []);

  // Filter spots dynamically by vibe pivots (Objective 2)
  const getFilteredSpots = () => {
    if (!selectedVibe) return spots;
    return spots.filter((spot) => {
      if (selectedVibe === 'calm') {
        return spot.category?.toLowerCase().includes('cafe') || spot.rating >= 4.7;
      }
      if (selectedVibe === 'gems') {
        return spot.rating >= 4.8;
      }
      if (selectedVibe === 'active') {
        return spot.category?.toLowerCase().includes('gym') || spot.category?.toLowerCase().includes('restaurant');
      }
      if (selectedVibe === 'trusted') {
        return spot.rating >= 4.6;
      }
      return true;
    });
  };

  const filteredSpotsList = getFilteredSpots();

  // Human-centered discovery badges generator
  const getEmotionalTag = (spot) => {
    if (spot.rating >= 4.8) return { label: '⭐ Top Rated', color: 'text-amber-400 bg-amber-500/10' };
    if (spot.distance <= 600) return { label: '📍 5-Min Walk', color: 'text-emerald-400 bg-emerald-500/10' };
    if (spot.category?.toLowerCase().includes('cafe')) return { label: '☕ Cafe Workspace', color: 'text-cyan-400 bg-cyan-500/10' };
    return { label: '🛡️ Verified', color: 'text-slate-400 bg-slate-500/5' };
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden relative bg-[#070A12] text-slate-100 font-body">
      
      {/* ========================================== */}
      {/* 1. LEFT PANEL: Exploration Console */}
      {/* ========================================== */}
      <aside className="hidden lg:flex w-[380px] h-full flex-col border-r border-slate-900 bg-slate-950/40 backdrop-blur-md relative z-10 flex-shrink-0">
        
        {/* Search header container */}
        <div className="p-5 border-b border-slate-900/60 space-y-4 flex-shrink-0">
          <DiscoverySearchBar
            value={input}
            onChange={setInput}
            onSearch={handleSearch}
            suggestions={suggestions}
            loading={loading}
            placeholder="Explore verified cafes, gyms..."
            selectedVibe={selectedVibe}
            onVibeSelect={setSelectedVibe}
          />

          {/* Active coordinate controls */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-[10px]">RAD: {searchState.radius} km</span>
            <button
              onClick={() => {
                const nextRadius = searchState.radius === 1 ? 2 : searchState.radius === 2 ? 5 : 1;
                searchState.setRadius(nextRadius);
                handleSearch(input, nextRadius);
              }}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-cyan-400 font-mono"
            >
              Adjust Radius
            </button>
          </div>
        </div>

        {/* Scrollable list of verified result cards */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3">
              <div className="radar-sweep-indicator" />
              <p className="text-xs font-mono text-slate-500 uppercase animate-pulse">Syncing coordinates...</p>
            </div>
          ) : filteredSpotsList.length > 0 ? (
            <div className="space-y-3">
              {filteredSpotsList.map((spot) => {
                const isHovered = hoveredSpotId === spot.id || hoveredSpotId === spot.spotId;
                const isSelected = selectedSpot?.id === spot.id || selectedSpot?.spotId === spot.spotId;
                const emotionalTag = getEmotionalTag(spot);

                return (
                  <div
                    key={spot.id || spot.spotId}
                    onMouseEnter={() => setHoveredSpotId(spot.id || spot.spotId)}
                    onMouseLeave={() => setHoveredSpotId(null)}
                    onClick={() => setSelectedSpot(spot)}
                    className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'border-cyan-500/30 bg-slate-900/60 shadow-xl'
                        : isHovered
                        ? 'border-emerald-500/25 bg-slate-900/40'
                        : 'border-slate-900/60 bg-slate-950/20'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[8.5px] font-mono font-bold tracking-wider ${emotionalTag.color}`}>
                          {emotionalTag.label}
                        </span>
                        <h4 className="text-sm font-bold text-slate-200">{spot.name}</h4>
                        <p className="text-xs text-slate-500 font-body">{spot.address || spot.location}</p>
                      </div>
                      <span className="text-xs text-yellow-500 font-semibold flex items-center gap-1">
                        ⭐ {spot.rating || '4.5'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-500 border-t border-slate-900/40">
                      <span>{spot.category || 'Spot'}</span>
                      <span className="text-cyan-400">{(spot.distance / 1000).toFixed(1)} km</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Delightful Recovery Empty State (Objective 6) */
            <div className="py-12 flex flex-col items-center justify-center text-center px-4 space-y-4">
              <div className="w-14 h-14 rounded-full border border-cyan-500/10 flex items-center justify-center animate-pulse">
                <span className="w-3.5 h-3.5 bg-cyan-400/20 rounded-full" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-300">No spots resolved in this vibe</h4>
                <p className="text-xs text-slate-500 max-w-[220px] leading-relaxed">
                  Broaden the camera scanning radius or toggle back to standard filters.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-[200px] pt-1">
                <button
                  onClick={() => {
                    searchState.setRadius(5);
                    handleSearch(input, 5);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-cyan-400 font-mono hover:bg-slate-850"
                >
                  EXPAND RANGE TO 5KM
                </button>
                <button
                  onClick={() => setSelectedVibe('')}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono hover:bg-slate-850"
                >
                  CLEAR VIBE FILTERS
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Adjacent Exploration Continuation Flows (Objective 9 & 1) */}
          {selectedSpot && !loading && (
            <div className="mt-6 pt-4 border-t border-slate-900 space-y-3 bg-slate-950/20 rounded-2xl p-4">
              <p className="text-[10px] font-mono text-cyan-400 font-bold tracking-widest uppercase">
                What else nearby feels worth exploring?
              </p>
              <p className="text-xs text-slate-400 font-body leading-relaxed">
                Adjacent geocells highlight secondary points within 10 minutes walking space:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setInput('Coffee');
                    handleSearch('Coffee');
                  }}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-850 hover:border-cyan-500/20 text-[10px] text-left text-slate-300 transition-all duration-200"
                >
                  ☕ Grab Coffee
                </button>
                <button
                  onClick={() => {
                    setInput('Park');
                    handleSearch('Park');
                  }}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-850 hover:border-cyan-500/20 text-[10px] text-left text-slate-300 transition-all duration-200"
                >
                  🌳 Walk in Park
                </button>
              </div>
            </div>
          )}

          {/* Explored Coordinates memory history (Objective 11) */}
          {discoveredHistory.length > 0 && (
            <div className="pt-4 border-t border-slate-900 space-y-2">
              <p className="text-[10px] font-mono text-slate-500 font-semibold uppercase tracking-wider">
                Exploration History
              </p>
              <div className="flex flex-col gap-1.5">
                {discoveredHistory.map((hist, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSpot(hist)}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-900 text-xs text-slate-400 hover:text-slate-300 transition-colors duration-150 flex items-center justify-between"
                  >
                    <span className="truncate">📍 {hist.name}</span>
                    <span className="text-[9px] font-mono text-slate-500">REVISIT</span>
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
        />
      </div>

      {/* Mobile Collapsible Sheet with adjacent continuation list */}
      <div
        className={`absolute bottom-0 left-0 right-0 lg:hidden rounded-t-[32px] border-t border-slate-900 bg-slate-950/95 z-30 flex flex-col transition-all duration-500 shadow-2xl ${
          sheetExpanded ? 'h-[60vh]' : 'h-[170px]'
        }`}
      >
        <div
          onClick={() => setSheetExpanded(!sheetExpanded)}
          className="w-full py-3 flex items-center justify-center cursor-pointer active:bg-slate-900/40 rounded-t-[32px]"
        >
          <div className="w-12 h-1 bg-slate-800 rounded-full" />
        </div>

        <div className="px-5 pb-3 flex justify-between items-center text-xs border-b border-slate-900/60 flex-shrink-0">
          <span className="font-bold text-slate-300 font-mono">
            {filteredSpotsList.length} spots resolved
          </span>
          <button
            onClick={() => setSheetExpanded(!sheetExpanded)}
            className="text-[10px] text-cyan-400 font-mono"
          >
            {sheetExpanded ? 'COLLAPSE' : 'EXPAND'}
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-3">
          {filteredSpotsList.slice(0, sheetExpanded ? undefined : 2).map((spot) => {
            const isSelected = selectedSpot?.id === spot.id || selectedSpot?.spotId === spot.spotId;

            return (
              <div
                key={spot.id || spot.spotId}
                onClick={() => {
                  setSelectedSpot(spot);
                  if (sheetExpanded) setSheetExpanded(false);
                }}
                className={`p-3 rounded-2xl border transition-all duration-300 flex justify-between items-center ${
                  isSelected ? 'border-cyan-500/30 bg-slate-900/60' : 'border-slate-900/60 bg-slate-950/20'
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{spot.name}</h4>
                  <p className="text-[10px] text-slate-500 font-body mt-0.5">{spot.address || spot.location}</p>
                </div>
                <span className="text-[10px] text-yellow-500 font-semibold">
                  ★ {spot.rating || '4.5'}
                </span>
              </div>
            );
          })}

          {/* Mobile Empty State pivot */}
          {filteredSpotsList.length === 0 && (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-slate-500">No matching vibes in range.</p>
              <button
                onClick={() => setSelectedVibe('')}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-cyan-400 font-mono"
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
        <div className="absolute inset-0 bg-[#070A12]/90 backdrop-blur-md z-[999] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-cyan-500/20 flex items-center justify-center mx-auto shadow-2xl">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-cyan-400">
                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="9" r="3" fill="currentColor" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Enable Spatial Exploration</h3>
              <p className="text-sm text-slate-400 font-body leading-relaxed">
                Nearby Locator maps premium cafes, work pods, and local highlights inside your precise coordinates quadrant. Enable geolocation to explore instantly.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={requestBrowserGeolocation}
                className="h-12 w-full rounded-2xl btn-primary-spatial text-sm font-semibold flex items-center justify-center transition-all duration-200"
              >
                Use current coordinates
              </button>
              <button
                onClick={() => {
                  setOnboardingOpen(false);
                  handleSearch('');
                }}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors duration-150 py-1"
              >
                Default to San Francisco Bryant district
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
