import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../../store/useUIStore';
import { useToastStore } from '../../store/useToastStore';
import { userSettingsService } from '../../services/userSettingsService';
import { queryKeys } from '../../lib/queryKeys';
import {
  SettingsCard,
  SettingsSection,
  SettingsRow,
  SettingsSwitch
} from '../../components/settings/SettingsCard';
import { Sun, Moon } from 'lucide-react';

export default function AppearanceSettingsPage() {
  const { isDark, toggleTheme } = useUIStore();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  const [reducedMotion, setReducedMotion] = useState(false);

  // Fetch preferences
  const { data: preferencesData } = useQuery({
    queryKey: queryKeys.settings.preferences(),
    queryFn: () => userSettingsService.getPreferences(),
    staleTime: 5 * 60 * 1000
  });

  useEffect(() => {
    if (preferencesData?.theme) {
      if (preferencesData.theme === 'dark' && !isDark) toggleTheme();
      if (preferencesData.theme === 'light' && isDark) toggleTheme();
    }
  }, [preferencesData]);

  // Preference Mutation
  const updateMutation = useMutation({
    mutationFn: (newPrefs) => userSettingsService.updatePreferences(newPrefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.preferences() });
    }
  });

  const handleThemeChange = (targetTheme) => {
    if (targetTheme === 'dark' && !isDark) toggleTheme();
    if (targetTheme === 'light' && isDark) toggleTheme();
    updateMutation.mutate({ theme: targetTheme });
    showToast(`${targetTheme === 'dark' ? 'Dark' : 'Light'} Theme active.`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-slate-100">
          Appearance & Themes
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Customize theme mode, UI density, and visual accessibility settings.
        </p>
      </div>

      <SettingsCard>
        <SettingsSection title="Theme Preference" description="Select default application color theme.">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all cursor-pointer ${
                !isDark
                  ? 'border-blue-600 bg-blue-50/50 text-blue-600 font-bold shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Sun className="w-5 h-5" />
              <span className="text-xs">Light Theme (Default)</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all cursor-pointer ${
                isDark
                  ? 'border-blue-600 bg-blue-950/60 text-blue-400 font-bold shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Moon className="w-5 h-5" />
              <span className="text-xs">Dark Theme</span>
            </button>
          </div>
        </SettingsSection>
      </SettingsCard>

      <SettingsCard>
        <SettingsSection title="Accessibility & Display" description="Configure visual comfort and motion preferences.">
          <SettingsRow label="Reduced Motion" description="Disables smooth canvas transitions and non-essential UI animations.">
            <SettingsSwitch
              checked={reducedMotion}
              onChange={(val) => {
                setReducedMotion(val);
                updateMutation.mutate({ reduced_motion: val });
                showToast(`Reduced motion ${val ? 'enabled' : 'disabled'}.`, 'success');
              }}
              ariaLabel="Toggle Reduced Motion"
            />
          </SettingsRow>
        </SettingsSection>
      </SettingsCard>
    </div>
  );
}
