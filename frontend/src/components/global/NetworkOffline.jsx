import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * NetworkOffline
 *
 * Triggered by: navigator.onLine === false (page load offline)
 *               OR window 'offline' event fires during session.
 * Dismissed by: window 'online' event — auto-hides with 2s success toast.
 *
 * Usage: Mount inside any layout. Renders a fixed top banner when offline.
 * Does NOT require AuthLayout — works globally at app level.
 */
export default function NetworkOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  const handleOffline = useCallback(() => {
    setIsOffline(true);
    setJustReconnected(false);
  }, []);

  const handleOnline = useCallback(() => {
    setJustReconnected(true);
    setTimeout(() => {
      setIsOffline(false);
      setJustReconnected(false);
    }, 2000);
  }, []);

  useEffect(() => {
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [handleOffline, handleOnline]);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 px-4 py-3 text-sm font-semibold transition-all duration-500 shadow-lg font-sans ${
        justReconnected
          ? 'bg-emerald-600 text-white'
          : 'bg-slate-900 text-white border-b border-rose-500/40'
      }`}
    >
      {justReconnected ? (
        <>
          <Wifi className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>Connection restored — you're back online.</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
          <span>No internet connection — please check your network.</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ml-2 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold transition-colors cursor-pointer"
          >
            Retry
          </button>
        </>
      )}
    </div>
  );
}
