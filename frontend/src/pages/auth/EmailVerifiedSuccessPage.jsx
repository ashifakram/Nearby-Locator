import React from 'react';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';

export default function EmailVerifiedSuccessPage() {
  return (
    <AuthCard>
      <StatusCard
        type="success"
        title="Email Verified!"
        description="Your email address has been successfully verified. Your account is now active and ready."
        primaryActionLabel="Continue to Sign In"
        primaryActionTo="/login"
      />
    </AuthCard>
  );
}
