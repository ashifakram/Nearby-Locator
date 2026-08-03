import React from 'react';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';

export default function ForbiddenPage() {
  return (
    <AuthCard>
      <StatusCard
        type="error"
        title="403 — Access Denied"
        description="You do not have administrative permissions or role clearance to access this resource."
        primaryActionLabel="Return to Discover"
        primaryActionTo="/discover"
        secondaryActionLabel="Back to Sign In"
        secondaryActionTo="/login"
      />
    </AuthCard>
  );
}
