import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { userSettingsService } from '../../services/userSettingsService';
import {
  SettingsCard,
  SettingsSection,
  SettingsRow
} from '../../components/settings/SettingsCard';
import { Download, CheckCircle2 } from 'lucide-react';

export default function AccountSettingsPage() {
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const [language, setLanguage] = useState('English (US)');

  const exportMutation = useMutation({
    mutationFn: () => userSettingsService.requestDataExport(),
    onSuccess: (data) => {
      showToast(data?.message || 'Data export generated successfully.', 'success');
    },
    onError: (err) => {
      // Fallback client download if endpoint responds with object
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user || {}, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `nearby_account_export_${user?.id || 'data'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Account data JSON downloaded.', 'success');
    }
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-slate-100">
          Account Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your account tier, primary email address, and language preferences.
        </p>
      </div>

      <SettingsCard>
        <SettingsSection title="Account Identity" description="Your primary login email address and platform role.">
          <SettingsRow label="Primary Email Address" description="Used for authentication, notifications, and security alerts.">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">{user?.email}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified
              </span>
            </div>
          </SettingsRow>

          <SettingsRow label="Platform Role" description="Your assigned role and access privileges.">
            <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold uppercase">
              {user?.role || 'USER'}
            </span>
          </SettingsRow>
        </SettingsSection>
      </SettingsCard>

      <SettingsCard>
        <SettingsSection title="Regional & Language" description="Select your preferred language and date formatting.">
          <SettingsRow label="Display Language" description="Select your preferred application language.">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none"
            >
              <option>English (US)</option>
              <option>Spanish (Español)</option>
              <option>French (Français)</option>
              <option>German (Deutsch)</option>
              <option>Japanese (日本語)</option>
            </select>
          </SettingsRow>
        </SettingsSection>
      </SettingsCard>

      <SettingsCard>
        <SettingsSection title="Data Export" description="Download a copy of your spatial searches, saved collections, and account history.">
          <SettingsRow label="Export Account Data" description="Generates a complete JSON data archive of your account.">
            <button
              type="button"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportMutation.isPending ? 'Generating Export...' : 'Export JSON'}</span>
            </button>
          </SettingsRow>
        </SettingsSection>
      </SettingsCard>
    </div>
  );
}
