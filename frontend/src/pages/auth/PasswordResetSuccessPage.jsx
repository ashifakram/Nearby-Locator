import React from 'react';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';

export default function PasswordResetSuccessPage() {
  return (
    <AuthCard>
      <StatusCard
        type="success"
        title="Password Reset Complete"
        description="Your password has been successfully updated. All active login sessions across your devices have been revoked for your security."
        primaryActionLabel="Sign In with New Password"
        primaryActionTo="/login"
      />
    </AuthCard>
  );
}
