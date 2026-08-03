import React, { useState } from 'react';
import { exportPlatformData } from '../../services/admin';
import { useToastStore } from '../../store/useToastStore';
import { useOutletContext } from 'react-router-dom';
import LoaderIcon from '../../icons/LoaderIcon';

export default function AdminDataExportsPage() {
  const { showToast } = useToastStore();
  const { triggerSudo } = useOutletContext();
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState('users');

  const handleExport = (e) => {
    e.preventDefault();
    triggerSudo(async () => {
      setIsExporting(true);
      try {
        await exportPlatformData(exportType);
        showToast(`${exportType} data exported successfully.`, 'success');
      } catch (err) {
        showToast(err?.response?.data?.message || 'Failed to export data.', 'error');
      } finally {
        setIsExporting(false);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto w-full font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-heading text-slate-900 tracking-tight">Data Exports</h1>
        <p className="text-sm text-slate-600 mt-2 font-medium">
          Export platform data in CSV format for offline analysis or compliance requirements.
        </p>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-8">
        <form onSubmit={handleExport} className="flex flex-col gap-6 max-w-md">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Export Category
            </label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 text-slate-900 dark:text-white font-medium cursor-pointer"
            >
              <option value="users">Users & Identities</option>
              <option value="audit_logs">Audit Logs</option>
              <option value="system_errors">System Errors</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-600/25 disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? <LoaderIcon width={16} height={16} color="white" /> : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            {isExporting ? 'Generating Export...' : 'Export to CSV'}
          </button>
        </form>
        
        <div className="mt-8 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex gap-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
            Exports containing Personally Identifiable Information (PII) are heavily audited. All export activities are permanently recorded in the system audit logs.
          </div>
        </div>
      </div>
    </div>
  );
}
