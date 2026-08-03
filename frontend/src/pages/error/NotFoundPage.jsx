import React from 'react';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';

export default function NotFoundPage() {
  return (
    <AuthCard>
      <StatusCard
        type="info"
        title="404 — Page Not Found"
        description="The coordinates you entered don't map to any existing page. The URL may be misspelled or the page may have moved."
        details={
          <p className="text-slate-600">
            Double-check the URL in your browser. If you followed a link, it may be broken or outdated.
          </p>
        }
        primaryActionLabel="Return to Home"
        primaryActionTo="/"
        secondaryActionLabel="Go to Dashboard"
        secondaryActionTo="/discover"
      />
    </AuthCard>
  );
}
