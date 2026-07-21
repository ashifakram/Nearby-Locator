import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (isAuthenticated) {
    return <Navigate to="/discover" replace />;
  }

  if (location.pathname === '/login') {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#070A12] text-slate-100">
      <div className="w-full max-w-md rounded-3xl shadow-2xl p-8 backdrop-blur-xl bg-slate-900/40 border border-slate-800/80">
        <Outlet />
      </div>
    </div>
  );
}
