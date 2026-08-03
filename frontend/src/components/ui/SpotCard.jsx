import React, { useState } from 'react';
import { Card } from './Card';

/**
 * Shared SpotCard Component
 * Reusable location card for Discover, Saved Places, Search History, and Recommendation lists.
 * Supports image thumbnails with fallbacks, rating, distance, intent badges, and a11y keyboard events.
 */
function SpotCardBase({
  spot,
  isSelected = false,
  isHovered = false,
  isLoading = false,
  onSelect = () => {},
  onMouseEnter = () => {},
  onMouseLeave = () => {},
  onSaveToggle,
  isSaved = false,
  className = ''
}) {

  const [imgError, setImgError] = useState(false);

  if (isLoading) {
    return (
      <Card className={`p-4 rounded-2xl animate-pulse border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 ${className}`}>
        <div className="flex gap-3">
          <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="flex-1 space-y-2 py-0.5">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
          </div>
        </div>
      </Card>
    );
  }

  if (!spot) return null;

  const spotId = spot.id || spot.spotId;
  const name = spot.name || 'Unnamed Spot';
  const category = spot.category || 'Spot';
  const address = spot.address || spot.location || '';
  const rating = spot.rating ? Number(spot.rating).toFixed(1) : '4.5';
  const reviewCount = spot.reviewCount || spot.review_count || spot.reviews_count || null;
  const distanceKm = spot.distance !== undefined && spot.distance !== null ? (spot.distance / 1000).toFixed(1) : null;
  const imageUrl = spot.imageUrl || spot.image_url || spot.photo || spot.image || null;

  // Format Emotional / Feature Badges
  const getBadgeConfig = () => {
    if (spot.rating >= 4.8) return { label: '⭐ Top Rated', cls: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50' };
    if (spot.distance && spot.distance <= 600) return { label: '📍 5-Min Walk', cls: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50' };
    if (category.toLowerCase().includes('cafe')) return { label: '☕ Quiet Workspace', cls: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50' };
    return { label: '🛡️ Verified', cls: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60' };
  };

  const badgeConfig = getBadgeConfig();

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(spot);
    }
  };

  const handleSaveClick = (e) => {
    e.stopPropagation();
    if (onSaveToggle) {
      onSaveToggle(e, spot);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select ${name}`}
      onClick={() => onSelect(spot)}
      onKeyDown={handleKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col gap-3 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
        isSelected
          ? 'border-blue-500/60 bg-blue-50/50 dark:bg-slate-800/90 shadow-md ring-1 ring-blue-500/20'
          : isHovered
          ? 'border-blue-500/30 bg-slate-100/60 dark:bg-slate-800/50 shadow-sm'
          : 'border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700'
      } ${className}`}
    >
      <div className="flex gap-3 items-start">
        {/* Cover Thumbnail / Placeholder */}
        <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center relative">
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" />
                <circle cx="12" cy="9" r="3" />
              </svg>
            </div>
          )}
        </div>

        {/* Spot Primary Information */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold tracking-wider border ${badgeConfig.cls}`}>
              {badgeConfig.label}
            </span>
            
            {onSaveToggle && (
              <button
                type="button"
                onClick={handleSaveClick}
                aria-label={isSaved ? `Remove ${name} from saved` : `Save ${name} to list`}
                className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved ? '#ef4444' : 'none'} stroke={isSaved ? '#ef4444' : 'currentColor'} strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
              </button>
            )}
          </div>

          <h4 className="text-sm font-heading font-bold text-slate-900 dark:text-slate-100 truncate leading-snug">
            {name}
          </h4>

          {address && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans truncate">
              {address}
            </p>
          )}
        </div>
      </div>

      {/* Spot Footer Metadata Bar */}
      <div className="flex items-center justify-between pt-2.5 text-[11px] font-mono border-t border-slate-100 dark:border-slate-800/80 text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{category}</span>
          {distanceKm && (
            <>
              <span className="opacity-40">•</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">{distanceKm} km</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 font-semibold text-[10px]">
          <span>⭐</span>
          <span>{rating}</span>
          {reviewCount && <span className="text-slate-400 font-normal">({reviewCount})</span>}
        </div>
      </div>
    </div>
  );
}

export const SpotCard = React.memo(
  SpotCardBase,
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.isHovered === next.isHovered &&
    prev.isLoading === next.isLoading &&
    prev.isSaved === next.isSaved &&
    (prev.spot?.id || prev.spot?.spotId) === (next.spot?.id || next.spot?.spotId) &&
    prev.spot?.rating === next.spot?.rating
);

export default SpotCard;

