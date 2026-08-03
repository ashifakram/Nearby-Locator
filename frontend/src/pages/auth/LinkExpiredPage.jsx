import React from 'react';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';

export default function LinkExpiredPage() {
  return (
    <AuthCard>
      <StatusCard
        type="expired"
        title="Link or Code Expired"
        description="The verification link or OTP code you provided has expired or was already consumed."
        primaryActionLabel="Request New Verification OTP"
        primaryActionTo="/verify-email"
        secondaryActionLabel="Back to Sign In"
        secondaryActionTo="/login"
      />
    </AuthCard>
  );
}
