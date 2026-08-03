import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { spotsService } from '../../services/spots';
import { SpotCard } from '../../components/ui/SpotCard';
import ChevronLeftIcon from '../../icons/ChevronLeftIcon';
import ChevronRightIcon from '../../icons/ChevronRightIcon';

export default function SearchHistoryPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.spots.history({ page, limit }),
    queryFn: () => spotsService.getSearchHistory({ page, limit }),
    keepPreviousData: true
  });

  const history = data?.data || [];
  const meta = data?.meta || { count: 0, limit: 20, offset: 0 };
  
  // Clean mathematical pagination using true backend total count
  const totalCount = meta.count;
  const hasMore = (page * limit) < totalCount;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
      <header className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col gap-2">
        <h2 className="text-3xl font-heading font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Search History
        </h2>
        <p className="text-sm font-sans text-slate-600 dark:text-slate-400 max-w-2xl">
          An unedited, append-only ledger of your platform search executions and spatial map scans.
        </p>
      </header>

      {/* ERROR STATE */}
      {error && (
        <div className="mb-8 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error.response?.data?.message || error.message || 'Failed to load search history'}
        </div>
      )}

      {/* LOADING STATE */}
      {isLoading ? (
        <div className="space-y-4">
          <SpotCard isLoading={true} />
          <SpotCard isLoading={true} />
          <SpotCard isLoading={true} />
        </div>
      ) : history.length === 0 && !error ? (
        /* EMPTY STATE */
        <div className="flex flex-col items-center justify-center min-h-[320px] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl bg-white/60 dark:bg-slate-900/40 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-slate-100">No Search History Yet</h3>
            <p className="text-sm font-sans text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              Your telemetry log is currently empty. Run searches on the discovery map to populate this ledger!
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
        /* LIST STATE (Timeline) */
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            {history.map((record) => {
              const isMapScan = !record.query_text;
              
              if (record.spot) {
                return (
                  <SpotCard
                    key={record.id}
                    spot={record.spot}
                    onSelect={() => navigate(`/?lat=${record.latitude}&lng=${record.longitude}&q=${encodeURIComponent(record.query_text || '')}&radius=1`)}
                  />
                );
              }

              return (
                <div 
                  key={record.id} 
                  onClick={() => navigate(`/?lat=${record.latitude}&lng=${record.longitude}&q=${encodeURIComponent(record.query_text || '')}&radius=5`)}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-blue-500/40 shadow-xs cursor-pointer"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                        isMapScan 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700' 
                          : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                      }`}>
                        {isMapScan ? 'MAP SCAN' : 'SEARCH'}
                      </span>
                      <h3 className={`text-base font-heading font-bold ${isMapScan ? 'text-slate-600 dark:text-slate-400 italic' : 'text-slate-900 dark:text-slate-100'}`}>
                        {isMapScan ? 'Browsed Viewport Map Area' : `"${record.query_text}"`}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      <span>Lat: {parseFloat(record.latitude).toFixed(4)}, Lng: {parseFloat(record.longitude).toFixed(4)}</span>
                      <span className="opacity-40">•</span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">{record.results_count || 0} spots resolved</span>
                    </div>
                  </div>

                  <div className="shrink-0 text-xs text-slate-400 dark:text-slate-500 font-mono text-left md:text-right">
                    {new Intl.DateTimeFormat('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    }).format(new Date(record.created_at))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* PAGINATION */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <span className="text-sm text-slate-500 dark:text-slate-400 font-sans">
              Page {page} of {Math.max(1, Math.ceil(totalCount / limit))} <span className="opacity-50 ml-2 font-mono text-xs">({totalCount} records)</span>
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

