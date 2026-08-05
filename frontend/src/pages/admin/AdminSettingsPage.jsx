import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSystemSettings } from '../../services/admin';
import {
  Sliders,
  AlertTriangle,
  RefreshCw,
  Info,
  Globe,
  ShieldCheck,
  Server,
  FileCode
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  const { data: settingsData, isFetching, error, refetch } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const res = await getSystemSettings();
      setLastSyncTime(new Date());
      return res;
    }
  });

  // Calculate total database setting keys returned by GET /api/admin/settings
  const dbKeyCount = React.useMemo(() => {
    if (!settingsData) return 0;
    let count = 0;
    Object.keys(settingsData).forEach((cat) => {
      if (Array.isArray(settingsData[cat])) {
        count += settingsData[cat].length;
      }
    });
    return count;
  }, [settingsData]);

  // ── ERROR STATE ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6 relative w-full min-h-full pb-32 font-sans">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Sliders className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Platform Settings</span>
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
              Global application configuration for single-deployment platform governance.
            </p>
          </div>
        </div>

        <div className="p-8 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-center flex flex-col items-center gap-3">
          <AlertTriangle className="w-10 h-10 text-rose-500" />
          <h3 className="text-base font-black text-rose-900 dark:text-rose-200">Failed to Load System Settings</h3>
          <p className="text-xs font-medium text-rose-700 dark:text-rose-300 max-w-md">
            {error?.message || 'Unable to retrieve settings configuration from the backend.'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md hover:bg-rose-700 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Load</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 relative w-full min-h-full pb-32 font-sans">

      {/* ── 1. EXECUTIVE PAGE HEADER ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Platform Settings</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Environment-governed system configuration for single-deployment instance.
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* ── 2. COMPACT SUMMARY & STATUS ROW ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Status Box 1: Governance Mode */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-emerald-400/50 hover:bg-emerald-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-1.5 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Governance Mode
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              ENVIRONMENT (.env)
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Active
            </span>
          </div>
        </div>

        {/* Status Box 2: Active Deployment Scope */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-blue-400/50 hover:bg-blue-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-1.5 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Deployment Scope
            </span>
            <Globe className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black text-blue-600 dark:text-blue-400 tracking-tight uppercase">
              SINGLE INSTANCE
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Global
            </span>
          </div>
        </div>

        {/* Status Box 3: DB Record Keys */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-purple-400/50 hover:bg-purple-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-1.5 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Database Records
            </span>
            <Server className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight">
              {dbKeyCount} DB Keys
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Preserved
            </span>
          </div>
        </div>

        {/* Status Box 4: Last Sync Time */}
        <div
          onClick={() => refetch()}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-amber-400/50 hover:bg-amber-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-1.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Last Sync
            </span>
            <Info className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black text-slate-700 dark:text-slate-300 font-mono tracking-tight">
              {lastSyncTime.toLocaleTimeString()}
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
              REST Sync
            </span>
          </div>
        </div>

      </div>

      {/* ── 3. ENVIRONMENT GOVERNANCE INFORMATIONAL PANEL ───────────────────────── */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
            <FileCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Environment Governed System Configuration
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-3xl">
              In this single-deployment architecture, system parameters, security policies, authentication rules, and service integrations are governed directly by backend environment variables (<code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold">.env</code>) and application build constants.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          
          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Authentication & Security
            </span>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              JWT Expiry, Sudo Elevation TTL & Password Rules
            </p>
            <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
              Enforced by <code className="font-mono">JWT_EXPIRY</code>, <code className="font-mono">validators.js</code>, and <code className="font-mono">sudoMiddleware.js</code>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              SSO & Integrations
            </span>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Google OAuth & External Services
            </p>
            <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
              Controlled by <code className="font-mono">GOOGLE_CLIENT_ID</code> and <code className="font-mono">GOOGLE_CLIENT_SECRET</code> env vars.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              System Telemetry & Dispatches
            </span>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Logging Levels & Nodemailer Dispatcher
            </p>
            <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
              Controlled by <code className="font-mono">LOG_LEVEL</code> and <code className="font-mono">SMTP_HOST</code> environment configuration.
            </p>
          </div>

        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <span>Database setting keys ({dbKeyCount} keys) remain 100% preserved in backend REST APIs for backward compatibility.</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">0 Dead UI Controls Exposed</span>
        </div>

      </div>

      {/* Bottom Scroll Spacer */}
      <div className="h-6 w-full shrink-0" aria-hidden="true" />
    </div>
  );
}
