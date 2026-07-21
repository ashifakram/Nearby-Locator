import React, { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';

export default function AdminLayout() {
  const { user, isAuthenticated } = useAuthStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    if (isAuthenticated && !user?.permissions?.some(p => p.startsWith('users.') || p.startsWith('roles.') || p.startsWith('audit.') || p.startsWith('metrics.'))) {
      showToast('Access denied. Administrator privileges required.', 'error');
    }
  }, [isAuthenticated, user, showToast]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.permissions?.some(p => p.startsWith('users.') || p.startsWith('roles.') || p.startsWith('audit.') || p.startsWith('metrics.'))) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex-grow flex flex-col overflow-hidden relative">
      <div className="bg-red-950/20 border-b border-red-500/20 px-6 py-2.5 flex items-center justify-between text-xs font-semibold text-red-400">
        <span>🛡️ SECURE ADMIN CONSOLE ENVIRONMENT</span>
        <span>ROLE: {user.role}</span>
      </div>
      <div className="flex-grow overflow-y-auto px-6 py-4">
        <Outlet />
      </div>
    </div>
  );
}
