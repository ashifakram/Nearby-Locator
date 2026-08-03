import React, { useState, useRef, useEffect } from 'react';
import { MapControls } from '../../../components/ui/MapControls';

function SpatialMapBase({
  spots = [],
  hoveredSpotId = null,
  setHoveredSpotId = () => {},
  selectedSpot = null,
  setSelectedSpot = () => {},
  centerLat = 37.7749,
  centerLng = -122.4194,
  radiusMeters = 1000,
  discoveredHistory = [],
  onSearchArea = null,
  isSearchingArea = false
}) {
  const [zoom, setZoom] = useState(1.4);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const mapRef = useRef(null);

  // Signature Area-Reveal wave key
  const [revealKey, setRevealKey] = useState(0);

  // When center coordinates update from a fresh search, reset pan displacement
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [centerLat, centerLng]);

  useEffect(() => {
    if (spots.length > 0) {
      setRevealKey((prev) => prev + 1);
    }
  }, [spots.length, centerLat, centerLng]);


  // Coordinate scales (SF scale approximation)
  const lngScale = 60000;
  const latScale = 60000;

  // Projekt lat/lng to SVG space
  const project = (lat, lng, width = 600, height = 500) => {
    const x = width / 2 + (lng - centerLng) * lngScale * zoom + pan.x;
    const y = height / 2 - (lat - centerLat) * latScale * zoom + pan.y;
    return { x, y };
  };

  // Dragging event handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: dx, y: dy });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zooming event handlers
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    setZoom(Math.max(0.5, Math.min(5, nextZoom)));
  };

  // Smoothly center map when a spot is clicked
  useEffect(() => {
    if (selectedSpot) {
      const targetLat = selectedSpot.latitude || selectedSpot.lat;
      const targetLng = selectedSpot.longitude || selectedSpot.lng;
      if (targetLat && targetLng) {
        const offsetX = (targetLng - centerLng) * lngScale * zoom;
        const offsetY = -(targetLat - centerLat) * latScale * zoom;
        setPan({ x: -offsetX, y: -offsetY });
      }
    }
  }, [selectedSpot]);

  // Spatial Curiosity coordinates triggers
  const curiosityCoords = [
    { id: 'curio-1', lat: 37.7795, lng: -122.4140, label: 'Sector 7-Alpha • Open Area' },
    { id: 'curio-2', lat: 37.7710, lng: -122.4250, label: 'Sector 4-Beta • Stroll Path' }
  ];

  const getVitalityCompassText = () => {
    if (zoom >= 2.0) return 'DETAILED GRID OVERLAY';
    if (zoom <= 0.8) return 'REGIONAL SCAN MODE';
    return 'COORDINATE GRID STABLE';
  };

  const ambientVitality = getVitalityCompassText();

  // Time-of-Day environmental color overlays - Ultra-low 0.5% opacity for absolute visual restraint (Risk 4)
  const getEnvironmentTimeShift = () => {
    const hours = new Date().getHours();
    if (hours >= 6 && hours < 12) {
      return { fill: '#fef08a', opacity: 0.005, label: 'AM GRID LIGHT' };
    }
    if (hours >= 17 && hours < 20) {
      return { fill: '#f97316', opacity: 0.006, label: 'PM SUNSET LIGHT' };
    }
    return { fill: '#020617', opacity: 0.005, label: 'MIDNIGHT COORDINATES' };
  };

  const timeShift = getEnvironmentTimeShift();

  // District personality gradients coordinates projections
  const bryantPos = project(37.7749, -122.4194);
  const southParkPos = project(37.7780, -122.4110);

  return (
    <div
      ref={mapRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className={`w-full h-full relative bg-slate-900 dark:bg-slate-950 overflow-hidden select-none cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{ touchAction: 'none' }}
    >
      {/* Self-contained CSS for signature progressive radar waves */}
      <style>{`
        @keyframes spatialRevealRipple {
          0% { r: 0px; opacity: 0.4; stroke-width: 1.5px; }
          100% { r: ${280 * zoom}px; opacity: 0; stroke-width: 0.4px; }
        }
        .spatial-reveal-ring {
          animation: spatialRevealRipple 1.4s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
      `}</style>

      {/* 1. Spatial Telemetry HUD */}
      <div className="absolute bottom-4 left-4 z-20 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-md space-y-1.5 pointer-events-none max-w-[220px] shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-80" />
          <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-semibold uppercase">SPATIAL HUD</span>
        </div>
        <div className="text-[9px] font-mono text-slate-500 space-y-0.5">
          <div>LAT: {centerLat.toFixed(4)}</div>
          <div>LNG: {centerLng.toFixed(4)}</div>
          <div>ZOOM: {zoom.toFixed(2)}x</div>
          <div>LIGHT: {timeShift.label}</div>
          <div>STATUS: {ambientVitality}</div>
        </div>
      </div>

      {/* 2. Muted Environmental Compass Indicator HUD */}
      <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-900/60 backdrop-blur-sm text-[9px] font-mono text-slate-400 flex items-center gap-2 pointer-events-none">
        <span className="w-1.2 h-1.2 bg-cyan-400 rounded-full opacity-60" />
        <span>SYSTEM: {timeShift.label}</span>
      </div>

      {/* 3. Cinematic Map SVG Canvas Frame */}
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="mapGrid"
            width={40 * zoom}
            height={40 * zoom}
            patternUnits="userSpaceOnUse"
            x={pan.x}
            y={pan.y}
          >
            <path d={`M ${40 * zoom} 0 L 0 0 0 ${40 * zoom}`} fill="none" stroke="#08B3C5" strokeWidth="0.5" opacity="0.03" />
          </pattern>
          
          {/* District gradients */}
          <radialGradient id="bryantGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#08B3C5" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#070A12" stopOpacity="0" />
          </radialGradient>
          
          <radialGradient id="southParkGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#070A12" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#mapGrid)" />

        {/* Dynamic Time-of-Day environmental color shifting overlays */}
        <rect width="100%" height="100%" fill={timeShift.fill} opacity={timeShift.opacity} pointerEvents="none" />

        {/* District Personality Atmosphere Overlays */}
        <g pointerEvents="none">
          <circle
            cx={bryantPos.x}
            y={bryantPos.y}
            r={240 * zoom}
            fill="url(#bryantGrad)"
          />
          {zoom >= 1.0 && (
            <text
              x={bryantPos.x - 50}
              y={bryantPos.y - 120 * zoom}
              fill="#08B3C5"
              opacity="0.12"
              fontSize="9"
              fontFamily="monospace"
              letterSpacing="1"
            >
              BRYANT TECH HUB
            </text>
          )}

          <circle
            cx={southParkPos.x}
            y={southParkPos.y}
            r={180 * zoom}
            fill="url(#southParkGrad)"
          />
        </g>

        {/* Walkable Adjacent Connections/Dashed route trails */}
        <g stroke="#08B3C5" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.25" pointerEvents="none">
          {spots.map((spot, idx) => {
            const spotLat = spot.latitude || spot.lat;
            const spotLng = spot.longitude || spot.lng;
            if (!spotLat || !spotLng) return null;
            const posA = project(spotLat, spotLng);

            return spots.slice(idx + 1, idx + 4).map((otherSpot) => {
              const otherLat = otherSpot.latitude || otherSpot.lat;
              const otherLng = otherSpot.longitude || otherSpot.lng;
              if (!otherLat || !otherLng) return null;
              
              const dist = Math.abs(spotLat - otherLat) + Math.abs(spotLng - otherLng);
              if (dist < 0.008) {
                const posB = project(otherLat, otherLng);
                return (
                  <line
                    key={`${spot.id || spot.spotId}-${otherSpot.id || otherSpot.spotId}`}
                    x1={posA.x}
                    y1={posA.y}
                    x2={posB.x}
                    y2={posB.y}
                  />
                );
              }
              return null;
            });
          })}
        </g>

        {/* Believable Bay coastline overlay */}
        <g opacity="0.4">
          <path
            d={`M -200 ${320 * zoom + pan.y} Q 280 ${280 * zoom + pan.y} 800 ${480 * zoom + pan.y} L 800 1200 L -200 1200 Z`}
            fill="#08B3C5"
            opacity="0.03"
            className="transition-all duration-300"
          />
          <text
            x={480 * zoom + pan.x}
            y={420 * zoom + pan.y}
            fill="#08B3C5"
            opacity="0.2"
            fontSize="10"
            fontFamily="monospace"
            letterSpacing="2"
          >
            SAN FRANCISCO BAY
          </text>
        </g>

        {/* Parks */}
        <g>
          <rect
            x={100 * zoom + pan.x}
            y={80 * zoom + pan.y}
            width={180 * zoom}
            height={140 * zoom}
            rx={8 * zoom}
            fill="#10b981"
            opacity="0.012"
            className="transition-all duration-300"
          />
        </g>

        {/* Roads & Avenues */}
        <g stroke="#1E293B" strokeWidth={2.5 * zoom} opacity="0.25">
          <line x1="-500" y1={120 * zoom + pan.y} x2="1500" y2={120 * zoom + pan.y} />
          <line x1="-500" y1={280 * zoom + pan.y} x2="1500" y2={280 * zoom + pan.y} strokeWidth={3.5 * zoom} stroke="#334155" />
          <line x1="-500" y1={420 * zoom + pan.y} x2="1500" y2={420 * zoom + pan.y} />
          
          <line x1={150 * zoom + pan.x} y1="-500" x2={150 * zoom + pan.x} y2="1500" />
          <line x1={320 * zoom + pan.x} y1="-500" x2={320 * zoom + pan.x} y2="1500" />
          <line x1={480 * zoom + pan.x} y1="-500" x2={480 * zoom + pan.x} y2="1500" />
        </g>

        <g fill="#E2E8F0" opacity="0.15" fontSize="8" fontFamily="monospace">
          <text x={pan.x - 100} y={115 * zoom + pan.y}>BRYANT STREET</text>
        </g>

        {/* Dynamic Radar Sweeps */}
        <g opacity="0.06">
          <circle cx={300 + pan.x} cy={250 + pan.y} r={100 * zoom} fill="none" stroke="#08B3C5" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx={300 + pan.x} cy={250 + pan.y} r={200 * zoom} fill="none" stroke="#08B3C5" strokeWidth="0.8" />
        </g>

        {/* Dynamic Road Trace */}
        {selectedSpot && spots.length > 0 && (
          <g opacity="0.5">
            {(() => {
              const startPos = project(centerLat, centerLng);
              const spotLat = selectedSpot.latitude || selectedSpot.lat;
              const spotLng = selectedSpot.longitude || selectedSpot.lng;
              const endPos = project(spotLat, spotLng);
              return (
                <path
                  d={`M ${startPos.x} ${startPos.y} Q ${(startPos.x + endPos.x) / 2 + 30} ${(startPos.y + endPos.y) / 2 - 30} ${endPos.x} ${endPos.y}`}
                  fill="none"
                  stroke="#08B3C5"
                  strokeWidth="1.8"
                  strokeDasharray="5 3"
                  className="transition-all duration-300"
                />
              );
            })()}
          </g>
        )}

        {/* Spatial Curiosity Coordinates Triggers - Restrained and Quiet */}
        {curiosityCoords.map((curio) => {
          const pos = project(curio.lat, curio.lng);
          return (
            <g
              key={curio.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              className="cursor-pointer"
              onClick={() => {
                setSelectedSpot({
                  name: curio.label.split(' • ')[0],
                  location: curio.label.split(' • ')[1],
                  latitude: curio.lat,
                  longitude: curio.lng,
                  rating: 4.8,
                  distance: 350
                });
              }}
            >
              <circle r={10} fill="none" stroke="#08B3C5" strokeWidth="0.8" opacity="0.15" />
              <circle r={2} fill="#08B3C5" opacity="0.3" />
              
              {zoom >= 1.4 && (
                <text
                  y="12"
                  fill="#08B3C5"
                  opacity="0.35"
                  fontSize="6.5"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {curio.label.substring(0, 10)}
                </text>
              )}
            </g>
          );
        })}

        {/* Signature Area-Reveal Sweep Wave */}
        {(() => {
          const userPos = project(centerLat, centerLng);
          return (
            <g key={revealKey} transform={`translate(${userPos.x}, ${userPos.y})`} className="pointer-events-none">
              <circle
                r="0"
                fill="none"
                stroke="#08B3C5"
                className="spatial-reveal-ring"
              />
            </g>
          );
        })()}

        {/* User Marker */}
        {(() => {
          const userPos = project(centerLat, centerLng);
          return (
            <g transform={`translate(${userPos.x}, ${userPos.y})`} className="pointer-events-none">
              <circle r={20} fill="none" stroke="#08B3C5" strokeWidth="1" opacity="0.08" className="animate-ping" style={{ animationDuration: '8s' }} />
              <circle r={8} fill="none" stroke="#08B3C5" strokeWidth="1" opacity="0.25" />
              <circle r={3} fill="#08B3C5" />
            </g>
          );
        })()}

        {/* Verified Markers */}
        {spots.slice(0, zoom < 1.0 ? 15 : 40).map((spot) => {
          const spotLat = spot.latitude || spot.lat || centerLat;
          const spotLng = spot.longitude || spot.lng || centerLng;
          const pos = project(spotLat, spotLng);
          const isHovered = hoveredSpotId === spot.id || hoveredSpotId === spot.spotId;
          const isSelected = selectedSpot?.id === spot.id || selectedSpot?.spotId === spot.spotId;

          const isPreviouslyDiscovered = discoveredHistory.some(
            (hist) => (hist.id || hist.spotId) === (spot.id || spot.spotId)
          );

          return (
            <g
              key={spot.id || spot.spotId}
              transform={`translate(${pos.x}, ${pos.y})`}
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSpot(spot);
              }}
              onMouseEnter={() => setHoveredSpotId(spot.id || spot.spotId)}
              onMouseLeave={() => setHoveredSpotId(null)}
            >
              {/* Warm Rediscovery Familiarity Halo overlay */}
              {isPreviouslyDiscovered && !isSelected && (
                <circle
                  r={14}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="0.8"
                  opacity="0.2"
                  strokeDasharray="2 2"
                />
              )}

              {(isHovered || isSelected) && (
                <circle
                  r={16}
                  fill="none"
                  stroke={isSelected ? '#08B3C5' : '#10b981'}
                  strokeWidth="1"
                  opacity="0.25"
                  className="animate-pulse"
                  style={{ animationDuration: '4s' }}
                />
              )}

              <circle
                r={isHovered ? 9 : isSelected ? 10 : 6}
                fill={isSelected ? '#08B3C5' : isHovered ? '#10b981' : '#1E293B'}
                stroke={isSelected ? '#070A12' : '#08B3C5'}
                strokeWidth="1.2"
                className="transition-all duration-300 ease-out"
              />

              <circle
                r="1.8"
                fill={isSelected ? '#070A12' : '#08B3C5'}
                opacity={isHovered || isSelected ? 1 : 0.5}
              />

              {spot.rating >= 4.7 && (
                <circle
                  cx={isHovered ? 4 : 3}
                  cy={isHovered ? -4 : -3}
                  r="1.5"
                  fill="#f59e0b"
                  stroke="#070A12"
                  strokeWidth="0.8"
                />
              )}

              {isHovered && (
                <g transform="translate(0, -20)" className="pointer-events-none">
                  <rect
                    x="-40"
                    width="80"
                    height="16"
                    rx="5"
                    fill="#0F1322"
                    stroke="#08B3C5"
                    strokeWidth="0.8"
                    opacity="0.95"
                  />
                  <text
                    x="0"
                    y="11"
                    fill="#E2E8F0"
                    fontSize="8"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {spot.name.substring(0, 12)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Viewport pan distance calculation for "Search This Area" */}
      {(() => {
        // Calculate current center coordinates based on pan offset
        const currentCenterLng = centerLng - pan.x / (lngScale * zoom);
        const currentCenterLat = centerLat + pan.y / (latScale * zoom);

        // Haversine distance tracking (meters)
        const R = 6371000;
        const dLat = ((currentCenterLat - centerLat) * Math.PI) / 180;
        const dLon = ((currentCenterLng - centerLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((centerLat * Math.PI) / 180) *
            Math.cos((currentCenterLat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const panDistanceMeters = R * c;

        const showSearchAreaPill = panDistanceMeters > 500 && typeof onSearchArea === 'function';

        return (
          <MapControls
            canRecenter={true}
            canZoom={true}
            canSearchArea={showSearchAreaPill}
            isSearchingArea={isSearchingArea}
            onSearchArea={() => {
              if (onSearchArea) {
                onSearchArea({ lat: currentCenterLat, lng: currentCenterLng });
              }
            }}
            onZoomIn={() => setZoom((prev) => Math.min(5, prev * 1.2))}
            onZoomOut={() => setZoom((prev) => Math.max(0.5, prev / 1.2))}
            onRecenter={() => {
              setPan({ x: 0, y: 0 });
              setZoom(1.4);
            }}
          />
        );
      })()}
    </div>
  );
}

export default React.memo(
  SpatialMapBase,
  (prev, next) =>
    prev.hoveredSpotId === next.hoveredSpotId &&
    (prev.selectedSpot?.id || prev.selectedSpot?.spotId) === (next.selectedSpot?.id || next.selectedSpot?.spotId) &&
    prev.centerLat === next.centerLat &&
    prev.centerLng === next.centerLng &&
    prev.isSearchingArea === next.isSearchingArea &&
    prev.spots.length === next.spots.length
);

