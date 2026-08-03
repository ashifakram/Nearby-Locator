import React, { useState } from 'react';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';
import CountdownTimer from '../../components/auth/CountdownTimer';

export default function GatewayTimeoutPage() {
  const [canRetry, setCanRetry] = useState(false);

  return (
    <AuthCard>
      <StatusCard
        type="warning"
        title="504 — Gateway Timeout"
        description="The upstream server did not respond in time. Your request could not be completed. This is usually transient."
        details={
          <div className="space-y-3 text-slate-600">
            <p>
              <strong className="text-slate-800">What happened?</strong> A downstream service (database, external API) took too long to respond.
            </p>
            <p>Check your network connection. If the issue persists, the service may be experiencing high load.</p>
            <div className="border-t border-slate-200 pt-3 text-center">
              {!canRetry ? (
                <>
                  <p className="text-xs text-slate-500 mb-2">Auto-retry available in</p>
                  <CountdownTimer initialSeconds={15} onTimerEnd={() => setCanRetry(true)} />
                </>
              ) : (
                <span className="text-xs font-bold text-emerald-600">✅ Ready — you may retry now.</span>
              )}
            </div>
          </div>
        }
        primaryActionLabel={canRetry ? 'Retry Request' : 'Please Wait…'}
        onPrimaryAction={canRetry ? () => window.location.reload() : undefined}
        secondaryActionLabel="Go to Dashboard"
        secondaryActionTo="/discover"
      />
    </AuthCard>
  );
}
