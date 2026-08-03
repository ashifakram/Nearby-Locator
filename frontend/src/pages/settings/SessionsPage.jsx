import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../store/useToastStore';
import { userSettingsService } from '../../services/userSettingsService';
import { queryKeys } from '../../lib/queryKeys';
import {
  SettingsCard,
  SettingsSection
} from '../../components/settings/SettingsCard';
import { Laptop, Smartphone, LogOut } from 'lucide-react';

export default function SessionsPage() {
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  // Fetch active sessions from API
  const { data: devicesList = [], isLoading } = useQuery({
    queryKey: queryKeys.settings.sessions(),
    queryFn: () => userSettingsService.getSessions(),
    staleTime: 30 * 1000
  });

  // Revoke single session mutation
  const revokeMutation = useMutation({
    mutationFn: (id) => userSettingsService.revokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.sessions() });
      showToast('Session revoked successfully.', 'success');
    },
    onError: (err) => {
      showToast(err?.message || 'Failed to revoke session.', 'error');
    }
  });

  // Revoke all other sessions mutation
  const revokeOthersMutation = useMutation({
    mutationFn: () => userSettingsService.revokeAllOtherSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.sessions() });
      showToast('All other sessions signed out.', 'success');
    },
    onError: (err) => {
      showToast(err?.message || 'Failed to revoke other sessions.', 'error');
    }
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-slate-100">
            Active Login Sessions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Devices and browsers currently logged into your account.
          </p>
        </div>

        {devicesList.length > 1 && (
          <button
            type="button"
            onClick={() => revokeOthersMutation.mutate()}
            disabled={revokeOthersMutation.isPending}
            className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{revokeOthersMutation.isPending ? 'Revoking...' : 'Sign Out Other Devices'}</span>
          </button>
        )}
      </div>

      <SettingsCard>
        <SettingsSection title="Active Devices" description="Revoke access for unrecognized device sessions instantly.">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading session telemetry...</div>
          ) : devicesList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No active session records found.</div>
          ) : (
            <div className="space-y-3 pt-2">
              {devicesList.map((item, index) => {
                const Icon = item.device_type === 'mobile' || item.userAgent?.includes('Mobile') ? Smartphone : Laptop;
                const isCurrent = item.isCurrent || index === 0;
                return (
                  <div
                    key={item.id || item.sessionId || index}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-heading font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{item.device || item.userAgent || 'Chrome Browser'}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px] font-mono font-bold">
                              Current Session
                            </span>
                          )}
                        </h5>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          {item.ip || item.ipAddress || '127.0.0.1'} • {item.location || 'San Francisco, CA'} • {item.lastActive || 'Active Now'}
                        </p>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => revokeMutation.mutate(item.id || item.sessionId)}
                        disabled={revokeMutation.isPending}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                      >
                        Revoke Access
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SettingsSection>
      </SettingsCard>
    </div>
  );
}
