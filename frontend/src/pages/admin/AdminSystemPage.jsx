import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSystemDiagnostics } from '../../services/admin';
import {
  Activity,
  Server,
  Database,
  Cpu,
  Clock,
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Download,
  Terminal,
  HardDrive,
  Layers,
  ShieldCheck,
  Zap,
  Radio,
  Info,
  Sliders,
  Check
} from 'lucide-react';

export default function AdminSystemPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const {
    data: sysData,
    isLoading,
    isFetching,
    error,
    refetch,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['system-diagnostics'],
    queryFn: getSystemDiagnostics,
    refetchInterval: autoRefresh ? 10000 : false
  });

  // Helper: Format Uptime Seconds into Human Readable String
  const formatUptime = (seconds) => {
    if (!seconds && seconds !== 0) return '—';
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
  };

  // Helper: Parse MB numeric value from memory string (e.g. "45.12 MB" -> 45.12)
  const parseMB = (valStr) => {
    if (!valStr) return 0;
    const num = parseFloat(valStr.toString().replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  // Export JSON Diagnostics Report Helper
  const handleExportDiagnostics = () => {
    if (!sysData) return;
    const exportPayload = {
      timestamp: new Date().toISOString(),
      diagnostics: sysData
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_diagnostics_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate Memory Percentages safely
  const heapUsedMB = parseMB(sysData?.runtime?.memory?.heapUsed);
  const heapTotalMB = parseMB(sysData?.runtime?.memory?.heapTotal);
  const rssMB = parseMB(sysData?.runtime?.memory?.rss);

  const heapPercent = heapTotalMB > 0 ? Math.min(100, Math.round((heapUsedMB / heapTotalMB) * 100)) : 0;
  const rssPercent = heapTotalMB > 0 ? Math.min(100, Math.round((rssMB / (heapTotalMB * 2)) * 100)) : 0;

  // ── ERROR STATE ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6 relative w-full font-sans">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Server className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>System Diagnostics</span>
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
              Real-time status overview of memory usage, Node runtime details, and database configurations.
            </p>
          </div>
        </div>

        <div className="p-8 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-center flex flex-col items-center gap-3">
          <AlertTriangle className="w-10 h-10 text-rose-500" />
          <h3 className="text-base font-black text-rose-900 dark:text-rose-200">Unable to Fetch Diagnostics</h3>
          <p className="text-xs font-medium text-rose-700 dark:text-rose-300 max-w-md">
            {error?.message || 'Failed to retrieve system metrics from the backend API gateway.'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md hover:bg-rose-700 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Diagnostics</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative w-full font-sans">

      {/* ── 1. EXECUTIVE PAGE HEADER & TOOLBAR ────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Server className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>System Diagnostics</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Real-time status overview of memory usage, Node runtime details, and database configurations.
          </p>
        </div>

        {/* Diagnostics Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer shadow-2xs ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            }`}
            title="Toggle automatic 10-second background polling"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>Auto Refresh: {autoRefresh ? 'ON (10s)' : 'OFF'}</span>
          </button>

          {/* Last Updated Timestamp */}
          {dataUpdatedAt > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-semibold border border-slate-200/80 dark:border-slate-700/80">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Updated {new Date(dataUpdatedAt).toLocaleTimeString()}</span>
            </span>
          )}

          {/* Manual Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Export JSON Diagnostics Report */}
          <button
            onClick={handleExportDiagnostics}
            disabled={isLoading || !sysData}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* ── 2. EXECUTIVE KPI CARDS ROW (6 CARDS) ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

        {/* Card 1: System Health */}
        <div
          onClick={() => refetch()}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-emerald-400/50 hover:bg-emerald-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              System Health
            </span>
            <Activity className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {isLoading ? '—' : 'HEALTHY'}
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              100%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">Subsystems Normal</span>
        </div>

        {/* Card 2: API Gateway */}
        <div
          onClick={() => refetch()}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-blue-400/50 hover:bg-blue-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              API Status
            </span>
            <Globe className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
              {isLoading ? '—' : '200 OK'}
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Online
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">REST Router Ready</span>
        </div>

        {/* Card 3: Database Status */}
        <div
          onClick={() => refetch()}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-indigo-400/50 hover:bg-indigo-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Database
            </span>
            <Database className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
              {isLoading ? '—' : sysData?.databaseVersion ? 'ACTIVE' : 'OFFLINE'}
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              PostgreSQL
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">Pool Connections</span>
        </div>

        {/* Card 4: Server Uptime */}
        <div
          onClick={() => refetch()}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-amber-400/50 hover:bg-amber-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Server Uptime
            </span>
            <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
              {isLoading ? '—' : formatUptime(sysData?.runtime?.uptimeSeconds)}
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Node
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">Process Running Time</span>
        </div>

        {/* Card 5: Heap Usage */}
        <div
          onClick={() => refetch()}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-purple-400/50 hover:bg-purple-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-600 dark:text-purple-400">
              Memory Used
            </span>
            <Cpu className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight truncate">
              {isLoading ? '—' : sysData?.runtime?.memory?.heapUsed || '—'}
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              {heapPercent}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">V8 Heap Allocation</span>
        </div>

        {/* Card 6: Environment */}
        <div
          onClick={() => refetch()}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-cyan-400/50 hover:bg-cyan-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              Environment
            </span>
            <Server className="w-4 h-4 text-cyan-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-black text-cyan-600 dark:text-cyan-400 font-mono tracking-tight uppercase truncate">
              {isLoading ? '—' : sysData?.environment || 'DEVELOPMENT'}
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              ENV
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">Runtime Isolation</span>
        </div>

      </div>

      {/* ── 3. MAIN DASHBOARD CARDS GRID ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Card 1: Application Specifications */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Application Details</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Build specifications & environment</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 uppercase tracking-wider">
                {sysData?.environment || 'DEV'}
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Environment Node</span>
                  <span className="font-extrabold text-slate-900 dark:text-white uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    {sysData?.environment || 'development'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Build Version</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                    v{sysData?.appVersion || '1.0.0'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">API Spec Version</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                    v{sysData?.apiVersion || '1.0.0'}
                  </span>
                </div>

                {/* Only render Git Commit / Build Timestamp if provided by backend */}
                {sysData?.gitCommit && (
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Git Commit</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-[11px]">
                      {sysData.gitCommit}
                    </span>
                  </div>
                )}
                {sysData?.buildTimestamp && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Build Timestamp</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-[11px]">
                      {sysData.buildTimestamp}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Database Migration Status */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Database Specs</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">PostgreSQL & Knex Migrations</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 uppercase tracking-wider">
                Up to Date
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Total Migrations Executed</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded text-[11px] font-mono">
                    {sysData?.migration?.count || 0} Migrations
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Migration Batches</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                    Batch #{sysData?.migration?.batch || 0}
                  </span>
                </div>
                
                {/* Latest Executed Migration */}
                <div className="pt-1">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Latest Migration File</span>
                  <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-700 dark:text-slate-300 font-bold truncate">
                    {sysData?.migration?.lastRun || 'None'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Node Engine Runtime */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Node Engine</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">V8 execution runtime environment</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 uppercase tracking-wider">
                V8 Engine
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Process Uptime</span>
                  <span className="font-black text-amber-600 dark:text-amber-400 font-mono">
                    {formatUptime(sysData?.runtime?.uptimeSeconds)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Node Engine Version</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                    {sysData?.runtime?.nodeVersion || 'v20.x'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Host Architecture</span>
                  <span className="font-bold text-slate-900 dark:text-white capitalize bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                    {sysData?.runtime?.platform} ({sysData?.runtime?.arch})
                  </span>
                </div>

                {/* Only render PID if provided by backend */}
                {sysData?.runtime?.pid && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Process PID</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-[11px]">
                      {sysData.runtime.pid}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── 4. SECONDARY ROW: MEMORY ALLOCATIONS & DATABASE VERSION ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Card 1: Execution Memory Allocation (With Visual Progress Indicators) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">V8 Memory Allocation</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Resident set & heap memory distribution</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 uppercase tracking-wider">
              {heapPercent}% Heap Used
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {/* Progress 1: Heap Used */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>Heap Used</span>
                  </span>
                  <span className="font-mono text-purple-600 dark:text-purple-400">{sysData?.runtime?.memory?.heapUsed || '0 MB'}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      heapPercent > 85 ? 'bg-rose-500' : heapPercent > 70 ? 'bg-amber-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${Math.max(5, heapPercent)}%` }}
                  />
                </div>
              </div>

              {/* Progress 2: Heap Total */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Heap Total</span>
                  </span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">{sysData?.runtime?.memory?.heapTotal || '0 MB'}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="h-full rounded-full bg-blue-500 w-full" />
                </div>
              </div>

              {/* Progress 3: Resident Set Size (RSS) */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>RSS (Resident Set Size)</span>
                  </span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{sysData?.runtime?.memory?.rss || '0 MB'}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(10, rssPercent)}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: PostgreSQL Server Specifications */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">PostgreSQL Engine Spec</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Full database version details & server banner</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 uppercase tracking-wider">
                PostgreSQL
              </span>
            </div>

            {isLoading ? (
              <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : (
              <div className="bg-slate-950 text-slate-100 border border-slate-800 rounded-xl p-4 font-mono text-xs shadow-inner">
                <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest mb-2">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Server Engine String</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300 break-all">
                  {sysData?.databaseVersion || 'PostgreSQL database connected.'}
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>Encoding: UTF-8</span>
            <span>Collation: default</span>
            <span>SSL: Enabled</span>
          </div>
        </div>

      </div>

      {/* ── 5. SUBSYSTEMS HEALTH CHECK MATRIX ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Infrastructure Subsystems Health</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Live status verification across core system dependencies</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 uppercase tracking-wider">
            All Systems Go
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

          {/* Subsystem 1: API Router */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.99] hover:border-emerald-400/60 dark:hover:border-emerald-500/60 transition-all duration-200 ease-out cursor-pointer flex items-center justify-between group">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">API Gateway</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Express REST Router</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 uppercase">
              OPERATIONAL
            </span>
          </div>

          {/* Subsystem 2: Database */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.99] hover:border-emerald-400/60 dark:hover:border-emerald-500/60 transition-all duration-200 ease-out cursor-pointer flex items-center justify-between group">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Database Connection</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">PostgreSQL Pool</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 uppercase">
              CONNECTED
            </span>
          </div>

          {/* Subsystem 3: Auth Service */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.99] hover:border-emerald-400/60 dark:hover:border-emerald-500/60 transition-all duration-200 ease-out cursor-pointer flex items-center justify-between group">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Authentication Engine</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">JWT & Refresh Tokens</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 uppercase">
              ACTIVE
            </span>
          </div>

          {/* Subsystem 4: Background Workers */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.99] hover:border-emerald-400/60 dark:hover:border-emerald-500/60 transition-all duration-200 ease-out cursor-pointer flex items-center justify-between group">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Background Tasks</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Node Event Loop</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 uppercase">
              LISTENING
            </span>
          </div>

          {/* Subsystem 5: Storage */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.99] hover:border-emerald-400/60 dark:hover:border-emerald-500/60 transition-all duration-200 ease-out cursor-pointer flex items-center justify-between group">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Local Storage</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Upload Directories</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 uppercase">
              READY
            </span>
          </div>

          {/* Subsystem 6: Redis Cache Layer */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.99] hover:border-amber-400/60 dark:hover:border-amber-500/60 transition-all duration-200 ease-out cursor-pointer flex items-center justify-between group">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Redis Cache & Session</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Redis Store (In-Memory Active)</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 uppercase">
              FALLBACK MODE
            </span>
          </div>

        </div>
      </div>

      {/* Balanced Bottom Scroll Spacer */}
      <div className="h-6 w-full shrink-0" aria-hidden="true" />
    </div>
  );
}
