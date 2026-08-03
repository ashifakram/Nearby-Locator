import React, { useState } from 'react';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';
import CountdownTimer from '../../components/auth/CountdownTimer';

export default function RateLimitedPage() {
  const [canRetry, setCanRetry] = useState(false);

  return (
    <AuthCard>
      <StatusCard
        type="warning"
        title="429 — Too Many Requests"
        description="You have made too many requests in a short period. Please wait for the rate limit cooldown before retrying."
        details={
          <div className="text-center py-1">
            {!canRetry ? (
              <CountdownTimer initialSeconds={60} onTimerEnd={() => setCanRetry(true)} />
            ) : (
              <span className="text-xs font-bold text-emerald-600">✅ Rate limit reset! You may retry now.</span>
            )}
          </div>
        }
        primaryActionLabel={canRetry ? 'Try Again' : 'Wait for Cooldown'}
        primaryActionTo="/login"
      />
    </AuthCard>
  );
}
