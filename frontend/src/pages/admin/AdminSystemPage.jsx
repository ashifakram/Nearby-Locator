import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSystemDiagnostics } from '../../services/admin';
import LoaderIcon from '../../icons/LoaderIcon';

export default function AdminSystemPage() {
  const { data: sysData, isLoading, error } = useQuery({
    queryKey: ['system-diagnostics'],
    queryFn: getSystemDiagnostics,
    refetchInterval: 10000 // auto refresh every 10 seconds
  });

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-750 text-xs font-semibold rounded-xl">
        Failed to load system diagnostics: {error.message || 'Unknown error'}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center items-center">
        <LoaderIcon width={32} height={32} color="#4f46e5" />
      </div>
    );
  }

  const formatUptime = (seconds) => {
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

  return (
    <div className="space-y-6 flex flex-col h-full w-full pb-8 pr-1">
      <header className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-bold text-slate-900 font-sans">System Diagnostics</h2>
        <p className="text-sm text-slate-500">Real-time status overview of memory usage, Node runtime details, and backend deployment database configurations.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core application specs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-4">Application Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-semibold border-b border-slate-100 pb-2">
                <span className="text-slate-550">Environment Node</span>
                <span className="text-slate-900 uppercase font-extrabold tracking-wide">{sysData.environment}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold border-b border-slate-100 pb-2">
                <span className="text-slate-550">Build Version</span>
                <span className="text-slate-900 font-mono">{sysData.appVersion}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold border-b border-slate-100 pb-2">
                <span className="text-slate-550">API Spec Version</span>
                <span className="text-slate-900 font-mono">{sysData.apiVersion}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Database migration specs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-4">Database Migration Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-semibold border-b border-slate-100 pb-2">
                <span className="text-slate-550">Total Migrations Run</span>
                <span className="text-blue-700 font-extrabold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded text-[10px]">{sysData.migration?.count || 0}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold border-b border-slate-100 pb-2">
                <span className="text-slate-550">Migration Batches</span>
                <span className="text-slate-900 font-mono">{sysData.migration?.batch || 0}</span>
              </div>
              <div className="flex flex-col gap-1 text-xs font-semibold">
                <span className="text-slate-550">Last Executed Migration</span>
                <span className="text-slate-650 font-mono text-[10px] break-all leading-normal bg-slate-50 p-2 rounded border border-slate-200 mt-1 font-bold">{sysData.migration?.lastRun || 'None'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Node Process stats */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-4">Node Engine Runtime</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-semibold border-b border-slate-100 pb-2">
                <span className="text-slate-550">Process Uptime</span>
                <span className="text-slate-900 font-bold">{formatUptime(sysData.runtime?.uptimeSeconds)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold border-b border-slate-100 pb-2">
                <span className="text-slate-550">Engine version</span>
                <span className="text-slate-900 font-mono">{sysData.runtime?.nodeVersion}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold border-b border-slate-100 pb-2">
                <span className="text-slate-550">Platform Architecture</span>
                <span className="text-slate-900 capitalize font-semibold">{sysData.runtime?.platform} ({sysData.runtime?.arch})</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Memory status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-455 uppercase tracking-widest mb-4">Execution Memory Allocation</h3>
          <div className="space-y-3 mt-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-550 mb-1">
                <span>RSS (Resident Set Size)</span>
                <span className="font-mono text-slate-850 font-bold">{sysData.runtime?.memory?.rss}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-550 mb-1">
                <span>Heap Total</span>
                <span className="font-mono text-slate-850 font-bold">{sysData.runtime?.memory?.heapTotal}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-550 mb-1">
                <span>Heap Used</span>
                <span className="font-mono text-slate-850 font-bold">{sysData.runtime?.memory?.heapUsed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PostgreSQL server version info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-455 uppercase tracking-widest mb-4">Postgres Server Database Specifications</h3>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
            <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Version Details</h4>
            <p className="text-slate-655 font-mono text-[11px] font-bold mt-1.5 leading-relaxed">{sysData.databaseVersion}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
