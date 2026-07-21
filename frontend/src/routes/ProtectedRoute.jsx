import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import LoaderIcon from '../icons/LoaderIcon';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isRestoring } = useAuthStore();
  const location = useLocation();

  if (isRestoring) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col gap-3 text-white">
        <LoaderIcon width={40} height={40} color="white" />
        <span className="text-sm font-semibold tracking-wider text-gray-400">Restoring Session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
