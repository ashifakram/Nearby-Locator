import React from 'react';

/**
 * Shared MapControls Component
 * Reusable control layer overlay for spatial maps across Nearby Locator.
 * Provides Zoom In, Zoom Out, Re-center, and optional Search-This-Area action pill.
 */
export function MapControls({
  canRecenter = true,
  canZoom = true,
  canSearchArea = false,
  onZoomIn = () => {},
  onZoomOut = () => {},
  onRecenter = () => {},
  onSearchArea = () => {},
  isSearchingArea = false,
  disabled = false,
  className = ''
}) {
  return (
    <>
      {/* 1. Floating "Search This Area" Viewport Pill (Top Center) */}
      {canSearchArea && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={onSearchArea}
            disabled={disabled || isSearchingArea}
            aria-label="Search spots in this viewport area"
            className={`px-4 py-2 rounded-full border backdrop-blur-md shadow-lg font-sans text-xs font-semibold flex items-center gap-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
              disabled || isSearchingArea
                ? 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                : 'bg-white/90 dark:bg-slate-900/90 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:border-blue-500/60 hover:bg-white dark:hover:bg-slate-900 active:scale-95'
            }`}
          >
            {isSearchingArea ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-blue-500/30 border-t-blue-600 animate-spin shrink-0" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l5.67-5.67" />
              </svg>
            )}
            <span>{isSearchingArea ? 'Searching Area...' : 'Search This Area'}</span>
          </button>
        </div>
      )}

      {/* 2. Floating Action Button Stack (Bottom-Right) */}
      <div
        role="toolbar"
        aria-label="Map Navigation Controls"
        className={`absolute bottom-6 right-6 z-20 flex flex-col gap-1.5 p-1 rounded-2xl border bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-slate-200/80 dark:border-slate-800/80 shadow-lg pointer-events-auto ${className}`}
      >
        {/* Zoom In */}
        {canZoom && (
          <button
            type="button"
            onClick={onZoomIn}
            disabled={disabled}
            aria-label="Zoom in map"
            title="Zoom In"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}

        {/* Zoom Out */}
        {canZoom && (
          <button
            type="button"
            onClick={onZoomOut}
            disabled={disabled}
            aria-label="Zoom out map"
            title="Zoom Out"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 12h14" />
            </svg>
          </button>
        )}

        {/* Divider if recenter is also present */}
        {canZoom && canRecenter && (
          <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-0.5 mx-auto" />
        )}

        {/* Re-center */}
        {canRecenter && (
          <button
            type="button"
            onClick={onRecenter}
            disabled={disabled}
            aria-label="Re-center map to origin location"
            title="Re-center Map"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}

export default MapControls;
