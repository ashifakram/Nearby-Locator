import React from 'react';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';

export default function AccountDisabledPage() {
  return (
    <AuthCard>
      <StatusCard
        type="error"
        title="Account Suspended"
        description="Your account has been disabled by system administrators or due to policy terms violation."
        details={
          <p>If you believe this is an error, please reach out to our compliance support team to submit an appeal.</p>
        }
        primaryActionLabel="Contact Support"
        onPrimaryAction={() => window.location.href = 'mailto:support@nearby.com?subject=Account%20Suspension%20Appeal'}
        secondaryActionLabel="Back to Sign In"
        secondaryActionTo="/login"
      />
    </AuthCard>
  );
}
