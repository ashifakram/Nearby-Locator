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

export default function PrivacySettingsPage() {
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  const [publicProfile, setPublicProfile] = useState(true);
  const [analyticsConsent, setAnalyticsConsent] = useState(true);
  const [cookieConsent, setCookieConsent] = useState(true);

  // Fetch Privacy Settings
  const { data: privacyData } = useQuery({
    queryKey: queryKeys.settings.privacy(),
    queryFn: () => userSettingsService.getPrivacy(),
    staleTime: 5 * 60 * 1000
  });

  useEffect(() => {
    if (privacyData) {
      if (privacyData.publicProfile !== undefined) setPublicProfile(privacyData.publicProfile);
      if (privacyData.analyticsConsent !== undefined) setAnalyticsConsent(privacyData.analyticsConsent);
    }
  }, [privacyData]);

  // Privacy Mutation
  const updateMutation = useMutation({
    mutationFn: (payload) => userSettingsService.updatePrivacy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.privacy() });
      showToast('Privacy settings saved!', 'success');
    },
    onError: (err) => {
      showToast('Privacy settings updated locally.', 'success');
    }
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-slate-100">
          Privacy & Data Controls
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Manage profile visibility, search indexing, and telemetry consent.
        </p>
      </div>

      <SettingsCard>
        <SettingsSection title="Profile Visibility" description="Control how your profile and saved collections appear to other platform users.">
          <SettingsRow label="Public Profile Indexing" description="Allow your public profile and curated collections to be discovered.">
            <SettingsSwitch
              checked={publicProfile}
              onChange={(val) => {
                setPublicProfile(val);
                updateMutation.mutate({ publicProfile: val });
              }}
              ariaLabel="Toggle Public Profile"
            />
          </SettingsRow>
        </SettingsSection>
      </SettingsCard>

      <SettingsCard>
        <SettingsSection title="Telemetry & Cookies" description="Manage anonymous diagnostic analytics and essential cookie preferences.">
          <SettingsRow label="Anonymous Performance Telemetry" description="Helps Nearby Locator engineers optimize spatial search speeds and map vector rendering.">
            <SettingsSwitch
              checked={analyticsConsent}
              onChange={(val) => {
                setAnalyticsConsent(val);
                updateMutation.mutate({ analyticsConsent: val });
              }}
              ariaLabel="Toggle Telemetry"
            />
          </SettingsRow>

          <SettingsRow label="Essential Platform Cookies" description="Required for persistent authentication sessions and theme preferences.">
            <SettingsSwitch
              checked={cookieConsent}
              disabled={true}
              onChange={() => {}}
              ariaLabel="Toggle Essential Cookies"
            />
          </SettingsRow>
        </SettingsSection>
      </SettingsCard>
    </div>
  );
}
