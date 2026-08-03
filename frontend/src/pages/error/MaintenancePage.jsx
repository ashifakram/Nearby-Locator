import React from 'react';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';

/** Triggered by: deploying with maintenance mode env flag, or navigating to /maintenance directly */
export default function MaintenancePage() {
  return (
    <AuthCard>
      <StatusCard
        type="info"
        title="Scheduled Maintenance"
        description="Nearby Locator is undergoing planned maintenance to improve your experience. We'll be back shortly."
        details={
          <div className="space-y-3 text-slate-600">
            <p>
              <strong className="text-slate-800">What we're doing:</strong> Database migrations, infrastructure upgrades, and performance tuning.
            </p>
            <p>Expected downtime: <strong className="text-slate-800">15–30 minutes.</strong> We apologize for any inconvenience.</p>
            <div className="border-t border-slate-200 pt-3 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
              </span>
              <span className="text-xs font-semibold text-blue-600">Maintenance in progress…</span>
            </div>
          </div>
        }
        primaryActionLabel="Refresh to Check"
        onPrimaryAction={() => window.location.reload()}
        secondaryActionLabel="Contact Support"
        onSecondaryAction={() => window.open('mailto:support@nearbylocator.com', '_blank')}
      />
    </AuthCard>
  );
}
