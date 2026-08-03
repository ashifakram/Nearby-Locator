import React, { useState } from 'react';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';
import CountdownTimer from '../../components/auth/CountdownTimer';

export default function ServiceUnavailablePage() {
  const [canRetry, setCanRetry] = useState(false);

  return (
    <AuthCard>
      <StatusCard
        type="warning"
        title="503 — Service Unavailable"
        description="The server is temporarily unable to handle this request. This is usually due to maintenance or overload."
        details={
          <div className="space-y-3">
            <p className="text-slate-600">
              <strong className="text-slate-800">Likely cause:</strong> Scheduled maintenance window or temporary capacity overload.
            </p>
            <div className="border-t border-slate-200 pt-3 text-center">
              {!canRetry ? (
                <>
                  <p className="text-xs text-slate-500 mb-2">Auto-retry in</p>
                  <CountdownTimer initialSeconds={30} onTimerEnd={() => setCanRetry(true)} />
                </>
              ) : (
                <span className="text-xs font-bold text-emerald-600">✅ Ready — you may retry now.</span>
              )}
            </div>
          </div>
        }
        primaryActionLabel={canRetry ? 'Retry Now' : 'Waiting for Service…'}
        onPrimaryAction={canRetry ? () => window.location.reload() : undefined}
        secondaryActionLabel="Check System Status"
        onSecondaryAction={() => window.open('mailto:support@nearbylocator.com', '_blank')}
      />
    </AuthCard>
  );
}
