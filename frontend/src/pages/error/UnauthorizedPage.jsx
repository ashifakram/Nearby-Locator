import React from 'react';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';

export default function UnauthorizedPage() {
  return (
    <AuthCard>
      <StatusCard
        type="warning"
        title="401 — Unauthorized Access"
        description="You must be logged in to view this page or resource."
        primaryActionLabel="Sign In to Continue"
        primaryActionTo="/login"
      />
    </AuthCard>
  );
}
