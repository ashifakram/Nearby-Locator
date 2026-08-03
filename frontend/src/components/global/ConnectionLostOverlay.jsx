import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, CloudOff, Info, RefreshCw } from 'lucide-react';
import LoaderIcon from '../../icons/LoaderIcon';

const HEALTH_ENDPOINT = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/v1/health`;
const POLL_INTERVAL_MS = 8000;    // probe every 8s while overlay is visible
const PING_TIMEOUT_MS = 5000;     // consider failed after 5s

/**
 * ConnectionLostOverlay
 *
 * Triggered when:
 *   - navigator.onLine fires 'offline'
 *   - OR a periodic health probe to /api/v1/health fails (backend down even if LAN is up)
 *
 * Dismissed when:
 *   - Health probe succeeds → auto-dismisses with a 1.5s success flash
 *
 * Usage: Mount once inside AppLayout (authenticated shell only).
 * The overlay sits at z-[9998], below NetworkOffline banner (z-9999).
 */
export default function ConnectionLostOverlay() {
  const [visible, setVisible] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const pollRef = useRef(null);
  const mountedRef = useRef(true);

  const probe = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
      const res = await fetch(HEALTH_ENDPOINT, {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok && mountedRef.current) {
        setRecovering(true);
        setTimeout(() => {
          if (mountedRef.current) {
            setVisible(false);
            setRecovering(false);
            setAttempts(0);
          }
        }, 1500);
        return true;
      }
    } catch {
      /* network failure — stay visible */
    }

    if (mountedRef.current) {
      setAttempts((n) => n + 1);
    }
    return false;
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      probe();
    }, POLL_INTERVAL_MS);
  }, [probe]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const handleOffline = useCallback(() => {
    if (!mountedRef.current) return;
    setVisible(true);
    setAttempts(0);
    startPolling();
  }, [startPolling]);

  const handleOnline = useCallback(() => {
    // Browser says we're back — do a real probe to confirm backend is up
    probe();
  }, [probe]);

  useEffect(() => {
    mountedRef.current = true;

    // Also run an initial probe on mount to catch stale-network scenarios
    if (!navigator.onLine) {
      setVisible(true);
      startPolling();
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      mountedRef.current = false;
      stopPolling();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [handleOffline, handleOnline, startPolling, stopPolling, probe]);

  // Stop polling when overlay hides
  useEffect(() => {
    if (!visible) stopPolling();
  }, [visible, stopPolling]);

  if (!visible) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Connection lost"
      className="fixed inset-0 z-[9998] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md font-sans"
    >
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl">

        {/* Icon */}
        <div className="flex justify-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center border shadow-2xs transition-colors duration-500 ${
              recovering
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : 'bg-rose-50 border-rose-200 text-rose-600'
            }`}
          >
            {recovering ? (
              <CheckCircle className="w-8 h-8 shrink-0" />
            ) : (
              <CloudOff className="w-8 h-8 shrink-0" />
            )}
          </div>
        </div>

        {/* Title & description */}
        <div>
          <h2 className="text-2xl font-bold font-heading tracking-tight text-slate-900">
            {recovering ? 'Reconnecting…' : 'Connection Lost'}
          </h2>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed font-sans">
            {recovering
              ? 'Backend is responding again. Restoring your session…'
              : 'Your connection to the Nearby Locator server was interrupted. Your work is safe — we\'re trying to reconnect.'}
          </p>
        </div>

        {/* Probe status */}
        {!recovering && (
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 space-y-2 text-left">
            <div className="flex items-center gap-2">
              <LoaderIcon width={16} height={16} color="#2563eb" />
              <span className="text-xs font-semibold text-slate-900">
                Probing server health…{attempts > 0 && ` (attempt ${attempts})`}
              </span>
            </div>
            <div className="flex items-start gap-2 text-slate-600">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span className="text-xs">
                Auto-retrying every {POLL_INTERVAL_MS / 1000}s. Your data will not be lost.
              </span>
            </div>
          </div>
        )}

        {/* Manual retry */}
        {!recovering && (
          <button
            type="button"
            onClick={probe}
            className="w-full h-[52px] flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
          >
            <span>Check Connection Now</span>
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
