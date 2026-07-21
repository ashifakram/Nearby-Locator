import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function AdminRoute({ children }) {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user?.permissions?.some(p => p.startsWith('users.') || p.startsWith('roles.') || p.startsWith('audit.') || p.startsWith('metrics.'))) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}
