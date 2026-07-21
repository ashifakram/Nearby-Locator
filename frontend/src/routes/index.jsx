import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import LoaderIcon from '../icons/LoaderIcon';

// 1. Layout imports
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';

// 2. Route Error fallback
import RouteErrorPage from '../pages/error/RouteErrorPage';

// 3. Lazy loaded pages for code splitting & rendering isolation (Performance baseline)
const LandingPage = lazy(() => import('../pages/landing/LandingPage'));
const SearchPage = lazy(() => import('../pages/search/SearchPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const SignupPage = lazy(() => import('../pages/auth/SignupPage'));
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'));
const AdminQueuesPage = lazy(() => import('../pages/admin/AdminQueuesPage'));
const NotFoundPage = lazy(() => import('../pages/error/NotFoundPage'));

// Shared suspense fallback skeleton loader
const SuspenseFallback = () => (
  <div className="w-full h-full flex items-center justify-center flex-col gap-3 min-h-[300px]">
    <LoaderIcon width={32} height={32} color="cyan" />
    <span className="text-xs font-medium text-gray-400 tracking-widest animate-pulse">LOADING LAYER...</span>
  </div>
);

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      // A. Completely Public Landing Route
      {
        path: '/',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <LandingPage />
          </Suspense>
        )
      },

      // B. Public Authentication Sub-Tree
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/login',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <LoginPage />
              </Suspense>
            )
          },
          {
            path: '/signup',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <SignupPage />
              </Suspense>
            )
          },
          {
            path: '/verify-email',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <VerifyEmailPage />
              </Suspense>
            )
          },
          {
            path: '/forgot-password',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <ForgotPasswordPage />
              </Suspense>
            )
          },
          {
            path: '/reset-password',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <ResetPasswordPage />
              </Suspense>
            )
          }
        ]
      },

      // C. Authenticated Application Sub-Tree
      {
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            path: '/discover',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <SearchPage />
              </Suspense>
            )
          },
          // D. Secure Administrative RBAC Sub-Tree
          {
            element: (
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            ),
            children: [
              {
                path: '/admin',
                element: (
                  <Suspense fallback={<SuspenseFallback />}>
                    <AdminQueuesPage />
                  </Suspense>
                )
              }
            ]
          }
        ]
      },

      // E. Global Error Catch-Alls
      {
        path: '/404',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <NotFoundPage />
          </Suspense>
        )
      },
      {
        path: '*',
        element: <Navigate to="/404" replace />
      }
    ]
  }
]);
