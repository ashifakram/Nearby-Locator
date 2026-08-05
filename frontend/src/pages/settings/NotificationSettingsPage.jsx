import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../store/useToastStore';
import { userSettingsService } from '../../services/userSettingsService';
import { queryKeys } from '../../lib/queryKeys';
import {
  SettingsCard,
  SettingsSection,
  SettingsRow,
  SettingsSwitch
} from '../../components/settings/SettingsCard';

export default function NotificationSettingsPage() {
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  // Fetch notification settings
  const { data: notificationsData } = useQuery({
    queryKey: queryKeys.settings.notifications(),
    queryFn: () => userSettingsService.getNotificationSettings(),
    staleTime: 5 * 60 * 1000
  });

  useEffect(() => {
    if (notificationsData) {
      const email = notificationsData.email_notifications || {};
      if (notificationsData.security_alerts !== undefined) setSecurityAlerts(notificationsData.security_alerts);
      if (email.updates !== undefined) setProductUpdates(email.updates);
      if (email.marketing !== undefined) setMarketingEmails(email.marketing);
      if (email.weekly_digest !== undefined) setWeeklyDigest(email.weekly_digest);
    }
  }, [notificationsData]);

  // Mutation
  const updateMutation = useMutation({
    queryKey: queryKeys.settings.notifications(),
    mutationFn: (newSettings) => userSettingsService.updateNotificationSettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.notifications() });
      showToast('Notification preferences saved to server!', 'success');
    },
    onError: (err) => {
      showToast('Failed to sync settings with server.', 'error');
    }
  });

  const handleToggle = (setter, keyName, val) => {
    setter(val);
    
    const emailPayload = {
      updates: keyName === 'productUpdates' ? val : productUpdates,
      marketing: keyName === 'marketingEmails' ? val : marketingEmails,
      weekly_digest: keyName === 'weeklyDigest' ? val : weeklyDigest,
    };

    updateMutation.mutate({
      security_alerts: keyName === 'securityAlerts' ? val : securityAlerts,
      email_notifications: emailPayload,
    });
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-slate-100">
          Notification Preferences
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Choose what notifications you receive via email and in-app alerts.
        </p>
      </div>

      <SettingsCard>
        <SettingsSection title="Email Notifications" description="Manage email communications sent to your primary address.">
          <SettingsRow label="Security & Login Alerts" description="Critical alerts regarding new logins, password changes, and 2FA events.">
            <SettingsSwitch
              checked={securityAlerts}
              onChange={(val) => handleToggle(setSecurityAlerts, 'securityAlerts', val)}
              ariaLabel="Toggle Security Alerts"
            />
          </SettingsRow>

          <SettingsRow label="Product Updates & Features" description="Announcements about new spatial discovery tools and platform upgrades.">
            <SettingsSwitch
              checked={productUpdates}
              onChange={(val) => handleToggle(setProductUpdates, 'productUpdates', val)}
              ariaLabel="Toggle Product Updates"
            />
          </SettingsRow>

          <SettingsRow label="Weekly Discovery Digest" description="A summary of top-rated spots and trending collections near your primary location.">
            <SettingsSwitch
              checked={weeklyDigest}
              onChange={(val) => handleToggle(setWeeklyDigest, 'weeklyDigest', val)}
              ariaLabel="Toggle Weekly Digest"
            />
          </SettingsRow>

          <SettingsRow label="Marketing & Promotional News" description="Offers, surveys, and tips for getting the most out of Nearby Locator.">
            <SettingsSwitch
              checked={marketingEmails}
              onChange={(val) => handleToggle(setMarketingEmails, 'marketingEmails', val)}
              ariaLabel="Toggle Marketing News"
            />
          </SettingsRow>
        </SettingsSection>
      </SettingsCard>
    </div>
  );
}
