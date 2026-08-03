import React from 'react';
import { usePermissions } from '../../contexts/PermissionContext';

export default function Can({ I, anyOf, allOf, children, fallback = null }) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, permissionState } = usePermissions();

  // Fail-safe: if permissions are not ready (UNKNOWN, LOADING, FAILED), do not render children
  if (permissionState !== 'READY') {
    return fallback;
  }

  let authorized = true;

  if (I && !hasPermission(I)) {
    authorized = false;
  }

  if (anyOf && !hasAnyPermission(anyOf)) {
    authorized = false;
  }

  if (allOf && !hasAllPermissions(allOf)) {
    authorized = false;
  }

  return authorized ? <>{children}</> : fallback;
}
