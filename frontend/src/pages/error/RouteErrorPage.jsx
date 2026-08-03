import React from 'react';
import { useRouteError } from 'react-router-dom';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';
import { logger } from '../../utils/logger';

/**
 * RouteErrorPage
 * React Router v6 errorElement — catches route-level errors thrown during lazy load,
 * loader failures, or render-phase crashes within a router segment.
 */
export default function RouteErrorPage() {
  const error = useRouteError();
  logger.error('[RouteErrorPage] Fatal route crash:', error);

  const isDev = import.meta.env.DEV;
  const errorMessage = error?.message || error?.statusText || String(error);

  return (
    <AuthCard>
      <StatusCard
        type="error"
        title="Routing Error"
        description="A fatal error occurred while loading this page. This may be caused by a failed code chunk or an unhandled exception."
        details={
          <div className="space-y-2">
            {isDev && (
              <div className="font-mono text-xs text-rose-700 bg-rose-50/80 border border-rose-200/60 rounded-xl p-3 break-all max-h-28 overflow-y-auto">
                <strong>DEV:</strong> {errorMessage}
              </div>
            )}
            <p className="text-slate-600">
              Reloading the page usually resolves this. If the error persists, try clearing your browser cache.
            </p>
          </div>
        }
        primaryActionLabel="Reload Page"
        onPrimaryAction={() => window.location.reload()}
        secondaryActionLabel="Return to Home"
        secondaryActionTo="/"
      />
    </AuthCard>
  );
}
