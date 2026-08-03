import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';

export default function VerificationRequiredPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || 'your email address';

  return (
    <AuthCard>
      <StatusCard
        type="warning"
        title="Verification Required"
        description={`Your account must be verified before accessing this feature. Check your inbox at ${email} for your 6-digit OTP code.`}
        primaryActionLabel="Enter Verification OTP"
        primaryActionTo="/verify-email"
        secondaryActionLabel="Back to Sign In"
        secondaryActionTo="/login"
      />
    </AuthCard>
  );
}
