import React from 'react';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';

export default function InternalServerErrorPage() {
  return (
    <AuthCard>
      <StatusCard
        type="error"
        title="500 — Internal Server Error"
        description="Something went wrong on our end. Our engineering team has been notified and is investigating the issue."
        details={
          <div className="space-y-2 text-slate-600">
            <p><strong className="text-slate-800">What happened?</strong> An unexpected server-side exception occurred while processing your request.</p>
            <p>If this persists, try refreshing or clearing your browser cache. Contact support if the problem continues.</p>
          </div>
        }
        primaryActionLabel="Retry Request"
        onPrimaryAction={() => window.location.reload()}
        secondaryActionLabel="Return to Home"
        secondaryActionTo="/"
      />
    </AuthCard>
  );
}
