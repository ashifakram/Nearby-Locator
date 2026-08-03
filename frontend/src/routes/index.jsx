import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import LoaderIcon from '../icons/LoaderIcon';
import GlobalAuthListener from '../components/global/GlobalAuthListener';

// 1. Layout imports
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';
import PublicLayout from '../layouts/PublicLayout';
import LegalLayout from '../layouts/LegalLayout';

// 2. Route Error fallback
import RouteErrorPage from '../pages/error/RouteErrorPage';

// 3. Lazy loaded pages for code splitting & rendering isolation
const LandingPage = lazy(() => import('../pages/landing/LandingPage'));
const SearchPage = lazy(() => import('../pages/search/SearchPage'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));


// Legal & Trust Pages
const PrivacyPolicyPage = lazy(() => import('../pages/legal/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('../pages/legal/TermsOfServicePage'));
const CookiePolicyPage = lazy(() => import('../pages/legal/CookiePolicyPage'));
const HelpCenterPage = lazy(() => import('../pages/legal/HelpCenterPage'));

// Public Marketing & Information Pages
const AboutPage = lazy(() => import('../pages/public/AboutPage'));
const ContactPage = lazy(() => import('../pages/public/ContactPage'));

// Authentication Pages Ecosystem
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const SignupPage = lazy(() => import('../pages/auth/SignupPage'));
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage'));
const EmailVerifiedSuccessPage = lazy(() => import('../pages/auth/EmailVerifiedSuccessPage'));
const VerificationRequiredPage = lazy(() => import('../pages/auth/VerificationRequiredPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'));
const PasswordResetSuccessPage = lazy(() => import('../pages/auth/PasswordResetSuccessPage'));
const LinkExpiredPage = lazy(() => import('../pages/auth/LinkExpiredPage'));
const AccountLockedPage = lazy(() => import('../pages/auth/AccountLockedPage'));
const AccountDisabledPage = lazy(() => import('../pages/auth/AccountDisabledPage'));
const SessionExpiredPage = lazy(() => import('../pages/auth/SessionExpiredPage'));

// Error & Access Pages
const UnauthorizedPage = lazy(() => import('../pages/error/UnauthorizedPage'));
const ForbiddenPage = lazy(() => import('../pages/error/ForbiddenPage'));
const RateLimitedPage = lazy(() => import('../pages/error/RateLimitedPage'));
const NotFoundPage = lazy(() => import('../pages/error/NotFoundPage'));

// Operational UX State Pages (HTTP errors)
const InternalServerErrorPage = lazy(() => import('../pages/error/InternalServerErrorPage'));
const ServiceUnavailablePage = lazy(() => import('../pages/error/ServiceUnavailablePage'));
const GatewayTimeoutPage = lazy(() => import('../pages/error/GatewayTimeoutPage'));
const MaintenancePage = lazy(() => import('../pages/error/MaintenancePage'));

// Operational UX State Pages (Auth delivery failures)
const EmailDeliveryFailedPage = lazy(() => import('../pages/auth/EmailDeliveryFailedPage'));
const OtpDeliveryFailedPage = lazy(() => import('../pages/auth/OtpDeliveryFailedPage'));
const OAuthProviderUnavailablePage = lazy(() => import('../pages/auth/OAuthProviderUnavailablePage'));

// Admin Pages
const AdminQueuesPage = lazy(() => import('../pages/admin/AdminQueuesPage'));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'));
const ProfileSettingsPage = lazy(() => import('../pages/settings/ProfileSettingsPage'));
const AccountSettingsPage = lazy(() => import('../pages/settings/AccountSettingsPage'));
const SecuritySettingsPage = lazy(() => import('../pages/settings/SecuritySettingsPage'));
const NotificationSettingsPage = lazy(() => import('../pages/settings/NotificationSettingsPage'));
const AppearanceSettingsPage = lazy(() => import('../pages/settings/AppearanceSettingsPage'));
const PrivacySettingsPage = lazy(() => import('../pages/settings/PrivacySettingsPage'));
const SessionsPage = lazy(() => import('../pages/settings/SessionsPage'));
const DangerZonePage = lazy(() => import('../pages/settings/DangerZonePage'));
const SettingsLayout = lazy(() => import('../components/settings/SettingsLayout'));
const SavedPlacesPage = lazy(() => import('../pages/search/SavedPlacesPage'));
const SearchHistoryPage = lazy(() => import('../pages/search/SearchHistoryPage'));

// Operations Center Layout & Pages
const AdminOperationsLayout = lazy(() => import('../layouts/AdminOperationsLayout'));
const OperationsOverviewPage = lazy(() => import('../pages/admin/operations/OperationsOverviewPage'));
const AuditLogsPage = lazy(() => import('../pages/admin/operations/AuditLogsPage'));
const AuthEventsPage = lazy(() => import('../pages/admin/operations/AuthEventsPage'));
const SystemErrorsPage = lazy(() => import('../pages/admin/operations/SystemErrorsPage'));
const ActiveSessionsPage = lazy(() => import('../pages/admin/operations/ActiveSessionsPage'));

// Additional Admin Pages
const AdminRolesPage = lazy(() => import('../pages/admin/AdminRolesPage'));
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage'));
const AdminSystemPage = lazy(() => import('../pages/admin/AdminSystemPage'));
const AdminApiDocsPage = lazy(() => import('../pages/admin/AdminApiDocsPage'));
const AdminDataExportsPage = lazy(() => import('../pages/admin/AdminDataExportsPage'));
const AdminProfilePage = lazy(() => import('../pages/admin/AdminProfilePage'));

// Shared suspense fallback skeleton loader
const SuspenseFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center flex-col gap-3.5 backdrop-blur-md bg-white/15">
    <LoaderIcon width={42} height={42} color="#2563eb" />
    <span className="text-xs font-bold text-slate-800 tracking-widest animate-pulse drop-shadow-xs font-sans">
      NEARBY LOCATOR
    </span>
  </div>
);

export const router = createBrowserRouter([
  {
    element: (
      <>
        <GlobalAuthListener />
        <Outlet />
      </>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      // A. Public Landing Page
      {
        path: '/',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <LandingPage />
          </Suspense>
        )
      },

      // B. Public Marketing Pages (PublicLayout shell)
      {
        element: <PublicLayout />,
        children: [
          { path: '/about', element: <Suspense fallback={<SuspenseFallback />}><AboutPage /></Suspense> },
          { path: '/contact', element: <Suspense fallback={<SuspenseFallback />}><ContactPage /></Suspense> },
        ]
      },

      // C. Legal & Trust Sub-Tree (LegalLayout shell with sidebar)
      {
        element: <LegalLayout />,
        children: [
          { path: '/privacy', element: <Suspense fallback={<SuspenseFallback />}><PrivacyPolicyPage /></Suspense> },
          { path: '/terms', element: <Suspense fallback={<SuspenseFallback />}><TermsOfServicePage /></Suspense> },
          { path: '/cookies', element: <Suspense fallback={<SuspenseFallback />}><CookiePolicyPage /></Suspense> },
          { path: '/help', element: <Suspense fallback={<SuspenseFallback />}><HelpCenterPage /></Suspense> },
        ]
      },

      // D. Public Authentication & Security Sub-Tree
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <Suspense fallback={<SuspenseFallback />}><LoginPage /></Suspense> },
          { path: '/signup', element: <Suspense fallback={<SuspenseFallback />}><SignupPage /></Suspense> },
          { path: '/verify-email', element: <Suspense fallback={<SuspenseFallback />}><VerifyEmailPage /></Suspense> },
          { path: '/email-verified', element: <Suspense fallback={<SuspenseFallback />}><EmailVerifiedSuccessPage /></Suspense> },
          { path: '/verify-required', element: <Suspense fallback={<SuspenseFallback />}><VerificationRequiredPage /></Suspense> },
          { path: '/forgot-password', element: <Suspense fallback={<SuspenseFallback />}><ForgotPasswordPage /></Suspense> },
          { path: '/reset-password', element: <Suspense fallback={<SuspenseFallback />}><ResetPasswordPage /></Suspense> },
          { path: '/reset-password-success', element: <Suspense fallback={<SuspenseFallback />}><PasswordResetSuccessPage /></Suspense> },
          { path: '/link-expired', element: <Suspense fallback={<SuspenseFallback />}><LinkExpiredPage /></Suspense> },
          { path: '/account-locked', element: <Suspense fallback={<SuspenseFallback />}><AccountLockedPage /></Suspense> },
          { path: '/account-disabled', element: <Suspense fallback={<SuspenseFallback />}><AccountDisabledPage /></Suspense> },
          { path: '/session-expired', element: <Suspense fallback={<SuspenseFallback />}><SessionExpiredPage /></Suspense> },
          { path: '/401', element: <Suspense fallback={<SuspenseFallback />}><UnauthorizedPage /></Suspense> },
          { path: '/403', element: <Suspense fallback={<SuspenseFallback />}><ForbiddenPage /></Suspense> },
          { path: '/429', element: <Suspense fallback={<SuspenseFallback />}><RateLimitedPage /></Suspense> },

          // HTTP operational error pages
          { path: '/500', element: <Suspense fallback={<SuspenseFallback />}><InternalServerErrorPage /></Suspense> },
          { path: '/503', element: <Suspense fallback={<SuspenseFallback />}><ServiceUnavailablePage /></Suspense> },
          { path: '/504', element: <Suspense fallback={<SuspenseFallback />}><GatewayTimeoutPage /></Suspense> },
          { path: '/maintenance', element: <Suspense fallback={<SuspenseFallback />}><MaintenancePage /></Suspense> },

          // Auth delivery failure states
          { path: '/email-delivery-failed', element: <Suspense fallback={<SuspenseFallback />}><EmailDeliveryFailedPage /></Suspense> },
          { path: '/otp-delivery-failed', element: <Suspense fallback={<SuspenseFallback />}><OtpDeliveryFailedPage /></Suspense> },
          { path: '/oauth-unavailable', element: <Suspense fallback={<SuspenseFallback />}><OAuthProviderUnavailablePage /></Suspense> },

          // 404 inside AuthLayout so it gets the same visual shell
          { path: '/404', element: <Suspense fallback={<SuspenseFallback />}><NotFoundPage /></Suspense> }
        ]
      },

      // E. Authenticated Application Sub-Tree
      {
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: '/dashboard', element: <Suspense fallback={<SuspenseFallback />}><DashboardPage /></Suspense> },
          { path: '/discover', element: <Suspense fallback={<SuspenseFallback />}><SearchPage /></Suspense> },
          { path: '/saved', element: <Suspense fallback={<SuspenseFallback />}><SavedPlacesPage /></Suspense> },
          { path: '/history', element: <Suspense fallback={<SuspenseFallback />}><SearchHistoryPage /></Suspense> },
          {
            path: '/settings',
            element: <Suspense fallback={<SuspenseFallback />}><SettingsLayout /></Suspense>,
            children: [
              { path: '', element: <Navigate to="profile" replace /> },
              { path: 'profile', element: <Suspense fallback={<SuspenseFallback />}><ProfileSettingsPage /></Suspense> },
              { path: 'account', element: <Suspense fallback={<SuspenseFallback />}><AccountSettingsPage /></Suspense> },
              { path: 'security', element: <Suspense fallback={<SuspenseFallback />}><SecuritySettingsPage /></Suspense> },
              { path: 'notifications', element: <Suspense fallback={<SuspenseFallback />}><NotificationSettingsPage /></Suspense> },
              { path: 'appearance', element: <Suspense fallback={<SuspenseFallback />}><AppearanceSettingsPage /></Suspense> },
              { path: 'privacy', element: <Suspense fallback={<SuspenseFallback />}><PrivacySettingsPage /></Suspense> },
              { path: 'sessions', element: <Suspense fallback={<SuspenseFallback />}><SessionsPage /></Suspense> },
              { path: 'danger-zone', element: <Suspense fallback={<SuspenseFallback />}><DangerZonePage /></Suspense> }
            ]
          }
        ]

      },

      // F. Protected Admin Dashboard Sub-Tree
      {
        element: (
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        ),
        children: [
          { path: '/admin', element: <Navigate to="/admin/operations/overview" replace /> },
          { path: '/admin/queues', element: <Suspense fallback={<SuspenseFallback />}><AdminQueuesPage /></Suspense> },
          { path: '/admin/users', element: <Suspense fallback={<SuspenseFallback />}><AdminUsersPage /></Suspense> },
          { path: '/admin/roles', element: <Suspense fallback={<SuspenseFallback />}><AdminRolesPage /></Suspense> },
          { path: '/admin/settings', element: <Suspense fallback={<SuspenseFallback />}><AdminSettingsPage /></Suspense> },
          { path: '/admin/system', element: <Suspense fallback={<SuspenseFallback />}><AdminSystemPage /></Suspense> },
          { path: '/admin/docs', element: <Suspense fallback={<SuspenseFallback />}><AdminApiDocsPage /></Suspense> },
          { path: '/admin/exports', element: <Suspense fallback={<SuspenseFallback />}><AdminDataExportsPage /></Suspense> },
          { path: '/admin/profile', element: <Suspense fallback={<SuspenseFallback />}><AdminProfilePage /></Suspense> },

          // Operations Sub-Tree
          {
            path: '/admin/operations',
            element: <Suspense fallback={<SuspenseFallback />}><AdminOperationsLayout /></Suspense>,
            children: [
              { path: '', element: <Navigate to="overview" replace /> },
              { path: 'overview', element: <Suspense fallback={<SuspenseFallback />}><OperationsOverviewPage /></Suspense> },
              { path: 'audit-logs', element: <Suspense fallback={<SuspenseFallback />}><AuditLogsPage /></Suspense> },
              { path: 'auth-events', element: <Suspense fallback={<SuspenseFallback />}><AuthEventsPage /></Suspense> },
              { path: 'system-errors', element: <Suspense fallback={<SuspenseFallback />}><SystemErrorsPage /></Suspense> },
              { path: 'active-sessions', element: <Suspense fallback={<SuspenseFallback />}><ActiveSessionsPage /></Suspense> }
            ]
          }
        ]
      },

      // 404 Fallback Route — wrapped in AuthLayout for design consistency
      {
        element: <AuthLayout />,
        children: [
          { path: '*', element: <Suspense fallback={<SuspenseFallback />}><NotFoundPage /></Suspense> }
        ]
      }
    ]
  }
]);
