import React from 'react';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';

export default function AccountLockedPage() {
  return (
    <AuthCard>
      <StatusCard
        type="locked"
        title="Account Temporarily Locked"
        description="Your account was locked due to multiple failed verification attempts or suspicious activity detection."
        details={
          <div className="space-y-1">
            <p><strong>Lock Duration:</strong> 15 minutes security cooldown</p>
            <p><strong>Unlock Guidance:</strong> You may wait for the cooldown to expire or initiate a password reset to unlock your account immediately.</p>
          </div>
        }
        primaryActionLabel="Reset Password to Unlock"
        primaryActionTo="/forgot-password"
        secondaryActionLabel="Back to Sign In"
        secondaryActionTo="/login"
      />
    </AuthCard>
  );
}
