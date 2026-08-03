import React from 'react';
import ProtectedRoute from './ProtectedRoute';

export default function AdminRoute({ children }) {
  return (
    <ProtectedRoute requirePermission="admin.access">
      {children}
    </ProtectedRoute>
  );
}
