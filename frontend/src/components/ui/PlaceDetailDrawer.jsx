import React, { useEffect, useRef, useState } from 'react';

/**
 * Shared PlaceDetailDrawer Component
 * Slide-over drawer / bottom sheet for deep place inspection across Nearby Locator.
 * Supports cover images, hours, phone, directions link, bookmark actions, and a11y focus management.
 */
function PlaceDetailDrawerBase({
  open = false,
  spot = null,
  onClose = () => {},
  onSave,
  onDirections,
  onShare,
  isSaved = false,
  loading = false,
  className = ''
}) {
  const drawerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [imgError, setImgError] = useState(false);

  // Store previously focused element and restore on close
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      // Focus drawer container
      setTimeout(() => {
        drawerRef.current?.focus();
      }, 50);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus?.();
    }
  }, [open]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Prevent background scrolling on mobile when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || !spot) return null;

  const name = spot.name || 'Spot Details';
  const category = spot.category || 'Spot';
  const address = spot.address || spot.location || '';
  const rating = spot.rating ? Number(spot.rating).toFixed(1) : '4.5';
  const reviewCount = spot.reviewCount || spot.review_count || spot.reviews_count || null;
  const distanceKm = spot.distance !== undefined && spot.distance !== null ? (spot.distance / 1000).toFixed(1) : null;
  const imageUrl = spot.imageUrl || spot.image_url || spot.photo || spot.image || null;
  const phone = spot.phone || spot.phone_number || spot.phoneNumber || null;
  const website = spot.website || spot.url || null;
  const hours = spot.hours || spot.opening_hours || spot.operatingHours || null;
  const description = spot.description || spot.summary || spot.ai_summary || null;
  const lat = spot.latitude || spot.lat;
  const lng = spot.longitude || spot.lng;

  // Directions fallback trigger
  const handleDirectionsClick = (e) => {
    if (onDirections) {
      onDirections(spot);
    } else if (lat && lng) {
      const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(gmapsUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Share trigger
  const handleShareClick = () => {
    if (onShare) {
      onShare(spot);
    } else if (navigator.share) {
      navigator.share({
        title: name,
        text: `Check out ${name} on Nearby Locator!`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex justify-end">
      {/* 1. Backdrop Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        aria-hidden="true"
      />

      {/* 2. Slide-Over Panel Container */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-spot-title"
        tabIndex={-1}
        className={`relative w-full lg:w-[460px] h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-10 overflow-hidden outline-none animate-slide-left ${className}`}
      >
        {/* Sticky Header Bar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close place details drawer"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareClick}
              aria-label={`Share ${name}`}
              className="p-2 rounded-xl text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
            </button>

            {onSave && (
              <button
                type="button"
                onClick={(e) => onSave(e, spot)}
                aria-label={isSaved ? `Remove ${name} from saved` : `Save ${name} to list`}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isSaved ? '#ef4444' : 'none'} stroke={isSaved ? '#ef4444' : 'currentColor'} strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="flex-1 overflow-y-auto space-y-6 p-6 scrollbar-thin">
          {/* Cover Hero Image */}
          <div className="w-full h-48 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden relative border border-slate-200/80 dark:border-slate-800/80 shrink-0 flex items-center justify-center">
            {imageUrl && !imgError ? (
              <img
                src={imageUrl}
                alt={name}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-2">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" />
                  <circle cx="12" cy="9" r="3" />
                </svg>
                <span className="text-xs font-mono font-medium">Spatial High Resolution Map</span>
              </div>
            )}
          </div>

          {/* Primary Spot Heading */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {category}
              </span>
              {distanceKm && (
                <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                  📍 {distanceKm} km away
                </span>
              )}
            </div>

            <h2 id="drawer-spot-title" className="text-2xl font-heading font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {name}
            </h2>

            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1 font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-900/50 text-xs">
                ⭐ {rating}
              </span>
              {reviewCount && (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                  ({reviewCount} verified reviews)
                </span>
              )}
            </div>
          </div>

          {/* Location & Address Card */}
          {address && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Address</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-sans leading-snug">{address}</p>
            </div>
          )}

          {/* Operating Hours */}
          {hours && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Operating Hours</p>
              <p className="text-sm font-sans font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <span>🕒</span>
                <span>{typeof hours === 'string' ? hours : 'Open Today'}</span>
              </p>
            </div>
          )}

          {/* Description or AI Summary */}
          {description && (
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-slate-800/50 border border-blue-200/60 dark:border-slate-700/60 space-y-2">
              <p className="text-[10px] font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wider font-bold">About & Highlights</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed">{description}</p>
            </div>
          )}

          {/* Contact Details */}
          {(phone || website) && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Contact & Info</p>
              {phone && (
                <a href={`tel:${phone}`} className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  <span>📞</span>
                  <span>{phone}</span>
                </a>
              )}
              {website && (
                <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline truncate">
                  <span>🌐</span>
                  <span className="truncate">{website}</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky bottom-0 z-20 shrink-0 flex items-center gap-3">
          <button
            type="button"
            onClick={handleDirectionsClick}
            className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-sans text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
          >
            <span>🗺️</span>
            <span>Get Directions</span>
          </button>

          {onSave && (
            <button
              type="button"
              onClick={(e) => onSave(e, spot)}
              className={`h-11 px-4 rounded-xl border font-sans text-sm font-semibold flex items-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                isSaved
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{isSaved ? '❤️ Saved' : '🤍 Save'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


export const PlaceDetailDrawer = React.memo(
  PlaceDetailDrawerBase,
  (prev, next) =>
    prev.open === next.open &&
    prev.isSaved === next.isSaved &&
    prev.loading === next.loading &&
    (prev.spot?.id || prev.spot?.spotId) === (next.spot?.id || next.spot?.spotId) &&
    prev.spot?.name === next.spot?.name
);

export default PlaceDetailDrawer;
