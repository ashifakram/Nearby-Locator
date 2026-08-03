import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from '../lib/queryClient';
import { router } from '../routes';
import GlobalErrorBoundary from '../components/global/GlobalErrorBoundary';
import NetworkOffline from '../components/global/NetworkOffline';
import { ToastContainer } from '../components/global/ToastContainer';
import { PermissionProvider } from '../contexts/PermissionContext';

export default function Providers() {
  return (
    <GlobalErrorBoundary>
      {/* Global network-offline banner & Toast Notifications — renders across ENTIRE application */}
      <NetworkOffline />
      <ToastContainer />
      <QueryClientProvider client={queryClient}>
        <PermissionProvider>
          <RouterProvider router={router} />
        </PermissionProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

