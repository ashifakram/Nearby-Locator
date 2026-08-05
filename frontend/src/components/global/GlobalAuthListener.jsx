import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/auth';
import { useToastStore } from '../../store/useToastStore';

export default function GlobalAuthListener() {
  const navigate = useNavigate();
  const navigationEvent = useAuthStore((state) => state.navigationEvent);
  const clearNavigation = useAuthStore((state) => state.clearNavigation);

  useEffect(() => {
    if (navigationEvent) {
      navigate(navigationEvent);
      clearNavigation();
    }
  }, [navigationEvent, navigate, clearNavigation]);

  useEffect(() => {
    let lastRefresh = 0;
    const handlePermissionRefresh = () => {
      const now = Date.now();
      if (now - lastRefresh < 10000) return;
      lastRefresh = now;
      authService.fetchUserPermissions();
    };

    window.addEventListener('permission_refresh_required', handlePermissionRefresh);
    return () => window.removeEventListener('permission_refresh_required', handlePermissionRefresh);
  }, []);

  return null;
}
