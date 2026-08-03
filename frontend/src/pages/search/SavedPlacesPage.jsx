import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { spotsService } from '../../services/spots';
import { SpotCard } from '../../components/ui/SpotCard';
import ChevronLeftIcon from '../../icons/ChevronLeftIcon';
import ChevronRightIcon from '../../icons/ChevronRightIcon';
import LocationIcon from '../../icons/LocationIcon';

export default function SavedPlacesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.spots.saves({ page, limit }),
    queryFn: () => spotsService.getSavedPlaces({ page, limit }),
    keepPreviousData: true
  });

  const spots = data?.data || [];
  const meta = data?.meta || { count: 0 };
  
  // Deterministic bounds checking using absolute count
  const hasMore = (page * limit) < meta.count;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
      <header className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col gap-2">
        <h2 className="text-3xl font-heading font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
          <LocationIcon width={28} height={28} color="#2563EB" />
          Saved Places
        </h2>
        <p className="text-sm font-sans text-slate-600 dark:text-slate-400 max-w-2xl">
          Your personal collection of verified locations and favorite spatial spots.
        </p>
      </header>

      {/* ERROR STATE */}
      {error && (
        <div className="mb-8 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error.response?.data?.message || error.message || 'Failed to load saved places'}
        </div>
      )}

      {/* LOADING STATE */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SpotCard isLoading={true} />
          <SpotCard isLoading={true} />
          <SpotCard isLoading={true} />
          <SpotCard isLoading={true} />
          <SpotCard isLoading={true} />
          <SpotCard isLoading={true} />
        </div>
      ) : spots.length === 0 && !error ? (
        /* EMPTY STATE */
        <div className="flex flex-col items-center justify-center min-h-[320px] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl bg-white/60 dark:bg-slate-900/40 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-slate-100">No Saved Places Yet</h3>
            <p className="text-sm font-sans text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              You haven't bookmarked any locations yet. Explore the discovery map and save your favorite spots!
            </p>
          </div>
          <button
            onClick={() => navigate('/discover')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-colors"
          >
            🗺️ Start Exploring Map
          </button>
        </div>
      ) : (
        /* LIST STATE */
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spots.map((spot) => (
              <SpotCard
                key={spot.id || spot.spot_id}
                spot={spot}
                isSaved={true}
                onSelect={() => navigate(`/?lat=${spot.latitude}&lng=${spot.longitude}&q=${encodeURIComponent(spot.name)}&radius=1`)}
              />
            ))}
          </div>

          {/* PAGINATION */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <span className="text-sm text-slate-500 dark:text-slate-400 font-sans">
              Page {page} of {Math.max(1, Math.ceil(meta.count / limit))} <span className="text-xs font-mono text-slate-400">({meta.count} total)</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                <ChevronLeftIcon width={18} height={18} color="currentColor" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                <ChevronRightIcon width={18} height={18} color="currentColor" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

