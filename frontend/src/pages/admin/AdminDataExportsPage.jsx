import React, { useState } from 'react';
import { exportPlatformData } from '../../services/admin';
import { useToastStore } from '../../store/useToastStore';
import { useOutletContext } from 'react-router-dom';
import {
  Download,
  FileSpreadsheet,
  Shield,
  ShieldAlert,
  Database,
  Lock,
  RefreshCw,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info,
  Layers
} from 'lucide-react';

export default function AdminDataExportsPage() {
  const { showToast } = useToastStore();
  const { triggerSudo } = useOutletContext();
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState('users');

  const handleExport = (e) => {
    if (e) e.preventDefault();
    triggerSudo(async () => {
      setIsExporting(true);
      try {
        await exportPlatformData(exportType);
        showToast(`${exportType.replace('_', ' ')} data exported successfully.`, 'success');
      } catch (err) {
        showToast(err?.response?.data?.message || 'Failed to export data.', 'error');
      } finally {
        setIsExporting(false);
      }
    });
  };

  // Helper metadata for selected export category
  const categoryDetails = {
    users: {
      title: 'Users & Identities',
      icon: Users,
      desc: 'Export registered user profiles, verification states, assigned roles, auth providers, and account timestamps.',
      countText: 'Full User Directory',
      badge: 'Account Data'
    },
    audit_logs: {
      title: 'Audit Logs',
      icon: FileText,
      desc: 'Export security audit trail events, actor emails, client IP addresses, action descriptors, and severity levels.',
      countText: 'Audit Event History',
      badge: 'Security Audit'
    },
    system_errors: {
      title: 'System Errors',
      icon: AlertTriangle,
      desc: 'Export operational error logs, service names, error messages, stack trace summaries, and resolution flags.',
      countText: 'Error Log Dump',
      badge: 'Diagnostics'
    }
  };

  const currentDetails = categoryDetails[exportType] || categoryDetails.users;
  const DetailIcon = currentDetails.icon;

  return (
    <div className="space-y-5 relative w-full min-h-full pb-32 font-sans">

      {/* ── 1. EXECUTIVE PAGE HEADER ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Data Exports</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Export platform data in CSV format for offline analysis, auditing, or compliance requirements.
          </p>
        </div>

        {/* Header Badges */}
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Sudo Elevated</span>
          </span>
        </div>
      </div>

      {/* ── 2. EXECUTIVE KPI SUMMARY ROW ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Metric 1: Supported Datasets */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-blue-400/50 hover:bg-blue-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Supported Datasets
            </span>
            <Layers className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black text-blue-600 dark:text-blue-400 tracking-tight font-mono">
              3 Categories
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Active
            </span>
          </div>
        </div>

        {/* Metric 2: Export Format */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-emerald-400/50 hover:bg-emerald-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Output Format
            </span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
              RFC 4180 CSV
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              UTF-8 BOM
            </span>
          </div>
        </div>

        {/* Metric 3: Access Control */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-purple-400/50 hover:bg-purple-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Access Gate
            </span>
            <Lock className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black text-purple-600 dark:text-purple-400 tracking-tight">
              SUDO STEP-UP
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Protected
            </span>
          </div>
        </div>

        {/* Metric 4: Audit Tracking */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-amber-400/50 hover:bg-amber-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Audit Tracking
            </span>
            <CheckCircle2 className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black text-amber-600 dark:text-amber-400 tracking-tight">
              PERMANENT LOG
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Audit Logged
            </span>
          </div>
        </div>

      </div>

      {/* ── 3. MAIN EXPORT SELECTION & ACTION FORM ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        
        {/* Form Container */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs lg:col-span-2 space-y-5">
          
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Export Generator</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Select an export category to generate and download a CSV data package.
            </p>
          </div>

          <form onSubmit={handleExport} className="space-y-4">
            
            {/* Category Select Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Export Category
              </label>
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer transition-all"
              >
                <option value="users">Users & Identities</option>
                <option value="audit_logs">Audit Logs</option>
                <option value="system_errors">System Errors</option>
              </select>
            </div>

            {/* Selected Category Feature Details Preview */}
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                <DetailIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    {currentDetails.title}
                  </h4>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 uppercase tracking-wider">
                    {currentDetails.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  {currentDetails.desc}
                </p>
              </div>
            </div>

            {/* Form Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isExporting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>{isExporting ? 'Generating Export Package...' : 'Export to CSV (Sudo Gated)'}</span>
              </button>
            </div>

          </form>
        </div>

        {/* Audit Warning Sidebar Card */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 dark:bg-amber-950/30 dark:border-amber-900/50 space-y-2.5 lg:col-span-1">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <h4 className="text-xs font-black uppercase tracking-wider">Security & Audit Compliance</h4>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
            Exports containing Personally Identifiable Information (PII) or system diagnostics are heavily audited. All export requests trigger Sudo elevation and are permanently recorded in system audit logs.
          </p>
          <div className="pt-2 border-t border-amber-500/20 text-[10px] font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <Info className="w-3 h-3 text-amber-500" />
            <span>Audit Action: EXPORT_REQUESTED</span>
          </div>
        </div>

      </div>

      {/* Balanced Bottom Scroll Spacer */}
      <div className="h-6 w-full shrink-0" aria-hidden="true" />
    </div>
  );
}
