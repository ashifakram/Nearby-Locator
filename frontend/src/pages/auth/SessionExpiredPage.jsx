import React from 'react';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';

export default function SessionExpiredPage() {
  return (
    <AuthCard>
      <StatusCard
        type="info"
        title="Session Expired"
        description="Your login session has expired due to inactivity or token rotation. Please sign in again to continue."
        primaryActionLabel="Sign In Again"
        primaryActionTo="/login"
      />
    </AuthCard>
  );
}
