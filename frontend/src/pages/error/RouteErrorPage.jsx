import React from 'react';
import { useRouteError } from 'react-router-dom';
import { logger } from '../../utils/logger';

export default function RouteErrorPage() {
  const error = useRouteError();
  logger.error('Fatal route crash captured by RouteErrorPage:', error);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <span className="text-5xl block mb-4">⚠️</span>
        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          The application encountered a non-catastrophic rendering failure. You can reload the page to restore normal operation.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-2xl font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg transition-all duration-200 hover:scale-[1.02]"
        >
          Reload Application
        </button>
      </div>
    </div>
  );
}
