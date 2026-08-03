import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Legacy Login view fallback redirecting to current /login route.
 */
export default function Login() {
  return <Navigate to="/login" replace />;
}
