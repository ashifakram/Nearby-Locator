import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { usePermissions } from '../contexts/PermissionContext';
import LoaderIcon from '../icons/LoaderIcon';

export default function ProtectedRoute({ children, requirePermission, anyOf, allOf }) {
  const status = useAuthStore((state) => state.status);
  const { hasPermission, hasAnyPermission, hasAllPermissions, permissionState } = usePermissions();
  const location = useLocation();

  if (status === 'UNKNOWN') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col gap-3 text-white">
        <LoaderIcon width={40} height={40} color="white" />
        <span className="text-sm font-semibold tracking-wider text-gray-400">Restoring Session...</span>
      </div>
    );
  }

  if (status === 'UNAUTHENTICATED') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If permissions are actively loading or unknown, show loading UI
  if (permissionState === 'UNKNOWN' || permissionState === 'LOADING') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col gap-3 text-white">
        <LoaderIcon width={40} height={40} color="white" />
        <span className="text-sm font-semibold tracking-wider text-gray-400">Loading Access Profile...</span>
      </div>
    );
  }

  let authorized = true;

  if (requirePermission && !hasPermission(requirePermission)) {
    authorized = false;
  }

  if (anyOf && !hasAnyPermission(anyOf)) {
    authorized = false;
  }

  if (allOf && !hasAllPermissions(allOf)) {
    authorized = false;
  }

  if (!authorized) {
    return <Navigate to="/403" replace />;
  }

  return children;
}
