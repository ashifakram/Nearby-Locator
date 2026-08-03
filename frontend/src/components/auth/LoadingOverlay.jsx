import React from 'react';
import LoaderIcon from '../../icons/LoaderIcon';

export default function LoadingOverlay({ message = 'Authenticating...' }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl bg-white/80 backdrop-blur-md transition-all duration-300 font-sans">
      <LoaderIcon width={40} height={40} color="#2563eb" />
      <span className="mt-3 text-sm font-bold tracking-wide text-slate-900 animate-pulse">
        {message}
      </span>
    </div>
  );
}
