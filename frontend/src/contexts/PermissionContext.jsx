import React, { createContext, useContext, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const permissions = useAuthStore((state) => state.permissions);
  const permissionState = useAuthStore((state) => state.permissionState);
  
  // Memoize the permission set for O(1) lookups
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const hasPermission = (permission) => {
    if (!permission) return true;
    if (permissionState !== 'READY') return false;
    return permissionSet.has(permission);
  };

  const hasAnyPermission = (permissionsArray) => {
    if (!permissionsArray || permissionsArray.length === 0) return true;
    if (permissionState !== 'READY') return false;
    return permissionsArray.some(p => permissionSet.has(p));
  };

  const hasAllPermissions = (permissionsArray) => {
    if (!permissionsArray || permissionsArray.length === 0) return true;
    if (permissionState !== 'READY') return false;
    return permissionsArray.every(p => permissionSet.has(p));
  };

  const value = useMemo(() => ({
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissionState,
  }), [permissionSet, permissionState]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}
