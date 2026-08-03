import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import useSearchState from '../../features/chat-discovery/hooks/useSearchState';
import { OnboardingWizard } from '../../components/global/OnboardingWizard';
import { SpotCard } from '../../components/ui/SpotCard';
import {
  Compass,
  Bookmark,
  History,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Coffee,
  Dumbbell,
  Laptop
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { spotsService } from '../../services/spots';
import { queryKeys } from '../../lib/queryKeys';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const searchState = useSearchState();
  const navigate = useNavigate();
  const [selectedVibeTab, setSelectedVibeTab] = useState('all');

  // Fetch real spots from spotsService for recommendations
  const { data: realSpotsData, isLoading: spotsLoading } = useQuery({
    queryKey: queryKeys.spots.list({ category: selectedVibeTab !== 'all' ? selectedVibeTab : undefined }),
    queryFn: () => spotsService.search({ category: selectedVibeTab !== 'all' ? selectedVibeTab : undefined }),
    staleTime: 5 * 60 * 1000
  });

  const recommendationSpots = useMemo(() => {
    const list = Array.isArray(realSpotsData?.spots) ? realSpotsData.spots : Array.isArray(realSpotsData) ? realSpotsData : [];
    return list.slice(0, 6);
  }, [realSpotsData]);

  // Restore persisted viewport session timestamp & filters
  const lastSearchQuery = searchState.q || searchState.filters?.query || 'San Francisco Bryant';
  const lastSearchRadius = searchState.radius || 5;
  const lastSearchVibe = searchState.filters?.vibe || 'Ambient';


  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/70 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Onboarding Wizard for new user sessions */}
      <OnboardingWizard />

      {/* Standardized Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-mono font-semibold border border-blue-200/80 dark:border-blue-900/50">
              COMMERCIAL SAAS
            </span>
          </div>
          <p className="text-sm font-sans text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, <span className="font-semibold text-slate-900 dark:text-slate-200">{user?.name || 'Explorer'}</span>. Resume your spatial discovery and review recommendations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/discover')}
          className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-sans text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer shrink-0"
        >
          <Compass className="w-4 h-4" />
          <span>Explore Map</span>
        </button>
      </div>

      {/* Hero Card 1: Continue Active Search (Hero Unit) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs relative overflow-hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>CONTINUE LAST ACTIVE SEARCH</span>
            </div>
            <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-slate-100">
              "{lastSearchQuery}"
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Viewport target: SF SoMa District • Radius: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{lastSearchRadius} km</span> • 8 Spots Identified
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="h-11 px-5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white font-sans text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <span>Resume Viewport Search</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Section 2: Spatial Intent Quick-Triggers */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Spatial Intent Triggers
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Quiet Cafes', icon: Coffee, query: 'Quiet Cafe' },
            { label: 'Fitness Hubs', icon: Dumbbell, query: 'Gym Fitness' },
            { label: 'Work Pods', icon: Laptop, query: 'Work Commons' },
            { label: 'Top Rated', icon: Sparkles, query: 'Top Rated' }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  searchState.setQ(item.query);
                  navigate('/discover');
                }}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 text-left transition-all cursor-pointer shadow-xs group"
              >
                <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-heading font-bold text-slate-900 dark:text-slate-100 block">
                  {item.label}
                </span>
                <span className="text-[10px] text-slate-400 block pt-0.5">Quick search →</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Telemetry Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/saved')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-400">SAVED SPOTS</span>
            <Bookmark className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-heading font-bold text-slate-900 dark:text-slate-100">12</p>
          <span className="text-[10px] text-slate-400 block">View collection →</span>
        </div>

        <div
          onClick={() => navigate('/history')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-400">LIFETIME SCANS</span>
            <History className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-2xl font-heading font-bold text-slate-900 dark:text-slate-100">48</p>
          <span className="text-[10px] text-slate-400 block">Review queries →</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-400">GEOCELLS EXPLORED</span>
            <MapPin className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-heading font-bold text-slate-900 dark:text-slate-100">6</p>
          <span className="text-[10px] text-slate-400 block">SF Bryant District</span>
        </div>

        <div
          onClick={() => navigate('/settings/security')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-400">SECURITY STATUS</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-heading font-bold text-emerald-600 dark:text-emerald-400">Active</p>
          <span className="text-[10px] text-slate-400 block">2FA Verified • Settings →</span>
        </div>
      </div>

      {/* Section 4: AI Recommendations Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-base font-heading font-bold text-slate-900 dark:text-slate-100">
              Curated Recommendations
            </h3>
          </div>

          <div className="flex gap-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'cafe', label: 'Cafes' },
              { id: 'gym', label: 'Gyms' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedVibeTab(tab.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  selectedVibeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Spot Cards Grid */}
        {spotsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <SpotCard key={n} isLoading={true} />
            ))}
          </div>
        ) : recommendationSpots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendationSpots.map((spot) => (
              <SpotCard
                key={spot.id || spot.spotId || spot.spot_id}
                spot={spot}
                onSelect={() => navigate('/discover')}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
            <Sparkles className="w-6 h-6 mx-auto text-blue-500/60" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No spots found in this filter.</p>
            <p>Explore the discovery map to discover more locations.</p>
          </div>
        )}
      </div>
    </div>
  );
}
