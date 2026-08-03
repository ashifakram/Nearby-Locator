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
    const handlePermissionRefresh = () => {
      useToastStore.getState().showToast('Authorization expired. Refreshing permissions...', 'error');
      authService.fetchUserPermissions();
    };

    window.addEventListener('permission_refresh_required', handlePermissionRefresh);
    return () => window.removeEventListener('permission_refresh_required', handlePermissionRefresh);
  }, []);

  return null;
}
